"""
app/services/prediction.py
──────────────────────────
ML model loader and inference service — CatBoost Schedule Delay Model.

Model 3 details (from training output):
  - Type: CatBoostRegressor
  - Target: future_schedule_extension_days, signed_log transformed
  - Decoding: signed_log inverse = sign(x) * (exp(|x|) - 1), clip to [0, 365]
  - Risk score: delay_risk = actual_days / TARGET_UPPER  →  [0.0, 1.0]
  - 61 features, 12 categorical columns

Artifacts (place in ml/artifacts/):
  model_3_schedule_delay.cbm       ← CatBoost binary model
  model_3_schedule_config.pkl      ← feature names, cat columns, bounds
  model_3_feature_importance.pkl   ← feature importance (optional, fallback to native)

Scoring formula:
  delay_risk   = min(1.0, inverse_signed_log(raw_prediction) / 365)
  cost_risk    = statistical baseline (expenditure_ratio threshold)
  overall_risk = 0.5 * cost_risk + 0.5 * delay_risk
"""

import json
import logging
import pickle
from pathlib import Path
from typing import Optional

import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)

# ── Module-level state ────────────────────────────────────────────────────────
_schedule_model = None
_model_config: dict = {}
_feature_importance: list = []
_feature_names: list[str] = []
_cat_features: list[str] = []

MODEL_LOADED: bool = False
MODEL_VERSION: Optional[str] = "catboost_schedule_delay_v3"

_TARGET_LOWER: float = 0.0
_TARGET_UPPER: float = 365.0


def _load_models() -> None:
    """Called once at app startup from main.py lifespan."""
    global _schedule_model, _model_config, _feature_importance
    global _feature_names, _cat_features, MODEL_LOADED, MODEL_VERSION

    artifacts_dir = Path(settings.ML_ARTIFACTS_DIR)
    model_path  = artifacts_dir / "model_3_schedule_delay.cbm"
    config_path = artifacts_dir / "model_3_schedule_config.pkl"

    missing = [p.name for p in [model_path, config_path] if not p.exists()]
    if missing:
        logger.warning(
            "⚠️  PRAGATI-AI: ML artifacts not found: %s  "
            "→ Backend starting in 'no model' state. "
            "Drop trained artifacts into ml/artifacts/ and restart.",
            missing,
        )
        MODEL_LOADED = False
        return

    try:
        # ── 1. Load CatBoost model ────────────────────────────────────────────
        from catboost import CatBoostRegressor
        _schedule_model = CatBoostRegressor()
        _schedule_model.load_model(str(model_path), format="cbm")
        logger.info("✅  CatBoost model loaded from %s", model_path.name)

        # ── 2. Load config (Python 3.13 compatible — only uses builtins) ──────
        with open(config_path, "rb") as f:
            _model_config = pickle.load(f)

        # Actual config keys confirmed: feature_columns, categorical_columns
        _feature_names = (
            _model_config.get("feature_columns")
            or _model_config.get("feature_names")
            or _model_config.get("features")
            or []
        )
        _cat_features = (
            _model_config.get("categorical_columns")
            or _model_config.get("cat_features")
            or _model_config.get("cat_cols")
            or []
        )

        # ── 3. Feature importance ─────────────────────────────────────────────
        # The pkl was saved in Python 3.10 (Colab) and fails in Python 3.13
        # (STACK_GLOBAL requires str). We bypass it and use CatBoost native API.
        importance_pkl = artifacts_dir / "model_3_feature_importance.pkl"
        loaded_from_pkl = False
        if importance_pkl.exists():
            try:
                with open(importance_pkl, "rb") as f:
                    raw = pickle.load(f)
                if hasattr(raw, "to_dict"):
                    _feature_importance = raw.to_dict("records")
                elif isinstance(raw, list):
                    _feature_importance = raw
                elif isinstance(raw, dict):
                    _feature_importance = [
                        {"Feature Id": k, "Importances": v} for k, v in raw.items()
                    ]
                loaded_from_pkl = True
            except Exception as pkl_err:
                logger.info(
                    "Feature importance pkl not loadable (%s) — "
                    "using CatBoost native get_feature_importance(). This is fine.",
                    type(pkl_err).__name__,
                )

        if not loaded_from_pkl:
            imp_df = _schedule_model.get_feature_importance(prettified=True)
            _feature_importance = imp_df.to_dict("records")

        # ── 4. Write model_run_metrics.json for the Model Performance UI ──────
        _write_metrics_json(artifacts_dir)

        if _feature_names:
            MODEL_LOADED = True
            logger.info(
                "✅  PRAGATI-AI: ML models loaded. "
                "Features: %d  Categorical: %d  Target upper: %.0f days  "
                "Transform: %s",
                len(_feature_names),
                len(_cat_features),
                _TARGET_UPPER,
                _model_config.get("target_transform", "signed_log"),
            )
        else:
            logger.error("❌  Config has no feature_columns key — check pkl file.")
            MODEL_LOADED = False

    except ImportError:
        logger.error("❌  catboost not installed. Run: pip install catboost")
        MODEL_LOADED = False
    except Exception as exc:
        logger.error("❌  Failed to load ML models: %s", exc, exc_info=True)
        MODEL_LOADED = False


def _write_metrics_json(artifacts_dir: Path) -> None:
    """Write model_run_metrics.json from config so the Model Performance UI shows real data."""
    metrics_path = artifacts_dir / "model_run_metrics.json"
    if metrics_path.exists():
        return  # don't overwrite if already present

    val  = _model_config.get("validation_metrics", {})
    test = _model_config.get("test_metrics", {})

    metrics = {
        "model_version":      MODEL_VERSION,
        "model_name":         _model_config.get("model_name", "Model 3 — Schedule Delay"),
        "model_type":         "CatBoostRegressor",
        "target":             _model_config.get("target", "future_schedule_extension_days"),
        "target_transform":   _model_config.get("target_transform", "signed_log"),
        # Validation
        "val_mae_days":       round(val.get("mae_days", 0), 2),
        "val_rmse_days":      round(val.get("rmse_days", 0), 2),
        "val_r2":             round(val.get("r2", 0), 4),
        # Test
        "test_mae_days":      round(test.get("mae_days", 0), 2),
        "test_rmse_days":     round(test.get("rmse_days", 0), 2),
        "test_r2":            round(test.get("r2", 0), 4),
        "delay_precision":    round(test.get("delay_precision", 0), 4),
        "delay_recall":       round(test.get("delay_recall", 0), 4),
        "delay_f1":           round(test.get("delay_f1", 0), 4),
        # Risk categories
        "risk_categories":    _model_config.get("risk_categories", {}),
    }
    try:
        with open(metrics_path, "w") as f:
            json.dump(metrics, f, indent=2)
        logger.info("✅  model_run_metrics.json written to ml/artifacts/")
    except Exception as e:
        logger.warning("Could not write model_run_metrics.json: %s", e)


def get_model_status() -> dict:
    return {
        "model_loaded":      MODEL_LOADED,
        "model_version":     MODEL_VERSION,
        "model_type":        "CatBoostRegressor" if MODEL_LOADED else None,
        "feature_count":     len(_feature_names),
        "cat_feature_count": len(_cat_features),
        "target_upper_days": _TARGET_UPPER,
    }


def build_feature_dataframe(feature_dict: dict):
    """Build a single-row DataFrame for CatBoost inference."""
    import pandas as pd

    cat_set = set(_cat_features)
    row = {}
    for col in _feature_names:
        val = feature_dict.get(col)
        if col in cat_set:
            row[col] = str(val) if val is not None else ""
        else:
            row[col] = float(val) if val is not None else 0.0

    return pd.DataFrame([row], columns=_feature_names)


def _inverse_signed_log(x: float) -> float:
    """
    Invert the signed_log transform used during training.
    signed_log(y) = sign(y) * log1p(|y|)
    inverse:        sign(x) * expm1(|x|)
    """
    return float(np.sign(x) * np.expm1(abs(x)))


def score_project(feature_dict: dict) -> dict:
    """
    Run CatBoost schedule-delay model and return risk scores.

    Target transform is signed_log (confirmed from model_3_schedule_config.pkl).
    Decoding: actual_days = sign(x) * expm1(|x|), then clip to [0, 365].
    """
    if MODEL_LOADED and _schedule_model is not None:
        try:
            X = build_feature_dataframe(feature_dict)
            raw_pred = float(_schedule_model.predict(X)[0])

            actual_days = _inverse_signed_log(raw_pred)
            actual_days = max(0.0, min(actual_days, _TARGET_UPPER))
            delay_risk  = round(actual_days / _TARGET_UPPER, 4)
            model_mode  = "catboost"
        except Exception as exc:
            logger.warning("CatBoost inference failed → baseline: %s", exc)
            actual_days = 0.0
            delay_risk, model_mode = _baseline_delay(feature_dict)
    else:
        actual_days = 0.0
        delay_risk, model_mode = _baseline_delay(feature_dict)

    exp_ratio = float(feature_dict.get("expenditure_ratio", 0.0))
    cost_risk    = round(0.65 if exp_ratio > 0.6 else 0.25, 4)
    overall_risk = round(0.5 * cost_risk + 0.5 * delay_risk, 4)

    return {
        "delay_risk":     delay_risk,
        "predicted_days": round(actual_days, 1),
        "risk_category":  _delay_category(actual_days),
        "cost_risk":      cost_risk,
        "overall_risk":   overall_risk,
        "model_mode":     model_mode,
        "model_version":  MODEL_VERSION,
    }


def get_top_drivers(top_n: int = 5) -> list[dict]:
    """Return top-N feature importance drivers."""
    if not _feature_importance:
        return []

    sorted_feats = sorted(
        _feature_importance,
        key=lambda x: abs(x.get("Importances", 0)),
        reverse=True,
    )[:top_n]

    return [
        {
            "feature":    item["Feature Id"],
            "label":      _humanise_feature(item["Feature Id"]),
            "importance": round(float(item["Importances"]), 4),
            "rank":       i + 1,
        }
        for i, item in enumerate(sorted_feats)
    ]


def get_shap_drivers(feature_dict: dict, top_n: int = 5) -> list[dict]:
    """Kept for API compatibility."""
    return get_top_drivers(top_n=top_n)


# ── Internal helpers ──────────────────────────────────────────────────────────

def _baseline_delay(feature_dict: dict) -> tuple[float, str]:
    schedule_gap = float(feature_dict.get("schedule_gap_pct", 0.0))
    return round(0.60 if schedule_gap > 20 else 0.20, 4), "baseline"


def _delay_category(actual_days: float) -> str:
    if actual_days <= 0:
        return "On Track"
    elif actual_days <= 30:
        return "Low Delay Risk"
    elif actual_days <= 90:
        return "Moderate Delay Risk"
    elif actual_days <= 180:
        return "High Delay Risk"
    else:
        return "Critical Delay Risk"


_FEATURE_LABELS = {
    "revised_doc":                   "Revised date of completion",
    "days_to_revised_doc":           "Days remaining to revised deadline",
    "physical_progress_pct":         "Physical progress (%)",
    "financial_progress_pct":        "Financial progress (%)",
    "schedule_gap_pct":              "Schedule gap vs plan (%)",
    "cumulative_expenditure_cr":     "Cumulative expenditure (₹ Cr)",
    "original_cost_cr":              "Original project cost (₹ Cr)",
    "revised_cost_cr":               "Revised project cost (₹ Cr)",
    "risk_signal_count":             "Number of active risk signals",
    "peer_progress_percentile":      "Progress vs peer projects",
    "peer_financial_gap_percentile": "Financial gap vs peer projects",
    "peer_schedule_gap_percentile":  "Schedule gap vs peer projects",
    "is_after_revised_target":       "Past revised completion target",
    "time_elapsed_pct":              "Time elapsed vs project duration",
    "financial_physical_gap_pct":    "Financial vs physical progress gap",
    "project_age_days":              "Project age (days)",
    "snapshot_month_num":            "Reporting month index",
    "heuristic_risk_level":          "Heuristic risk classification",
    "legacy_code":                   "Legacy project code flag",
    "approval_date_dt_month":        "Approval month",
}


def _humanise_feature(raw: str) -> str:
    """Return a human-readable label for a feature name."""
    if raw in _FEATURE_LABELS:
        return _FEATURE_LABELS[raw]
    if raw.startswith("sector_"):
        return f"Sector: {raw.replace('sector_', '').replace('_', ' ').title()}"
    if raw.startswith("ministry_"):
        return f"Ministry: {raw.replace('ministry_', '').replace('_', ' ').upper()}"
    return raw.replace("_", " ").title()

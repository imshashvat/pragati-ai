"""
app/services/prediction.py
──────────────────────────
ML model loader and inference service — CatBoost Schedule Delay Model.

Model 3 details (from training output):
  - Type: CatBoostRegressor
  - Target: future_schedule_extension_days, clipped [0, 365], log1p transformed
  - Decoding: actual_days = expm1(prediction), clipped to [0, 365]
  - Risk score: delay_risk = actual_days / 365  →  [0.0, 1.0]
  - 61 features, 12 categorical columns

Artifacts (place in ml/artifacts/):
  model_3_schedule_delay.cbm       ← CatBoost binary model
  model_3_schedule_config.pkl      ← feature names, cat columns, bounds
  model_3_feature_importance.pkl   ← feature importance for driver display

Startup behaviour:
  - Loads all three artifacts at startup from ML_ARTIFACTS_DIR
  - If any file is missing → MODEL_LOADED = False, graceful fallback (no crash)
  - Exposes score_project() and get_model_status() used by all routers

Scoring formula:
  delay_risk   = min(1.0, expm1(raw_prediction) / 365)
  cost_risk    = statistical baseline (expenditure_ratio threshold)
  overall_risk = 0.5 * cost_risk + 0.5 * delay_risk
"""

import logging
import pickle
from pathlib import Path
from typing import Optional

import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)

# ── Module-level state ────────────────────────────────────────────────────────
_schedule_model = None          # CatBoostRegressor instance
_model_config: dict = {}        # from model_3_schedule_config.pkl
_feature_importance: dict = {}  # from model_3_feature_importance.pkl
_feature_names: list[str] = []  # ordered feature list for DataFrame construction
_cat_features: list[str] = []   # categorical column names (CatBoost native)

MODEL_LOADED: bool = False
MODEL_VERSION: Optional[str] = "catboost_schedule_delay_v3"

# Target clipping bounds (matches training: lower=0, upper=365)
_TARGET_LOWER: float = 0.0
_TARGET_UPPER: float = 365.0


def _load_models() -> None:
    """
    Called once at app startup from main.py lifespan.
    Graceful fallback: sets MODEL_LOADED=False if any artifact is missing.
    """
    global _schedule_model, _model_config, _feature_importance
    global _feature_names, _cat_features, MODEL_LOADED, MODEL_VERSION

    artifacts_dir = Path(settings.ML_ARTIFACTS_DIR)
    model_path      = artifacts_dir / "model_3_schedule_delay.cbm"
    config_path     = artifacts_dir / "model_3_schedule_config.pkl"
    importance_path = artifacts_dir / "model_3_feature_importance.pkl"

    missing = [p.name for p in [model_path, config_path, importance_path] if not p.exists()]
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
        # Load CatBoost model
        from catboost import CatBoostRegressor  # lazy import — optional dep
        _schedule_model = CatBoostRegressor()
        _schedule_model.load_model(str(model_path), format="cbm")

        # Load config
        with open(config_path, "rb") as f:
            _model_config = pickle.load(f)

        # Load feature importance
        with open(importance_path, "rb") as f:
            raw_importance = pickle.load(f)

        # Normalise feature importance to dict keyed by feature name
        if isinstance(raw_importance, dict):
            _feature_importance = raw_importance
        elif hasattr(raw_importance, "iterrows"):
            # pandas DataFrame with 'feature' and 'importance' columns
            _feature_importance = dict(
                zip(raw_importance["feature"], raw_importance["importance"])
            )
        else:
            _feature_importance = {}

        # Extract feature names and categorical columns from config
        # Config may use different key names — handle common variants
        _feature_names = (
            _model_config.get("feature_names")
            or _model_config.get("features")
            or _model_config.get("feature_columns")
            or []
        )
        _cat_features = (
            _model_config.get("cat_features")
            or _model_config.get("categorical_columns")
            or _model_config.get("cat_cols")
            or []
        )

        # If config has target bounds, use them
        global _TARGET_UPPER
        if "target_upper" in _model_config:
            _TARGET_UPPER = float(_model_config["target_upper"])
        if "upper_bound" in _model_config:
            _TARGET_UPPER = float(_model_config["upper_bound"])

        if _feature_names:
            MODEL_LOADED = True
            logger.info(
                "✅  PRAGATI-AI: CatBoost schedule-delay model loaded. "
                "Features: %d  Categorical: %d  Target upper bound: %.0f days",
                len(_feature_names),
                len(_cat_features),
                _TARGET_UPPER,
            )
        else:
            # CatBoost can self-report feature names if config didn't have them
            try:
                _feature_names = list(_schedule_model.feature_names_)
                logger.info(
                    "✅  PRAGATI-AI: Feature names read from CatBoost model directly (%d features).",
                    len(_feature_names),
                )
                MODEL_LOADED = True
            except Exception:
                logger.error(
                    "❌  model_3_schedule_config.pkl has no feature_names key "
                    "and CatBoost could not provide them. Check your config file."
                )
                MODEL_LOADED = False

    except ImportError:
        logger.error(
            "❌  catboost package not installed. "
            "Run: pip install catboost  (or add to requirements.txt)"
        )
        MODEL_LOADED = False
    except Exception as exc:
        logger.error("❌  Failed to load ML models: %s", exc, exc_info=True)
        MODEL_LOADED = False


def get_model_status() -> dict:
    """Returns current model load state for health / model-performance endpoints."""
    return {
        "model_loaded": MODEL_LOADED,
        "model_version": MODEL_VERSION,
        "model_type": "CatBoostRegressor" if MODEL_LOADED else None,
        "feature_count": len(_feature_names),
        "cat_feature_count": len(_cat_features),
        "target_upper_days": _TARGET_UPPER,
    }


def build_feature_dataframe(feature_dict: dict):
    """
    Build a single-row pandas DataFrame matching the exact column order and
    dtypes the CatBoost model was trained on.

    CatBoost requires DataFrame input with named columns (unlike XGBoost which
    accepts numpy arrays). Missing columns are filled with 0 for numeric and
    '' for categorical.

    Returns: pd.DataFrame with shape (1, n_features)
    """
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


def score_project(feature_dict: dict) -> dict:
    """
    Run the CatBoost schedule-delay model and return risk scores.

    Decoding pipeline:
      1. Model outputs log1p-transformed days (training used log1p on clipped [0, 365])
      2. Invert: actual_days = expm1(raw_output), clip to [0, TARGET_UPPER]
      3. Normalise: delay_risk = actual_days / TARGET_UPPER  →  [0.0, 1.0]

    Cost risk uses a statistical baseline (no cost model trained yet).

    Returns:
        {
          "delay_risk":        float,  # 0–1 schedule delay risk
          "predicted_days":    float,  # predicted future extension in days
          "risk_category":     str,    # "On Track" | "Low" | "Moderate" | "High"
          "cost_risk":         float,  # statistical baseline
          "overall_risk":      float,  # 0.5 * cost_risk + 0.5 * delay_risk
          "model_mode":        str,    # "catboost" | "baseline"
          "model_version":     str | None,
        }
    """
    if MODEL_LOADED and _schedule_model is not None:
        try:
            X = build_feature_dataframe(feature_dict)
            raw_pred = float(_schedule_model.predict(X)[0])

            # Invert log1p transformation, clip to [0, TARGET_UPPER]
            actual_days = float(np.expm1(max(0.0, raw_pred)))
            actual_days = min(actual_days, _TARGET_UPPER)
            actual_days = max(0.0, actual_days)

            delay_risk = round(actual_days / _TARGET_UPPER, 4)
            model_mode = "catboost"
        except Exception as exc:
            logger.warning("CatBoost inference failed, falling back to baseline: %s", exc)
            actual_days = 0.0
            delay_risk, model_mode = _baseline_delay(feature_dict)
    else:
        actual_days = 0.0
        delay_risk, model_mode = _baseline_delay(feature_dict)

    # Statistical cost risk baseline (cost model not yet trained)
    exp_ratio = float(feature_dict.get("expenditure_ratio", 0.0))
    cost_risk = round(0.65 if exp_ratio > 0.6 else 0.25, 4)

    overall_risk = round(0.5 * cost_risk + 0.5 * delay_risk, 4)

    return {
        "delay_risk": delay_risk,
        "predicted_days": round(actual_days, 1),
        "risk_category": _delay_category(actual_days),
        "cost_risk": cost_risk,
        "overall_risk": overall_risk,
        "model_mode": model_mode,
        "model_version": MODEL_VERSION,
    }


def get_top_drivers(top_n: int = 5) -> list[dict]:
    """
    Return top-N feature importance drivers from model_3_feature_importance.pkl.

    This uses global feature importance (not per-project SHAP) because:
      - The model is a regressor (SHAP on regressors requires extra setup)
      - Feature importance gives a fast, interpretable signal for the UI
      - Per-project SHAP can be added as a future enhancement

    Returns list of driver dicts:
        [{"feature": str, "label": str, "importance": float, "rank": int}]
    """
    if not _feature_importance:
        return []

    sorted_features = sorted(
        _feature_importance.items(), key=lambda x: abs(x[1]), reverse=True
    )[:top_n]

    return [
        {
            "feature": feat,
            "label": _humanise_feature(feat),
            "importance": round(float(imp), 4),
            "rank": i + 1,
        }
        for i, (feat, imp) in enumerate(sorted_features)
    ]


def get_shap_drivers(feature_dict: dict, top_n: int = 5) -> list[dict]:
    """
    Kept for API compatibility. Returns global feature importance drivers.
    Full per-project SHAP can be enabled once catboost SHAP is configured.
    """
    return get_top_drivers(top_n=top_n)


# ── Internal helpers ──────────────────────────────────────────────────────────

def _baseline_delay(feature_dict: dict) -> tuple[float, str]:
    """Statistical fallback delay risk when model is not loaded."""
    schedule_gap = float(feature_dict.get("schedule_gap_pct", 0.0))
    delay_risk = round(0.60 if schedule_gap > 20 else 0.20, 4)
    return delay_risk, "baseline"


def _delay_category(actual_days: float) -> str:
    """Map predicted delay days to a human-readable risk category."""
    if actual_days <= 0:
        return "On Track"
    elif actual_days <= 30:
        return "Low Delay Risk"
    elif actual_days <= 90:
        return "Moderate Delay Risk"
    else:
        return "High Delay Risk"


# ── Human-readable feature label map ─────────────────────────────────────────
_FEATURE_LABELS = {
    "revised_doc":                  "Revised date of completion",
    "days_to_revised_doc":          "Days remaining to revised deadline",
    "physical_progress_pct":        "Physical progress (%)",
    "financial_progress_pct":       "Financial progress (%)",
    "schedule_gap_pct":             "Schedule gap vs plan (%)",
    "cumulative_expenditure_cr":    "Cumulative expenditure (₹ Cr)",
    "original_cost_cr":             "Original project cost (₹ Cr)",
    "revised_cost_cr":              "Revised project cost (₹ Cr)",
    "risk_signal_count":            "Number of active risk signals",
    "peer_progress_percentile":     "Progress vs peer projects",
    "peer_financial_gap_percentile": "Financial gap vs peer projects",
    "peer_schedule_gap_percentile": "Schedule gap vs peer projects",
    "is_after_revised_target":      "Past revised completion target",
    "time_elapsed_pct":             "Time elapsed vs project duration",
    "financial_physical_gap_pct":   "Financial vs physical progress gap",
    "project_age_days":             "Project age (days)",
    "snapshot_month_num":           "Reporting month index",
    "heuristic_risk_level":         "Heuristic risk classification",
    "legacy_code":                  "Legacy project code flag",
    "approval_date_dt_month":       "Approval month",
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

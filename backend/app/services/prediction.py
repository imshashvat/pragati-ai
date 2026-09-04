"""
app/services/prediction.py
──────────────────────────
ML model loader and inference service.

Startup behaviour (Section 29):
  - Loads cost_model.pkl, delay_model.pkl, feature_columns.json from ml/artifacts/
  - If any file is missing → MODEL_LOADED = False, clear log message, no crash
  - Exposes score_project() and get_model_status() used by routers

Scoring formula (Section 10, Step 10 of ML guide):
  overall_risk = 0.5 * cost_risk + 0.5 * delay_risk

model_mode returned:
  "ml"       — real XGBoost artifacts loaded and used
  "baseline" — fallback statistical rule (expenditure_ratio > 0.6)
  "demo"     — synthetic seed row (never scored by this service)

SHAP note:
  shap requires MSVC C++ on Windows and has no cp313 prebuilt wheel.
  It is therefore a soft-optional import — if unavailable, get_shap_drivers()
  returns [] gracefully. SHAP will work fine in the Colab training environment
  (Linux) and on any machine with build tools installed.
"""

import json
import logging
from pathlib import Path
from typing import Optional

import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)

# ── Module-level state ───────────────────────────────────────────────────────
_cost_model = None
_delay_model = None
_feature_columns: list[str] = []
MODEL_LOADED: bool = False
MODEL_VERSION: Optional[str] = None


def _load_models() -> None:
    """
    Called once at app startup from main.py lifespan.
    Graceful fallback: sets MODEL_LOADED=False if any artifact is missing.
    """
    global _cost_model, _delay_model, _feature_columns, MODEL_LOADED, MODEL_VERSION

    artifacts_dir = Path(settings.ML_ARTIFACTS_DIR)
    cost_path = artifacts_dir / "cost_model.pkl"
    delay_path = artifacts_dir / "delay_model.pkl"
    features_path = artifacts_dir / "feature_columns.json"
    metrics_path = artifacts_dir / "model_run_metrics.json"

    missing = [
        p.name for p in [cost_path, delay_path, features_path]
        if not p.exists()
    ]
    if missing:
        logger.warning(
            "⚠️  PRAGATI-AI: ML artifacts not found: %s  "
            "→ Backend starting in 'no model loaded' state. "
            "Drop trained artifacts into ml/artifacts/ and restart.",
            missing,
        )
        MODEL_LOADED = False
        return

    try:
        import joblib
        _cost_model = joblib.load(cost_path)
        _delay_model = joblib.load(delay_path)

        with open(features_path) as f:
            _feature_columns = json.load(f)

        # Read model_version from metrics if available
        if metrics_path.exists():
            with open(metrics_path) as f:
                metrics = json.load(f)
            MODEL_VERSION = metrics.get("model_version")

        MODEL_LOADED = True
        logger.info(
            "✅  PRAGATI-AI: ML models loaded successfully. "
            "Version: %s  Features: %d",
            MODEL_VERSION,
            len(_feature_columns),
        )
    except Exception as exc:
        logger.error("❌  Failed to load ML models: %s", exc, exc_info=True)
        MODEL_LOADED = False


def get_model_status() -> dict:
    """Returns current model load state for data-provenance / model-performance endpoints."""
    return {
        "model_loaded": MODEL_LOADED,
        "model_version": MODEL_VERSION,
        "feature_count": len(_feature_columns),
    }


def build_feature_vector(feature_dict: dict) -> np.ndarray:
    """
    Build a 2D numpy array in exactly the column order from feature_columns.json.
    Missing features default to 0.0 — matches the ML guide's fillna(0) convention.
    Mismatched order would silently break XGBoost predictions, so this file is
    the contract (Section 29).
    """
    row = [float(feature_dict.get(col, 0.0)) for col in _feature_columns]
    return np.array([row], dtype=np.float32)


def score_project(feature_dict: dict) -> dict:
    """
    Run cost-risk and delay-risk models, return combined scores.

    Returns:
        {
          "cost_risk": float,
          "delay_risk": float,
          "overall_risk": float,
          "model_mode": "ml" | "baseline",
          "model_version": str | None,
        }
    """
    if MODEL_LOADED and _cost_model is not None and _delay_model is not None:
        X = build_feature_vector(feature_dict)
        cost_risk = float(_cost_model.predict_proba(X)[0, 1])
        delay_risk = float(_delay_model.predict_proba(X)[0, 1])
        model_mode = "ml"
    else:
        # Statistical baseline fallback: expenditure_ratio > 0.6 → elevated risk
        exp_ratio = float(feature_dict.get("expenditure_ratio", 0.0))
        cost_risk = 0.65 if exp_ratio > 0.6 else 0.25
        delay_risk = 0.60 if exp_ratio > 0.6 else 0.20
        model_mode = "baseline"

    overall_risk = round(0.5 * cost_risk + 0.5 * delay_risk, 4)
    cost_risk = round(cost_risk, 4)
    delay_risk = round(delay_risk, 4)

    return {
        "cost_risk": cost_risk,
        "delay_risk": delay_risk,
        "overall_risk": overall_risk,
        "model_mode": model_mode,
        "model_version": MODEL_VERSION,
    }


def get_shap_drivers(feature_dict: dict, top_n: int = 5) -> list[dict]:
    """
    Compute SHAP top-N drivers for one project.
    Called at ingestion time (batch), not per page-load (Section 12 / Q4).

    Returns list of driver dicts:
        [{"feature": str, "label": str, "impact": float, "direction": str, "rank": int}]

    Falls back to empty list if model not loaded.
    """
    if not MODEL_LOADED or _cost_model is None:
        return []

    try:
        import shap

        X = build_feature_vector(feature_dict)
        explainer = shap.TreeExplainer(_cost_model)
        shap_values = explainer.shap_values(X)[0]  # shape: (n_features,)

        order = np.argsort(-np.abs(shap_values))[:top_n]
        drivers = []
        for rank, idx in enumerate(order, start=1):
            raw_feature = _feature_columns[idx]
            impact_val = float(shap_values[idx])
            drivers.append({
                "feature": raw_feature,
                "label": _humanise_feature(raw_feature),
                "impact": round(abs(impact_val), 4),
                "direction": "increases_risk" if impact_val > 0 else "decreases_risk",
                "rank": rank,
            })
        return drivers
    except Exception as exc:
        logger.warning("SHAP extraction failed: %s", exc)
        return []


# ── Human-readable feature label map ─────────────────────────────────────────
_FEATURE_LABELS = {
    "expenditure_ratio": "Expenditure ahead of physical progress",
    "cost_growth_ratio": "Revised cost vs original budget",
    "expenditure_ratio_prev": "Expenditure ratio (previous month)",
    "expenditure_ratio_trend": "Month-on-month expenditure trend",
    "months_since_start": "Months since project start",
    "data_quality_flag": "Incomplete data fields",
}


def _humanise_feature(raw: str) -> str:
    """Return a human-readable label for a feature name; fall back to title-cased raw."""
    if raw in _FEATURE_LABELS:
        return _FEATURE_LABELS[raw]
    # Handle one-hot encoded features like sector_Roads, ministry_MoRTH
    if raw.startswith("sector_"):
        return f"Sector: {raw.replace('sector_', '').replace('_', ' ').title()}"
    if raw.startswith("ministry_"):
        return f"Ministry: {raw.replace('ministry_', '').replace('_', ' ').upper()}"
    return raw.replace("_", " ").title()

"""
app/routers/model_performance.py
─────────────────────────────────
GET /model-performance
Returns model_run_metrics.json verbatim plus live model status and top feature importance.
If the file doesn't exist yet, returns a clear "no model" state with guidance.
"""

import json
from pathlib import Path

from fastapi import APIRouter, Depends

from app.config import settings
from app.deps import require_role
from app.models.ingestion_log import User
from app.services.prediction import get_model_status, get_top_drivers

router = APIRouter(tags=["model-performance"])


@router.get("/model-performance")
def model_performance(
    user: User = Depends(require_role("officer", "senior_official", "admin")),
):
    """
    Returns:
        - All fields from model_run_metrics.json (val/test metrics, model name, etc.)
        - Live model load status from prediction service
        - Top-5 feature importance drivers (CatBoost native, from loaded model)
    """
    metrics_path = Path(settings.ML_ARTIFACTS_DIR) / "model_run_metrics.json"
    status = get_model_status()
    top_drivers = get_top_drivers(top_n=5)

    if not metrics_path.exists():
        return {
            **status,
            "feature_importance": top_drivers,
            "note": (
                "No model_run_metrics.json found in ml/artifacts/. "
                "Train the CatBoost model in Google Colab and drop all three artifacts "
                "(model_3_schedule_delay.cbm, model_3_schedule_config.pkl, model_run_metrics.json) "
                "into ml/artifacts/, then restart the backend."
            ),
        }

    with open(metrics_path) as f:
        metrics = json.load(f)

    return {**metrics, **status, "feature_importance": top_drivers}

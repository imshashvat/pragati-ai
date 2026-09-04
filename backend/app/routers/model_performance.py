"""
app/routers/model_performance.py
─────────────────────────────────
GET /model-performance
Returns model_run_metrics.json verbatim (Section 29 rule 5).
If the file doesn't exist yet, returns a clear "no model" state.
"""

import json
from pathlib import Path

from fastapi import APIRouter, Depends

from app.config import settings
from app.deps import require_role
from app.models.ingestion_log import User
from app.services.prediction import get_model_status

router = APIRouter(tags=["model-performance"])


@router.get("/model-performance")
def model_performance(
    user: User = Depends(require_role("officer", "senior_official", "admin")),
):
    """
    Reads and returns model_run_metrics.json from ml/artifacts/ verbatim.
    Augments with current model load status.
    """
    metrics_path = Path(settings.ML_ARTIFACTS_DIR) / "model_run_metrics.json"
    status = get_model_status()

    if not metrics_path.exists():
        return {
            **status,
            "note": (
                "No model_run_metrics.json found in ml/artifacts/. "
                "Train models in Colab and drop all four artifacts there, "
                "then restart the backend."
            ),
        }

    with open(metrics_path) as f:
        metrics = json.load(f)

    return {**metrics, **status}

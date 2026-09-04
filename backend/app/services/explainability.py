"""
app/services/explainability.py
────────────────────────────────
Thin wrapper that retrieves stored SHAP drivers from the DB
for a given prediction_id.  SHAP itself is computed at ingestion time
(services/prediction.py::get_shap_drivers), not here, per Section 12.
"""

from sqlalchemy.orm import Session

from app.models.prediction import Prediction, RiskDriver


def get_drivers_for_project(db: Session, project_id: str) -> dict:
    """
    Return the top drivers attached to the most recent prediction
    for the given project_id.

    Returns the API contract shape for GET /projects/{id}/drivers.
    """
    latest_pred = (
        db.query(Prediction)
        .filter(Prediction.project_id == project_id)
        .order_by(Prediction.created_at.desc())
        .first()
    )

    if not latest_pred:
        return {"project_id": project_id, "drivers": []}

    drivers = (
        db.query(RiskDriver)
        .filter(RiskDriver.prediction_id == latest_pred.id)
        .order_by(RiskDriver.rank)
        .all()
    )

    return {
        "project_id": project_id,
        "drivers": [
            {
                "feature": d.feature,
                "label": d.label,
                "impact": d.impact,
                "direction": d.direction,
                "rank": d.rank,
            }
            for d in drivers
        ],
    }

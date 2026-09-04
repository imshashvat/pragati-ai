"""
app/routers/data_provenance.py
───────────────────────────────
GET /data-provenance
Returns data freshness, source label ("live" | "demo"), and quality flags.
The top-bar badge on every screen reads from this endpoint.
"""

import json
from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_role
from app.models.ingestion_log import IngestionLog, User
from app.models.prediction import Prediction
from app.models.snapshot import ProjectSnapshot
from app.services.prediction import get_model_status

router = APIRouter(tags=["data-provenance"])


@router.get("/data-provenance")
def data_provenance(
    user: User = Depends(require_role("officer", "senior_official", "admin")),
    db: Session = Depends(get_db),
):
    """
    Returns:
        last_sync      — timestamp of most recent successful ingestion
        source         — "demo" if all predictions are model_mode="demo",
                         "live" if any real ML prediction exists
        data_quality_flags — projects with data_quality_flag > 0
        model_loaded   — from prediction service
        model_version  — from prediction service
    """
    # Last successful ingestion
    last_ingest = (
        db.query(IngestionLog)
        .filter(IngestionLog.status == "success")
        .order_by(IngestionLog.timestamp.desc())
        .first()
    )

    # Determine source label
    ml_prediction_count = (
        db.query(Prediction).filter(Prediction.model_mode == "ml").count()
    )
    source = "live" if ml_prediction_count > 0 else "demo"

    # Data quality flags (projects with any incomplete snapshot)
    quality_flags = []
    bad_snaps = (
        db.query(ProjectSnapshot)
        .filter(ProjectSnapshot.data_quality_flag > 0)
        .order_by(ProjectSnapshot.data_quality_flag.desc())
        .limit(50)
        .all()
    )
    for s in bad_snaps:
        quality_flags.append({
            "project_id": s.project_id,
            "report_month": s.report_month,
            "flag_type": "incomplete_fields",
            "detail": f"{s.data_quality_flag} field(s) missing",
        })

    model_status = get_model_status()

    return {
        "last_sync": last_ingest.timestamp.isoformat() if last_ingest else None,
        "source": source,
        "data_quality_flags": quality_flags,
        **model_status,
    }

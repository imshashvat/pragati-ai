"""
app/routers/alerts.py
──────────────────────
GET  /alerts                   — list/filter alerts (Officer + Senior Official)
POST /alerts/{alert_id}/review — Officer acts on an alert (Officer only)

Valid action → next status transitions (Section 9 state machine):
    acknowledge   → acknowledged
    investigate   → investigating
    resolve       → resolved
    false_positive→ false_positive
    escalate      → escalated
"""

import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_role
from app.models.alert import Alert, ReviewNote
from app.models.ingestion_log import User
from app.models.project import Project

router = APIRouter(tags=["alerts"])

# Allowed action → resulting status
_ACTION_STATUS_MAP = {
    "acknowledge": "acknowledged",
    "investigate": "investigating",
    "resolve": "resolved",
    "false_positive": "false_positive",
    "escalate": "escalated",
}


class ReviewRequest(BaseModel):
    action: str  # acknowledge | investigate | resolve | false_positive | escalate
    note: Optional[str] = None


@router.get("/alerts")
def list_alerts(
    status_filter: Optional[str] = Query(None, alias="status"),
    severity: Optional[str] = Query(None),
    sector: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    user: User = Depends(require_role("officer", "senior_official", "admin")),
    db: Session = Depends(get_db),
):
    q = db.query(Alert).join(Project, Alert.project_id == Project.project_id)

    if status_filter:
        q = q.filter(Alert.status == status_filter)
    if severity:
        q = q.filter(Alert.severity == severity)
    if sector:
        q = q.filter(Project.sector == sector)

    q = q.order_by(Alert.created_at.desc())
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "alert_id": a.alert_id,
                "project_id": a.project_id,
                "project_name": a.project.name if a.project else None,
                "severity": a.severity,
                "status": a.status,
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "updated_at": a.updated_at.isoformat() if a.updated_at else None,
            }
            for a in items
        ],
    }


@router.post("/alerts/{alert_id}/review")
def review_alert(
    alert_id: str,
    body: ReviewRequest,
    user: User = Depends(require_role("officer")),  # Senior Official cannot act
    db: Session = Depends(get_db),
):
    if body.action not in _ACTION_STATUS_MAP:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid action '{body.action}'. "
                   f"Allowed: {list(_ACTION_STATUS_MAP.keys())}",
        )

    alert = db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    new_status = _ACTION_STATUS_MAP[body.action]
    alert.status = new_status
    alert.updated_at = datetime.utcnow()

    note = ReviewNote(
        alert_id=alert_id,
        officer_id=user.user_id,
        action=body.action,
        note=body.note,
    )
    db.add(note)
    db.commit()
    db.refresh(alert)

    return {
        "alert_id": alert.alert_id,
        "status": alert.status,
        "updated_at": alert.updated_at.isoformat(),
    }

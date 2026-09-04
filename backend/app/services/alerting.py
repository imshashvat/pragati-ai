"""
app/services/alerting.py
─────────────────────────
Creates Alert records when risk crosses the threshold.

Deduplication rule (Section 3 / Section 8 edge cases):
    Never create a new alert for a project that already has an open alert
    (status in: created, acknowledged, investigating, escalated).
    An open alert is reused; a closed/resolved/false_positive alert allows
    a new one.
"""

import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.services.risk_scoring import risk_to_severity

_OPEN_STATUSES = {"created", "acknowledged", "investigating", "escalated"}


def get_or_create_alert(
    db: Session,
    project_id: str,
    overall_risk: float,
    prediction_id: int | None = None,
) -> tuple[Alert, bool]:
    """
    Returns (alert, created:bool).
    If an open alert already exists for the project, returns it unchanged.
    Otherwise creates a new one with severity derived from overall_risk.
    """
    existing = (
        db.query(Alert)
        .filter(
            Alert.project_id == project_id,
            Alert.status.in_(_OPEN_STATUSES),
        )
        .first()
    )
    if existing:
        return existing, False

    severity = risk_to_severity(overall_risk)
    alert = Alert(
        alert_id=str(uuid.uuid4()),
        project_id=project_id,
        severity=severity,
        status="created",
        prediction_id=prediction_id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(alert)
    db.flush()  # get alert_id without committing the outer transaction
    return alert, True


def transition_alert(
    db: Session,
    alert: Alert,
    new_status: str,
) -> Alert:
    """Apply a state transition; no validation here — router layer validates allowed actions."""
    alert.status = new_status
    alert.updated_at = datetime.utcnow()
    db.add(alert)
    return alert

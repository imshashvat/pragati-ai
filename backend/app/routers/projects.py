"""
app/routers/projects.py
────────────────────────
GET /projects          — ranked list (default: needs action)
GET /projects/{id}     — full risk view + trend
GET /projects/{id}/drivers — SHAP driver list
"""

import math
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_role
from app.models.alert import Alert
from app.models.ingestion_log import User
from app.models.prediction import Prediction
from app.models.project import Project
from app.models.snapshot import ProjectSnapshot
from app.services.explainability import get_drivers_for_project
from app.services.risk_scoring import compute_priority_score

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("")
def list_projects(
    status: Optional[str] = Query(None, description="Filter by alert status"),
    sector: Optional[str] = Query(None),
    ministry: Optional[str] = Query(None),
    min_risk: Optional[float] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    user: User = Depends(require_role("officer", "senior_official", "admin")),
    db: Session = Depends(get_db),
):
    """
    Returns projects enriched with latest prediction + alert data,
    ranked by computed priority score (highest first).
    Default: returns all projects that have any open alert.
    """
    q = db.query(Project)

    if sector:
        q = q.filter(Project.sector == sector)
    if ministry:
        q = q.filter(Project.ministry == ministry)

    projects = q.all()
    results = []

    for proj in projects:
        # Latest prediction
        pred = (
            db.query(Prediction)
            .filter(Prediction.project_id == proj.project_id)
            .order_by(Prediction.created_at.desc())
            .first()
        )
        if not pred:
            continue

        if min_risk is not None and pred.overall_risk < min_risk:
            continue

        # Latest open alert
        alert = (
            db.query(Alert)
            .filter(Alert.project_id == proj.project_id)
            .order_by(Alert.created_at.desc())
            .first()
        )
        alert_status = alert.status if alert else None
        alert_id = alert.alert_id if alert else None

        # Status filter — "needs_action" maps to open statuses
        if status == "needs_action":
            if alert_status not in {"created", "acknowledged", "investigating"}:
                continue
        elif status and alert_status != status:
            continue

        priority = compute_priority_score(
            pred.overall_risk,
            proj.original_cost or 0,
            urgency_factor=_urgency(alert_status),
        )

        results.append({
            "project_id": proj.project_id,
            "name": proj.name,
            "sector": proj.sector,
            "ministry": proj.ministry,
            "overall_risk": pred.overall_risk,
            "cost_risk": pred.cost_risk,
            "delay_risk": pred.delay_risk,
            "alert_status": alert_status,
            "alert_id": alert_id,
            "model_mode": pred.model_mode,
            "priority_score": priority,
        })

    # Sort by priority descending
    results.sort(key=lambda x: x["priority_score"], reverse=True)

    # Pagination
    start = (page - 1) * page_size
    return {
        "total": len(results),
        "page": page,
        "page_size": page_size,
        "items": results[start : start + page_size],
    }


@router.get("/{project_id}")
def get_project_detail(
    project_id: str,
    user: User = Depends(require_role("officer", "senior_official", "admin")),
    db: Session = Depends(get_db),
):
    """Full risk view + monthly trend for one project."""
    proj = db.get(Project, project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    pred = (
        db.query(Prediction)
        .filter(Prediction.project_id == project_id)
        .order_by(Prediction.created_at.desc())
        .first()
    )

    # Monthly trend — all snapshots in chronological order
    snaps = (
        db.query(ProjectSnapshot)
        .filter(ProjectSnapshot.project_id == project_id)
        .order_by(ProjectSnapshot.report_month)
        .all()
    )
    trend = []
    for s in snaps:
        orig = s.original_cost or 1.0
        trend.append({
            "month": s.report_month,
            "expenditure_ratio": round((s.expenditure or 0) / orig, 4),
            "cost_growth_ratio": round((s.revised_cost or orig) / orig, 4),
            "expenditure": s.expenditure,
            "revised_cost": s.revised_cost,
        })

    return {
        "project_id": proj.project_id,
        "name": proj.name,
        "sector": proj.sector,
        "ministry": proj.ministry,
        "original_cost": proj.original_cost,
        "cost_risk": pred.cost_risk if pred else None,
        "delay_risk": pred.delay_risk if pred else None,
        "overall_risk": pred.overall_risk if pred else None,
        "model_mode": pred.model_mode if pred else None,
        "model_version": pred.model_version if pred else None,
        "trend": trend,
        "data_quality_flag": snaps[-1].data_quality_flag if snaps else 0,
    }


@router.get("/{project_id}/drivers")
def get_project_drivers(
    project_id: str,
    user: User = Depends(require_role("officer", "senior_official", "admin")),
    db: Session = Depends(get_db),
):
    """SHAP top drivers for the most recent prediction of this project."""
    proj = db.get(Project, project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return get_drivers_for_project(db, project_id)


def _urgency(alert_status: Optional[str]) -> float:
    if alert_status in ("escalated",):
        return 1.5
    if alert_status in ("created", "acknowledged", "investigating"):
        return 1.2
    return 1.0

"""
app/routers/projects.py
────────────────────────
GET /projects          — ranked list (default: needs action)
GET /projects/{id}     — full risk view + trend
GET /projects/{id}/drivers — SHAP driver list
"""

import math
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_role
from app.models.alert import Alert
from app.models.ingestion_log import User
from app.models.prediction import Prediction, RiskDriver
from app.models.project import Project
from app.models.snapshot import ProjectSnapshot
from app.services.explainability import get_drivers_for_project
from app.services.llm_assistant import explain_project
from app.services.risk_scoring import compute_priority_score


class AssistantRequest(BaseModel):
    question: Optional[str] = None

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
    Uses subqueries for latest prediction and alert — single round-trip.
    """
    # Subquery: latest prediction_id per project
    latest_pred_sq = (
        db.query(
            Prediction.project_id,
            func.max(Prediction.created_at).label("max_created"),
        )
        .group_by(Prediction.project_id)
        .subquery()
    )

    # Subquery: latest alert created_at per project
    latest_alert_sq = (
        db.query(
            Alert.project_id,
            func.max(Alert.created_at).label("max_created"),
        )
        .group_by(Alert.project_id)
        .subquery()
    )

    # Fetch all projects with optional sector/ministry filter
    proj_q = db.query(Project)
    if sector:
        proj_q = proj_q.filter(Project.sector == sector)
    if ministry:
        proj_q = proj_q.filter(Project.ministry == ministry)
    projects = {p.project_id: p for p in proj_q.all()}

    if not projects:
        return {"total": 0, "page": page, "page_size": page_size, "items": []}

    # Fetch latest predictions for all matching projects in ONE query
    preds = (
        db.query(Prediction)
        .join(
            latest_pred_sq,
            (Prediction.project_id == latest_pred_sq.c.project_id)
            & (Prediction.created_at == latest_pred_sq.c.max_created),
        )
        .filter(Prediction.project_id.in_(projects.keys()))
        .all()
    )
    pred_map = {p.project_id: p for p in preds}

    # Fetch latest alerts for all matching projects in ONE query
    alerts = (
        db.query(Alert)
        .join(
            latest_alert_sq,
            (Alert.project_id == latest_alert_sq.c.project_id)
            & (Alert.created_at == latest_alert_sq.c.max_created),
        )
        .filter(Alert.project_id.in_(projects.keys()))
        .all()
    )
    alert_map = {a.project_id: a for a in alerts}

    results = []
    for proj_id, proj in projects.items():
        pred = pred_map.get(proj_id)
        if not pred:
            continue
        if min_risk is not None and pred.overall_risk < min_risk:
            continue

        alert = alert_map.get(proj_id)
        alert_status = alert.status if alert else None
        alert_id = alert.alert_id if alert else None

        # Status filter
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


@router.get("/recommendations")
def get_recommendations(
    sector: Optional[str] = Query(None),
    ministry: Optional[str] = Query(None),
    sort_by: str = Query("overall_risk", description="Field to sort by"),
    sort_dir: str = Query("asc", regex="^(asc|desc)$"),
    user: User = Depends(require_role("officer", "senior_official", "admin")),
    db: Session = Depends(get_db),
):
    """
    Returns all projects ranked for continuation suitability (all roles).

    continuation_suitability = round((1 - overall_risk) * 100, 1)
    This is a deliberately simple, transparent inverse-of-risk score —
    not a separate model — so it can be defended in a live demo.
    """
    # Subquery: latest prediction per project
    latest_pred_sq = (
        db.query(
            Prediction.project_id,
            func.max(Prediction.created_at).label("max_created"),
        )
        .group_by(Prediction.project_id)
        .subquery()
    )

    # Fetch projects with optional filters
    proj_q = db.query(Project)
    if sector:
        proj_q = proj_q.filter(Project.sector == sector)
    if ministry:
        proj_q = proj_q.filter(Project.ministry == ministry)
    projects = {p.project_id: p for p in proj_q.all()}

    if not projects:
        return []

    # Fetch latest prediction for every project in ONE query
    preds = (
        db.query(Prediction)
        .join(
            latest_pred_sq,
            (Prediction.project_id == latest_pred_sq.c.project_id)
            & (Prediction.created_at == latest_pred_sq.c.max_created),
        )
        .filter(Prediction.project_id.in_(projects.keys()))
        .all()
    )
    pred_map = {p.project_id: p for p in preds}

    # Fetch rank-1 driver for each prediction in ONE query
    pred_ids = [p.id for p in preds]
    top_drivers = (
        db.query(RiskDriver)
        .filter(RiskDriver.prediction_id.in_(pred_ids), RiskDriver.rank == 1)
        .all()
    )
    driver_map = {d.prediction_id: d for d in top_drivers}

    # Build result list
    results = []
    for proj_id, proj in projects.items():
        pred = pred_map.get(proj_id)
        if not pred:
            continue

        # continuation_suitability: simple transparent inverse-of-risk score
        continuation_suitability = round((1 - pred.overall_risk) * 100, 1)

        # ── Contextual insight — each project gets a unique reason ────────────
        # Rules are evaluated in priority order; first match wins.
        cr = pred.cost_risk      # 0–1
        dr = pred.delay_risk     # 0–1
        or_ = pred.overall_risk  # 0–1
        suit = continuation_suitability  # 0–100
        top_drv = driver_map.get(pred.id)
        drv_label = top_drv.label if top_drv else None

        if suit >= 75:
            top_reason = (
                "Excellent execution profile — low risk across all dimensions; "
                "strong candidate for continued government funding."
            )
        elif suit >= 60:
            if cr < 0.35 and dr < 0.35:
                top_reason = (
                    "Well-managed project: both cost and schedule adherence are solid. "
                    "Minor monitoring recommended."
                )
            elif cr < dr - 0.15:
                top_reason = (
                    f"Cost discipline is good (Cost Risk {round(cr*100)}%). "
                    f"Some schedule slippage detected — timeline recovery plan advised."
                )
            elif dr < cr - 0.15:
                top_reason = (
                    f"Schedule adherence is commendable (Delay Risk {round(dr*100)}%). "
                    f"Budget utilisation trending above plan — cost review recommended."
                )
            else:
                top_reason = (
                    "Balanced risk profile at an acceptable level. "
                    "Eligible for continuation with standard quarterly review."
                )
        elif suit >= 40:
            if cr > dr + 0.20:
                top_reason = (
                    f"Primary concern: cost overrun (Cost Risk {round(cr*100)}%). "
                    "Physical progress appears on track. Revised cost estimate warranted."
                )
            elif dr > cr + 0.20:
                top_reason = (
                    f"Primary concern: schedule slippage (Delay Risk {round(dr*100)}%). "
                    "Budget absorption is adequate. Milestone recovery plan required."
                )
            elif drv_label:
                top_reason = f"Moderate risk — key driver: {drv_label}. Targeted corrective action needed."
            else:
                top_reason = (
                    f"Moderate overall risk ({round(or_*100)}%). "
                    "Both cost and schedule metrics need improvement before next review."
                )
        else:
            # High risk — suit < 40
            if cr > 0.80 and dr > 0.80:
                top_reason = (
                    f"Critical dual risk: Cost {round(cr*100)}% · Delay {round(dr*100)}%. "
                    "Immediate corrective action and ministerial review recommended."
                )
            elif cr > dr + 0.15:
                top_reason = (
                    f"Cost overrun is the dominant risk ({round(cr*100)}%). "
                    "Physical progress may not justify expenditure — audit advised."
                )
            elif dr > cr + 0.15:
                top_reason = (
                    f"Severe schedule delay ({round(dr*100)}%) is the primary concern. "
                    "Milestone targets missed — implementing agency escalation needed."
                )
            elif drv_label:
                top_reason = f"High risk — leading driver: {drv_label}. Escalation recommended."
            else:
                top_reason = (
                    f"High overall risk ({round(or_*100)}%). "
                    "Comprehensive project review before further disbursement advised."
                )

        results.append({
            "project_id": proj.project_id,
            "name": proj.name,
            "sector": proj.sector,
            "ministry": proj.ministry,
            "overall_risk": pred.overall_risk,
            "cost_risk": pred.cost_risk,
            "delay_risk": pred.delay_risk,
            "original_cost": proj.original_cost,
            "model_mode": pred.model_mode,
            "continuation_suitability": continuation_suitability,
            "top_reason": top_reason,
        })

    SORTABLE = {
        "overall_risk", "cost_risk", "delay_risk",
        "continuation_suitability", "name", "sector", "ministry", "original_cost",
    }
    key = sort_by if sort_by in SORTABLE else "overall_risk"
    results.sort(
        key=lambda x: (x[key] is None, x[key] or 0),
        reverse=(sort_dir == "desc"),
    )
    return results


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


@router.post("/{project_id}/assistant")
def ask_assistant(
    project_id: str,
    body: AssistantRequest,
    user: User = Depends(require_role("officer", "senior_official", "admin")),
    db: Session = Depends(get_db),
):
    """
    POST /projects/{project_id}/assistant
    Body: { "question": string | null }
    Returns: { "answer": string }

    Calls the LLM assistant to narrate pre-computed risk data.
    Never generates its own risk score. Falls back gracefully if LLM unavailable.
    """
    proj = db.get(Project, project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    # Fetch latest prediction
    pred = (
        db.query(Prediction)
        .filter(Prediction.project_id == project_id)
        .order_by(Prediction.created_at.desc())
        .first()
    )

    # Fetch SHAP drivers
    drivers_raw = get_drivers_for_project(db, project_id)
    drivers = drivers_raw.get("drivers", []) if isinstance(drivers_raw, dict) else []

    # Fetch trend (last 6 snapshots)
    snaps = (
        db.query(ProjectSnapshot)
        .filter(ProjectSnapshot.project_id == project_id)
        .order_by(ProjectSnapshot.report_month.desc())
        .limit(6)
        .all()
    )
    trend = [
        {"month": str(s.report_month), "cost_growth": s.revised_cost, "expenditure": s.expenditure}
        for s in reversed(snaps)
    ]

    # Build project_data dict — only pre-computed values, no invented numbers
    project_data = {
        "project_id": proj.project_id,
        "name": proj.name,
        "sector": proj.sector,
        "ministry": proj.ministry,
        "original_cost_cr": proj.original_cost,
        "overall_risk": round(pred.overall_risk * 100, 1) if pred else None,
        "cost_risk": round(pred.cost_risk * 100, 1) if pred else None,
        "delay_risk": round(pred.delay_risk * 100, 1) if pred else None,
        "model_mode": pred.model_mode if pred else None,
        "top_shap_drivers": [
            {
                "rank": d.get("rank"),
                "label": d.get("label"),
                "impact_pts": d.get("impact_pts"),
                "direction": d.get("direction"),
            }
            for d in drivers[:5]
        ],
        "trend_last_6_periods": trend,
    }

    answer = explain_project(project_data, body.question)
    return {"answer": answer}


def _urgency(alert_status: Optional[str]) -> float:
    if alert_status in ("escalated",):
        return 1.5
    if alert_status in ("created", "acknowledged", "investigating"):
        return 1.2
    return 1.0

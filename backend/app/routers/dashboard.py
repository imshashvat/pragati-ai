"""
app/routers/dashboard.py
─────────────────────────
GET /dashboard/portfolio — national/sector aggregates for Senior Official dashboard
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_role
from app.models.ingestion_log import User
from app.models.prediction import Prediction
from app.models.project import Project

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/portfolio")
def portfolio_dashboard(
    sector: Optional[str] = Query(None),
    ministry: Optional[str] = Query(None),
    user: User = Depends(require_role("officer", "senior_official", "admin")),
    db: Session = Depends(get_db),
):
    """
    Returns portfolio-wide risk aggregates:
    total projects, high-risk count, cost-risk count, delay-risk count,
    breakdown by sector and by ministry.
    Only counts projects that have at least one prediction.
    """
    q = (
        db.query(Project, Prediction)
        .join(Prediction, Prediction.project_id == Project.project_id)
        # Latest prediction per project via a correlated approach
        .filter(
            Prediction.created_at == db.query(func.max(Prediction.created_at))
            .filter(Prediction.project_id == Project.project_id)
            .correlate(Project)
            .scalar_subquery()
        )
    )

    if sector:
        q = q.filter(Project.sector == sector)
    if ministry:
        q = q.filter(Project.ministry == ministry)

    rows = q.all()

    total = len(rows)
    high_risk = sum(1 for _, p in rows if p.overall_risk >= 0.65)
    cost_risk_count = sum(1 for _, p in rows if p.cost_risk >= 0.50)
    delay_risk_count = sum(1 for _, p in rows if p.delay_risk >= 0.50)

    # By sector
    sector_map: dict[str, dict] = {}
    for proj, pred in rows:
        s = proj.sector or "Unknown"
        if s not in sector_map:
            sector_map[s] = {"sector": s, "project_count": 0, "high_risk_count": 0, "risk_sum": 0.0}
        sector_map[s]["project_count"] += 1
        sector_map[s]["risk_sum"] += pred.overall_risk
        if pred.overall_risk >= 0.65:
            sector_map[s]["high_risk_count"] += 1

    by_sector = []
    for s, v in sector_map.items():
        by_sector.append({
            "sector": s,
            "project_count": v["project_count"],
            "high_risk_count": v["high_risk_count"],
            "avg_risk": round(v["risk_sum"] / max(v["project_count"], 1), 4),
        })
    by_sector.sort(key=lambda x: x["avg_risk"], reverse=True)

    # By ministry
    ministry_map: dict[str, dict] = {}
    for proj, pred in rows:
        m = proj.ministry or "Unknown"
        if m not in ministry_map:
            ministry_map[m] = {"ministry": m, "project_count": 0, "high_risk_count": 0, "risk_sum": 0.0}
        ministry_map[m]["project_count"] += 1
        ministry_map[m]["risk_sum"] += pred.overall_risk
        if pred.overall_risk >= 0.65:
            ministry_map[m]["high_risk_count"] += 1

    by_ministry = []
    for m, v in ministry_map.items():
        by_ministry.append({
            "ministry": m,
            "project_count": v["project_count"],
            "high_risk_count": v["high_risk_count"],
            "avg_risk": round(v["risk_sum"] / max(v["project_count"], 1), 4),
        })
    by_ministry.sort(key=lambda x: x["avg_risk"], reverse=True)

    return {
        "total_projects": total,
        "high_risk_count": high_risk,
        "cost_risk_count": cost_risk_count,
        "delay_risk_count": delay_risk_count,
        "by_sector": by_sector,
        "by_ministry": by_ministry,
    }

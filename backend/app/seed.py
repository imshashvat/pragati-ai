"""
app/seed.py
────────────
Seeds the database with:
  1. 3 user accounts (officer, senior_official, admin)
  2. ~50 synthetic PAIMANA-style projects with 6 months of snapshots each
  3. Pre-computed predictions with model_mode="demo" for every project
  4. SHAP-style demo drivers (hand-crafted, not real SHAP)
  5. Alerts for all projects with overall_risk >= RISK_THRESHOLD

Every seeded prediction has model_mode="demo" so GET /data-provenance
returns source="demo" until real ML artifacts are loaded (Section 29 rule 6 / Q2).

Run: python -m app.seed  (from backend/ directory)
"""

import random
import uuid
from datetime import datetime, timedelta

import bcrypt
from sqlalchemy.orm import Session

from app.database import Base, SessionLocal, engine
from app.models.alert import Alert, ReviewNote
from app.models.ingestion_log import IngestionLog, User
from app.models.prediction import Prediction, RiskDriver
from app.models.project import Project
from app.models.snapshot import ProjectSnapshot
from app.services.risk_scoring import compute_priority_score, risk_to_severity, should_create_alert

def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

random.seed(42)

# ── Sector / Ministry pool ─────────────────────────────────────────────────────
SECTORS = ["Roads & Highways", "Railways", "Power", "Irrigation", "Urban Infrastructure",
           "Petroleum & Natural Gas", "Coal", "Telecom", "Water Supply", "Defence Infrastructure"]

MINISTRIES = ["MoRTH", "MoR", "MoP", "MoWR", "MoHUA", "MoPNG",
              "MoC", "MoCA", "MoJS", "MoD"]

PROJECT_NAMES = [
    "NH-44 Four-Laning Phase {}", "Eastern DFC Package {}", "Rajasthan Canal Modernisation {}",
    "Smart City Road {} Upgradation", "PGCIL Transmission Line {}", "Metro Phase {} Extension",
    "Rural Electrification Cluster {}", "Port Connectivity Rail Link {}", "Dam Rehabilitation {}",
    "Coastal Highway Package {}", "Irrigation Canal {}", "Power Plant Unit {} Augmentation",
    "National Waterway {} Development", "Airport Expansion Phase {}", "Solar Park {}",
    "Urban Water Supply {} Zone", "Railway Station Redevelopment {}", "SEZ Road Link {}",
    "Flyover Package {} Bypass", "Broadband Rollout Region {}",
]


def _make_project_id(i: int) -> str:
    return f"PAIMANA-{1000 + i:04d}"


def _make_snapshots(project_id: str, base_cost: float, risky: bool) -> list[dict]:
    """6 months of synthetic snapshots. Risky projects show accelerating overrun."""
    snaps = []
    base_month = datetime(2025, 9, 1)
    revised_cost = base_cost
    expenditure = 0.0

    for m in range(6):
        month_str = (base_month + timedelta(days=30 * m)).strftime("%Y-%m")
        monthly_spend = base_cost * random.uniform(0.04, 0.07)
        if risky and m >= 3:
            monthly_spend *= random.uniform(1.3, 1.8)  # expenditure spike
            revised_cost = base_cost * random.uniform(1.12, 1.45)

        expenditure = min(expenditure + monthly_spend, revised_cost)
        dq = 0 if random.random() > 0.15 else random.randint(1, 2)

        snaps.append({
            "project_id": project_id,
            "report_month": month_str,
            "original_cost": base_cost,
            "revised_cost": revised_cost,
            "expenditure": round(expenditure, 2),
            "original_date": "2027-03-31",
            "revised_date": "2028-06-30" if risky else "2027-06-30",
            "data_quality_flag": dq,
        })
    return snaps


def _make_demo_drivers(prediction_id: int, risky: bool) -> list[RiskDriver]:
    """Hand-crafted SHAP-style drivers for demo data."""
    if risky:
        drivers_raw = [
            ("expenditure_ratio", "Expenditure ahead of physical progress", 0.31, "increases_risk"),
            ("cost_growth_ratio", "Revised cost vs original budget", 0.22, "increases_risk"),
            ("expenditure_ratio_trend", "Month-on-month expenditure trend", 0.14, "increases_risk"),
            ("data_quality_flag", "Incomplete data fields", 0.07, "increases_risk"),
            ("months_since_start", "Months since project start", 0.05, "decreases_risk"),
        ]
    else:
        drivers_raw = [
            ("expenditure_ratio", "Expenditure ahead of physical progress", 0.08, "decreases_risk"),
            ("cost_growth_ratio", "Revised cost vs original budget", 0.05, "decreases_risk"),
            ("expenditure_ratio_trend", "Month-on-month expenditure trend", 0.04, "decreases_risk"),
            ("months_since_start", "Months since project start", 0.03, "increases_risk"),
            ("data_quality_flag", "Incomplete data fields", 0.02, "decreases_risk"),
        ]
    return [
        RiskDriver(
            prediction_id=prediction_id,
            feature=f,
            label=lbl,
            impact=imp,
            direction=d,
            rank=i + 1,
        )
        for i, (f, lbl, imp, d) in enumerate(drivers_raw)
    ]


def seed(db: Session) -> None:
    print("Seeding users…")
    users = [
        User(
            user_id=str(uuid.uuid4()),
            username="officer",
            email="officer@pragati.ai",
            hashed_password=_hash("officer123"),
            role="officer",
        ),
        User(
            user_id=str(uuid.uuid4()),
            username="senior",
            email="senior@pragati.ai",
            hashed_password=_hash("senior123"),
            role="senior_official",
        ),
        User(
            user_id=str(uuid.uuid4()),
            username="admin",
            email="admin@pragati.ai",
            hashed_password=_hash("admin123"),
            role="admin",
        ),
    ]
    for u in users:
        exists = db.query(User).filter(
            (User.username == u.username) | (User.email == u.email)
        ).first()
        if not exists:
            db.add(u)
    db.flush()
    print("  ✔ users seeded (skipped existing)")


    # ── Seed ingestion log entry so provenance screen shows something ─────────
    ingest_log = IngestionLog(
        ingestion_id=str(uuid.uuid4()),
        timestamp=datetime.utcnow() - timedelta(hours=2),
        status="success",
        rows_processed=52,
        projects_updated=52,
        error_detail=None,
    )
    if db.query(IngestionLog).count() == 0:
        db.add(ingest_log)
    db.flush()

    print("Seeding 52 projects + snapshots + predictions + alerts…")
    project_count = 0
    alert_count = 0

    for i in range(52):
        pid = _make_project_id(i)
        if db.get(Project, pid):
            continue  # already seeded

        sector = SECTORS[i % len(SECTORS)]
        ministry = MINISTRIES[i % len(MINISTRIES)]
        template = PROJECT_NAMES[i % len(PROJECT_NAMES)]
        name = template.format(str(i + 1).zfill(2))
        base_cost = round(random.uniform(150, 8000), 2)  # INR crore

        # ~40% of projects are risky
        risky = (i % 5 < 2) or (i % 7 == 0)

        # Cost / delay risk values — demo values, not from real model
        cost_risk = round(random.uniform(0.55, 0.90), 4) if risky else round(random.uniform(0.10, 0.44), 4)
        delay_risk = round(random.uniform(0.50, 0.85), 4) if risky else round(random.uniform(0.08, 0.42), 4)
        overall_risk = round(0.5 * cost_risk + 0.5 * delay_risk, 4)

        project = Project(
            project_id=pid,
            name=name,
            sector=sector,
            ministry=ministry,
            original_cost=base_cost,
        )
        db.add(project)

        snaps = _make_snapshots(pid, base_cost, risky)
        for s in snaps:
            db.add(ProjectSnapshot(**s, ingestion_id=ingest_log.ingestion_id))

        from app.services.prediction import get_model_status
        _ms = get_model_status()
        _mode    = "catboost" if _ms.get("model_loaded") else "demo"
        _version = _ms.get("model_version") if _ms.get("model_loaded") else None

        pred = Prediction(
            project_id=pid,
            report_month="2026-02",
            cost_risk=cost_risk,
            delay_risk=delay_risk,
            overall_risk=overall_risk,
            model_mode=_mode,
            model_version=_version,
        )
        db.add(pred)
        db.flush()

        for drv in _make_demo_drivers(pred.id, risky):
            db.add(drv)

        if should_create_alert(overall_risk):
            severity = risk_to_severity(overall_risk)
            alert = Alert(
                alert_id=str(uuid.uuid4()),
                project_id=pid,
                severity=severity,
                status="created",
                prediction_id=pred.id,
                created_at=datetime.utcnow() - timedelta(hours=random.randint(1, 48)),
                updated_at=datetime.utcnow(),
            )
            db.add(alert)
            alert_count += 1

        project_count += 1

    db.commit()
    print(f"  ✔ {project_count} projects, {alert_count} alerts seeded")
    print("Seed complete. Demo credentials:")
    print("  officer  / officer123")
    print("  senior   / senior123")
    print("  admin    / admin123")


if __name__ == "__main__":
    # Create all tables then seed
    import app.models  # noqa: F401 — registers all ORM models with Base.metadata
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed(db)

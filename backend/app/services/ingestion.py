"""
app/services/ingestion.py
──────────────────────────
Accepts a PAIMANA CSV/XLSX upload, validates schema, writes snapshots,
triggers feature engineering + prediction + SHAP, creates alerts.

COLUMN_MAP mirrors the ML guide Step 1 Cell 2 — edit it to match real
PAIMANA column names once you have the actual export.
"""

import io
import json
import logging
import uuid
from datetime import datetime
from typing import Any

import pandas as pd
from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.models.ingestion_log import IngestionLog
from app.models.prediction import Prediction, RiskDriver
from app.models.project import Project
from app.models.snapshot import ProjectSnapshot
from app.services.alerting import get_or_create_alert
from app.services.feature_engineering import engineer_features
from app.services.prediction import get_shap_drivers, score_project
from app.services.risk_scoring import compute_priority_score, should_create_alert

logger = logging.getLogger(__name__)

# Edit this map to match your actual PAIMANA export column names
COLUMN_MAP = {
    "project_id": "Project Code",
    "project_name": "Project Name",
    "sector": "Sector",
    "ministry": "Line Ministry",
    "original_cost": "Original Cost",
    "revised_cost": "Revised Cost",
    "expenditure": "Expenditure",
    "original_date": "Original End Date",
    "revised_date": "Revised End Date",
    "report_month": "Reporting Month",
}

REQUIRED_COLUMNS = {"project_id", "project_name", "original_cost"}


def run_ingestion(db: Session, file_bytes: bytes, filename: str) -> dict:
    """
    Full ingestion pipeline:
    1. Parse CSV/XLSX
    2. Validate schema
    3. Upsert projects + snapshots
    4. For each project: engineer features → score → SHAP → alert if needed
    5. Write IngestionLog row

    Returns a summary dict matching the POST /admin/ingest response schema.
    """
    ingestion_id = str(uuid.uuid4())
    errors: list[str] = []
    rows_processed = 0
    projects_updated = 0

    try:
        df = _parse_file(file_bytes, filename)
    except Exception as exc:
        _write_log(db, ingestion_id, "failed", 0, 0, [str(exc)])
        return {
            "ingestion_id": ingestion_id,
            "status": "failed",
            "rows_processed": 0,
            "projects_updated": 0,
            "errors": [str(exc)],
        }

    # Rename columns using COLUMN_MAP (reverse: display_name → internal_name)
    reverse_map = {v: k for k, v in COLUMN_MAP.items()}
    df = df.rename(columns=reverse_map)

    # Check required columns
    missing_required = REQUIRED_COLUMNS - set(df.columns)
    if missing_required:
        msg = f"Missing required columns after mapping: {missing_required}"
        _write_log(db, ingestion_id, "failed", 0, 0, [msg])
        return {"ingestion_id": ingestion_id, "status": "failed",
                "rows_processed": 0, "projects_updated": 0, "errors": [msg]}

    # Normalise types
    for col in ["original_cost", "revised_cost", "expenditure"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # report_month — default to current month if column absent
    if "report_month" not in df.columns:
        df["report_month"] = datetime.utcnow().strftime("%Y-%m")
    else:
        df["report_month"] = pd.to_datetime(df["report_month"], errors="coerce").dt.strftime("%Y-%m")
        df["report_month"] = df["report_month"].fillna(datetime.utcnow().strftime("%Y-%m"))

    # Drop rows with no project_id
    df = df.dropna(subset=["project_id"])
    df["project_id"] = df["project_id"].astype(str).str.strip()

    # Detect duplicates within the file
    dup_mask = df.duplicated(subset=["project_id", "report_month"], keep="first")
    if dup_mask.any():
        dup_ids = df.loc[dup_mask, "project_id"].tolist()
        errors.append(f"Duplicate project+month rows skipped: {dup_ids[:10]}")
        df = df[~dup_mask]

    rows_processed = len(df)

    for _, row in df.iterrows():
        try:
            _upsert_project_and_snapshot(db, row, ingestion_id)
            projects_updated += 1
        except Exception as exc:
            errors.append(f"Row {row.get('project_id', '?')}: {exc}")
            logger.warning("Ingestion row error: %s", exc)

    db.flush()

    # Now score every project that has a snapshot from this ingestion
    _score_all_ingested(db, ingestion_id)

    status = "success" if not errors else ("partial" if projects_updated > 0 else "failed")
    _write_log(db, ingestion_id, status, rows_processed, projects_updated, errors)
    db.commit()

    return {
        "ingestion_id": ingestion_id,
        "status": status,
        "rows_processed": rows_processed,
        "projects_updated": projects_updated,
        "errors": errors[:20],  # cap for API response size
    }


# ── Private helpers ───────────────────────────────────────────────────────────

def _parse_file(file_bytes: bytes, filename: str) -> pd.DataFrame:
    buf = io.BytesIO(file_bytes)
    if filename.lower().endswith(".xlsx") or filename.lower().endswith(".xls"):
        return pd.read_excel(buf)
    return pd.read_csv(buf)


def _upsert_project_and_snapshot(db: Session, row: Any, ingestion_id: str) -> None:
    pid = str(row["project_id"])

    # Upsert project
    project = db.get(Project, pid)
    if not project:
        project = Project(
            project_id=pid,
            name=str(row.get("project_name", pid)),
            sector=_safe_str(row.get("sector")),
            ministry=_safe_str(row.get("ministry")),
            original_cost=_safe_float(row.get("original_cost")),
        )
        db.add(project)
    else:
        # Update mutable fields if present
        if "project_name" in row and pd.notna(row["project_name"]):
            project.name = str(row["project_name"])
        if "sector" in row:
            project.sector = _safe_str(row.get("sector"))
        if "ministry" in row:
            project.ministry = _safe_str(row.get("ministry"))

    # Upsert snapshot (skip if month already exists)
    month = str(row.get("report_month", ""))
    existing_snap = (
        db.query(ProjectSnapshot)
        .filter_by(project_id=pid, report_month=month)
        .first()
    )
    if existing_snap:
        return  # idempotent: already have this month's snapshot

    dq_flag = sum([
        1 for col in ["revised_cost", "expenditure", "revised_date"]
        if col not in row or pd.isna(row.get(col))
    ])

    snap = ProjectSnapshot(
        project_id=pid,
        report_month=month,
        original_cost=_safe_float(row.get("original_cost")),
        revised_cost=_safe_float(row.get("revised_cost")),
        expenditure=_safe_float(row.get("expenditure")),
        original_date=_safe_str(row.get("original_date")),
        revised_date=_safe_str(row.get("revised_date")),
        data_quality_flag=dq_flag,
        ingestion_id=ingestion_id,
    )
    db.add(snap)


def _score_all_ingested(db: Session, ingestion_id: str) -> None:
    """
    After snapshot writes, score every project updated in this ingestion.
    Computes SHAP immediately (Section 12 / Q4 confirmed).
    """
    # Collect all project_ids touched in this ingestion
    touched_snaps = (
        db.query(ProjectSnapshot.project_id)
        .filter(ProjectSnapshot.ingestion_id == ingestion_id)
        .distinct()
        .all()
    )
    project_ids = [r[0] for r in touched_snaps]

    for pid in project_ids:
        try:
            _score_one_project(db, pid, ingestion_id)
        except Exception as exc:
            logger.warning("Scoring failed for project %s: %s", pid, exc)


def _score_one_project(db: Session, pid: str, ingestion_id: str) -> None:
    project = db.get(Project, pid)
    if not project:
        return

    # Get full snapshot history for this project, sorted oldest→newest
    snaps = (
        db.query(ProjectSnapshot)
        .filter(ProjectSnapshot.project_id == pid)
        .order_by(ProjectSnapshot.report_month)
        .all()
    )
    snap_dicts = [
        {
            "report_month": s.report_month,
            "original_cost": s.original_cost,
            "revised_cost": s.revised_cost,
            "expenditure": s.expenditure,
            "original_date": s.original_date,
            "revised_date": s.revised_date,
            "data_quality_flag": s.data_quality_flag,
        }
        for s in snaps
    ]

    feature_dict, cold_start = engineer_features(
        snap_dicts,
        sector=project.sector,
        ministry=project.ministry,
    )

    result = score_project(feature_dict)
    latest_month = snaps[-1].report_month if snaps else datetime.utcnow().strftime("%Y-%m")

    pred = Prediction(
        project_id=pid,
        report_month=latest_month,
        cost_risk=result["cost_risk"],
        delay_risk=result["delay_risk"],
        overall_risk=result["overall_risk"],
        model_mode=result["model_mode"],
        model_version=result.get("model_version"),
    )
    db.add(pred)
    db.flush()

    # Compute and store SHAP drivers
    drivers = get_shap_drivers(feature_dict)
    for d in drivers:
        db.add(RiskDriver(
            prediction_id=pred.id,
            feature=d["feature"],
            label=d["label"],
            impact=d["impact"],
            direction=d["direction"],
            rank=d["rank"],
        ))

    # Create alert if risk ≥ threshold
    if should_create_alert(result["overall_risk"]):
        get_or_create_alert(db, pid, result["overall_risk"], prediction_id=pred.id)


def _write_log(
    db: Session, ingestion_id: str, status: str,
    rows: int, projects: int, errors: list
) -> None:
    log = IngestionLog(
        ingestion_id=ingestion_id,
        status=status,
        rows_processed=rows,
        projects_updated=projects,
        error_detail=json.dumps(errors) if errors else None,
    )
    db.add(log)
    db.flush()


def _safe_float(val: Any) -> float | None:
    try:
        return float(val) if val is not None and not (isinstance(val, float) and pd.isna(val)) else None
    except (TypeError, ValueError):
        return None


def _safe_str(val: Any) -> str | None:
    if val is None:
        return None
    try:
        if pd.isna(val):
            return None
    except (TypeError, ValueError):
        pass
    return str(val).strip() or None

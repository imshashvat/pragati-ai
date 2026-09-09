"""
app/services/ingestion.py
──────────────────────────
Accepts a PAIMANA CSV/XLSX upload, validates schema, writes snapshots,
triggers feature engineering + prediction + SHAP, creates alerts.

Column matching is FLEXIBLE — we try the canonical PAIMANA names first,
then fall back to a list of common aliases, and finally try bare internal
names (e.g. "project_id", "name").  This means any reasonable CSV works.
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

# ── Column name resolution ────────────────────────────────────────────────────
#
# Each internal field maps to a list of accepted column-header variants
# (case-insensitive, whitespace-collapsed).  The FIRST match found in the
# uploaded file wins.  Add more aliases here as needed.
#
FIELD_ALIASES: dict[str, list[str]] = {
    "project_id": [
        "project code", "project_code", "projectcode",
        "project id", "project_id", "projectid",
        "id", "code",
    ],
    "project_name": [
        "project name", "project_name", "projectname",
        "name", "title",
    ],
    "sector": [
        "sector", "sector name", "sector_name",
    ],
    "ministry": [
        "line ministry", "line_ministry", "ministry",
        "ministry name", "ministry_name", "department",
    ],
    "original_cost": [
        "original cost", "original_cost", "originalcost",
        "approved cost", "approved_cost", "sanctioned cost",
        "project cost", "project_cost", "cost",
    ],
    "revised_cost": [
        "revised cost", "revised_cost", "revisedcost",
        "current cost", "current_cost", "latest cost",
    ],
    "expenditure": [
        "expenditure", "actual expenditure", "actual_expenditure",
        "exp", "spent", "amount spent",
    ],
    "original_date": [
        "original end date", "original_end_date", "originalenddate",
        "original completion date", "scheduled end date",
        "original date", "original_date",
    ],
    "revised_date": [
        "revised end date", "revised_end_date", "revisedenddate",
        "revised completion date", "current end date",
        "revised date", "revised_date",
    ],
    "report_month": [
        "reporting month", "reporting_month", "reportingmonth",
        "report month", "report_month", "reportmonth",
        "month", "period",
    ],
}

REQUIRED_FIELDS = {"project_id", "project_name", "original_cost"}


def _normalise_header(h: str) -> str:
    """Lower-case, collapse whitespace/underscores."""
    return " ".join(str(h).lower().replace("_", " ").split())


def _build_column_map(df_columns: list[str]) -> dict[str, str]:
    """
    Return {internal_field: actual_df_column} for every field we can resolve.
    Unresolvable optional fields are simply absent from the returned dict.
    """
    normalised = {_normalise_header(c): c for c in df_columns}
    result: dict[str, str] = {}
    for field, aliases in FIELD_ALIASES.items():
        for alias in aliases:
            if alias in normalised:
                result[field] = normalised[alias]
                break
    return result


def run_ingestion(db: Session, file_bytes: bytes, filename: str) -> dict:
    """
    Full ingestion pipeline:
    1. Parse CSV/XLSX
    2. Auto-detect column mapping (flexible aliases)
    3. Upsert projects + snapshots
    4. For each project: engineer features → score → SHAP → alert if needed
    5. Write IngestionLog row

    Returns a summary dict matching the POST /admin/ingest response schema.
    """
    ingestion_id = str(uuid.uuid4())
    errors: list[str] = []
    rows_processed = 0
    projects_updated = 0

    # Create ingestion log record upfront so foreign key constraints on ProjectSnapshot are satisfied
    _write_log(db, ingestion_id, "processing", 0, 0, [])

    # ── 1. Parse ──────────────────────────────────────────────────────────────
    try:
        df = _parse_file(file_bytes, filename)
    except Exception as exc:
        _write_log(db, ingestion_id, "failed", 0, 0, [str(exc)])
        db.commit()
        return {
            "ingestion_id": ingestion_id,
            "status": "failed",
            "rows_processed": 0,
            "projects_updated": 0,
            "errors": [str(exc)],
        }

    # ── 2. Flexible column mapping ────────────────────────────────────────────
    col_map = _build_column_map(list(df.columns))
    logger.info("Ingestion column map: %s", col_map)

    missing_required = REQUIRED_FIELDS - set(col_map.keys())
    if missing_required:
        detected = list(df.columns[:15])  # show first 15 headers for debugging
        msg = (
            f"Could not find required columns: {sorted(missing_required)}. "
            f"Detected headers: {detected}. "
            f"Please use the template CSV or rename your columns — "
            f"see the 'Download Template' button on the admin page."
        )
        _write_log(db, ingestion_id, "failed", 0, 0, [msg])
        db.commit()
        return {
            "ingestion_id": ingestion_id,
            "status": "failed",
            "rows_processed": 0,
            "projects_updated": 0,
            "errors": [msg],
        }

    # Rename to internal names so the rest of the pipeline works uniformly
    rename = {v: k for k, v in col_map.items()}
    df = df.rename(columns=rename)

    # ── 3. Normalise types ────────────────────────────────────────────────────
    for col in ["original_cost", "revised_cost", "expenditure"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # report_month — default to current month if column absent
    if "report_month" not in df.columns:
        df["report_month"] = datetime.utcnow().strftime("%Y-%m")
    else:
        df["report_month"] = (
            pd.to_datetime(df["report_month"], errors="coerce")
            .dt.strftime("%Y-%m")
        )
        df["report_month"] = df["report_month"].fillna(
            datetime.utcnow().strftime("%Y-%m")
        )

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

    # ── 4. Upsert rows ────────────────────────────────────────────────────────
    for _, row in df.iterrows():
        try:
            _upsert_project_and_snapshot(db, row, ingestion_id)
            projects_updated += 1
        except Exception as exc:
            errors.append(f"Row {row.get('project_id', '?')}: {exc}")
            logger.warning("Ingestion row error: %s", exc)

    db.flush()

    # ── 5. Score every project touched in this ingestion ──────────────────────
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
    fn = filename.lower()
    if fn.endswith(".xlsx") or fn.endswith(".xls"):
        return pd.read_excel(buf)
    # Try utf-8 first, fall back to latin-1 (common in govt exports)
    try:
        return pd.read_csv(buf)
    except UnicodeDecodeError:
        buf.seek(0)
        return pd.read_csv(buf, encoding="latin-1")


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
        if "project_name" in row and pd.notna(row["project_name"]):
            project.name = str(row["project_name"])
        if "sector" in row:
            project.sector = _safe_str(row.get("sector"))
        if "ministry" in row:
            project.ministry = _safe_str(row.get("ministry"))

    # Upsert snapshot (skip if month already exists — idempotent)
    month = str(row.get("report_month", ""))
    existing_snap = (
        db.query(ProjectSnapshot)
        .filter_by(project_id=pid, report_month=month)
        .first()
    )
    if existing_snap:
        return

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
    Computes SHAP immediately.
    """
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

    if should_create_alert(result["overall_risk"]):
        get_or_create_alert(db, pid, result["overall_risk"], prediction_id=pred.id)


def _write_log(
    db: Session, ingestion_id: str, status: str,
    rows: int, projects: int, errors: list
) -> None:
    log = db.get(IngestionLog, ingestion_id)
    if not log:
        log = IngestionLog(
            ingestion_id=ingestion_id,
            status=status,
            rows_processed=rows,
            projects_updated=projects,
            error_detail=json.dumps(errors) if errors else None,
        )
        db.add(log)
    else:
        log.status = status
        log.rows_processed = rows
        log.projects_updated = projects
        log.error_detail = json.dumps(errors) if errors else None
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

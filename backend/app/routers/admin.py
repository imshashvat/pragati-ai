"""
app/routers/admin.py
─────────────────────
POST /admin/ingest        — upload and trigger monthly ingestion (Admin only)
GET  /admin/ingestion-log — list ingestion runs (Admin only)
"""

import json
from typing import Optional

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_role
from app.models.ingestion_log import IngestionLog, User
from app.services.ingestion import run_ingestion

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/ingest")
async def trigger_ingestion(
    file: UploadFile = File(...),
    user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """
    Upload a PAIMANA CSV/XLSX export to trigger the full ingestion pipeline.
    Validates schema, upserts projects/snapshots, scores all touched projects.
    """
    file_bytes = await file.read()
    result = run_ingestion(db, file_bytes, file.filename or "upload.csv")
    return result


@router.get("/ingestion-log")
def ingestion_log(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Returns paginated ingestion run history, newest first."""
    q = db.query(IngestionLog).order_by(IngestionLog.timestamp.desc())
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "ingestion_id": i.ingestion_id,
                "timestamp": i.timestamp.isoformat() if i.timestamp else None,
                "status": i.status,
                "rows_processed": i.rows_processed,
                "projects_updated": i.projects_updated,
                "error_detail": json.loads(i.error_detail) if i.error_detail else [],
            }
            for i in items
        ],
    }

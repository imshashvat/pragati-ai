"""
app/models/ingestion_log.py
────────────────────────────
IngestionLog: one row per monthly data upload / ingestion run.
Admin-facing; surfaced on the Data Operations screen.
Also stores User table (3 seeded users: officer, senior_official, admin).
"""

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text

from app.database import Base


class IngestionLog(Base):
    __tablename__ = "ingestion_logs"

    ingestion_id = Column(String, primary_key=True, index=True)  # UUID
    timestamp = Column(DateTime, default=datetime.utcnow)
    status = Column(String, nullable=False)  # "success" | "failed" | "partial"
    rows_processed = Column(Integer, default=0)
    projects_updated = Column(Integer, default=0)
    error_detail = Column(Text, nullable=True)  # JSON-serialised list of errors


class User(Base):
    __tablename__ = "users"

    user_id = Column(String, primary_key=True, index=True)  # UUID
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)  # "officer" | "senior_official" | "admin"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

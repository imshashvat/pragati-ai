"""
app/models/snapshot.py
──────────────────────
Monthly snapshot of a project's state at reporting month T.
Maps directly onto the ML guide's "one row per project per month" data structure.
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class ProjectSnapshot(Base):
    __tablename__ = "project_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(String, ForeignKey("projects.project_id"), nullable=False, index=True)
    report_month = Column(String, nullable=False)  # "YYYY-MM" ISO string

    # Raw financial fields from PAIMANA export
    original_cost = Column(Float, nullable=True)
    revised_cost = Column(Float, nullable=True)
    expenditure = Column(Float, nullable=True)
    original_date = Column(String, nullable=True)  # ISO date string
    revised_date = Column(String, nullable=True)   # ISO date string

    # Derived quality tag: count of null fields (0 = complete, higher = more missing)
    data_quality_flag = Column(Integer, default=0)

    ingestion_id = Column(String, ForeignKey("ingestion_logs.ingestion_id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="snapshots")

"""
app/models/project.py
─────────────────────
Master project table — one row per infrastructure project.
Source: validated PAIMANA export (ingestion service populates/updates).
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, Float, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Project(Base):
    __tablename__ = "projects"

    project_id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    sector = Column(String, nullable=True)
    ministry = Column(String, nullable=True)
    original_cost = Column(Float, nullable=True)  # INR crore
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    snapshots = relationship("ProjectSnapshot", back_populates="project", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="project", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="project", cascade="all, delete-orphan")

"""
app/models/alert.py
───────────────────
Alert + ReviewNote tables.

Alert state machine (Section 9):
  created → acknowledged → investigating → resolved | false_positive | escalated → closed

Severity bands:
  low      overall_risk < 0.5
  medium   0.5 ≤ overall_risk < 0.65
  high     0.65 ≤ overall_risk < 0.80
  critical overall_risk ≥ 0.80
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    alert_id = Column(String, primary_key=True, index=True)  # UUID
    project_id = Column(String, ForeignKey("projects.project_id"), nullable=False, index=True)

    severity = Column(String, nullable=False)  # low | medium | high | critical
    status = Column(String, nullable=False, default="created")
    # created | acknowledged | investigating | resolved | false_positive | escalated | closed

    prediction_id = Column(Integer, ForeignKey("predictions.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="alerts")
    review_notes = relationship("ReviewNote", back_populates="alert", cascade="all, delete-orphan")


class ReviewNote(Base):
    __tablename__ = "review_notes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    alert_id = Column(String, ForeignKey("alerts.alert_id"), nullable=False, index=True)

    officer_id = Column(String, nullable=False)
    # acknowledge | investigate | resolve | false_positive | escalate
    action = Column(String, nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    alert = relationship("Alert", back_populates="review_notes")

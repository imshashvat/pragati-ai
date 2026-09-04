"""
app/models/prediction.py
────────────────────────
Prediction + RiskDriver tables.
- Prediction: one row per project per scoring run
- RiskDriver: up to 5 rows per prediction (SHAP top drivers)

model_mode:
  "ml"       — real XGBoost model from ml/artifacts/
  "baseline" — statistical fallback (expenditure_ratio rule)
  "demo"     — seed data, no real model involved
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(String, ForeignKey("projects.project_id"), nullable=False, index=True)
    report_month = Column(String, nullable=False)  # "YYYY-MM"

    cost_risk = Column(Float, nullable=False)
    delay_risk = Column(Float, nullable=False)
    overall_risk = Column(Float, nullable=False)

    # Which model produced this?  "ml" | "baseline" | "demo"
    model_mode = Column(String, nullable=False, default="demo")
    model_version = Column(String, nullable=True)  # e.g. "2026-08-01_1430"

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="predictions")
    drivers = relationship("RiskDriver", back_populates="prediction", cascade="all, delete-orphan")


class RiskDriver(Base):
    __tablename__ = "risk_drivers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    prediction_id = Column(Integer, ForeignKey("predictions.id"), nullable=False, index=True)

    # Raw feature name from feature_columns.json
    feature = Column(String, nullable=False)
    # Human-readable label (e.g. "Expenditure ahead of physical progress")
    label = Column(String, nullable=False)
    # SHAP value magnitude
    impact = Column(Float, nullable=False)
    # "increases_risk" | "decreases_risk"
    direction = Column(String, nullable=False)

    rank = Column(Integer, nullable=False)  # 1 = top driver

    # Relationships
    prediction = relationship("Prediction", back_populates="drivers")

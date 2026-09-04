"""
app/routers/predict.py
───────────────────────
POST /predict/schedule-delay  — standalone ML inference endpoint.

Accepts a ProjectInput payload and returns:
  - predicted future schedule extension in days
  - delay risk score (0–1)
  - risk category label
  - overall risk (combined with statistical cost baseline)
  - top feature importance drivers

This endpoint is useful for:
  1. Testing the model independently of the full project pipeline
  2. Real-time "what-if" analysis from the frontend
  3. Demos without needing stored project data in the DB

Authentication: JWT required (officer role or above).
For public/demo use, set require_auth=False in query or remove Depends.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.deps import get_current_user
from app.models.ingestion_log import User
from app.services.feature_engineering import features_from_api_input
from app.services.prediction import score_project, get_model_status, get_top_drivers

router = APIRouter(prefix="/predict", tags=["ML Prediction"])


# ── Request schema ────────────────────────────────────────────────────────────

class ProjectInput(BaseModel):
    """
    Input features for Model 3 — Future Schedule Delay Forecasting.
    Matches the CatBoost model's training feature schema.
    """
    # Identifiers / categorical
    project_name: str = Field(..., example="NH-48 Widening Package 3")
    agency:        str = Field(..., example="NHAI")
    state:         str = Field(..., example="Maharashtra")
    ministry:      str = Field(..., example="Ministry of Road Transport and Highways")
    sector:        str = Field(..., example="Roads & Highways")

    # Progress
    physical_progress_pct:  float = Field(..., ge=0, le=100, example=45.5)
    financial_progress_pct: float = Field(..., ge=0, le=100, example=38.2)

    # Costs (₹ Crore)
    original_cost_cr:          float = Field(..., gt=0, example=1250.0)
    revised_cost_cr:           float = Field(..., gt=0, example=1380.0)
    cumulative_expenditure_cr: float = Field(..., ge=0, example=527.4)

    # Schedule
    schedule_gap_pct: float = Field(
        ..., example=15.3,
        description="How far behind schedule the project is, as a percentage of total duration"
    )


# ── Response schema ───────────────────────────────────────────────────────────

class DriverOut(BaseModel):
    feature:    str
    label:      str
    importance: float
    rank:       int


class PredictionResponse(BaseModel):
    predicted_days:  float
    delay_risk:      float
    risk_category:   str
    cost_risk:       float
    overall_risk:    float
    model_mode:      str
    model_version:   str | None
    top_drivers:     list[DriverOut]
    model_status:    dict


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/schedule-delay", response_model=PredictionResponse)
def predict_schedule_delay(
    inp: ProjectInput,
    user: User = Depends(get_current_user),
):
    """
    Predict future schedule extension (delay) for a project using Model 3.

    **Model**: CatBoost Regressor — Future Schedule Extension Forecast
    **Target**: Additional days the project completion will be pushed forward
    **Risk score**: Normalised to [0.0, 1.0] where 1.0 = 365+ day delay
    **Risk categories**:
    - On Track (0 days)
    - Low Delay Risk (1–30 days)
    - Moderate Delay Risk (31–90 days)
    - High Delay Risk (>90 days)
    """
    status = get_model_status()

    # Build feature dict from API payload
    feature_dict = features_from_api_input(inp.model_dump())

    # Run scoring
    result = score_project(feature_dict)

    # Top drivers (global feature importance — fast, no per-row SHAP overhead)
    drivers = get_top_drivers(top_n=5)

    return PredictionResponse(
        predicted_days=result["predicted_days"],
        delay_risk=result["delay_risk"],
        risk_category=result["risk_category"],
        cost_risk=result["cost_risk"],
        overall_risk=result["overall_risk"],
        model_mode=result["model_mode"],
        model_version=result["model_version"],
        top_drivers=[DriverOut(**d) for d in drivers],
        model_status=status,
    )


@router.get("/status")
def model_status():
    """
    Returns current ML model load status — no auth required.
    Used by the frontend's model performance panel.
    """
    return get_model_status()

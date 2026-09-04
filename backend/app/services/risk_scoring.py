"""
app/services/risk_scoring.py
─────────────────────────────
Priority formula (Section 19 / Section 3):
    priority = overall_risk × log1p(original_cost_crore) × urgency_factor

urgency_factor:
    1.5 if the project already has an unresolved critical/high alert
    1.2 if the project has an unresolved medium alert
    1.0 otherwise

Severity bands → alert severity string:
    overall_risk < 0.50          → "low"
    0.50 ≤ overall_risk < 0.65   → "medium"
    0.65 ≤ overall_risk < 0.80   → "high"
    overall_risk ≥ 0.80          → "critical"
"""

import math

from app.config import settings


def compute_priority_score(
    overall_risk: float,
    original_cost_crore: float,
    urgency_factor: float = 1.0,
) -> float:
    """Documented priority formula — used for ranking the priority queue."""
    safe_cost = max(original_cost_crore, 1.0)
    return round(overall_risk * math.log1p(safe_cost) * urgency_factor, 6)


def risk_to_severity(overall_risk: float) -> str:
    """Map overall_risk float to a severity label string."""
    if overall_risk >= 0.80:
        return "critical"
    if overall_risk >= 0.65:
        return "high"
    if overall_risk >= 0.50:
        return "medium"
    return "low"


def should_create_alert(overall_risk: float) -> bool:
    """True when overall_risk ≥ configured threshold (default 0.45)."""
    return overall_risk >= settings.RISK_THRESHOLD

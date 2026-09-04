"""
app/services/feature_engineering.py
────────────────────────────────────
Given a project's full snapshot history (list of dicts ordered by report_month),
compute the feature vector that matches feature_columns.json.

Mirrors the ML guide Step 4 logic exactly so that inference-time features
are computed the same way training-time features were.

Returns:
    feature_dict: dict[str, float]  — keyed by raw feature name
    cold_start: bool                — True if insufficient history (< 2 months)
"""

import logging
from typing import Any

logger = logging.getLogger(__name__)


def engineer_features(
    snapshots: list[dict[str, Any]],
    sector: str | None = None,
    ministry: str | None = None,
) -> tuple[dict[str, float], bool]:
    """
    Parameters
    ----------
    snapshots : list of snapshot dicts, sorted oldest → newest,
                each with keys: report_month, original_cost, revised_cost,
                expenditure, original_date, revised_date, data_quality_flag
    sector    : project sector string (for one-hot features)
    ministry  : project ministry string (for one-hot features)

    Returns
    -------
    (feature_dict, cold_start)
    """
    if not snapshots:
        return {}, True

    latest = snapshots[-1]
    cold_start = len(snapshots) < 2

    orig_cost = float(latest.get("original_cost") or 0) or 1.0  # avoid /0
    revised_cost = float(latest.get("revised_cost") or orig_cost)
    expenditure = float(latest.get("expenditure") or 0)

    expenditure_ratio = expenditure / orig_cost
    cost_growth_ratio = revised_cost / orig_cost

    features: dict[str, float] = {
        "expenditure_ratio": round(expenditure_ratio, 6),
        "cost_growth_ratio": round(cost_growth_ratio, 6),
        "data_quality_flag": float(latest.get("data_quality_flag") or 0),
        "months_since_start": float(len(snapshots) - 1),
    }

    # Trend features require at least 2 snapshots
    if not cold_start:
        prev = snapshots[-2]
        prev_orig = float(prev.get("original_cost") or 0) or 1.0
        prev_expenditure = float(prev.get("expenditure") or 0)
        prev_exp_ratio = prev_expenditure / prev_orig

        features["expenditure_ratio_prev"] = round(prev_exp_ratio, 6)
        features["expenditure_ratio_trend"] = round(expenditure_ratio - prev_exp_ratio, 6)
    else:
        features["expenditure_ratio_prev"] = 0.0
        features["expenditure_ratio_trend"] = 0.0

    # Sector / ministry one-hot — we add the specific column for this project.
    # The model will have been trained with get_dummies; unknown categories → 0.
    if sector:
        safe = sector.replace(" ", "_").replace("-", "_")
        features[f"sector_{safe}"] = 1.0
        features["sector_nan"] = 0.0
    else:
        features["sector_nan"] = 1.0

    if ministry:
        safe = ministry.replace(" ", "_").replace("-", "_")
        features[f"ministry_{safe}"] = 1.0
        features["ministry_nan"] = 0.0
    else:
        features["ministry_nan"] = 1.0

    return features, cold_start

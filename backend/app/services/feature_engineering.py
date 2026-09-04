"""
app/services/feature_engineering.py
────────────────────────────────────
Builds the feature dict / DataFrame for Model 3 (CatBoost Schedule Delay).

The CatBoost model was trained on 61 features including:
  - Numeric: physical_progress_pct, financial_progress_pct, original_cost_cr,
             revised_cost_cr, cumulative_expenditure_cr, schedule_gap_pct,
             risk_signal_count, peer_progress_percentile, etc.
  - Categorical (passed as strings): ministry, sector, state, agency,
             month, project_name, revised_doc, original_doc, etc.

This function accepts a project snapshot dict (as stored in DB) plus
additional enrichment fields, and returns a flat feature_dict that
`prediction.build_feature_dataframe()` will turn into a DataFrame.

Any feature not derivable from available data is set to 0 / '' — the model
handles missing values natively via CatBoost's built-in NaN handling.
"""

import logging
from typing import Any

logger = logging.getLogger(__name__)


def engineer_features(
    snapshots: list[dict[str, Any]],
    sector: str | None = None,
    ministry: str | None = None,
    state: str | None = None,
    agency: str | None = None,
    project_name: str | None = None,
) -> tuple[dict[str, float | str], bool]:
    """
    Build the flat feature dict for Model 3 inference.

    Parameters
    ----------
    snapshots   : list of snapshot dicts, sorted oldest → newest.
                  Each snapshot has keys from ProjectSnapshot ORM:
                  report_month, original_cost, revised_cost, expenditure,
                  physical_progress_pct, financial_progress_pct,
                  schedule_gap_pct, data_quality_flag
    sector      : project sector string (categorical feature)
    ministry    : project ministry string (categorical feature)
    state       : project state string (categorical feature)
    agency      : implementing agency string (categorical feature)
    project_name: project name (categorical — high importance in the model)

    Returns
    -------
    (feature_dict, cold_start)
      feature_dict : dict[str, float | str]  keyed by raw feature name
      cold_start   : True if < 2 snapshots (insufficient trend data)
    """
    if not snapshots:
        return {}, True

    latest = snapshots[-1]
    cold_start = len(snapshots) < 2

    # ── Core cost fields ─────────────────────────────────────────────────────
    orig_cost = float(latest.get("original_cost") or 0) or 1.0  # avoid /0
    revised_cost = float(latest.get("revised_cost") or orig_cost)
    expenditure = float(latest.get("expenditure") or 0)

    # Derived ratios (kept for legacy cost-risk baseline)
    expenditure_ratio = expenditure / orig_cost
    cost_growth_ratio = revised_cost / orig_cost

    # ── Progress fields (directly from snapshot if available) ────────────────
    physical_progress_pct = float(latest.get("physical_progress_pct") or 0.0)
    financial_progress_pct = float(latest.get("financial_progress_pct") or 0.0)

    # ── Schedule fields ───────────────────────────────────────────────────────
    schedule_gap_pct = float(latest.get("schedule_gap_pct") or 0.0)

    # financial_physical_gap_pct: how far financial progress trails physical
    financial_physical_gap_pct = financial_progress_pct - physical_progress_pct

    # ── Temporal features ─────────────────────────────────────────────────────
    project_age_days = float(len(snapshots) - 1) * 30.5  # approx from snapshot count
    snapshot_month_num = float(len(snapshots))

    # ── Data quality ─────────────────────────────────────────────────────────
    data_quality_flag = float(latest.get("data_quality_flag") or 0)

    # ── Build core feature dict ───────────────────────────────────────────────
    features: dict[str, float | str] = {
        # Numeric features
        "physical_progress_pct":      round(physical_progress_pct, 4),
        "financial_progress_pct":     round(financial_progress_pct, 4),
        "schedule_gap_pct":           round(schedule_gap_pct, 4),
        "financial_physical_gap_pct": round(financial_physical_gap_pct, 4),
        "original_cost_cr":           round(orig_cost, 4),
        "revised_cost_cr":            round(revised_cost, 4),
        "cumulative_expenditure_cr":  round(expenditure, 4),
        "expenditure_ratio":          round(expenditure_ratio, 6),
        "cost_growth_ratio":          round(cost_growth_ratio, 6),
        "project_age_days":           round(project_age_days, 1),
        "snapshot_month_num":         snapshot_month_num,
        "data_quality_flag":          data_quality_flag,
        "risk_signal_count":          0.0,       # enriched by alerting service if available
        "peer_progress_percentile":   50.0,      # default mid-range (enriched at batch time)
        "peer_financial_gap_percentile": 50.0,
        "peer_schedule_gap_percentile":  50.0,
        "time_elapsed_pct":           0.0,
        "is_after_revised_target":    0.0,
        "legacy_code":                0.0,
        "approval_date_dt_month":     0.0,

        # Categorical features (must be str for CatBoost)
        "sector":        sector or "",
        "ministry":      ministry or "",
        "state":         state or "",
        "agency":        agency or "",
        "project_name":  project_name or "",
        "month":         "",         # reporting month — not always available at inference
        "revised_doc":   "",         # revised date of completion — added if snapshot has it
        "original_doc":  "",
        "heuristic_risk_level": _heuristic_risk(schedule_gap_pct, physical_progress_pct),
        "pmgid":         "",
    }

    # ── Trend features (require ≥ 2 snapshots) ───────────────────────────────
    if not cold_start:
        prev = snapshots[-2]
        prev_orig = float(prev.get("original_cost") or 0) or 1.0
        prev_exp = float(prev.get("expenditure") or 0)
        prev_exp_ratio = prev_exp / prev_orig
        features["expenditure_ratio_prev"]  = round(prev_exp_ratio, 6)
        features["expenditure_ratio_trend"] = round(expenditure_ratio - prev_exp_ratio, 6)
    else:
        features["expenditure_ratio_prev"]  = 0.0
        features["expenditure_ratio_trend"] = 0.0

    # ── Date fields from snapshot if present ──────────────────────────────────
    revised_doc = latest.get("revised_doc") or latest.get("revised_date")
    original_doc = latest.get("original_doc") or latest.get("original_date")
    report_month = latest.get("report_month")

    if revised_doc:
        features["revised_doc"]  = str(revised_doc)[:10]  # ISO date prefix
    if original_doc:
        features["original_doc"] = str(original_doc)[:10]
    if report_month:
        features["month"] = str(report_month)[:7]  # YYYY-MM

    return features, cold_start


# ── Direct-input feature builder (for POST /predict/schedule-delay) ──────────

def features_from_api_input(inp: dict[str, Any]) -> dict[str, float | str]:
    """
    Build a feature dict directly from a ProjectInput API payload.
    Used by the /predict/schedule-delay endpoint for standalone inference
    without needing a stored project + snapshots in the database.

    inp keys match the ProjectInput Pydantic schema.
    """
    physical  = float(inp.get("physical_progress_pct") or 0.0)
    financial = float(inp.get("financial_progress_pct") or 0.0)
    orig_cost = float(inp.get("original_cost_cr") or 0.0) or 1.0
    revised   = float(inp.get("revised_cost_cr") or orig_cost)
    expend    = float(inp.get("cumulative_expenditure_cr") or 0.0)
    gap       = float(inp.get("schedule_gap_pct") or 0.0)

    return {
        "physical_progress_pct":       round(physical, 4),
        "financial_progress_pct":      round(financial, 4),
        "schedule_gap_pct":            round(gap, 4),
        "financial_physical_gap_pct":  round(financial - physical, 4),
        "original_cost_cr":            round(orig_cost, 4),
        "revised_cost_cr":             round(revised, 4),
        "cumulative_expenditure_cr":   round(expend, 4),
        "expenditure_ratio":           round(expend / orig_cost, 6),
        "cost_growth_ratio":           round(revised / orig_cost, 6),
        "project_age_days":            0.0,
        "snapshot_month_num":          1.0,
        "data_quality_flag":           0.0,
        "risk_signal_count":           0.0,
        "peer_progress_percentile":    50.0,
        "peer_financial_gap_percentile": 50.0,
        "peer_schedule_gap_percentile":  50.0,
        "time_elapsed_pct":            0.0,
        "is_after_revised_target":     0.0,
        "legacy_code":                 0.0,
        "approval_date_dt_month":      0.0,
        "expenditure_ratio_prev":      0.0,
        "expenditure_ratio_trend":     0.0,
        "sector":        str(inp.get("sector") or ""),
        "ministry":      str(inp.get("ministry") or ""),
        "state":         str(inp.get("state") or ""),
        "agency":        str(inp.get("agency") or ""),
        "project_name":  str(inp.get("project_name") or ""),
        "month":         "",
        "revised_doc":   "",
        "original_doc":  "",
        "heuristic_risk_level": _heuristic_risk(gap, physical),
        "pmgid":         "",
    }


def _heuristic_risk(schedule_gap_pct: float, physical_pct: float) -> str:
    """
    Reproduce the heuristic_risk_level categorical feature used in training.
    This is derived from schedule_gap_pct and physical progress.
    """
    if schedule_gap_pct > 30 or physical_pct < 20:
        return "High"
    elif schedule_gap_pct > 10 or physical_pct < 50:
        return "Medium"
    else:
        return "Low"

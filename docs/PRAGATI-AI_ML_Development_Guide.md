## Workflow context for this guide

You will train the models on **Google Colab**, export the trained artifacts, and wire them into the prototype backend built with **Antigravity / Claude Code**. This guide is written for exactly that split: everything here runs standalone in a Colab notebook and ends with a small set of exported files (`.pkl` models, a `feature_columns.json`, and a metrics report) that your backend simply loads and calls — it does not assume any particular backend framework.

### Column-name disclaimer

The exact column names in your downloaded PAIMANA export may differ slightly from the names used below. The code is written so that **you only need to edit the `COLUMN_MAP` dictionary in Step 1** to match your real file — every later step refers to columns through that map, not by hardcoded names. This is deliberate: guessing your exact column names in advance is a good way to hand you code that silently fails.

---

## Step 1 — Load and inspect the data

```python
# --- Cell 1: setup ---
!pip install -q xgboost shap scikit-learn pandas

import pandas as pd
import numpy as np

# Upload your downloaded PAIMANA export (CSV or XLSX) in the Colab file browser first
df = pd.read_csv("paimana_export.csv")   # or pd.read_excel(...) if XLSX

print(df.shape)
print(df.columns.tolist())
df.head()
```

```python
# --- Cell 2: map YOUR real column names here — edit this to match your file ---
COLUMN_MAP = {
    "project_id":     "Project Code",
    "project_name":   "Project Name",
    "sector":         "Sector",
    "ministry":       "Line Ministry",
    "original_cost":  "Original Cost",
    "revised_cost":   "Revised Cost",
    "expenditure":    "Expenditure",
    "original_date":  "Original End Date",
    "revised_date":   "Revised End Date",
    "report_month":   "Reporting Month",   # if your export has a month/date column per row
}

df = df.rename(columns={v: k for k, v in COLUMN_MAP.items()})
df.info()
df.isna().sum().sort_values(ascending=False)
```

**What to check here manually before continuing:**
- Does the file have **one row per project per month** (a real snapshot history), or **one row per project** (a single current state)? This single fact decides whether you can do genuine temporal prediction (Option A) or need the honest-prototype route (Option B) — see the decision this guide builds toward in Step 6.
- How many unique projects and how many unique reporting months do you actually have?

```python
print("Unique projects:", df["project_id"].nunique())
if "report_month" in df.columns:
    print("Unique months:", df["report_month"].nunique())
    print(df.groupby("project_id")["report_month"].nunique().describe())
```

---

## Step 2 — Clean and standardise

```python
# --- Cell 3: basic cleaning ---
for col in ["original_cost", "revised_cost", "expenditure"]:
    df[col] = pd.to_numeric(df[col], errors="coerce")

for col in ["original_date", "revised_date"]:
    df[col] = pd.to_datetime(df[col], errors="coerce", dayfirst=True)

if "report_month" in df.columns:
    df["report_month"] = pd.to_datetime(df["report_month"], errors="coerce")

# Drop rows with no cost data at all — can't build a target without it
df = df.dropna(subset=["original_cost"])

# Data-quality flag — feed this in as a feature later, don't just discard rows silently
df["data_quality_flag"] = df[["revised_cost", "expenditure", "revised_date"]].isna().sum(axis=1)

df.describe(include="all").T
```

---

## Step 3 — Define the prediction targets

This is the single most important step in the whole notebook. Write these definitions down verbatim for your report and demo script — a judge will ask for exactly this.

```python
# --- Cell 4: target definitions ---

# Cost overrun target: did revised cost exceed original cost by more than 10%?
df["cost_overrun_flag"] = (
    (df["revised_cost"] - df["original_cost"]) / df["original_cost"] > 0.10
).astype(int)

# Delay target: did the revised completion date slip more than 6 months
# past the original date?
df["delay_days"] = (df["revised_date"] - df["original_date"]).dt.days
df["delay_flag"] = (df["delay_days"] > 180).astype(int)

print(df["cost_overrun_flag"].value_counts(normalize=True))
print(df["delay_flag"].value_counts(normalize=True))
```

If your file is a **single current snapshot per project** (not a monthly time series), you cannot yet honestly build "predict at month T, reveal at T+delta" — see Step 6 (Option B) for what to build instead of faking this.

---

## Step 4 — Feature engineering

```python
# --- Cell 5: engineered features ---

df["expenditure_ratio"] = df["expenditure"] / df["original_cost"]
df["cost_growth_ratio"] = df["revised_cost"] / df["original_cost"]

# If you DO have monthly snapshots, compute trend features per project:
if "report_month" in df.columns:
    df = df.sort_values(["project_id", "report_month"])
    df["expenditure_ratio_prev"] = df.groupby("project_id")["expenditure_ratio"].shift(1)
    df["expenditure_ratio_trend"] = df["expenditure_ratio"] - df["expenditure_ratio_prev"]
    df["months_since_start"] = df.groupby("project_id").cumcount()

# One-hot encode categorical context
df = pd.get_dummies(df, columns=["sector", "ministry"], dummy_na=True)

feature_cols = [c for c in df.columns if c.startswith((
    "expenditure_ratio", "cost_growth_ratio", "months_since_start",
    "data_quality_flag", "sector_", "ministry_"
))]
print(len(feature_cols), "features:", feature_cols)
```

---

## Step 5 — Baseline model (build this before any ML — the PS explicitly asks you to justify ML over statistics)

```python
# --- Cell 6: statistical baseline ---
from sklearn.metrics import precision_recall_fscore_support, roc_auc_score

# Simple rule: flag if expenditure is running well ahead of a nominal expected pace
baseline_pred = (df["expenditure_ratio"] > 0.6).astype(int)

p, r, f1, _ = precision_recall_fscore_support(
    df["cost_overrun_flag"], baseline_pred, average="binary", zero_division=0
)
print(f"Baseline — precision: {p:.2f}  recall: {r:.2f}  F1: {f1:.2f}")
```

Keep this number. Every time you report your ML model's performance, report this baseline right next to it.

---

## Step 6 — Choose Option A or Option B based on what Step 1 told you

```python
# --- Cell 7: temporal split decision ---
HAS_MONTHLY_HISTORY = "report_month" in df.columns and df.groupby("project_id")["report_month"].nunique().median() >= 3

print("Sufficient monthly history for genuine temporal validation:", HAS_MONTHLY_HISTORY)
```

- **If `True` (Option A):** continue to Step 7 using a **time-based split** — train on snapshots before a cutoff month, test on snapshots after it. Never shuffle-split across time; a random k-fold here silently leaks the future into training and invalidates every metric you report.
- **If `False` (Option B):** you have a genuine single-snapshot dataset. Still build the full pipeline below using a standard train/test split (random, stratified by target), but **label every result in your demo and report as "demonstration methodology, not a validated early-warning claim"** — this is the honesty rule from your own blueprint document, and it is what protects you from the toughest judge question rather than exposing you to it.

---

## Step 7 — Train the models

```python
# --- Cell 8: train/test split ---
from sklearn.model_selection import train_test_split

X = df[feature_cols].fillna(0)
y_cost = df["cost_overrun_flag"]
y_delay = df["delay_flag"]

if HAS_MONTHLY_HISTORY:
    cutoff = df["report_month"].quantile(0.8)
    train_idx = df["report_month"] < cutoff
    X_train, X_test = X[train_idx], X[~train_idx]
    y_cost_train, y_cost_test = y_cost[train_idx], y_cost[~train_idx]
    y_delay_train, y_delay_test = y_delay[train_idx], y_delay[~train_idx]
else:
    X_train, X_test, y_cost_train, y_cost_test, y_delay_train, y_delay_test = train_test_split(
        X, y_cost, y_delay, test_size=0.2, random_state=42, stratify=y_cost
    )
```

```python
# --- Cell 9: train cost-risk and delay-risk models ---
from xgboost import XGBClassifier

cost_model = XGBClassifier(
    n_estimators=200, max_depth=4, learning_rate=0.05,
    eval_metric="logloss", random_state=42
)
cost_model.fit(X_train, y_cost_train)

delay_model = XGBClassifier(
    n_estimators=200, max_depth=4, learning_rate=0.05,
    eval_metric="logloss", random_state=42
)
delay_model.fit(X_train, y_delay_train)
```

---

## Step 8 — Validate honestly

```python
# --- Cell 10: evaluation ---
from sklearn.metrics import classification_report, roc_auc_score

for name, model, y_test in [("Cost", cost_model, y_cost_test), ("Delay", delay_model, y_delay_test)]:
    proba = model.predict_proba(X_test)[:, 1]
    pred = (proba > 0.5).astype(int)
    print(f"\n--- {name} model ---")
    print(classification_report(y_test, pred, zero_division=0))
    try:
        print("ROC-AUC:", round(roc_auc_score(y_test, proba), 3))
    except ValueError:
        print("ROC-AUC: undefined (only one class present in test set)")
```

```python
# --- Cell 11: calibration sanity check ---
import numpy as np
proba = cost_model.predict_proba(X_test)[:, 1]
bins = np.linspace(0, 1, 6)
for lo, hi in zip(bins[:-1], bins[1:]):
    mask = (proba >= lo) & (proba < hi)
    if mask.sum() > 0:
        print(f"Predicted {lo:.1f}-{hi:.1f}: actual overrun rate = {y_cost_test[mask].mean():.2f} (n={mask.sum()})")
```

---

## Step 9 — Explainability (SHAP)

```python
# --- Cell 12: SHAP driver extraction ---
import shap

explainer = shap.TreeExplainer(cost_model)
shap_values = explainer.shap_values(X_test)

def top_drivers(row_idx, n=3):
    contributions = shap_values[row_idx]
    order = np.argsort(-np.abs(contributions))[:n]
    return [(feature_cols[i], round(float(contributions[i]), 4)) for i in order]

# Example: explain the highest-risk project in the test set
top_risk_idx = np.argmax(cost_model.predict_proba(X_test)[:, 1])
print("Top drivers for highest-risk project:", top_drivers(top_risk_idx))
```

For your backend, precompute and store `top_drivers()` output for every project at scoring time — don't call SHAP live on every dashboard page load, it's too slow for an interactive UI.

---

## Step 10 — Combine into one calibrated risk score

```python
# --- Cell 13: combined risk score ---
def overall_risk(cost_proba, delay_proba, w_cost=0.5, w_delay=0.5):
    return round(float(w_cost * cost_proba + w_delay * delay_proba), 4)

df.loc[X_test.index, "cost_risk"] = cost_model.predict_proba(X_test)[:, 1]
df.loc[X_test.index, "delay_risk"] = delay_model.predict_proba(X_test)[:, 1]
df.loc[X_test.index, "overall_risk"] = df.loc[X_test.index].apply(
    lambda r: overall_risk(r["cost_risk"], r["delay_risk"]), axis=1
)

df.loc[X_test.index, ["project_id", "cost_risk", "delay_risk", "overall_risk"]].sort_values(
    "overall_risk", ascending=False
).head(10)
```

Document this weighted-average formula explicitly in your report — a documented formula a judge can question and evaluate is far more defensible than a hidden ensemble score.

---

## Step 11 — Export everything your backend needs

```python
# --- Cell 14: export artifacts ---
import joblib, json
from datetime import datetime

joblib.dump(cost_model, "cost_model.pkl")
joblib.dump(delay_model, "delay_model.pkl")

with open("feature_columns.json", "w") as f:
    json.dump(feature_cols, f)

metrics_report = {
    "model_version": datetime.now().strftime("%Y-%m-%d_%H%M"),
    "trained_on_rows": len(X_train),
    "tested_on_rows": len(X_test),
    "temporal_validation": bool(HAS_MONTHLY_HISTORY),
    "cost_model_auc": float(roc_auc_score(y_cost_test, cost_model.predict_proba(X_test)[:, 1])) if y_cost_test.nunique() > 1 else None,
    "delay_model_auc": float(roc_auc_score(y_delay_test, delay_model.predict_proba(X_test)[:, 1])) if y_delay_test.nunique() > 1 else None,
}
with open("model_run_metrics.json", "w") as f:
    json.dump(metrics_report, f, indent=2)

print("Exported: cost_model.pkl, delay_model.pkl, feature_columns.json, model_run_metrics.json")
```

Download these four files from Colab. This is exactly the artifact set your `predictions` and `model_runs` tables (defined in the system blueprint below) expect — `model_run_metrics.json` maps directly onto the Model Performance screen, and `feature_columns.json` is what your backend uses to build the feature vector consistently at inference time.

---

## Step 12 — What your backend (built via Antigravity / Claude Code) needs to do with these files

0. Place all four exported files, unchanged, into the `ml/artifacts/` folder in the repo — this is the single handoff point between this notebook and the backend. See "Section 29 — ML artifact to backend connection" in the Full Development Guide for the exact loading contract.
1. Load `cost_model.pkl` and `delay_model.pkl` with `joblib.load(...)` inside your FastAPI (or equivalent) service.
2. On each new snapshot, build the feature vector using **exactly** the column order in `feature_columns.json` — mismatched order silently produces garbage predictions with tree models.
3. Call `.predict_proba()` for both models, combine via the Step 10 formula, and write the result into your `predictions` table.
4. Run the SHAP driver extraction (Step 9) once per scoring batch, not per page view, and store the top-3 drivers alongside the prediction.
5. Surface `model_run_metrics.json`'s contents directly on the Model Performance screen defined in the blueprint — this is the fastest way to make that screen real instead of a mockup.

---

## Honest gap check for your ML pipeline specifically

- This guide gives you a complete, runnable pipeline — but it cannot tell you in advance whether your actual downloaded file has monthly history or a single snapshot. Run Step 1's inspection cell first and that answers it for you.
- Class imbalance is likely (cost/delay overruns are probably a minority of projects) — if `value_counts(normalize=True)` in Step 3 shows a very skewed split (e.g. under 10% positive), consider `scale_pos_weight` in `XGBClassifier` or class-weighted metrics, and say so explicitly in your report rather than letting a high accuracy number hide a model that just predicts "no risk" for everything.

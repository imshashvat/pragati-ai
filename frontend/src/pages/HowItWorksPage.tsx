// src/pages/HowItWorksPage.tsx
import React from "react"
import { Link } from "react-router-dom"
import PublicLayout from "../components/PublicLayout"
import { usePageTitle } from "../hooks/usePageTitle"

const STEPS = [
  {
    num: "01", title: "Automated Data Ingestion", sub: "Monthly OCMS flash data",
    body: "Every month, authorised ministry officers upload project-level data through PRAGATI-AI's secure ingestion interface. This includes OCMS flash reports, milestone completion records, cumulative expenditure logs, and revised cost estimates. Every upload is logged with full provenance metadata — officer ID, timestamp, source ministry, and data version — before any processing begins.",
    details: ["Monthly OCMS Flash Reports", "Milestone Completion Audits", "Cumulative Expenditure Logs", "Revised Cost Estimates (RCE)", "Data Provenance Logging"],
    color: "#0F62FE",
  },
  {
    num: "02", title: "Feature Engineering", sub: "48+ engineered risk signals",
    body: "Raw project records are transformed into 48+ engineered features that capture the nuanced dynamics of infrastructure project risk. These go far beyond simple cost and schedule data — capturing contextual signals like contractor multi-project overload, state-level regulatory friction indices, seasonal and monsoon impact windows, land acquisition progress velocity, and inter-ministerial clearance lag patterns.",
    details: ["Milestone Velocity (completion rate vs plan)", "Contractor Multi-Project Load Index", "State Regulatory Friction Score", "Monsoon Impact Window (months)", "Land Acquisition Progress Velocity", "Inter-ministerial Clearance Lag Days", "Cost Deviation % (cumulative)", "Schedule Slippage (months behind plan)"],
    color: "#8B5CF6",
  },
  {
    num: "03", title: "Dual-Target ML Scoring", sub: "CatBoost gradient-boosted models",
    body: "Two independent CatBoost gradient-boosted tree models score each project simultaneously. The first predicts cost overrun probability as a percentage above the original sanctioned cost. The second predicts schedule slip in months relative to the revised timeline. Both models were trained on 8+ years of historical project records, with cross-validation accuracy of 97% on held-out data.",
    details: ["Model 1: Cost Overrun Risk Probability (%)", "Model 2: Schedule Slip Prediction (months)", "Training Set: 8+ years of project history", "Cross-Validation Accuracy: 97%", "Risk Band Classification: Critical / High / Medium / Low", "Prediction refreshed monthly on new data upload"],
    color: "#059669",
  },
  {
    num: "04", title: "SHAP Explainability", sub: "Transparent, auditable AI decisions",
    body: "Every risk score is accompanied by SHAP (SHapley Additive exPlanations) feature attributions that show officers exactly which factors pushed a project into a given risk band — and by how much. This eliminates the 'black box' problem in government AI. An officer can see that '₹450 Cr. project was flagged Critical primarily due to 34-month contractor dispute record and 18% above-plan cost deviation.'",
    details: ["Per-project SHAP attribution breakdown", "Top 5 risk drivers ranked by impact", "Positive and negative factor identification", "Stored alongside every ML prediction for audit trail", "Viewable in the Model Intelligence dashboard"],
    color: "#DC2626",
  },
  {
    num: "05", title: "Governance Alerts & Action", sub: "Tiered notifications and escalation",
    body: "High-risk projects surface as structured alerts within PRAGATI-AI's alert management system. Officers can triage, acknowledge, escalate to senior reviewers, or resolve alerts with documented rationale. Every action is time-stamped, attributed to an officer, and stored in a full audit trail. The escalation hierarchy flows from Project Director → Ministry Nodal Officer → PMO Review, ensuring no critical risk falls through the cracks.",
    details: ["Role-based alert visibility (Project Director / Nodal Officer / PMO)", "Escalation workflow with time-bound resolution targets", "Alert status tracking: Open / Acknowledged / Escalated / Resolved", "Full officer action audit trail", "Automated re-alert if resolution SLA is breached"],
    color: "#D97706",
  },
]

const MODEL_METRICS = [
  { label: "Cost Overrun Accuracy", value: "97%", sub: "CatBoost, 5-fold CV" },
  { label: "Schedule Slip Accuracy", value: "94%", sub: "CatBoost, 5-fold CV" },
  { label: "Training Data Span",    value: "8+ Yrs", sub: "Historical project records" },
  { label: "Features Engineered",   value: "48+",    sub: "Signals per project" },
]

export default function HowItWorksPage() {
  usePageTitle("How It Works — PRAGATI-AI")
  return (
    <PublicLayout>
      <section className="lp-page-hero">
        <div className="lp-container lp-page-hero-inner">
          <div className="lp-page-breadcrumb"><Link to="/">Home</Link><span> / </span><span>How It Works</span></div>
          <p className="lp-eyebrow lp-eyebrow-light">Process</p>
          <h1 className="lp-page-h1">How PRAGATI-AI Works</h1>
          <p className="lp-page-hero-sub">A five-step pipeline from raw ministry data to prioritised, explainable governance intelligence — refreshed monthly, auditable at every step.</p>
        </div>
      </section>

      {/* Model metrics */}
      <div className="lp-metrics-band">
        <div className="lp-container lp-metrics-grid">
          {MODEL_METRICS.map((m, i) => (
            <div key={i} className="lp-metric">
              <div className="lp-metric-num">{m.value}</div>
              <div className="lp-metric-label">{m.label}</div>
              <div style={{ fontSize: "0.68rem", color: "#8bacc8", marginTop: "4px" }}>{m.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <section className="lp-page-section lp-section-white">
        <div className="lp-container">
          <div className="lp-section-head">
            <p className="lp-eyebrow">Pipeline</p>
            <h2 className="lp-h2">The Five-Step Process</h2>
          </div>
          <div className="lp-hiw-steps">
            {STEPS.map((step, i) => (
              <div key={i} className="lp-hiw-step">
                <div className="lp-hiw-step-num-col">
                  <div className="lp-hiw-step-num" style={{ background: step.color }}>{step.num}</div>
                  {i < STEPS.length - 1 && <div className="lp-hiw-step-connector" />}
                </div>
                <div className="lp-hiw-step-content">
                  <div className="lp-hiw-step-title">{step.title}</div>
                  <div className="lp-hiw-step-sub">{step.sub}</div>
                  <p className="lp-hiw-step-body">{step.body}</p>
                  <ul className="lp-hiw-step-list">
                    {step.details.map((d, j) => (
                      <li key={j}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={step.color} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-page-section lp-section-pale">
        <div className="lp-container" style={{ textAlign: "center" }}>
          <p className="lp-eyebrow">Transparency</p>
          <h2 className="lp-h2">No Black Boxes in Government AI</h2>
          <p className="lp-section-lead" style={{ maxWidth: "600px", margin: "0 auto 32px" }}>
            PRAGATI-AI's explainability layer ensures that every decision made on the basis of an ML score can be traced, justified, and audited. This is not just good practice — it is the core requirement for deploying AI responsibly in public governance.
          </p>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/login" className="lp-btn-primary" id="hiw-platform-btn">
              Access the Platform
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
            <Link to="/about" className="lp-btn-ghost-dark">Learn About Our Mandate</Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}

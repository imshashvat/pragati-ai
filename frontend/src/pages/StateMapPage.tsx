// src/pages/StateMapPage.tsx
import React from "react"
import { Link } from "react-router-dom"
import PublicLayout from "../components/PublicLayout"
import { usePageTitle } from "../hooks/usePageTitle"
import IndiaMapSection from "../components/IndiaMapSection"

const INSIGHTS = [
  { state: "Uttar Pradesh", projects: 182, risk: "Critical", color: "#C0392B", outlay: "₹6.8 Lakh Cr." },
  { state: "Maharashtra",   projects: 137, risk: "Critical", color: "#C0392B", outlay: "₹5.1 Lakh Cr." },
  { state: "Rajasthan",     projects: 99,  risk: "High",     color: "#E67E22", outlay: "₹3.2 Lakh Cr." },
]

export default function StateMapPage() {
  usePageTitle("State Map — PRAGATI-AI")
  return (
    <PublicLayout>
      <section className="lp-page-hero">
        <div className="lp-container lp-page-hero-inner">
          <div className="lp-page-breadcrumb"><Link to="/">Home</Link><span> / </span><span>State Map</span></div>
          <p className="lp-eyebrow lp-eyebrow-light">State-wise Intelligence</p>
          <h1 className="lp-page-h1">State-wise Project Intelligence Map</h1>
          <p className="lp-page-hero-sub">Explore state-wise distribution of centrally monitored infrastructure projects. Hover over any state to view its complete project portfolio, total outlay, expenditure, and ML-predicted risk band.</p>
        </div>
      </section>

      {/* Full-width map */}
      <IndiaMapSection />

      {/* Key insights below map */}
      <section className="lp-page-section lp-section-pale">
        <div className="lp-container">
          <div className="lp-section-head">
            <p className="lp-eyebrow">Key Insights</p>
            <h2 className="lp-h2">States Requiring Immediate Attention</h2>
            <p className="lp-section-lead">States currently classified as Critical or High risk by PRAGATI-AI's ML model, requiring priority officer review.</p>
          </div>
          <div className="lp-insights-grid">
            {INSIGHTS.map((ins, i) => (
              <div key={i} className="lp-insight-card" style={{ borderTop: `4px solid ${ins.color}` }}>
                <div className="lp-insight-state">{ins.state}</div>
                <div className="lp-insight-risk" style={{ color: ins.color }}>{ins.risk} Risk</div>
                <div className="lp-insight-row"><span className="lp-insight-label">Projects Monitored</span><span className="lp-insight-val">{ins.projects}</span></div>
                <div className="lp-insight-row"><span className="lp-insight-label">Total Outlay</span><span className="lp-insight-val">{ins.outlay}</span></div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: "0.75rem", color: "#697077", marginTop: "20px", textAlign: "center" }}>
            Data as of July 2026 · Centrally monitored projects ≥₹150 Cr. · MoSPI PAIMANA framework
          </p>
        </div>
      </section>

      <section className="lp-page-section lp-section-dark" style={{ textAlign: "center" }}>
        <div className="lp-container">
          <h2 className="lp-h2 lp-h2-white" style={{ marginBottom: "12px" }}>Access Full Project Intelligence</h2>
          <p className="lp-body lp-body-light" style={{ marginBottom: "32px" }}>Authorised officers can drill into individual project records, SHAP explanations, and audit trails on the platform.</p>
          <Link to="/login" className="lp-btn-primary" id="statemap-cta-btn">
            Officer Sign In
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </div>
      </section>
    </PublicLayout>
  )
}

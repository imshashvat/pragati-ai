// src/pages/AboutPage.tsx
import React from "react"
import { Link } from "react-router-dom"
import PublicLayout from "../components/PublicLayout"
import { usePageTitle } from "../hooks/usePageTitle"

const RISK_BANDS = [
  { band: "Critical", color: "#C0392B", bg: "#FEF0F0", desc: "Immediate escalation required. Cost overrun >30% or schedule slip >12 months predicted." },
  { band: "High",     color: "#E67E22", bg: "#FEF9EF", desc: "Monitoring alert triggered. Early intervention recommended within 30 days." },
  { band: "Medium",   color: "#F1C40F", bg: "#FEFDE8", desc: "Watch-list status. Regular bi-weekly officer review mandated." },
  { band: "Low",      color: "#27AE60", bg: "#EEFBF4", desc: "On track. Model confidence >85% for timely completion within revised estimates." },
]

const OBJECTIVES = [
  { icon: "🏗️", title: "Prevent Capital Lock-In", body: "Identify delayed projects early so that idle capital can be redirected to higher-priority schemes, preventing multi-crore opportunity costs from compounding." },
  { icon: "🔗", title: "Eliminate Bottlenecks", body: "Surface inter-ministerial clearance delays, land acquisition stagnation, and contractor underperformance before they cascade into project collapse." },
  { icon: "📡", title: "Proactive Escalation", body: "Replace reactive post-mortem reviews with forward-looking alerts. Officers receive structured intelligence 60–90 days before a risk materialises." },
  { icon: "🔍", title: "Full Explainability", body: "Every risk score is paired with SHAP feature attributions so officers understand precisely why a project was flagged — no opaque black boxes in government decisions." },
]

const TIMELINE = [
  { year: "2017", title: "OCMS Launched", body: "Online Monitoring and Coordination System deployed for monthly project reporting across ministries." },
  { year: "2021", title: "PAIMANA Initiative", body: "MoSPI launches Predictive Analytics for Infrastructure Monitoring and National Assessment — formalising ML-based governance intelligence." },
  { year: "2023", title: "Pilot Dataset", body: "Gradient-boosted model trained on 5 years of project records across Roads & Highways and Railways sectors. Validation accuracy: 94%." },
  { year: "2025", title: "Full Platform Deployment", body: "PRAGATI-AI extended to all 6 critical infrastructure sectors, 1,200+ projects, 28 States & UTs." },
  { year: "2026", title: "Explainability Layer", body: "SHAP attribution dashboard added, giving project officers per-feature transparency for every ML risk prediction." },
]

export default function AboutPage() {
  usePageTitle("About — PRAGATI-AI")
  return (
    <PublicLayout>
      {/* ── HERO ── */}
      <section className="lp-page-hero" aria-labelledby="about-page-h">
        <div className="lp-container lp-page-hero-inner">
          <div className="lp-page-breadcrumb">
            <Link to="/">Home</Link><span> / </span><span>About</span>
          </div>
          <p className="lp-eyebrow lp-eyebrow-light">About the Platform</p>
          <h1 id="about-page-h" className="lp-page-h1">
            India's First ML-Powered<br />Infrastructure Risk Monitor
          </h1>
          <p className="lp-page-hero-sub">
            PRAGATI-AI is a national-scale predictive governance intelligence platform built
            for MoSPI's PAIMANA initiative — turning raw ministry data into actionable risk alerts.
          </p>
        </div>
      </section>

      {/* ── MANDATE ── */}
      <section className="lp-page-section lp-section-white">
        <div className="lp-container">
          <div className="lp-about-layout">
            <div className="lp-about-copy">
              <p className="lp-eyebrow">Our Mandate</p>
              <h2 className="lp-h2">MoSPI's Infrastructure &amp; Project Monitoring Division</h2>
              <p className="lp-body">
                The Ministry of Statistics and Programme Implementation (MoSPI) is the apex body
                for national-level infrastructure project monitoring in India. Under its Infrastructure
                and Project Monitoring Division (IPMD), the ministry tracks all central government
                capital expenditure projects above ₹150 Crore.
              </p>
              <p className="lp-body">
                PRAGATI-AI operationalises MoSPI's PAIMANA framework by transforming monthly
                project data — cost logs, milestone completions, expenditure reports — into
                forward-looking ML risk scores that allow officers to act <strong>before</strong> projects
                enter irreversible delay or cost overrun territory.
              </p>
              <div className="lp-chips">
                {["PAIMANA Framework","SHAP Explainability","Full Audit Trail","Role-Based Access","Data Provenance"].map((c, i) => (
                  <span key={i} className="lp-chip">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    {c}
                  </span>
                ))}
              </div>
            </div>
            <div className="lp-about-tiles">
              <div className="lp-tile lp-tile-navy">
                <div className="lp-tile-bigstat">₹42 Lakh Cr.</div>
                <div className="lp-tile-sublabel">Portfolio under active monitoring</div>
              </div>
              <div className="lp-tile lp-tile-warm">
                <div className="lp-tile-bigstat lp-stat-dark">1,200+</div>
                <div className="lp-tile-sublabel lp-sub-dark">Central government projects tracked</div>
              </div>
              <div className="lp-tile lp-tile-feature">
                <div className="lp-tile-bigstat lp-stat-blue">97%</div>
                <div className="lp-tile-body-text">Model prediction accuracy on held-out validation set</div>
              </div>
              <div className="lp-tile lp-tile-feature">
                <div className="lp-tile-bigstat lp-stat-blue">48 hrs</div>
                <div className="lp-tile-body-text">Average time from alert generation to officer resolution</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── EVOLUTION TIMELINE ── */}
      <section className="lp-page-section lp-section-pale">
        <div className="lp-container">
          <div className="lp-section-head">
            <p className="lp-eyebrow">Evolution</p>
            <h2 className="lp-h2">From OCMS to PAIMANA to PRAGATI-AI</h2>
            <p className="lp-section-lead">A decade of building India's government intelligence infrastructure.</p>
          </div>
          <div className="lp-timeline">
            {TIMELINE.map((t, i) => (
              <div key={i} className="lp-timeline-item">
                <div className="lp-timeline-year">{t.year}</div>
                <div className="lp-timeline-dot" />
                <div className="lp-timeline-content">
                  <div className="lp-timeline-title">{t.title}</div>
                  <p className="lp-timeline-body">{t.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4-TIER RISK CLASSIFICATION ── */}
      <section className="lp-page-section lp-section-white">
        <div className="lp-container">
          <div className="lp-section-head">
            <p className="lp-eyebrow">Risk Model</p>
            <h2 className="lp-h2">4-Tier Risk Classification</h2>
            <p className="lp-section-lead">Every project is scored and classified into one of four risk bands based on ML predictions.</p>
          </div>
          <div className="lp-risk-bands">
            {RISK_BANDS.map((r, i) => (
              <div key={i} className="lp-risk-band-card" style={{ background: r.bg, borderLeft: `4px solid ${r.color}` }}>
                <div className="lp-risk-band-label" style={{ color: r.color }}>{r.band}</div>
                <p className="lp-risk-band-desc">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── KEY OBJECTIVES ── */}
      <section className="lp-page-section lp-section-pale">
        <div className="lp-container">
          <div className="lp-section-head">
            <p className="lp-eyebrow">Objectives</p>
            <h2 className="lp-h2">What PRAGATI-AI Sets Out to Achieve</h2>
          </div>
          <div className="lp-objectives-grid">
            {OBJECTIVES.map((o, i) => (
              <div key={i} className="lp-objective-card">
                <div className="lp-objective-icon">{o.icon}</div>
                <h3 className="lp-objective-title">{o.title}</h3>
                <p className="lp-objective-body">{o.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="lp-page-section lp-section-dark" style={{ textAlign: "center" }}>
        <div className="lp-container">
          <h2 className="lp-h2 lp-h2-white" style={{ marginBottom: "12px" }}>Ready to Explore the Platform?</h2>
          <p className="lp-body lp-body-light" style={{ marginBottom: "32px" }}>Authorised officers can sign in to access live project risk intelligence.</p>
          <Link to="/login" className="lp-btn-primary" id="about-cta-btn">
            Officer Sign In
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </div>
      </section>
    </PublicLayout>
  )
}

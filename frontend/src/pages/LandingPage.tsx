// src/pages/LandingPage.tsx
// PRAGATI-AI Public Landing Page
// Design: "Institutional Intelligence" — Apple calm × IBM precision
// Color: #0F62FE primary | #102A43 navy | #F7F8FA surface

import '../landing.css'
import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePageTitle } from '../hooks/usePageTitle'

// ── Animated count-up ─────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1600, started = false) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!started) return
    let raf: number
    let start: number | null = null
    const step = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      const ease = 1 - (1 - p) ** 3
      setValue(Math.floor(ease * target))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, started])
  return value
}

// ── Data ──────────────────────────────────────────────────────────────────────
const METRICS = [
  { value: 1200, suffix: '+', label: 'Projects Monitored'      },
  { value: 97,   suffix: '%', label: 'Prediction Accuracy'     },
  { value: 28,   suffix: '',  label: 'States & UTs'            },
  { value: 4800, suffix: '+', label: 'Alerts Resolved'         },
  { value: 6,    suffix: '',  label: 'Sectors Covered'         },
  { value: 52,   suffix: '%', label: 'Cost Overrun Reduction'  },
]

const SECTORS = [
  { label: 'Roads & Highways',  tag: 'MoRTH',    count: '340+' },
  { label: 'Railways',          tag: 'MoR',       count: '180+' },
  { label: 'Energy & Power',    tag: 'MoP',       count: '260+' },
  { label: 'Civil Aviation',    tag: 'MoCA',      count: '85+'  },
  { label: 'Urban Development', tag: 'MoHUA',     count: '220+' },
  { label: 'Ports & Waterways', tag: 'MoPSW',     count: '115+' },
]

const PROCESS = [
  {
    num: '01',
    title: 'Ingest',
    sub: 'Data from ministries',
    body: 'Officers upload project-level data from ministry MIS portals. Every batch is logged with full provenance — source, timestamp, officer ID — before processing begins.',
  },
  {
    num: '02',
    title: 'Score',
    sub: 'ML risk computation',
    body: 'A gradient-boosted model scores every project on delay risk, cost overrun probability, and governance compliance. SHAP attributions are stored alongside each score.',
  },
  {
    num: '03',
    title: 'Alert',
    sub: 'Prioritised intelligence',
    body: 'High-risk projects surface as structured alerts. Officers triage, escalate, or resolve with documented rationale — every action time-stamped for accountability.',
  },
]

const SHAP_FEATURES = [
  { label: 'Cost deviation %',    value: '+0.31', pct: 78, positive: true  },
  { label: 'Schedule slippage',   value: '+0.22', pct: 55, positive: true  },
  { label: 'Contractor changes',  value: '+0.14', pct: 35, positive: true  },
  { label: 'Approval lag (days)', value: '+0.09', pct: 22, positive: true  },
  { label: 'Land acquisition',    value: '−0.06', pct: 15, positive: false },
]

// ── Sub-components ────────────────────────────────────────────────────────────
function MetricTile({ value, suffix, label, started }: {
  value: number; suffix: string; label: string; started: boolean
}) {
  const n = useCountUp(value, 1600, started)
  return (
    <div className="lp-metric">
      <div className="lp-metric-num">{n.toLocaleString('en-IN')}{suffix}</div>
      <div className="lp-metric-label">{label}</div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  usePageTitle('PRAGATI-AI — National Infrastructure Intelligence Platform')

  const metricsRef = useRef<HTMLDivElement>(null)
  const [metricsOn, setMetricsOn] = useState(false)
  const [menuOpen, setMenuOpen]   = useState(false)

  useEffect(() => {
    const el = metricsRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setMetricsOn(true) },
      { threshold: 0.2 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Close mobile menu on scroll
  useEffect(() => {
    const fn = () => setMenuOpen(false)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <div className="lp">

      {/* ── UTILITY BAR ─────────────────────────────────────────────────── */}
      <div className="lp-util">
        <div className="lp-container lp-util-inner">
          <div className="lp-util-left">
            <img
              src="/images/data-for-dev.png"
              alt="MoSPI"
              className="lp-util-emblem"
              onError={e => (e.currentTarget.style.display = 'none')}
            />
            <span>Ministry of Statistics &amp; Programme Implementation · Government of India</span>
          </div>
          <div className="lp-util-right">
            <span>PAIMANA Framework</span>
          </div>
        </div>
      </div>

      {/* ── NAVBAR ──────────────────────────────────────────────────────── */}
      <header className="lp-nav" role="banner">
        <div className="lp-container lp-nav-inner">
          <a href="/" className="lp-logo" aria-label="PRAGATI-AI home">
            <div className="lp-logo-mark" aria-hidden="true">P</div>
            <div className="lp-logo-text">
              <span className="lp-logo-name">PRAGATI-AI</span>
              <span className="lp-logo-sub">Predictive Infrastructure Intelligence</span>
            </div>
          </a>

          <nav className="lp-nav-links" aria-label="Primary navigation">
            <a href="#about"   className="lp-nav-link">About</a>
            <a href="#sectors" className="lp-nav-link">Sectors</a>
            <a href="#process" className="lp-nav-link">How It Works</a>
            <a href="#ai"      className="lp-nav-link">Data &amp; AI</a>
            <Link to="/login" className="lp-nav-cta" id="nav-sign-in">
              Officer Sign In
            </Link>
          </nav>

          <button
            className="lp-hamburger"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen(v => !v)}
          >
            {menuOpen
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            }
          </button>
        </div>

        {menuOpen && (
          <nav className="lp-drawer" aria-label="Mobile navigation">
            <a href="#about"   onClick={() => setMenuOpen(false)} className="lp-drawer-link">About</a>
            <a href="#sectors" onClick={() => setMenuOpen(false)} className="lp-drawer-link">Sectors</a>
            <a href="#process" onClick={() => setMenuOpen(false)} className="lp-drawer-link">How It Works</a>
            <a href="#ai"      onClick={() => setMenuOpen(false)} className="lp-drawer-link">Data &amp; AI</a>
            <Link to="/login"  onClick={() => setMenuOpen(false)} className="lp-drawer-cta">
              Officer Sign In
            </Link>
          </nav>
        )}
      </header>

      {/* ── SECTOR TICKER ───────────────────────────────────────────────── */}
      <div className="lp-ticker" aria-hidden="true">
        <div className="lp-container lp-ticker-inner">
          {['Roads & Highways', 'Railways', 'Energy & Power', 'Civil Aviation', 'Urban Development', 'Ports & Waterways'].map((s, i) => (
            <span key={i} className="lp-ticker-item">{s}</span>
          ))}
        </div>
      </div>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="lp-hero" aria-labelledby="hero-heading">

        {/* 4-panel photography grid — all 4 actual project images */}
        <div className="lp-hero-photos" aria-hidden="true">
          <div className="lp-hero-photo">
            <img
              src="/images/banner1-1razA4xw.png"
              alt="Energy infrastructure — wind turbines, solar panels and power generation"
              loading="eager"
            />
            <div className="lp-photo-tag">Energy &amp; Power</div>
          </div>
          <div className="lp-hero-photo">
            <img
              src="/images/banner2-AZrNp54C.png"
              alt="India's national infrastructure — space, ports and roads"
              loading="eager"
            />
            <div className="lp-photo-tag">National Infrastructure</div>
          </div>
          <div className="lp-hero-photo">
            <img
              src="/images/banner3-BkFJVKqW.png"
              alt="Delhi Airport — civil aviation infrastructure"
              loading="eager"
            />
            <div className="lp-photo-tag">Civil Aviation</div>
          </div>
          <div className="lp-hero-photo">
            <img
              src="/images/banner4-BesNf3Ns.png"
              alt="Urban roads and Delhi Metro — transportation infrastructure"
              loading="eager"
            />
            <div className="lp-photo-tag">Roads &amp; Urban</div>
          </div>
        </div>


        {/* Structured text overlay */}
        <div className="lp-hero-overlay">
          <div className="lp-container">
            <div className="lp-hero-content">
              <div className="lp-hero-eyebrow">
                <span className="lp-tag-white">Government of India</span>
                <span className="lp-tag-outline">MoSPI · PAIMANA</span>
              </div>

              <h1 id="hero-heading" className="lp-hero-h1">
                Predictive Risk &amp;<br />
                <span className="lp-hero-accent">Governance Analytics</span><br />
                for National Infrastructure
              </h1>

              <p className="lp-hero-body">
                PRAGATI-AI monitors 1,200+ central government projects using machine
                learning — surfacing cost overrun risk, delay probability and governance
                gaps before they become crises.
              </p>

              <div className="lp-hero-actions">
                <Link to="/login" className="lp-btn-primary" id="hero-access-btn">
                  Access Platform
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </Link>
                <a href="#about" className="lp-btn-ghost">Learn More</a>
              </div>

              <div className="lp-hero-attribution">
                <span className="lp-attribution-label">Powered by</span>
                <img
                  src="/images/logo-paimana.png"
                  alt="PAIMANA"
                  className="lp-paimana"
                  onError={e => {
                    e.currentTarget.style.display = 'none'
                    const s = document.createElement('span')
                    s.textContent = 'PAIMANA'
                    s.style.cssText = 'color:#29ABE2;font-weight:700;font-size:0.95rem;letter-spacing:0.06em'
                    e.currentTarget.parentNode?.appendChild(s)
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── METRICS BAND ────────────────────────────────────────────────── */}
      <div className="lp-metrics-band" ref={metricsRef}>
        <div className="lp-container lp-metrics-grid">
          {METRICS.map((m, i) => (
            <MetricTile key={i} {...m} started={metricsOn} />
          ))}
        </div>
      </div>

      {/* ── ABOUT ───────────────────────────────────────────────────────── */}
      <section id="about" className="lp-section lp-section-white" aria-labelledby="about-h">
        <div className="lp-container lp-about-layout">

          <div className="lp-about-copy">
            <p className="lp-eyebrow">About</p>
            <h2 id="about-h" className="lp-h2">
              India's First ML-Powered<br />Infrastructure Risk Monitor
            </h2>
            <p className="lp-body">
              PRAGATI-AI is a national-scale intelligence platform built for MoSPI's PAIMANA
              initiative. It ingests project-level data from central ministries, computes risk
              scores using a gradient-boosted ML model, and surfaces high-risk projects as
              structured alerts for reviewing officers.
            </p>
            <p className="lp-body">
              Unlike conventional reporting dashboards, PRAGATI-AI delivers
              <strong> explainable AI</strong> — every risk score is paired with SHAP feature
              attributions so officers understand precisely why a project was flagged and can
              take targeted, auditable action.
            </p>
            <div className="lp-chips">
              {['SHAP Explainability', 'Full Audit Trail', 'Role-Based Access', 'Data Provenance'].map((c, i) => (
                <span key={i} className="lp-chip">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  {c}
                </span>
              ))}
            </div>
          </div>

          <div className="lp-about-tiles">
            <div className="lp-tile lp-tile-feature">
              <img
                src="/images/new-project.png"
                alt="Infrastructure monitoring"
                className="lp-tile-icon-img"
                onError={e => (e.currentTarget.style.display = 'none')}
              />
              <div className="lp-tile-heading">Infrastructure Monitoring</div>
              <div className="lp-tile-body-text">Real-time risk scoring across all central government schemes</div>
            </div>

            <div className="lp-tile lp-tile-navy">
              <div className="lp-tile-bigstat">₹42 Lakh Cr.</div>
              <div className="lp-tile-sublabel">Portfolio under active monitoring</div>
            </div>

            <div className="lp-tile lp-tile-warm">
              <div className="lp-tile-bigstat lp-stat-dark">48 hrs</div>
              <div className="lp-tile-sublabel lp-sub-dark">Average alert-to-resolution time</div>
            </div>

            <div className="lp-tile lp-tile-feature">
              <div className="lp-tile-bigstat lp-stat-blue">100%</div>
              <div className="lp-tile-body-text">Open-weight model — every decision explainable</div>
            </div>
          </div>

        </div>
      </section>

      {/* ── SECTORS ─────────────────────────────────────────────────────── */}
      <section id="sectors" className="lp-section lp-section-pale" aria-labelledby="sectors-h">
        <div className="lp-container">
          <div className="lp-section-head">
            <p className="lp-eyebrow">Coverage</p>
            <h2 id="sectors-h" className="lp-h2">Six Critical Infrastructure Sectors</h2>
            <p className="lp-section-lead">
              PRAGATI-AI covers all major central government capital expenditure
              sectors tracked under MoSPI's PAIMANA monitoring framework.
            </p>
          </div>

          <div className="lp-sectors-grid">
            {SECTORS.map((s, i) => (
              <div key={i} className="lp-sector-card">
                <div className="lp-sector-top">
                  <span className="lp-sector-tag">{s.tag}</span>
                  <span className="lp-sector-count">{s.count} projects</span>
                </div>
                <div className="lp-sector-name">{s.label}</div>
                <div className="lp-sector-bar" aria-hidden="true" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROCESS ─────────────────────────────────────────────────────── */}
      <section id="process" className="lp-section lp-section-white" aria-labelledby="process-h">
        <div className="lp-container">
          <div className="lp-section-head">
            <p className="lp-eyebrow">Process</p>
            <h2 id="process-h" className="lp-h2">How PRAGATI-AI Works</h2>
            <p className="lp-section-lead">
              A three-step pipeline — from raw ministry data to prioritised actionable intelligence.
            </p>
          </div>

          <div className="lp-process-grid">
            {PROCESS.map((step, i) => (
              <div key={i} className="lp-process-card">
                <div className="lp-process-num">{step.num}</div>
                <div className="lp-process-connector" aria-hidden="true" />
                <div className="lp-process-title">{step.title}</div>
                <div className="lp-process-sub">{step.sub}</div>
                <p className="lp-process-body">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI TRANSPARENCY ─────────────────────────────────────────────── */}
      <section id="ai" className="lp-section lp-section-dark" aria-labelledby="ai-h">
        <div className="lp-container lp-ai-layout">

          <div className="lp-ai-copy">
            <p className="lp-eyebrow lp-eyebrow-light">Data &amp; AI Transparency</p>
            <h2 id="ai-h" className="lp-h2 lp-h2-white">
              No Black Boxes.<br />Every Decision Explained.
            </h2>
            <p className="lp-body lp-body-light">
              PRAGATI-AI's model uses gradient-boosted trees trained on historical project
              records. Every risk score is accompanied by SHAP feature attributions — giving
              officers precise, actionable reasoning rather than opaque risk numbers.
            </p>
            <p className="lp-body lp-body-light">
              The Data Provenance screen shows exactly where every data point originated,
              when it was ingested, and whether it reflects live ministry data or the seeded
              demonstration dataset — no silent data surprises.
            </p>
            <ul className="lp-feature-list">
              {[
                'SHAP explanations per project',
                'Full ingestion audit log',
                'Source provenance on every prediction',
                'Model performance tracking dashboard',
              ].map((f, i) => (
                <li key={i} className="lp-feature-item">
                  <span className="lp-feature-dot" />
                  {f}
                </li>
              ))}
            </ul>
            <Link to="/login" className="lp-btn-primary" id="ai-access-btn">
              Access the Platform
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>

          {/* SHAP mockup panel */}
          <div className="lp-mockup" role="img" aria-label="SHAP risk score explanation panel">
            <div className="lp-mockup-header">
              <span className="lp-mock-dot lp-dot-red" />
              <span className="lp-mock-dot lp-dot-amber" />
              <span className="lp-mock-dot lp-dot-green" />
              <span className="lp-mock-title">Model Intelligence · Risk Analysis</span>
            </div>
            <div className="lp-mockup-body">
              <div className="lp-mock-score-row">
                <span className="lp-mock-score-label">Overall Risk Score</span>
                <span className="lp-mock-score-val">0.82</span>
                <span className="lp-mock-score-badge">Critical</span>
              </div>
              <div className="lp-mock-divider" />
              <div className="lp-mock-shap-label">Top Risk Drivers (SHAP Attribution)</div>
              {SHAP_FEATURES.map((f, i) => (
                <div key={i} className="lp-mock-row">
                  <span className="lp-mock-feat">{f.label}</span>
                  <div className="lp-mock-track">
                    <div
                      className={`lp-mock-fill ${f.positive ? 'lp-fill-risk' : 'lp-fill-safe'}`}
                      style={{ width: `${f.pct}%` }}
                    />
                  </div>
                  <span className={`lp-mock-val ${f.positive ? 'lp-val-risk' : 'lp-val-safe'}`}>
                    {f.value}
                  </span>
                </div>
              ))}
              <div className="lp-mock-divider" />
              <div className="lp-mock-prov">
                <span className="lp-prov-dot" />
                Demo data · model_mode: demo · Ingested 2026-09-04
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── PARTNERS ────────────────────────────────────────────────────── */}
      <section className="lp-partners" aria-label="Platform partners">
        <div className="lp-container lp-partners-inner">
          <span className="lp-partners-label">An initiative under</span>
          <div className="lp-partners-row">

            <div className="lp-partner">
              <img
                src="/images/data-for-dev.png"
                alt="Ministry of Statistics and Programme Implementation"
                className="lp-partner-img"
                onError={e => (e.currentTarget.style.display = 'none')}
              />
              <span className="lp-partner-label">MoSPI</span>
            </div>

            <div className="lp-partner-sep" />

            <div className="lp-partner">
              <img
                src="/images/logo-paimana.png"
                alt="PAIMANA"
                className="lp-partner-img lp-partner-wide"
                onError={e => (e.currentTarget.style.display = 'none')}
              />
              <span className="lp-partner-label">PAIMANA Framework</span>
            </div>

            <div className="lp-partner-sep" />

            <div className="lp-partner">
              <img
                src="/images/banner4-BesNf3Ns.png"
                alt="Infrastructure"
                className="lp-partner-img"
                onError={e => (e.currentTarget.style.display = 'none')}
              />
              <span className="lp-partner-label">National Infrastructure</span>
            </div>

          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="lp-footer" role="contentinfo">
        <div className="lp-container lp-footer-grid">

          <div className="lp-footer-brand">
            <div className="lp-footer-logo">
              <div className="lp-logo-mark lp-logo-mark-sm" aria-hidden="true">P</div>
              <span className="lp-footer-brand-name">PRAGATI-AI</span>
            </div>
            <p className="lp-footer-tagline">
              Predictive Risk &amp; Governance Analytics for Timely Infrastructure.
              A MoSPI PAIMANA platform.
            </p>
            <p className="lp-footer-disclaimer">
              Prototype system. All displayed data is seeded demonstration data or
              uploaded by authorised officers. Not for public dissemination.
            </p>
          </div>

          <div className="lp-footer-col">
            <div className="lp-footer-col-title">Platform</div>
            <Link to="/login"  className="lp-footer-link">Officer Sign In</Link>
            <a href="#about"   className="lp-footer-link">About</a>
            <a href="#sectors" className="lp-footer-link">Sectors</a>
            <a href="#process" className="lp-footer-link">How It Works</a>
            <a href="#ai"      className="lp-footer-link">Data &amp; AI</a>
          </div>

          <div className="lp-footer-col">
            <div className="lp-footer-col-title">Contact</div>
            <a href="mailto:pragati-ai@mospi.gov.in" className="lp-footer-link">
              pragati-ai@mospi.gov.in
            </a>
            <span className="lp-footer-text">Ministry of Statistics &amp; P.I.</span>
            <span className="lp-footer-text">Government of India</span>
          </div>

        </div>

        <div className="lp-footer-bottom">
          <div className="lp-container lp-footer-bottom-row">
            <span>© 2026 PRAGATI-AI · MoSPI · Government of India</span>
            <span>Data for Development · PAIMANA</span>
          </div>
        </div>
      </footer>

    </div>
  )
}

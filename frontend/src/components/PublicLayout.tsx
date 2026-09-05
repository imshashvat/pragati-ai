// src/components/PublicLayout.tsx
// Shared wrapper for all public pages: MoSPI navbar + footer + sector ticker

import React from 'react'
import { Link } from 'react-router-dom'
import PublicNavbar from './PublicNavbar'
import '../landing.css'

const SECTOR_TICKERS = [
  'Roads & Highways', 'Railways', 'Energy & Power',
  'Civil Aviation', 'Urban Development', 'Ports & Waterways',
]

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lp">
      <PublicNavbar />

      <div className="lp-ticker" aria-hidden="true">
        <div className="lp-container lp-ticker-inner">
          {SECTOR_TICKERS.map((s, i) => <span key={i} className="lp-ticker-item">{s}</span>)}
        </div>
      </div>

      <main>{children}</main>

      <footer className="lp-footer" role="contentinfo">
        <div className="lp-container lp-footer-grid">
          <div className="lp-footer-brand">
            <div className="lp-footer-logo">
              <div className="lp-logo-mark lp-logo-mark-sm" aria-hidden="true">P</div>
              <span className="lp-footer-brand-name">PRAGATI-AI</span>
            </div>
            <p className="lp-footer-tagline">Predictive Risk &amp; Governance Analytics for Timely Infrastructure. A MoSPI PAIMANA platform.</p>
            <p className="lp-footer-disclaimer">Prototype system. All displayed data is seeded demonstration data or uploaded by authorised officers. Not for public dissemination.</p>
          </div>
          <div className="lp-footer-col">
            <div className="lp-footer-col-title">Platform</div>
            <Link to="/login"        className="lp-footer-link">Officer Sign In</Link>
            <Link to="/about"        className="lp-footer-link">About</Link>
            <Link to="/sectors"      className="lp-footer-link">Sectors</Link>
            <Link to="/how-it-works" className="lp-footer-link">How It Works</Link>
            <Link to="/state-map"    className="lp-footer-link">State Map</Link>
            <Link to="/contact"      className="lp-footer-link">Contact Us</Link>
          </div>
          <div className="lp-footer-col">
            <div className="lp-footer-col-title">Contact</div>
            <a href="mailto:pragati-ai@mospi.gov.in" className="lp-footer-link">pragati-ai@mospi.gov.in</a>
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

      <div className="lp-ticker" aria-hidden="true">
        <div className="lp-container lp-ticker-inner">
          {SECTOR_TICKERS.map((s, i) => <span key={i} className="lp-ticker-item">{s}</span>)}
        </div>
      </div>

      <main>{children}</main>

      <footer className="lp-footer" role="contentinfo">
        <div className="lp-container lp-footer-grid">
          <div className="lp-footer-brand">
            <div className="lp-footer-logo">
              <div className="lp-logo-mark lp-logo-mark-sm" aria-hidden="true">P</div>
              <span className="lp-footer-brand-name">PRAGATI-AI</span>
            </div>
            <p className="lp-footer-tagline">Predictive Risk &amp; Governance Analytics for Timely Infrastructure. A MoSPI PAIMANA platform.</p>
            <p className="lp-footer-disclaimer">Prototype system. All displayed data is seeded demonstration data or uploaded by authorised officers. Not for public dissemination.</p>
          </div>
          <div className="lp-footer-col">
            <div className="lp-footer-col-title">Platform</div>
            <Link to="/login"        className="lp-footer-link">Officer Sign In</Link>
            <Link to="/about"        className="lp-footer-link">About</Link>
            <Link to="/sectors"      className="lp-footer-link">Sectors</Link>
            <Link to="/how-it-works" className="lp-footer-link">How It Works</Link>
            <Link to="/state-map"    className="lp-footer-link">State Map</Link>
            <Link to="/contact"      className="lp-footer-link">Contact Us</Link>
          </div>
          <div className="lp-footer-col">
            <div className="lp-footer-col-title">Contact</div>
            <a href="mailto:pragati-ai@mospi.gov.in" className="lp-footer-link">pragati-ai@mospi.gov.in</a>
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

// src/components/PublicLayout.tsx
// Shared wrapper for all public pages: MoSPI navbar + footer + sector ticker
// Active nav link is highlighted automatically via useLocation().

import React, { useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import "../landing.css"

const NAV_LINKS = [
  { to: "/",             label: "Home"         },
  { to: "/about",        label: "About"        },
  { to: "/sectors",      label: "Sectors"      },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/state-map",    label: "State Map"    },
  { to: "/contact",      label: "Contact"      },
]

const SECTOR_TICKERS = [
  "Roads & Highways","Railways","Energy & Power",
  "Civil Aviation","Urban Development","Ports & Waterways",
]

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const location  = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const fn = () => setMenuOpen(false)
    window.addEventListener("scroll", fn, { passive: true })
    return () => window.removeEventListener("scroll", fn)
  }, [])

  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to)

  return (
    <div className="lp">
      <header className="lp-nav" role="banner">
        <div className="lp-container lp-nav-inner">
          <Link to="/" className="lp-logo" aria-label="PRAGATI-AI home">
            <img src="/images/logo-mospi.png" alt="MoSPI" className="lp-mospi-logo" />
            <div className="lp-logo-divider" aria-hidden="true" />
            <div className="lp-logo-text">
              <span className="lp-logo-name">PRAGATI-AI</span>
              <span className="lp-logo-sub">Predictive Infrastructure Intelligence · MoSPI</span>
            </div>
          </Link>
          <nav className="lp-nav-links" aria-label="Primary navigation">
            {NAV_LINKS.map(({ to, label }) => (
              <Link key={to} to={to} className={"lp-nav-link" + (isActive(to) ? " lp-nav-link--active" : "")}>
                {label}
              </Link>
            ))}
            <Link to="/login" className="lp-nav-cta" id="nav-sign-in">Officer Sign In</Link>
          </nav>
          <button className="lp-hamburger" aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen(v => !v)}>
            {menuOpen
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            }
          </button>
        </div>
        {menuOpen && (
          <nav className="lp-drawer" aria-label="Mobile navigation">
            {NAV_LINKS.map(({ to, label }) => (
              <Link key={to} to={to} className={"lp-drawer-link" + (isActive(to) ? " lp-drawer-link--active" : "")}>
                {label}
              </Link>
            ))}
            <Link to="/login" className="lp-drawer-cta">Officer Sign In</Link>
          </nav>
        )}
      </header>

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

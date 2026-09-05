// src/components/PublicNavbar.tsx
// Shared MoSPI top navbar — public pages AND post-login pages.
//
// Mobile behaviour:
//   - Desktop (>768px): full logo + nav links + rightSlot side-by-side
//   - Mobile  (≤768px): compact logo + hamburger opens drawer with nav links only
//                        rightSlot items stay in the top bar (NOT dumped into drawer)
//                        An optional mobileSignOutLabel lets us add a simple logout row

import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import '../landing.css'

const NAV_LINKS = [
  { to: '/',             label: 'Home'         },
  { to: '/about',        label: 'About'        },
  { to: '/sectors',      label: 'Sectors'      },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/state-map',    label: 'State Map'    },
  { to: '/contact',      label: 'Contact'      },
]

interface Props {
  /** Desktop right slot (CTA button, badges etc). NOT shown inside mobile drawer. */
  rightSlot?: React.ReactNode
  /**
   * If provided, shown at the bottom of the mobile drawer as a simple sign-out/login row.
   * Pass a React node, e.g. <button onClick={logout}>Sign Out</button>.
   * On public pages leave undefined — the default "Officer Sign In" link is shown.
   */
  mobileAuthSlot?: React.ReactNode
}

export default function PublicNavbar({ rightSlot, mobileAuthSlot }: Props) {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // Close menu on scroll or route change
  useEffect(() => {
    const fn = () => setMenuOpen(false)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)

  return (
    <header className="lp-nav" role="banner">
      <div className="lp-container lp-nav-inner">

        {/* ── Logo ─────────────────────────────────────────────────── */}
        <Link to="/" className="lp-logo" aria-label="PRAGATI-AI home">
          <img src="/images/logo-mospi.png" alt="MoSPI" className="lp-mospi-logo" />
          <div className="lp-logo-divider" aria-hidden="true" />
          <div className="lp-logo-text">
            <span className="lp-logo-name">PRAGATI-AI</span>
            <span className="lp-logo-sub lp-logo-sub--hide-xs">
              Predictive Infrastructure Intelligence · MoSPI
            </span>
          </div>
        </Link>

        {/* ── Desktop nav links (hidden ≤768px) ───────────────────── */}
        <nav className="lp-nav-links" aria-label="Primary navigation">
          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={to} to={to}
              className={'lp-nav-link' + (isActive(to) ? ' lp-nav-link--active' : '')}
            >
              {label}
            </Link>
          ))}
          {rightSlot ?? (
            <Link to="/login" className="lp-nav-cta" id="nav-sign-in">Officer Sign In</Link>
          )}
        </nav>

        {/* ── Mobile right side: rightSlot + hamburger ────────────── */}
        <div className="lp-mobile-controls">
          {/* rightSlot items (ProvenanceBadge, Sign Out, sidebar toggle) */}
          {rightSlot && (
            <div className="lp-mobile-right-slot">
              {rightSlot}
            </div>
          )}
          {/* Hamburger for public nav drawer */}
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
      </div>

      {/* ── Mobile drawer — public nav links ONLY ───────────────────── */}
      {menuOpen && (
        <nav className="lp-drawer" aria-label="Mobile navigation">
          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={to} to={to}
              className={'lp-drawer-link' + (isActive(to) ? ' lp-drawer-link--active' : '')}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
          {/* Auth action row at bottom of drawer */}
          {mobileAuthSlot
            ? <div className="lp-drawer-auth-row">{mobileAuthSlot}</div>
            : <Link to="/login" className="lp-drawer-cta" onClick={() => setMenuOpen(false)}>Officer Sign In</Link>
          }
        </nav>
      )}
    </header>
  )
}

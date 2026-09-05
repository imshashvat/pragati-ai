// src/components/PublicNavbar.tsx
// Shared MoSPI top navbar — used on public pages AND post-login app pages

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
  /** If provided, show this instead of "Officer Sign In" button (e.g. for logged-in users) */
  rightSlot?: React.ReactNode
}

export default function PublicNavbar({ rightSlot }: Props) {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

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
          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={to} to={to}
              className={'lp-drawer-link' + (isActive(to) ? ' lp-drawer-link--active' : '')}
            >
              {label}
            </Link>
          ))}
          {rightSlot ?? (
            <Link to="/login" className="lp-drawer-cta">Officer Sign In</Link>
          )}
        </nav>
      )}
    </header>
  )
}

// src/components/Layout.tsx
// Premium dark-navy sidebar + glass topbar — consistent with LandingPage design system
// Colors mirror landing.css: #102A43 navy, #0F62FE primary, #8bacc8 muted

import React, { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { logout } from '../api/auth'
import ProvenanceBadge from './ProvenanceBadge'

// ── Inline SVG Icons ──────────────────────────────────────────────────────────
const Icon = {
  LayoutDashboard: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  ),
  FolderOpen: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  Bell: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  BarChart2: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  Database: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
    </svg>
  ),
  Settings: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  LogOut: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  Menu: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  X: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
}

interface NavItem {
  to: string
  label: string
  icon: React.FC
  roles: string[]
  badge?: string
}

const NAV: NavItem[] = [
  { to: '/dashboard',       label: 'Portfolio',         icon: Icon.LayoutDashboard, roles: ['officer','senior_official','admin'] },
  { to: '/projects',        label: 'Projects',           icon: Icon.FolderOpen,      roles: ['officer','senior_official','admin'] },
  { to: '/alerts',          label: 'Alerts',             icon: Icon.Bell,            roles: ['officer','senior_official','admin'] },
  { to: '/model',           label: 'Model Performance',  icon: Icon.BarChart2,       roles: ['officer','senior_official','admin'] },
  { to: '/data-provenance', label: 'Data Provenance',    icon: Icon.Database,        roles: ['officer','senior_official','admin'] },
  { to: '/admin',           label: 'Admin',              icon: Icon.Settings,        roles: ['admin'] },
]

function roleLabel(role: string | null): string {
  if (!role) return ''
  const map: Record<string, string> = {
    officer: 'Field Officer',
    senior_official: 'Senior Official',
    admin: 'Administrator',
  }
  return map[role] ?? role.replace(/_/g, ' ')
}

function roleInitial(role: string | null): string {
  return roleLabel(role).charAt(0).toUpperCase()
}

// ── Sidebar content ───────────────────────────────────────────────────────────
function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { role, clearAuth } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleLogout() {
    try { await logout() } catch { /* ignore */ }
    clearAuth()
    navigate('/login')
  }

  const visible = NAV.filter(n => role && n.roles.includes(role))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Logo bar ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 20px 18px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Logo mark */}
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #0F62FE 0%, #0050E6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 700,
            color: '#fff',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(15,98,254,0.4)',
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '-0.01em',
          }}>
            P
          </div>
          <div>
            <div style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#FFFFFF',
              letterSpacing: '0.03em',
              lineHeight: 1.1,
            }}>
              PRAGATI-AI
            </div>
            <div style={{ fontSize: '10px', color: '#8bacc8', marginTop: '2px', letterSpacing: '0.01em' }}>
              PAIMANA Platform
            </div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#8bacc8', padding: '4px', borderRadius: '4px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'color 150ms',
            }}
            aria-label="Close menu"
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = '#8bacc8')}
          >
            <Icon.X />
          </button>
        )}
      </div>

      {/* ── Section label ────────────────────────────────────────────────── */}
      <div style={{
        padding: '18px 20px 8px',
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'rgba(139,172,200,0.5)',
      }}>
        Navigation
      </div>

      {/* ── Nav items ────────────────────────────────────────────────────── */}
      <nav
        style={{ flex: 1, overflowY: 'auto', paddingBottom: '12px' }}
        aria-label="Main navigation"
      >
        {visible.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            id={`nav-${item.to.replace('/', '').replace(/-/g, '_') || 'dashboard'}`}
            onClick={onClose}
            end={item.to === '/dashboard'}
            style={{ textDecoration: 'none', display: 'block' }}
          >
            {({ isActive }) => (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 20px',
                  margin: '1px 8px',
                  borderRadius: '7px',
                  fontSize: '13px',
                  fontWeight: isActive ? 500 : 400,
                  color: isActive ? '#FFFFFF' : '#8bacc8',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(15,98,254,0.25) 0%, rgba(15,98,254,0.12) 100%)'
                    : 'transparent',
                  border: isActive ? '1px solid rgba(15,98,254,0.25)' : '1px solid transparent',
                  boxShadow: isActive ? '0 1px 4px rgba(15,98,254,0.12)' : 'none',
                  transition: 'all 150ms ease',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                    e.currentTarget.style.color = '#FFFFFF'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#8bacc8'
                  }
                }}
              >
                {/* Active left bar */}
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: '20%',
                    bottom: '20%',
                    width: '3px',
                    borderRadius: '0 2px 2px 0',
                    background: '#0F62FE',
                  }} aria-hidden="true" />
                )}
                <span style={{ opacity: isActive ? 1 : 0.65, flexShrink: 0 }} aria-hidden="true">
                  <item.icon />
                </span>
                <span>{item.label}</span>
                {isActive && (
                  <span style={{ marginLeft: 'auto', opacity: 0.4 }} aria-hidden="true">
                    <Icon.ChevronRight />
                  </span>
                )}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── User section ─────────────────────────────────────────────────── */}
      <div style={{
        padding: '14px 16px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '10px',
        }}>
          {/* Avatar */}
          <div style={{
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0F62FE, #0050E6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 600,
            color: '#fff',
            flexShrink: 0,
          }}>
            {roleInitial(role)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#c8ddf0',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {roleLabel(role)}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(139,172,200,0.5)', marginTop: '1px' }}>
              PAIMANA · Authenticated
            </div>
          </div>
        </div>
        <button
          id="btn-logout"
          onClick={handleLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '8px 12px',
            fontSize: '12px',
            fontWeight: 500,
            color: '#8bacc8',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 150ms ease',
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(218,30,40,0.12)'
            e.currentTarget.style.borderColor = 'rgba(218,30,40,0.25)'
            e.currentTarget.style.color = '#ff6b6b'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
            e.currentTarget.style.color = '#8bacc8'
          }}
        >
          <Icon.LogOut />
          Sign out
        </button>
      </div>
    </div>
  )
}

// ── Main Layout ───────────────────────────────────────────────────────────────
export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F7F8FA' }}>

      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col flex-shrink-0 overflow-y-auto"
        style={{
          width: '248px',
          background: 'linear-gradient(180deg, #0d2137 0%, #102A43 40%, #0e2540 100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '2px 0 12px rgba(0,0,0,0.15)',
          zIndex: 30,
        }}
        aria-label="Sidebar"
      >
        <SidebarContent />
      </aside>

      {/* ── Mobile sidebar drawer ─────────────────────────────────────── */}
      {drawerOpen && (
        <>
          <div
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 40,
              animation: 'lp-fadeIn 200ms ease',
            }}
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div
            className="lg:hidden"
            style={{
              position: 'fixed',
              top: 0, left: 0, bottom: 0,
              width: '248px',
              background: 'linear-gradient(180deg, #0d2137 0%, #102A43 40%, #0e2540 100%)',
              borderRight: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '4px 0 24px rgba(0,0,0,0.25)',
              zIndex: 50,
              overflowY: 'auto',
              animation: 'slideIn 200ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <SidebarContent onClose={() => setDrawerOpen(false)} />
          </div>
        </>
      )}

      {/* ── Main column ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>

        {/* Top bar */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px 0 16px',
            height: '60px',
            flexShrink: 0,
            background: '#FFFFFF',
            borderBottom: '1px solid #E8ECF0',
            boxShadow: '0 1px 4px rgba(16,42,67,0.06)',
            zIndex: 30,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Hamburger — mobile only */}
            <button
              className="lg:hidden"
              style={{
                padding: '8px',
                borderRadius: '6px',
                background: 'none',
                border: 'none',
                color: '#525252',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <Icon.Menu />
            </button>

            {/* Breadcrumb / Platform name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '22px',
                height: '22px',
                borderRadius: '5px',
                background: 'linear-gradient(135deg, #0F62FE, #0050E6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 700,
                color: '#fff',
                flexShrink: 0,
              }}>
                P
              </div>
              <span style={{
                fontSize: '13px',
                fontWeight: 500,
                color: '#102A43',
                letterSpacing: '-0.01em',
              }}>
                PRAGATI-AI
              </span>
              <span style={{ color: '#C1C7CD', fontSize: '12px' }} aria-hidden="true">/</span>
              <span style={{ fontSize: '13px', color: '#697077' }}>
                Predictive Infrastructure Intelligence
              </span>
            </div>
          </div>

          {/* Right: Provenance badge */}
          <ProvenanceBadge />
        </header>

        {/* Scrollable page body */}
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 24px 32px' }}>
            <Outlet />
          </div>
        </main>
      </div>

      {/* ── Keyframe animations (mobile drawer) ─────────────────────────── */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
        @keyframes lp-fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

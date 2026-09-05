// src/components/Layout.tsx
// Premium dark-navy dashboard shell — NO Tailwind conflicts, pure inline styles
// Sidebar is always visible on desktop (≥900px), collapsible on mobile via hamburger

import React, { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { logout } from '../api/auth'
import ProvenanceBadge from './ProvenanceBadge'

// ── SVG Icons (pure inline) ───────────────────────────────────────────────────
const Icons = {
  Dashboard: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  Folder: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  Bell: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Chart: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  DB: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  Settings: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  LogOut: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Menu: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  X: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
}

interface NavItem { to: string; label: string; icon: React.FC; roles: string[] }

const NAV: NavItem[] = [
  { to: '/dashboard',       label: 'Portfolio',      icon: Icons.Dashboard, roles: ['officer','senior_official','admin'] },
  { to: '/projects',        label: 'Projects',       icon: Icons.Folder,    roles: ['officer','senior_official','admin'] },
  { to: '/alerts',          label: 'Alerts',         icon: Icons.Bell,      roles: ['officer','senior_official','admin'] },
  { to: '/data-provenance', label: 'Data Provenance',icon: Icons.DB,        roles: ['officer','senior_official','admin'] },
  { to: '/admin',           label: 'Admin',          icon: Icons.Settings,  roles: ['admin'] },
]

const ROLE_LABELS: Record<string, string> = {
  officer: 'Field Officer',
  senior_official: 'Senior Official',
  admin: 'Administrator',
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ onClose }: { onClose?: () => void }) {
  const { role, clearAuth } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    try { await logout() } catch { /**/ }
    clearAuth()
    navigate('/login')
  }

  const roleLabel = ROLE_LABELS[role ?? ''] ?? (role ?? '')
  const initial   = roleLabel.charAt(0).toUpperCase()
  const visible   = NAV.filter(n => role && n.roles.includes(role))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: "'Inter', sans-serif" }}>

      {/* Logo bar */}
      <div style={{ padding: '18px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#0F62FE,#0050E6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', boxShadow: '0 2px 8px rgba(15,98,254,.4)' }}>P</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '.03em', lineHeight: 1.1 }}>PRAGATI-AI</div>
            <div style={{ fontSize: 10, color: '#8bacc8', marginTop: 2 }}>PAIMANA Platform</div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8bacc8', padding: 4, borderRadius: 4, display: 'flex', lineHeight: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = '#8bacc8')}
          ><Icons.X /></button>
        )}
      </div>

      {/* Section label */}
      <div style={{ padding: '16px 20px 6px', fontSize: 10, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(139,172,200,.45)' }}>Navigation</div>

      {/* Nav items */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 0 8px' }}>
        {visible.map(item => (
          <NavLink key={item.to} to={item.to} onClick={onClose} end={item.to === '/dashboard'} style={{ textDecoration: 'none', display: 'block' }}>
            {({ isActive }) => (
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 16px', margin: '1px 8px', borderRadius: 7,
                  fontSize: 13, fontWeight: isActive ? 500 : 400,
                  color: isActive ? '#fff' : '#8bacc8',
                  background: isActive ? 'rgba(15,98,254,.2)' : 'transparent',
                  border: isActive ? '1px solid rgba(15,98,254,.22)' : '1px solid transparent',
                  cursor: 'pointer', transition: 'all 140ms',
                  position: 'relative',
                }}
                onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.06)'; (e.currentTarget as HTMLElement).style.color = '#fff' } }}
                onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#8bacc8' } }}
              >
                {isActive && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, borderRadius: '0 2px 2px 0', background: '#0F62FE' }} />}
                <span style={{ opacity: isActive ? 1 : .65, flexShrink: 0, lineHeight: 0 }}><item.icon /></span>
                <span>{item.label}</span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#0F62FE,#0050E6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#fff', flexShrink: 0 }}>{initial}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#c8ddf0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{roleLabel}</div>
            <div style={{ fontSize: 10, color: 'rgba(139,172,200,.5)', marginTop: 1 }}>PAIMANA · Authenticated</div>
          </div>
        </div>
        <button
          id="btn-logout"
          onClick={handleLogout}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px 12px', fontSize: 12, fontWeight: 500, color: '#8bacc8', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 6, cursor: 'pointer', transition: 'all 140ms', fontFamily: 'inherit' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(218,30,40,.12)'; e.currentTarget.style.borderColor = 'rgba(218,30,40,.3)'; e.currentTarget.style.color = '#ff6b6b' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)'; e.currentTarget.style.color = '#8bacc8' }}
        >
          <Icons.LogOut /> Sign out
        </button>
      </div>
    </div>
  )
}

// ── Main Layout ───────────────────────────────────────────────────────────────
const SIDEBAR_W = 248
const BREAKPOINT = 900 // px — sidebar visible above this width

export default function Layout() {
  const location = useLocation()
  const [windowW,     setWindowW]     = useState(window.innerWidth)
  const [drawerOpen,  setDrawerOpen]  = useState(false)

  // Track window width to show/hide sidebar
  useEffect(() => {
    const onResize = () => setWindowW(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  const isDesktop = windowW >= BREAKPOINT

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F7F8FA', fontFamily: "'Inter', sans-serif" }}>

      {/* ── Desktop Sidebar (always visible ≥ 900px) ─────────────────────── */}
      {isDesktop && (
        <aside style={{
          width: SIDEBAR_W, flexShrink: 0,
          background: 'linear-gradient(180deg, #0d2137 0%, #102A43 55%, #0e2540 100%)',
          borderRight: '1px solid rgba(255,255,255,.06)',
          boxShadow: '2px 0 12px rgba(0,0,0,.18)',
          overflowY: 'auto', zIndex: 30,
          display: 'flex', flexDirection: 'column',
        }}>
          <Sidebar />
        </aside>
      )}

      {/* ── Mobile Overlay + Drawer ───────────────────────────────────────── */}
      {!isDesktop && drawerOpen && (
        <>
          <div
            onClick={() => setDrawerOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 40, cursor: 'pointer' }}
            aria-hidden="true"
          />
          <div style={{
            position: 'fixed', top: 0, left: 0, bottom: 0,
            width: SIDEBAR_W,
            background: 'linear-gradient(180deg, #0d2137 0%, #102A43 55%, #0e2540 100%)',
            borderRight: '1px solid rgba(255,255,255,.06)',
            boxShadow: '4px 0 24px rgba(0,0,0,.3)',
            zIndex: 50, overflowY: 'auto',
            animation: 'sbSlideIn 220ms cubic-bezier(.16,1,.3,1)',
          }}>
            <Sidebar onClose={() => setDrawerOpen(false)} />
          </div>
        </>
      )}

      {/* ── Main column ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>

        {/* Top bar */}
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px 0 16px', height: 60, flexShrink: 0,
          background: '#fff', borderBottom: '1px solid #E8ECF0',
          boxShadow: '0 1px 4px rgba(16,42,67,.06)', zIndex: 30,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

            {/* Hamburger — always visible on mobile (<900px), hidden on desktop */}
            {!isDesktop && (
              <button
                id="btn-hamburger"
                onClick={() => setDrawerOpen(v => !v)}
                aria-label="Open navigation menu"
                style={{
                  padding: 8, borderRadius: 6,
                  background: 'none', border: 'none',
                  color: '#102A43', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', lineHeight: 0,
                  transition: 'background 140ms',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F3F5F7')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                {drawerOpen ? <Icons.X /> : <Icons.Menu />}
              </button>
            )}

            {/* Platform name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 22, height: 22, borderRadius: 5, background: 'linear-gradient(135deg,#0F62FE,#0050E6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>P</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#102A43', letterSpacing: '-.01em' }}>PRAGATI-AI</span>
              <span style={{ color: '#D0D7DE', fontSize: 13 }}>/</span>
              <span style={{ fontSize: 13, color: '#697077' }}>Predictive Infrastructure Intelligence</span>
            </div>
          </div>

          {/* Provenance badge */}
          <ProvenanceBadge />
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 24px 40px' }}>
            <Outlet />
          </div>
        </main>
      </div>

      <style>{`
        @keyframes sbSlideIn {
          from { transform: translateX(-100%); opacity: .6; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}

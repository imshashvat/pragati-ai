// src/components/Layout.tsx
// Premium white sidebar + 64px topbar + mobile hamburger drawer

import React, { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { logout } from '../api/auth'
import ProvenanceBadge from './ProvenanceBadge'

// ── Lucide-style SVG icons (inline — no external dependency) ──────────────
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
}

interface NavItem {
  to: string
  label: string
  icon: React.FC
  roles: string[]
}

const NAV: NavItem[] = [
  { to: '/dashboard',       label: 'Portfolio',         icon: Icon.LayoutDashboard, roles: ['officer','senior_official','admin'] },
  { to: '/projects',        label: 'Projects',           icon: Icon.FolderOpen,      roles: ['officer','senior_official','admin'] },
  { to: '/alerts',          label: 'Alerts',             icon: Icon.Bell,            roles: ['officer','senior_official','admin'] },
  { to: '/model',           label: 'Model Performance',  icon: Icon.BarChart2,       roles: ['officer','senior_official','admin'] },
  { to: '/data-provenance', label: 'Data Provenance',    icon: Icon.Database,        roles: ['officer','senior_official','admin'] },
  { to: '/admin',           label: 'Admin',              icon: Icon.Settings,        roles: ['admin'] },
]

// ── Sidebar content (shared between desktop and drawer) ───────────────────
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
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-[#E0E4E8]">
        <div>
          <div
            className="text-sm font-semibold tracking-tight"
            style={{ color: '#102A43', letterSpacing: '-0.01em' }}
          >
            PRAGATI-AI
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: '#697077' }}>
            PAIMANA Platform
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded text-[#697077] hover:text-[#161616] hover:bg-[#F3F5F7] transition-colors"
            aria-label="Close menu"
          >
            <Icon.X />
          </button>
        )}
      </div>

      {/* Nav section label */}
      <div className="px-5 pt-5 pb-2">
        <span className="section-label">Navigation</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto pb-4" aria-label="Main navigation">
        {visible.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            id={`nav-${item.to.replace('/', '').replace(/-/g, '_')}`}
            onClick={onClose}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            aria-current={undefined}  // NavLink handles this internally
            end={item.to === '/dashboard'}  // only exact match for dashboard
          >
            {({ isActive }) => (
              <>
                <span className="flex-shrink-0" style={{ opacity: isActive ? 1 : 0.6 }} aria-hidden="true">
                  <item.icon />
                </span>
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User / logout */}
      <div className="px-5 py-4 border-t border-[#E0E4E8]">
        <div className="text-[11px] font-medium" style={{ color: '#697077', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {role?.replace(/_/g, ' ')}
        </div>
        <button
          id="btn-logout"
          onClick={handleLogout}
          className="mt-2 flex items-center gap-2 text-[13px] text-[#525252] hover:text-[#161616] transition-colors"
        >
          <Icon.LogOut />
          Sign out
        </button>
      </div>
    </div>
  )
}

// ── Main Layout ──────────────────────────────────────────────────────────
export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  // Lock body scroll when drawer open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F7F8FA' }}>

      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col flex-shrink-0 bg-white border-r border-[#E0E4E8] overflow-y-auto"
        style={{ width: '256px', zIndex: 30 }}
        aria-label="Sidebar"
      >
        <SidebarContent />
      </aside>

      {/* ── Mobile sidebar drawer ────────────────────────────────────────── */}
      {drawerOpen && (
        <>
          <div
            className="sidebar-overlay lg:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="sidebar-drawer lg:hidden">
            <SidebarContent onClose={() => setDrawerOpen(false)} />
          </div>
        </>
      )}

      {/* ── Main column ─────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Top bar */}
        <header
          className="flex items-center justify-between px-4 lg:px-8 shrink-0 bg-white border-b border-[#E0E4E8]"
          style={{ height: '64px', zIndex: 30 }}
        >
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              className="lg:hidden p-2 rounded text-[#525252] hover:text-[#161616] hover:bg-[#F3F5F7] transition-colors"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <Icon.Menu />
            </button>
            {/* Platform name */}
            <span className="text-sm font-medium" style={{ color: '#102A43' }}>
              Predictive Infrastructure Intelligence
            </span>
          </div>
          <ProvenanceBadge />
        </header>

        {/* Scrollable page body */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

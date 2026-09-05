// src/App.tsx
// Root router. Protected routes redirect to /login when unauthenticated.
// Admin-only routes redirect to /dashboard when role is insufficient.

import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

import Layout             from './components/Layout'
import LoginPage          from './pages/LoginPage'
import LandingPage        from './pages/LandingPage'
import DashboardPage      from './pages/DashboardPage'
import ProjectsPage       from './pages/ProjectsPage'
import ProjectDetailPage  from './pages/ProjectDetailPage'
import AlertsPage         from './pages/AlertsPage'
import ModelPage          from './pages/ModelPage'
import DataProvenancePage from './pages/DataProvenancePage'
import AdminPage          from './pages/AdminPage'
import NotFoundPage       from './pages/NotFoundPage'
import RecommendationsPage from './pages/RecommendationsPage'

// Public info pages
import AboutPage        from './pages/AboutPage'
import SectorsPage      from './pages/SectorsPage'
import HowItWorksPage   from './pages/HowItWorksPage'
import StateMapPage     from './pages/StateMapPage'
import ContactPage      from './pages/ContactPage'

// ── Route guards ───────────────────────────────────────────────────────────

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { role } = useAuth()
  return role === 'admin' ? <>{children}</> : <Navigate to="/dashboard" replace />
}

// ── App ────────────────────────────────────────────────────────────────────

function AppRoutes() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      {/* Public */}
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />}
      />
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />

      {/* Public info pages — always accessible */}
      <Route path="/about"        element={<AboutPage />} />
      <Route path="/sectors"      element={<SectorsPage />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
      <Route path="/state-map"    element={<StateMapPage />} />
      <Route path="/contact"      element={<ContactPage />} />

      {/* Protected shell */}
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/dashboard"           element={<DashboardPage />} />
        <Route path="/projects"            element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="/alerts"              element={<AlertsPage />} />
        <Route path="/model"               element={<ModelPage />} />
        <Route path="/recommendations"     element={<RecommendationsPage />} />
        <Route path="/data-provenance"     element={<DataProvenancePage />} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminPage />
            </RequireAdmin>
          }
        />
      </Route>

      {/* Proper 404 — not a silent redirect */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}

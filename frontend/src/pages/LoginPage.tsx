// src/pages/LoginPage.tsx
// Split-panel institutional login — Apple calm × IBM structure

import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import { usePageTitle } from '../hooks/usePageTitle'
import PublicLayout from '../components/PublicLayout'

export default function LoginPage() {
  usePageTitle('Sign In')

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const { setAuth } = useAuth()
  const navigate = useNavigate()
  const submitting = useRef(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting.current) return  // prevent double-submit
    submitting.current = true
    setError(null)
    setLoading(true)
    try {
      const data = await login(username, password)
      setAuth(data.token, data.role, data.user_id)
      navigate('/dashboard')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status
      if (status === 401) {
        setError('Invalid username or password. Please check your credentials.')
      } else if (status === 429) {
        setError('Too many attempts. Please wait a moment before trying again.')
      } else {
        setError('Sign in failed. Please check your connection and try again.')
      }
    } finally {
      setLoading(false)
      submitting.current = false
    }
  }

  return (
    <PublicLayout>
    <div className="min-h-screen flex" style={{ background: '#F7F8FA', minHeight: 'calc(100vh - 200px)' }}>

      {/* ── Left panel (institutional context) — hidden on mobile ─────── */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 flex-1"
        style={{ background: '#FFFFFF', borderRight: '1px solid #E0E4E8', maxWidth: '480px' }}
      >
        <div>
          {/* Wordmark */}
          <div className="mb-12">
            <div
              className="text-lg font-semibold tracking-tight"
              style={{ color: '#102A43', letterSpacing: '-0.02em' }}
            >
              PRAGATI-AI
            </div>
            <div className="text-[12px] mt-1" style={{ color: '#697077' }}>
              Ministry of Statistics & Programme Implementation
            </div>
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <h1
              className="font-semibold leading-tight"
              style={{ fontSize: '28px', color: '#102A43', letterSpacing: '-0.02em', lineHeight: '1.2' }}
            >
              Predictive Infrastructure<br />Intelligence System
            </h1>
            <p className="text-[14px] leading-relaxed" style={{ color: '#525252' }}>
              Risk prediction, anomaly detection and governance analytics for national infrastructure projects under PAIMANA monitoring.
            </p>
          </div>
        </div>

        {/* Footer note */}
        <div className="space-y-3">
          {[
            { label: 'Predict', desc: 'ML-powered risk scoring' },
            { label: 'Explain', desc: 'Transparent risk drivers' },
            { label: 'Simulate', desc: 'Scenario impact modelling' },
            { label: 'Prescribe', desc: 'Evidence-based action' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3">
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded"
                style={{ background: '#EDF5FF', color: '#0F62FE', letterSpacing: '0.04em' }}
              >
                {item.label.toUpperCase()}
              </span>
              <span className="text-[13px]" style={{ color: '#697077' }}>{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel (form) ────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile-only wordmark */}
          <div className="lg:hidden mb-8 text-center">
            <div className="text-base font-semibold" style={{ color: '#102A43' }}>PRAGATI-AI</div>
            <div className="text-[12px] mt-0.5" style={{ color: '#697077' }}>PAIMANA Platform</div>
          </div>

          <h2 className="text-[22px] font-semibold mb-1" style={{ color: '#161616', letterSpacing: '-0.015em' }}>
            Sign in
          </h2>
          <p className="text-[13px] mb-8" style={{ color: '#525252' }}>
            Access the PRAGATI-AI intelligence platform
          </p>

          <form id="form-login" onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label
                htmlFor="input-username"
                className="block text-[13px] font-medium mb-1.5"
                style={{ color: '#161616' }}
              >
                Username
              </label>
              <input
                id="input-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="input"
                placeholder="Enter your username"
                required
              />
            </div>

            <div>
              <label
                htmlFor="input-password"
                className="block text-[13px] font-medium mb-1.5"
                style={{ color: '#161616' }}
              >
                Password
              </label>
              <input
                id="input-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input"
                placeholder="Enter your password"
                required
              />
            </div>

            {error && (
              <div
                id="login-error"
                className="text-[13px] px-3 py-2.5 rounded"
                style={{ background: '#FFF0F1', color: '#DA1E28', border: '1px solid #FF8389' }}
                role="alert"
              >
                {error}
              </div>
            )}

            <button
              id="btn-login"
              type="submit"
              disabled={loading || !username || !password}
              aria-disabled={loading || !username || !password}
              aria-busy={loading}
              className="btn-primary w-full justify-center py-2.5"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* Demo credentials */}
          <div
            className="mt-6 p-3 rounded-md"
            style={{ background: '#F7F8FA', border: '1px solid #E0E4E8' }}
          >
            <div className="text-[11px] font-semibold mb-2" style={{ color: '#697077', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Demo Credentials
            </div>
            <div className="space-y-1">
              {[
                { u: 'officer', p: 'officer123', r: 'Field Officer' },
                { u: 'senior',  p: 'senior123',  r: 'Senior Official' },
                { u: 'admin',   p: 'admin123',   r: 'Administrator' },
              ].map(c => (
                <div key={c.u} className="flex items-center justify-between">
                  <span className="text-[12px] font-mono" style={{ color: '#161616' }}>
                    {c.u} / {c.p}
                  </span>
                  <span className="text-[11px]" style={{ color: '#8D8D8D' }}>{c.r}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
    </PublicLayout>
  )
}

// src/pages/NotFoundPage.tsx
// Custom 404 — matches the "Institutional Intelligence" design system

import React, { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function NotFoundPage() {
  const location  = useLocation()
  const { isAuthenticated } = useAuth()

  // Set title
  useEffect(() => {
    const prev = document.title
    document.title = 'Page Not Found — PRAGATI-AI'
    return () => { document.title = prev }
  }, [])

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: '#F7F8FA' }}
    >
      <div className="w-full max-w-md text-center">

        {/* Wordmark */}
        <div className="mb-8">
          <div
            className="text-sm font-semibold"
            style={{ color: '#102A43', letterSpacing: '-0.01em' }}
          >
            PRAGATI-AI
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: '#697077' }}>
            MoSPI · PS-26103
          </div>
        </div>

        {/* 404 card */}
        <div className="card text-center">
          {/* Error code */}
          <div
            className="font-semibold mb-2"
            style={{ fontSize: '72px', color: '#E0E4E8', lineHeight: '1', letterSpacing: '-0.04em' }}
            aria-hidden="true"
          >
            404
          </div>

          <h1
            className="font-semibold mb-2"
            style={{ fontSize: '20px', color: '#161616', letterSpacing: '-0.01em' }}
          >
            Page not found
          </h1>

          <p className="text-[14px] mb-6" style={{ color: '#525252', lineHeight: '1.6' }}>
            The path{' '}
            <code
              className="px-1.5 py-0.5 rounded text-[12px] font-mono"
              style={{ background: '#F3F5F7', color: '#525252' }}
            >
              {location.pathname}
            </code>{' '}
            does not exist in this system.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  id="btn-404-dashboard"
                  className="btn-primary"
                >
                  Go to Portfolio
                </Link>
                <Link
                  to="/projects"
                  id="btn-404-projects"
                  className="btn-secondary"
                >
                  View Projects
                </Link>
              </>
            ) : (
              <Link
                to="/login"
                id="btn-404-login"
                className="btn-primary"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Help text */}
        <p className="text-[12px] mt-6" style={{ color: '#8D8D8D' }}>
          If you followed a link to reach this page, please report it to your system administrator.
        </p>
      </div>
    </div>
  )
}

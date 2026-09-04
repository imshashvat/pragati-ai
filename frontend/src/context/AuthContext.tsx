// src/context/AuthContext.tsx
// ────────────────────────────
// Minimal auth context: token + role stored in localStorage.

import React, { createContext, useContext, useState } from 'react'

interface AuthState {
  token: string | null
  role: string | null
  userId: string | null
}

interface AuthContextValue extends AuthState {
  setAuth: (token: string, role: string, userId: string) => void
  clearAuth: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => ({
    token: localStorage.getItem('pragati_token'),
    role: localStorage.getItem('pragati_role'),
    userId: localStorage.getItem('pragati_user_id'),
  }))

  function setAuth(token: string, role: string, userId: string) {
    localStorage.setItem('pragati_token', token)
    localStorage.setItem('pragati_role', role)
    localStorage.setItem('pragati_user_id', userId)
    setState({ token, role, userId })
  }

  function clearAuth() {
    localStorage.removeItem('pragati_token')
    localStorage.removeItem('pragati_role')
    localStorage.removeItem('pragati_user_id')
    setState({ token: null, role: null, userId: null })
  }

  return (
    <AuthContext.Provider
      value={{ ...state, setAuth, clearAuth, isAuthenticated: !!state.token }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

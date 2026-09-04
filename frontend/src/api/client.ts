// src/api/client.ts
// Axios instance — reads backend URL from env var in production,
// falls back to '/' (Vite proxy) in development.

import axios from 'axios'

// In production (Vercel), set VITE_API_BASE_URL to your Railway backend URL.
// In development, Vite proxy forwards all /auth, /projects, etc. to localhost:8000.
const rawBase = (import.meta.env.VITE_API_BASE_URL ?? '').trim()
const BASE = rawBase ? rawBase.replace(/\/+$/, '') : ''

const client = axios.create({
  baseURL: BASE,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token from localStorage on every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('pragati_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On 401 — clear auth state and redirect to login
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('pragati_token')
      localStorage.removeItem('pragati_role')
      localStorage.removeItem('pragati_user_id')
      // Only redirect if not already on login page
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default client

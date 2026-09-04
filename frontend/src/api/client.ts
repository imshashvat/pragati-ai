// src/api/client.ts
// Axios instance with base URL + JWT Bearer interceptor.
// Token stored in localStorage under keys: pragati_token, pragati_role, pragati_user_id

import axios from 'axios'

const client = axios.create({
  baseURL: '/',   // Vite dev proxy forwards /auth, /projects, etc. to :8000
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('pragati_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On 401 — clear ALL auth state and redirect to login
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('pragati_token')
      localStorage.removeItem('pragati_role')
      localStorage.removeItem('pragati_user_id')   // FIX: was missing before
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default client

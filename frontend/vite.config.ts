import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // SPA fallback: serve index.html for all non-asset routes
    // so direct navigation to /projects, /alerts etc. loads React,
    // not the raw FastAPI response (which would 401 without a token).
    proxy: {
      // Only proxy exact API prefixes — React Router handles everything else
      '/auth': { target: 'http://localhost:8000', changeOrigin: true },
      '/dashboard': { target: 'http://localhost:8000', changeOrigin: true },
      '/alerts': { target: 'http://localhost:8000', changeOrigin: true },
      '/model-performance': { target: 'http://localhost:8000', changeOrigin: true },
      '/data-provenance': { target: 'http://localhost:8000', changeOrigin: true },
      '/admin': { target: 'http://localhost:8000', changeOrigin: true },
      '/health': { target: 'http://localhost:8000', changeOrigin: true },
      '/predict': { target: 'http://localhost:8000', changeOrigin: true },
      // /projects API calls — only proxy if path starts with /projects/
      // and the request has an Authorization header (i.e. from axios, not browser nav)
      // We use a regex to match /projects with optional trailing slash + path but
      // NOT the SPA route /projects itself when loaded directly.
      // Solution: proxy all /projects/* (with subpath) and exact /projects? with query params
      '^/projects(/.+|\\?.+)': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
})

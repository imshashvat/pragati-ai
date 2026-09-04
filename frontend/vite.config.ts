import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:8000',
      '/projects': 'http://localhost:8000',
      '/alerts': 'http://localhost:8000',
      '/dashboard': 'http://localhost:8000',
      '/model-performance': 'http://localhost:8000',
      '/data-provenance': 'http://localhost:8000',
      '/admin': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
      '/predict': 'http://localhost:8000',
    },
  },
})

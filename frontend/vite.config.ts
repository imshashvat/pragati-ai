import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Helper: forward to FastAPI unless the browser is requesting an HTML page (SPA navigation)
const apiProxy = {
  target: 'http://localhost:8000',
  changeOrigin: true,
  bypass: (req: any) => {
    if (req.headers && req.headers.accept && req.headers.accept.includes('text/html')) {
      return '/index.html'
    }
  },
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': apiProxy,
      '/projects': apiProxy,
      '/dashboard': apiProxy,
      '/alerts': apiProxy,
      '/model-performance': apiProxy,
      '/data-provenance': apiProxy,
      '/admin': apiProxy,
      '/health': apiProxy,
      '/predict': apiProxy,
    },
  },
})

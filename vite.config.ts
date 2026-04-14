import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/graph': {
        target: 'https://graph.facebook.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/graph/, ''),
      },
      '/api/rupload': {
        target: 'https://rupload.facebook.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/rupload/, ''),
      },
      '/api/walle': {
        target: 'https://walle.agendaedu.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/walle/, ''),
      },
    },
  },
})

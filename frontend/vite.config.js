import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/stations': 'http://localhost:8000',
      '/suburban': 'http://localhost:8000',
      '/bus': 'http://localhost:8000',
      '/api': 'http://localhost:8000',
      '/status': 'http://localhost:8000',
    }
  }
})

// client/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/proxy': 'http://localhost:3000', '/user': 'http://localhost:3000', '/admin': 'http://localhost:3000' } }
})

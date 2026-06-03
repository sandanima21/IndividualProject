import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    // 'global' must alias globalThis, not {}. An empty object literal means
    // writes like global.x = y silently go nowhere.
    global: 'globalThis',
  },
  server: {
    host: 'localhost',
    port: 5173,
  },
})

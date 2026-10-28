import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages serves the site from /ticket/; the deploy workflow sets BASE_PATH. Local dev uses /.
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH || '/',
})

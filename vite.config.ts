import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'

import pkg from './package.json' with { type: 'json' }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
      '@shell': fileURLToPath(new URL('./src/shell', import.meta.url)),
      '@modules': fileURLToPath(new URL('./src/modules', import.meta.url)),
    },
  },
  // Exposed in the header so the running build is identifiable at a glance.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import pkg from './package.json' with { type: 'json' }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Exposed in the header so the running build is identifiable at a glance.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})

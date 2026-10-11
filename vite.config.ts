// ViteConfig_v1.0 — This section is intended to configure the Vite dev server and build (React plugin, GitHub Pages base path) and the Vitest unit-test runner.
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: '/igusa-demo/',
  plugins: [react()],
  test: {
    include: ['tests/**/*.test.ts'],
    passWithNoTests: true,
  },
})

// PlaywrightConfig_v1.0 — This section is intended to configure Playwright end-to-end runs: chromium only, the local dev server as web server, and the /igusa-demo/ base URL.
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173/igusa-demo/',
    viewport: { width: 1440, height: 900 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173/igusa-demo/',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})

// CaptureS2_v1.0 — This section is intended to screenshot the S2 dev page at 1440x900 for the portfolio (run while `npm run dev` serves on 5173).
import { chromium } from '@playwright/test'
const out = process.argv[2]
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:5173/igusa-demo/', { waitUntil: 'networkidle' })
await page.screenshot({ path: out, fullPage: true })
console.log('footer:', await page.locator('footer').innerText(), '| theme:', await page.locator('html').getAttribute('data-theme'), '| title:', await page.title())
await browser.close()

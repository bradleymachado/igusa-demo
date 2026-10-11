// CaptureS6_v1.0 — This section is intended to capture the S6 portfolio images: the full stage at a 1440×900 viewport, the phone frame alone via locator.screenshot, and the 390×844 narrow view (run while `npm run dev` serves on 5173).
import { chromium } from '@playwright/test'
const dir = process.argv[2] ?? '00_Plan/process-images'
const url = 'http://localhost:5173/igusa-demo/'
const browser = await chromium.launch()

const wide = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await wide.goto(url, { waitUntil: 'networkidle' })
await wide.evaluate(() => document.fonts.ready)
await wide.screenshot({ path: `${dir}/Igusa_S6_Stage_v1.0.png`, fullPage: true })
await wide.getByTestId('phone-frame').screenshot({ path: `${dir}/Igusa_S6_Phone_v1.0.png`, omitBackground: true })
const dims = await wide.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }))
console.log('wide page', `${dims.w}x${dims.h}`)

const narrow = await browser.newPage({ viewport: { width: 390, height: 844 } })
await narrow.goto(url, { waitUntil: 'networkidle' })
await narrow.evaluate(() => document.fonts.ready)
await narrow.screenshot({ path: `${dir}/Igusa_S6_Narrow_v1.0.png` })
await browser.close()

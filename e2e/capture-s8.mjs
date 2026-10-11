// CaptureS8_v1.0 — This section is intended to capture the S8 portfolio images with IBS sample data loaded: the Apple Watch frame alone (clean output, locator screenshot) and the full stage at 1440×900 right after a Watch tile tap (environment, pulse + "Logged." if timing allows, iPhone widget count already bumped). It starts its own Vite dev server on port 5176 and stops it at the end. Run: `node e2e/capture-s8.mjs [outDir]`.
import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { generate, getTemplate } from '../src/data/index.ts'

const dir = process.argv[2] ?? '00_Plan/process-images'
const PORT = 5176
const url = `http://localhost:${PORT}/igusa-demo/`
const KEY = 'igusa-demo-v1'

function ibsSeed() {
  const t = getTemplate('ibs')
  const state = {
    setupDone: true, templateId: 'ibs', events: t.events.map((e) => ({ ...e })), entries: generate(t),
    theme: 'newsprint', weaveUnlocked: false, presenterStep: 1, appTab: 'log', appOpen: false, paywallOpen: false,
  }
  return JSON.stringify({ state, version: 1 })
}

const viteBin = path.join(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js')
const server = spawn(process.execPath, [viteBin, '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
console.log(`vite pid ${server.pid} on ${PORT}`)
const deadline = Date.now() + 30_000
while (Date.now() < deadline) {
  try { const r = await fetch(url); if (r.ok) break } catch { /* not up yet */ }
  await new Promise((r) => setTimeout(r, 250))
}

const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, ibsSeed()])
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByTestId('watch-face').waitFor()
  await page.getByTestId('widget-medium').waitFor()
  await page.evaluate(() => document.fonts.ready)

  const face = await page.getByTestId('watch-screen').boundingBox()
  console.log(`watch screen ${face.width}x${face.height}`)
  await page.getByTestId('watch-frame').screenshot({ path: `${dir}/Igusa_S8_Watch_v1.0.png`, omitBackground: true })

  const dairyBefore = await page.getByTestId('widget-medium').getByTestId('count-ibs-dairy').textContent()
  await page.getByRole('button', { name: 'Watch log Dairy' }).click()
  const pulse = await page.getByRole('button', { name: 'Watch log Dairy' }).evaluate((el) => el.className)
  await page.screenshot({ path: `${dir}/Igusa_S8_Sync_v1.0.png`, fullPage: true })
  const dairyAfter = await page.getByTestId('widget-medium').getByTestId('count-ibs-dairy').textContent()
  console.log(`sync capture: medium Dairy ${dairyBefore} → ${dairyAfter}; watch tile class at capture start "${pulse}"`)
  console.log('saved Igusa_S8_Watch_v1.0.png, Igusa_S8_Sync_v1.0.png')
} finally {
  await browser.close()
  server.kill()
  console.log(`vite pid ${server.pid} killed: ${server.killed}`)
}

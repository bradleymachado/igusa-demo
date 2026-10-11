// CaptureS10_v1.0 — This section is intended to capture the S10 portfolio images with IBS sample data loaded: the phone frame on the app's Log tab (clean output) and the phone frame with the "How strong?" severity sheet open after a press-and-hold. Run while a dev server serves the app: `node e2e/capture-s10.mjs [outDir] [url]`.
import { chromium } from '@playwright/test'
import { generate, getTemplate } from '../src/data/index.ts'

const dir = process.argv[2] ?? '00_Plan/process-images'
const url = process.argv[3] ?? 'http://localhost:5173/igusa-demo/'
const KEY = 'igusa-demo-v1'

function ibsSeed() {
  const t = getTemplate('ibs')
  const state = {
    setupDone: true, templateId: 'ibs', events: t.events.map((e) => ({ ...e })), entries: generate(t),
    theme: 'newsprint', weaveUnlocked: false, presenterStep: 1, appTab: 'log', appOpen: true,
  }
  return JSON.stringify({ state, version: 1 })
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(url, { waitUntil: 'networkidle' })
await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, ibsSeed()])
await page.reload({ waitUntil: 'networkidle' })
await page.getByTestId('event-list').waitFor()
await page.evaluate(() => document.fonts.ready)

const frame = page.getByTestId('phone-frame')
await frame.screenshot({ path: `${dir}/Igusa_S10_List_v1.0.png`, omitBackground: true })

const row = page.getByRole('button', { name: 'Cramping: tap to log, hold for severity' })
const b = await row.boundingBox()
await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
await page.mouse.down()
await page.waitForTimeout(650)
await page.mouse.up()
await page.getByTestId('severity-sheet').waitFor()
await page.mouse.move(5, 5) // keep the cursor out of the frame
await frame.screenshot({ path: `${dir}/Igusa_S10_Sheet_v1.0.png`, omitBackground: true })
await browser.close()
console.log('saved Igusa_S10_List_v1.0.png, Igusa_S10_Sheet_v1.0.png')

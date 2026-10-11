// CaptureS11_v1.0 — This section is intended to capture the S11 portfolio images with IBS sample data on the Grid tab: the full stage at 1440×900 (environment), the phone frame with Bloating selected in Count mode (clean output), and the phone frame in Bloating × Dairy two-event mode. Run while a dev server serves the app: `node e2e/capture-s11.mjs [outDir] [url]`.
import { chromium } from '@playwright/test'
import { generate, getTemplate } from '../src/data/index.ts'

const dir = process.argv[2] ?? '00_Plan/process-images'
const url = process.argv[3] ?? 'http://localhost:5173/igusa-demo/'
const KEY = 'igusa-demo-v1'

function ibsSeed() {
  const t = getTemplate('ibs')
  const state = {
    setupDone: true, templateId: 'ibs', events: t.events.map((e) => ({ ...e })), entries: generate(t),
    theme: 'newsprint', weaveUnlocked: false, presenterStep: 4, appTab: 'grid', appOpen: true,
  }
  return JSON.stringify({ state, version: 1 })
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(url, { waitUntil: 'networkidle' })
await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, ibsSeed()])
await page.reload({ waitUntil: 'networkidle' })
await page.getByTestId('year-strip').waitFor()
await page.evaluate(() => document.fonts.ready)

const grid = page.getByTestId('grid-screen')
await grid.getByRole('button', { name: 'Bloating', exact: true }).click()
await page.screenshot({ path: `${dir}/Igusa_S11_Stage_v1.0.png`, fullPage: true })
await page.getByTestId('phone-frame').screenshot({ path: `${dir}/Igusa_S11_Grid_v1.0.png`, omitBackground: true })

await grid.getByRole('button', { name: 'Dairy', exact: true }).click()
await page.getByTestId('phone-frame').screenshot({ path: `${dir}/Igusa_S11_Split_v1.0.png`, omitBackground: true })

const box = await grid.boundingBox()
console.log(`grid screen ${box.width}x${box.height}; summary: ${(await grid.getByTestId('grid-summary').innerText()).replace(/\n/g, ' | ')}`)
await browser.close()
console.log('saved Igusa_S11_Stage_v1.0.png, Igusa_S11_Grid_v1.0.png, Igusa_S11_Split_v1.0.png')

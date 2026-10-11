// CaptureS12_v1.0 — This section is intended to capture the S12 portfolio images with IBS sample data on the Weave tab: the full stage at 1440×900 (environment), and the phone frame for the unlocked Triggers list, the Overlay strip, the When heatmap and the locked list with blurred pills (clean outputs). Run while a dev server serves the app: `node e2e/capture-s12.mjs [outDir] [url]`.
import { chromium } from '@playwright/test'
import { generate, getTemplate } from '../src/data/index.ts'

const dir = process.argv[2] ?? '00_Plan/process-images'
const url = process.argv[3] ?? 'http://localhost:5173/igusa-demo/'
const KEY = 'igusa-demo-v1'

function ibsSeed(weaveUnlocked) {
  const t = getTemplate('ibs')
  const state = {
    setupDone: true, templateId: 'ibs', events: t.events.map((e) => ({ ...e })), entries: generate(t),
    theme: 'newsprint', weaveUnlocked, presenterStep: 5, appTab: 'weave', appOpen: true,
  }
  return JSON.stringify({ state, version: 1 })
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(url, { waitUntil: 'networkidle' })

async function load(unlocked) {
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, ibsSeed(unlocked)])
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByTestId('weave-screen').waitFor()
  await page.evaluate(() => document.fonts.ready)
}
const frame = () => page.getByTestId('phone-frame')
const shot = (name) => frame().screenshot({ path: `${dir}/${name}`, omitBackground: true })

await load(true)
await page.screenshot({ path: `${dir}/Igusa_S12_Stage_v1.0.png`, fullPage: true })
await shot('Igusa_S12_Triggers_v1.0.png')
await page.getByRole('button', { name: 'Overlay segment' }).click()
await page.getByTestId('overlay-strip').waitFor()
await shot('Igusa_S12_Overlay_v1.0.png')
await page.getByRole('button', { name: 'When segment' }).click()
await page.getByTestId('when-grid').waitFor()
await shot('Igusa_S12_When_v1.0.png')
console.log(`when line: ${await page.getByTestId('when-most').innerText()}`)

await load(false)
await shot('Igusa_S12_Locked_v1.0.png')
await browser.close()
console.log('saved Igusa_S12_Stage_v1.0.png, Igusa_S12_Triggers_v1.0.png, Igusa_S12_Overlay_v1.0.png, Igusa_S12_When_v1.0.png, Igusa_S12_Locked_v1.0.png')

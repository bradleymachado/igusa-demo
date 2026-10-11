// CaptureS7_v1.0 — This section is intended to capture the S7 portfolio images with IBS sample data loaded: the full stage at 1440×900 (environment), the phone frame showing the home screen with widgets (clean output), and the phone frame with the medium widget's 1–5 severity row open. Run while a dev server serves the app: `node e2e/capture-s7.mjs [outDir] [url]`.
import { chromium } from '@playwright/test'
import { generate, getTemplate } from '../src/data/index.ts'

const dir = process.argv[2] ?? '00_Plan/process-images'
const url = process.argv[3] ?? 'http://localhost:5173/igusa-demo/'
const KEY = 'igusa-demo-v1'

function ibsSeed() {
  const t = getTemplate('ibs')
  const state = {
    setupDone: true, templateId: 'ibs', events: t.events.map((e) => ({ ...e })), entries: generate(t),
    theme: 'newsprint', weaveUnlocked: false, presenterStep: 1, appTab: 'log', appOpen: false,
  }
  return JSON.stringify({ state, version: 1 })
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(url, { waitUntil: 'networkidle' })
const stub = page.getByRole('button', { name: 'Use IBS sample data' })
if (await stub.count()) {
  await stub.click()
  console.log('setup via stub button')
} else {
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, ibsSeed()])
  await page.reload({ waitUntil: 'networkidle' })
  console.log('setup via localStorage seed')
}
await page.getByTestId('widget-medium').waitFor()
await page.evaluate(() => document.fonts.ready)

await page.screenshot({ path: `${dir}/Igusa_S7_Stage_v1.0.png`, fullPage: true })
await page.getByTestId('phone-frame').screenshot({ path: `${dir}/Igusa_S7_Widgets_v1.0.png`, omitBackground: true })

const med = page.getByTestId('widget-medium')
const box = await med.boundingBox()
const screen = await page.getByTestId('phone-screen').boundingBox()
console.log(`medium widget ${box.width}x${box.height} at y=${(box.y - screen.y).toFixed(0)} in screen; bottom ${(box.y + box.height - screen.y).toFixed(0)} of ${screen.height}`)

await med.getByRole('button', { name: 'Log Bloating' }).click()
await med.getByTestId('severity-row').waitFor()
await page.waitForTimeout(350) // let the 300 ms pulse finish
await page.getByTestId('phone-frame').screenshot({ path: `${dir}/Igusa_S7_SeverityRow_v1.0.png`, omitBackground: true })
await browser.close()
console.log('saved Igusa_S7_Stage_v1.0.png, Igusa_S7_Widgets_v1.0.png, Igusa_S7_SeverityRow_v1.0.png')

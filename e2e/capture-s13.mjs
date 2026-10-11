// CaptureS13_v1.0 — This section is intended to capture the S13 portfolio images with IBS sample data: the full stage at 1440×900 on the Summary tab (environment), the phone frame on the unlocked Summary tab and the phone frame with the paywall open (clean outputs). Run while a dev server serves the app: `node e2e/capture-s13.mjs [outDir] [url]`.
import { chromium } from '@playwright/test'
import { generate, getTemplate } from '../src/data/index.ts'

const dir = process.argv[2] ?? '00_Plan/process-images'
const url = process.argv[3] ?? 'http://localhost:5173/igusa-demo/'
const KEY = 'igusa-demo-v1'

function ibsSeed(weaveUnlocked, appTab) {
  const t = getTemplate('ibs')
  const state = {
    setupDone: true, templateId: 'ibs', events: t.events.map((e) => ({ ...e })), entries: generate(t),
    theme: 'newsprint', weaveUnlocked, presenterStep: 6, appTab, appOpen: true,
  }
  return JSON.stringify({ state, version: 1 })
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(url, { waitUntil: 'networkidle' })

async function load(unlocked, tab, testId) {
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, ibsSeed(unlocked, tab)])
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByTestId(testId).waitFor()
  await page.evaluate(() => document.fonts.ready)
}
const frame = () => page.getByTestId('phone-frame')
const shot = (name) => frame().screenshot({ path: `${dir}/${name}`, omitBackground: true })

await load(true, 'summary', 'summary-screen')
await page.screenshot({ path: `${dir}/Igusa_S13_Stage_v1.0.png`, fullPage: true })
await shot('Igusa_S13_Summary_v1.0.png')

await load(false, 'weave', 'weave-screen')
await page.getByRole('button', { name: 'See patterns, unlock Weave' }).first().click()
await page.getByTestId('paywall').waitFor()
await shot('Igusa_S13_Paywall_v1.0.png')
await browser.close()
console.log('saved Igusa_S13_Stage_v1.0.png, Igusa_S13_Summary_v1.0.png, Igusa_S13_Paywall_v1.0.png')

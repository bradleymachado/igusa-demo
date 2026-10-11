// CaptureS9_v1.0 — This section is intended to capture the S9 portfolio images: the phone frame at each of the four setup steps with IBS chosen (clean output) and the full 1440×900 stage at Step 2 (environment), run while `npm run dev` serves on 5173.
import { chromium } from '@playwright/test'
const dir = process.argv[2] ?? '00_Plan/process-images'
const url = 'http://localhost:5173/igusa-demo/'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(url, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.goto(url, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)

const phone = page.getByTestId('phone-frame')
const shot = async (n) => {
  await page.waitForTimeout(150)
  await phone.screenshot({ path: `${dir}/Igusa_S9_Setup${n}_v1.0.png`, omitBackground: true })
  console.log(`Igusa_S9_Setup${n}_v1.0.png`)
}

await shot(1)
await page.getByRole('button', { name: 'Choose IBS', exact: true }).click()
await shot(2)
await page.screenshot({ path: `${dir}/Igusa_S9_Stage_v1.0.png`, fullPage: true })
console.log('Igusa_S9_Stage_v1.0.png')
await page.getByRole('button', { name: 'Continue to widget', exact: true }).click()
await shot(3)
await page.getByRole('button', { name: 'Continue to sample data', exact: true }).click()
await shot(4)
await page.evaluate(() => localStorage.clear())
await browser.close()

// FlowSpec_v1.0 — This section is intended to walk the six pitch steps through the presenter bar at 1440×900 (full stage) and 390×844 (phone only, opening the Watch with its toggle on step 3), asserting the expected screen at each step, no horizontal overflow, and at 1440×900 a presenter bar fully inside the viewport without scrolling; it saves shots\step<N>_wide.png / step<N>_phone.png and copies the two S16 process images.
import { test, expect, type Page } from '@playwright/test'
import { copyFileSync, mkdirSync } from 'node:fs'

const SHOTS = 'shots'
const IMAGES = '00_Plan/process-images'

const stepButton = (page: Page, n: number) => page.locator(`[data-testid="presenter-bar"] button[aria-label^="Step ${n}:"]`)

/** The screen each step must land on (testids inside the phone or Watch). */
async function expectStepScreen(page: Page, n: number) {
  const phone = page.getByTestId('phone-screen')
  switch (n) {
    case 1:
      await expect(phone.getByTestId('setup-flow')).toBeVisible()
      break
    case 2:
      await expect(phone.getByTestId('home-screen')).toBeVisible()
      await expect(phone.getByTestId('home-screen').getByTestId('widget-medium')).toBeVisible()
      break
    case 3:
      await expect(page.getByTestId('watch-screen')).toBeVisible()
      await expect(page.getByTestId('watch-face')).toBeVisible()
      break
    case 4:
      await expect(phone.getByTestId('grid-screen')).toBeVisible()
      break
    case 5:
      await expect(phone.getByTestId('weave-screen')).toBeVisible()
      break
    default:
      await expect(phone.getByTestId('summary-screen')).toBeVisible()
  }
}

async function fresh(page: Page) {
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.getByTestId('phone-screen').waitFor()
  await page.evaluate(() => document.fonts.ready)
}

const scrollWidth = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth)

test.describe('S16 flow — wide 1440×900 (full stage)', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('steps 1→6 land on their screens; bar inside the viewport; no horizontal overflow', async ({ page }) => {
    mkdirSync(SHOTS, { recursive: true })
    await fresh(page)
    const rows: string[] = []
    for (let n = 1; n <= 6; n++) {
      await stepButton(page, n).click()
      await expect(stepButton(page, n)).toHaveAttribute('aria-current', 'step')
      await expectStepScreen(page, n)
      const bar = (await page.getByTestId('presenter-bar').boundingBox())!
      const scrollY = await page.evaluate(() => window.scrollY)
      const sw = await scrollWidth(page)
      rows.push(`step${n}: bar ${bar.x.toFixed(0)},${bar.y.toFixed(0)}–${(bar.x + bar.width).toFixed(0)},${(bar.y + bar.height).toFixed(1)} · scrollY ${scrollY} · scrollWidth ${sw}`)
      expect(scrollY).toBe(0)
      expect(bar.y).toBeGreaterThanOrEqual(0)
      expect(bar.x).toBeGreaterThanOrEqual(0)
      expect(bar.y + bar.height).toBeLessThanOrEqual(900)
      expect(bar.x + bar.width).toBeLessThanOrEqual(1440)
      expect(sw).toBeLessThanOrEqual(1440)
      await page.waitForTimeout(450) // the presenter ring is fully drawn by 300 ms; let it settle for the capture
      await page.screenshot({ path: `${SHOTS}/step${n}_wide.png` })
    }
    console.log(`[S16 wide] ${rows.join(' | ')}`)
    copyFileSync(`${SHOTS}/step2_wide.png`, `${IMAGES}/Igusa_S16_Stage_v1.0.png`)
  })
})

test.describe('S16 flow — phone 390×844 (phone only)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('steps 1→6 land on their screens; Watch opens from its toggle on step 3; no horizontal overflow', async ({ page }) => {
    mkdirSync(SHOTS, { recursive: true })
    await fresh(page)
    const rows: string[] = []
    const toggle = page.getByTestId('watch-toggle')
    for (let n = 1; n <= 6; n++) {
      await stepButton(page, n).click()
      await expect(stepButton(page, n)).toHaveAttribute('aria-current', 'step')
      if (n === 3) {
        // Step 3 opens the Watch overlay itself on narrow screens; close it and press the toggle so the toggle path is exercised.
        if ((await toggle.getAttribute('aria-pressed')) === 'true') await toggle.click()
        await expect(page.getByTestId('watch-screen')).toBeHidden()
        await toggle.click()
        await expect(toggle).toHaveAttribute('aria-pressed', 'true')
      }
      await expectStepScreen(page, n)
      const sw = await scrollWidth(page)
      rows.push(`step${n}: scrollWidth ${sw}`)
      expect(sw).toBeLessThanOrEqual(390)
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.waitForTimeout(450)
      await page.screenshot({ path: `${SHOTS}/step${n}_phone.png` })
      if (n === 3) {
        await toggle.click()
        await expect(page.getByTestId('watch-screen')).toBeHidden()
      }
    }
    console.log(`[S16 phone] ${rows.join(' | ')}`)
    copyFileSync(`${SHOTS}/step4_phone.png`, `${IMAGES}/Igusa_S16_PhoneOnly_v1.0.png`)
  })
})

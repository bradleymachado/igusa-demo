// StepsSpec_v1.0 — This section is intended to check the S14 presenter: the six guided steps walked by keyboard (each landing on its named screen, with the widget ring and Watch pulse timed), Reset back to the tutorial with an empty store, `#step=N&theme=…` deep links, hash sync without reload, theme buttons through the store, the presenter-bar button audit, and one 1440×900 screenshot per step.
import { test, expect, type Page } from '@playwright/test'
import { readState, buttonAudit } from './helpers'

const SHOTS = 'shots'

async function freshLoad(page: Page, url = './') {
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.goto(url)
  await page.getByTestId('phone-screen').waitFor()
}

const stepButton = (page: Page, n: number) => page.locator('[data-testid="presenter-bar"] button[aria-label^="Step ' + n + ':"]')

async function expectCurrent(page: Page, n: number) {
  await expect(stepButton(page, n)).toHaveAttribute('aria-current', 'step')
  await expect(page.locator('[data-testid="presenter-bar"] [aria-current="step"]')).toHaveCount(1)
  const border = await stepButton(page, n).evaluate((b) => getComputedStyle(b).borderTopColor)
  expect(border).toBe('rgb(63, 138, 132)') // --brand Patina
}

const outlineOf = (page: Page, testId: string) =>
  page.getByTestId(testId).evaluate((el) => {
    const cs = getComputedStyle(el)
    return { style: cs.outlineStyle, flagged: el.closest('[data-flash]')?.getAttribute('data-flash') ?? null }
  })

test('walk steps 1 → 6 by keyboard, ArrowLeft back to 5, screenshot each', async ({ page }) => {
  await freshLoad(page)
  // Step 1
  await expectCurrent(page, 1)
  await expect(page.getByTestId('setup-flow')).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/step1.png`, fullPage: true })
  console.log('[S14] step 1: setup-flow visible, hash', JSON.stringify(await page.evaluate(() => location.hash)))

  // Step 2: auto IBS, home screen, widget ring 1.2 s
  const t0 = Date.now()
  await page.keyboard.press('ArrowRight')
  await expect.poll(async () => (await outlineOf(page, 'widget-medium')).flagged, { timeout: 200, intervals: [20] }).toBe('widget')
  const tOn = Date.now() - t0
  expect((await outlineOf(page, 'widget-medium')).style).toBe('solid')
  await page.screenshot({ path: `${SHOTS}/step2.png`, fullPage: true })
  await expect.poll(async () => (await outlineOf(page, 'widget-medium')).flagged, { timeout: 1600 - (Date.now() - t0), intervals: [50] }).toBeNull()
  const tOff = Date.now() - t0
  expect(tOff).toBeLessThanOrEqual(1600)
  expect((await outlineOf(page, 'widget-medium')).style).toBe('none')
  await expectCurrent(page, 2)
  await expect(page.getByTestId('home-screen')).toBeVisible()
  const s2 = await readState(page)
  expect(s2.setupDone).toBe(true)
  expect(s2.templateId).toBe('ibs')
  expect(s2.entries.length).toBeGreaterThan(0)
  console.log(`[S14] step 2: setupDone ${s2.setupDone}, template ${s2.templateId}, entries ${s2.entries.length}, ring on ${tOn} ms, off ${tOff} ms, hash ${await page.evaluate(() => location.hash)}`)

  // Step 3: Watch bezel pulse
  await page.keyboard.press('ArrowRight')
  await expect.poll(async () => (await outlineOf(page, 'watch-frame')).flagged, { timeout: 200, intervals: [20] }).toBe('watch')
  expect((await outlineOf(page, 'watch-frame')).style).toBe('solid')
  await expectCurrent(page, 3)
  await page.screenshot({ path: `${SHOTS}/step3.png`, fullPage: true })
  console.log(`[S14] step 3: watch-frame flagged, hash ${await page.evaluate(() => location.hash)}`)

  // Step 4: Grid
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('app-view')).toBeVisible()
  await expect(page.getByTestId('grid-screen')).toBeVisible()
  expect((await readState(page)).appTab).toBe('grid')
  await expectCurrent(page, 4)
  await page.screenshot({ path: `${SHOTS}/step4.png`, fullPage: true })
  console.log(`[S14] step 4: app-view grid, hash ${await page.evaluate(() => location.hash)}`)

  // Step 5: Weave
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('weave-screen')).toBeVisible()
  await expect(page.getByTestId('paywall')).toHaveCount(0)
  await expectCurrent(page, 5)
  await page.screenshot({ path: `${SHOTS}/step5.png`, fullPage: true })
  console.log(`[S14] step 5: weave-screen, hash ${await page.evaluate(() => location.hash)}`)

  // Step 6: Summary
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('summary-screen')).toBeVisible()
  await expectCurrent(page, 6)
  await page.screenshot({ path: `${SHOTS}/step6.png`, fullPage: true })
  expect(await page.evaluate(() => location.hash)).toBe('#step=6')
  console.log(`[S14] step 6: summary-screen, hash ${await page.evaluate(() => location.hash)}`)

  // ArrowRight at 6 stays; ArrowLeft → 5
  await page.keyboard.press('ArrowRight')
  await expectCurrent(page, 6)
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByTestId('weave-screen')).toBeVisible()
  await expectCurrent(page, 5)
  expect(await page.evaluate(() => location.hash)).toBe('#step=5')
  console.log(`[S14] ArrowLeft: step 5, hash ${await page.evaluate(() => location.hash)}`)
})

test('Reset demo returns to the tutorial with an empty store and #step=1, no reload', async ({ page }) => {
  await freshLoad(page, './#step=4')
  await expect(page.getByTestId('grid-screen')).toBeVisible()
  await page.evaluate(() => { (window as unknown as { __marker: string }).__marker = 'alive' })
  await page.getByRole('button', { name: 'Reset demo' }).click()
  await expect(page.getByTestId('setup-flow')).toBeVisible()
  const s = await readState(page)
  expect(s.setupDone).toBe(false)
  expect(s.entries.length).toBe(0)
  expect(await page.evaluate(() => location.hash)).toBe('#step=1')
  expect(await page.evaluate(() => (window as unknown as { __marker?: string }).__marker)).toBe('alive')
  await expectCurrent(page, 1)
  console.log(`[S14] reset: setupDone ${s.setupDone}, entries ${s.entries.length}, hash ${await page.evaluate(() => location.hash)}, marker survived`)
})

test('deep link #step=5&theme=tatami lands on Weave in Tatami', async ({ page }) => {
  await freshLoad(page, './#step=5&theme=tatami')
  await expect(page.getByTestId('weave-screen')).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'tatami')
  await expectCurrent(page, 5)
  const s = await readState(page)
  expect(s.theme).toBe('tatami')
  console.log(`[S14] deep link: weave-screen, data-theme ${await page.locator('html').getAttribute('data-theme')}, store theme ${s.theme}, step ${s.presenterStep}`)
})

test('step buttons write #step=N without a reload', async ({ page }) => {
  await freshLoad(page)
  await page.evaluate(() => { (window as unknown as { __marker: string }).__marker = 'alive' })
  const hashes: string[] = []
  for (const n of [2, 4, 6, 3, 5, 1]) {
    await stepButton(page, n).click()
    await expectCurrent(page, n)
    const h = await page.evaluate(() => location.hash)
    expect(h).toBe(`#step=${n}`)
    hashes.push(h)
  }
  expect(await page.evaluate(() => (window as unknown as { __marker?: string }).__marker)).toBe('alive')
  const navs = await page.evaluate(() => performance.getEntriesByType('navigation').length)
  console.log(`[S14] click hashes ${hashes.join(' ')}, marker survived, navigation entries ${navs}`)
})

test('theme buttons go through the store', async ({ page }) => {
  await freshLoad(page)
  await page.getByRole('button', { name: 'Tatami theme' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'tatami')
  expect((await readState(page)).theme).toBe('tatami')
  await expect(page.getByRole('button', { name: 'Tatami theme' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Newsprint theme' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'newsprint')
  expect((await readState(page)).theme).toBe('newsprint')
  console.log('[S14] theme: tatami → store tatami, newsprint → store newsprint')
})

test('presenter bar buttons are labelled and ≥ 44 px', async ({ page }) => {
  await freshLoad(page)
  const a = await buttonAudit(page, 'presenter-bar')
  console.log(`[S14] presenter audit: ${a.count} buttons, unlabelled ${a.noLabel.length}, under 44 px ${a.tooSmall}, smallest ${a.min.w.toFixed(1)}×${a.min.h.toFixed(1)} (${a.min.label})`)
  expect(a.noLabel.length).toBe(0)
  expect(a.tooSmall).toBe(0)
})

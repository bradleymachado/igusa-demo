// FooterSpec_v1.0 — This section is intended to check the S17b audit fixes: the "Prototype. Sample data. Not medical advice." footer inside the viewport without scrolling on all seven pitch views at 390×844 (setup, home, Watch overlay, Grid, Weave, Summary, paywall) with the tab bar fully above it, the footer in view at 1440×900, the paywall's "no payment is taken" line inside the sheet at both viewports, and the Igusa favicon link; it saves the two S17b process images.
import { test, expect, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const IMAGES = '00_Plan/process-images'
const FOOTER_TEXT = 'Prototype. Sample data. Not medical advice.'

async function fresh(page: Page) {
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.getByTestId('phone-screen').waitFor()
  await page.evaluate(() => document.fonts.ready)
}

/** Moves to a pitch step through the deep-link hash (no clicks, so the page never scrolls). */
async function goStep(page: Page, n: number) {
  await page.evaluate((s) => { window.location.hash = `#step=${s}` }, n)
  await expect(page.locator(`[data-testid="presenter-bar"] button[aria-label^="Step ${n}:"]`)).toHaveAttribute('aria-current', 'step')
}

async function openPaywall(page: Page) {
  await goStep(page, 5)
  await page.getByRole('button', { name: 'See patterns, unlock Weave' }).click()
  await expect(page.getByTestId('paywall')).toBeVisible()
}

/** Asserts the footer sits inside the viewport at scrollY 0 and, when the app is open on the phone-only layout, the tab bar ends above it (at 1440×900 the footer sits beside the iPhone, so that check is skipped). */
async function checkFooter(page: Page, view: string, vh: number, tabAbove = true) {
  const footer = page.getByTestId('presenter-footer')
  await expect(footer).toBeVisible()
  await expect(footer).toHaveText(FOOTER_TEXT)
  const box = (await footer.boundingBox())!
  const scrollY = await page.evaluate(() => window.scrollY)
  const tabbar = page.locator('.app-tabbar')
  let tabNote = 'no tab bar'
  if (tabAbove && (await tabbar.isVisible())) {
    const t = (await tabbar.boundingBox())!
    tabNote = `tab bar ${t.y.toFixed(0)}–${(t.y + t.height).toFixed(0)}`
    expect(t.y).toBeGreaterThanOrEqual(0)
    expect(t.y + t.height).toBeLessThanOrEqual(box.y + 0.5)
  }
  const row = `${view}: footer y ${box.y.toFixed(0)}–${(box.y + box.height).toFixed(0)} · scrollY ${scrollY} · ${tabNote}`
  expect(scrollY).toBe(0)
  expect(box.y).toBeGreaterThanOrEqual(0)
  expect(box.y + box.height).toBeLessThanOrEqual(vh)
  return row
}

test.describe('S17b footer — phone 390×844', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('footer in view without scrolling on all seven views; tab bar above it', async ({ page }) => {
    mkdirSync(IMAGES, { recursive: true })
    await fresh(page)
    const rows: string[] = []
    await expect(page.getByTestId('setup-flow')).toBeVisible()
    rows.push(await checkFooter(page, 'setup', 844))
    await goStep(page, 2)
    await expect(page.getByTestId('home-screen')).toBeVisible()
    rows.push(await checkFooter(page, 'home', 844))
    await goStep(page, 3)
    await expect(page.getByTestId('watch-screen')).toBeVisible()
    rows.push(await checkFooter(page, 'watch', 844))
    await page.getByTestId('watch-toggle').click()
    await expect(page.getByTestId('watch-screen')).toBeHidden()
    await goStep(page, 4)
    await expect(page.getByTestId('grid-screen')).toBeVisible()
    rows.push(await checkFooter(page, 'grid', 844))
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${IMAGES}/Igusa_S17b_PhoneFooter_v1.0.png` })
    await goStep(page, 5)
    await expect(page.getByTestId('weave-screen')).toBeVisible()
    rows.push(await checkFooter(page, 'weave', 844))
    await goStep(page, 6)
    await expect(page.getByTestId('summary-screen')).toBeVisible()
    rows.push(await checkFooter(page, 'summary', 844))
    await openPaywall(page)
    rows.push(await checkFooter(page, 'paywall', 844))
    console.log(`[S17b phone] ${rows.join(' | ')}`)
  })

  test('paywall shows the no-payment line inside the sheet, above Continue', async ({ page }) => {
    await fresh(page)
    await openPaywall(page)
    const note = page.getByTestId('paywall-note')
    await expect(note).toHaveText('Prototype — no payment is taken. Continue simply unlocks Weave for this demo.')
    const n = (await note.boundingBox())!
    const sheet = (await page.getByTestId('paywall').boundingBox())!
    const cont = (await page.locator('.pw-continue').boundingBox())!
    const footer = (await page.getByTestId('presenter-footer').boundingBox())!
    console.log(`[S17b phone] paywall note ${n.x.toFixed(0)},${n.y.toFixed(0)} ${n.width.toFixed(0)}x${n.height.toFixed(0)} · sheet ${sheet.x},${sheet.y} ${sheet.width}x${sheet.height} · continue y ${cont.y.toFixed(0)} · footer y ${footer.y.toFixed(0)}`)
    expect(n.x).toBeGreaterThanOrEqual(sheet.x)
    expect(n.x + n.width).toBeLessThanOrEqual(sheet.x + sheet.width)
    expect(n.y).toBeGreaterThanOrEqual(sheet.y)
    expect(n.y + n.height).toBeLessThanOrEqual(cont.y)
    expect(cont.y + cont.height).toBeLessThanOrEqual(footer.y)
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${IMAGES}/Igusa_S17b_Paywall_v1.0.png` })
  })
})

test.describe('S17b footer — wide 1440×900', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('footer in view without scrolling; paywall note inside the sheet', async ({ page }) => {
    await fresh(page)
    const rows = [await checkFooter(page, 'setup', 900, false)]
    await openPaywall(page)
    rows.push(await checkFooter(page, 'paywall', 900, false))
    const n = (await page.getByTestId('paywall-note').boundingBox())!
    const sheet = (await page.getByTestId('paywall').boundingBox())!
    rows.push(`note ${n.x.toFixed(0)},${n.y.toFixed(0)} in sheet ${sheet.x.toFixed(0)},${sheet.y.toFixed(0)} ${sheet.width.toFixed(0)}x${sheet.height.toFixed(0)}`)
    expect(n.x).toBeGreaterThanOrEqual(sheet.x)
    expect(n.x + n.width).toBeLessThanOrEqual(sheet.x + sheet.width)
    expect(n.y).toBeGreaterThanOrEqual(sheet.y)
    expect(n.y + n.height).toBeLessThanOrEqual(sheet.y + sheet.height)
    console.log(`[S17b wide] ${rows.join(' | ')}`)
  })
})

test('favicon: link[rel=icon] ends with favicon.svg and serves an SVG with a <path>', async ({ page }) => {
  await page.goto('./')
  const href = await page.locator('link[rel="icon"]').getAttribute('href')
  expect(href).toMatch(/favicon\.svg$/)
  const url = new URL(href!, page.url()).toString()
  const res = await page.request.get(url)
  const body = await res.text()
  console.log(`[S17b favicon] href ${href} → ${url} · status ${res.status()} · ${body.length} B · <path> ${(body.match(/<path/g) ?? []).length}`)
  expect(res.status()).toBe(200)
  expect(body).toContain('<svg')
  expect(body).toContain('<path')
  expect(body).toContain('#3F8A84')
})

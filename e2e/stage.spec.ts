// StageSpec_v1.0 — This section is intended to check the S6 stage: both devices visible at 1440×900 without horizontal overflow, the phone filling a 390×844 viewport with the Watch hidden until toggled, mid-width scaling, the theme switch, and every button ≥ 44×44 px with an aria-label.
import { test, expect, type Page } from '@playwright/test'

async function buttonAudit(page: Page) {
  return page.evaluate(() => {
    const buttons = [...document.querySelectorAll('button')].filter((b) => {
      const r = b.getBoundingClientRect()
      return r.width > 0 && r.height > 0
    })
    const noLabel = buttons.filter((b) => !(b.getAttribute('aria-label') ?? '').trim()).length
    const sizes = buttons.map((b) => b.getBoundingClientRect())
    return {
      count: buttons.length,
      noLabel,
      minW: Math.min(...sizes.map((r) => r.width)),
      minH: Math.min(...sizes.map((r) => r.height)),
    }
  })
}

test.describe('S6 stage — wide 1440×900', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('both devices visible, correct screen sizes, no horizontal overflow', async ({ page }) => {
    await page.goto('./')
    const phone = page.getByTestId('phone-screen')
    const watch = page.getByTestId('watch-screen')
    await expect(phone).toBeVisible()
    await expect(watch).toBeVisible()
    await expect(page.getByTestId('watch-toggle')).toHaveCount(0)
    const pb = (await phone.boundingBox())!
    const wb = (await watch.boundingBox())!
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const gap = wb.x - (pb.x + pb.width)
    console.log(`[S6 wide] phone ${pb.width}x${pb.height} | watch ${wb.width}x${wb.height} | scrollWidth ${scrollWidth} | screen-to-screen ${gap.toFixed(1)} px`)
    expect(pb.width).toBe(390)
    expect(pb.height).toBe(844)
    expect(wb.width).toBe(198)
    expect(wb.height).toBe(242)
    expect(wb.x).toBeGreaterThan(pb.x + pb.width)
    expect(scrollWidth).toBeLessThanOrEqual(1440)
    await expect(page.getByText('Prototype. Sample data. Not medical advice.')).toBeVisible()
    await expect(page.getByTestId('status-bar').locator('time')).toHaveText(/^\d{1,2}:\d{2}$/)
  })

  test('every button has an aria-label and is at least 44×44', async ({ page }) => {
    await page.goto('./')
    const a = await buttonAudit(page)
    console.log(`[S6 wide] buttons ${a.count} | without aria-label ${a.noLabel} | smallest ${a.minW.toFixed(1)}x${a.minH.toFixed(1)}`)
    expect(a.count).toBeGreaterThanOrEqual(9)
    expect(a.noLabel).toBe(0)
    expect(a.minW).toBeGreaterThanOrEqual(44)
    expect(a.minH).toBeGreaterThanOrEqual(44)
  })

  test('step buttons select, theme switch sets data-theme', async ({ page }) => {
    await page.goto('./')
    const step4 = page.getByRole('button', { name: 'Step 4: Grid' })
    await step4.click()
    await expect(step4).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: 'Step 1: Set up' })).toHaveAttribute('aria-pressed', 'false')
    await page.getByRole('button', { name: 'Tatami theme' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'tatami')
    const ground = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ground').trim())
    console.log(`[S6 wide] --ground under data-theme=tatami: ${ground}`)
    expect(ground).not.toBe('')
    await page.getByRole('button', { name: 'Newsprint theme' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'newsprint')
  })
})

test.describe('S6 stage — mid 900×800', () => {
  test.use({ viewport: { width: 900, height: 800 } })

  test('pair is scaled down to fit without horizontal overflow', async ({ page }) => {
    await page.goto('./')
    const stage = page.getByTestId('stage')
    await expect(stage).toHaveAttribute('data-mode', 'mid')
    const scale = Number(await stage.getAttribute('data-scale'))
    const pb = (await page.getByTestId('phone-frame').boundingBox())!
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    console.log(`[S6 mid] scale ${scale} | phone frame ${pb.width.toFixed(1)}x${pb.height.toFixed(1)} | scrollWidth ${scrollWidth}`)
    expect(scale).toBeLessThan(1)
    expect(pb.y + pb.height).toBeLessThanOrEqual(800)
    expect(scrollWidth).toBeLessThanOrEqual(900)
    await expect(page.getByTestId('watch-screen')).toBeVisible()
  })
})

test.describe('S6 stage — narrow 390×844', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('phone screen fills the viewport; Watch hidden until the toggle is pressed', async ({ page }) => {
    await page.goto('./')
    const phone = page.getByTestId('phone-screen')
    const watch = page.getByTestId('watch-screen')
    const toggle = page.getByTestId('watch-toggle')
    const pb = (await phone.boundingBox())!
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    console.log(`[S6 narrow] phone screen ${pb.width}x${pb.height} at (${pb.x},${pb.y}) | scrollWidth ${scrollWidth} | watch visible before toggle ${await watch.isVisible()}`)
    expect(pb.width).toBe(390)
    expect(pb.height).toBe(844)
    expect(pb.x).toBe(0)
    expect(pb.y).toBe(0)
    expect(scrollWidth).toBeLessThanOrEqual(390)
    await expect(watch).toBeHidden()
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-label', 'Show Watch')
    await toggle.click()
    await expect(watch).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-label', 'Hide Watch')
    console.log(`[S6 narrow] watch visible after toggle ${await watch.isVisible()}`)
    await toggle.click()
    await expect(watch).toBeHidden()
  })

  test('every button has an aria-label and is at least 44×44', async ({ page }) => {
    await page.goto('./')
    const a = await buttonAudit(page)
    console.log(`[S6 narrow] buttons ${a.count} | without aria-label ${a.noLabel} | smallest ${a.minW.toFixed(1)}x${a.minH.toFixed(1)}`)
    expect(a.count).toBeGreaterThanOrEqual(10)
    expect(a.noLabel).toBe(0)
    expect(a.minW).toBeGreaterThanOrEqual(44)
    expect(a.minH).toBeGreaterThanOrEqual(44)
  })
})

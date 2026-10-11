// ThemeSpec_v1.0 — This section is intended to check the S15 Tatami theme end to end: the presenter bar switches <html data-theme> and the ground colour without a reload, year-strip cells keep data-level and tint(event, level) fills under the woven overlay, Weave text follows the Tatami ink, Newsprint switches back to white, and phone-frame captures of home, grid and Weave Triggers are saved in Tatami.
import { test, expect, type Page } from '@playwright/test'
import { tint } from '../src/engine'
import { openApp, openSeeded } from './helpers'

const IMG = '00_Plan/process-images'
const TATAMI_INK = '#2A2622'

/** Resolves a token on <html> to the browser's rgb() form through a probe element. */
async function tokenRgb(page: Page, token: string): Promise<string> {
  return page.evaluate((t) => {
    const probe = document.createElement('span')
    probe.style.color = `var(${t})`
    document.documentElement.appendChild(probe)
    const c = getComputedStyle(probe).color
    probe.remove()
    return c
  }, token)
}

const themeAttr = (page: Page) => page.evaluate(() => document.documentElement.dataset.theme)
const themeButton = (page: Page, name: 'Tatami' | 'Newsprint') => page.getByRole('button', { name: `${name} theme` })

async function toTatami(page: Page) {
  await themeButton(page, 'Tatami').click()
  await expect.poll(() => themeAttr(page)).toBe('tatami')
  await expect.poll(() => tokenRgb(page, '--ground')).toBe('rgb(244, 239, 228)')
}

/** Every in-range year-strip rect: its data-level and computed fill. */
async function stripCells(page: Page) {
  return page.getByTestId('year-strip').evaluate((svg) =>
    [...svg.querySelectorAll('rect.ys-cell:not([data-out])')].map((r) => ({
      level: Number(r.getAttribute('data-level')),
      fill: getComputedStyle(r).fill,
    })),
  )
}

function checkFills(cells: { level: number; fill: string }[], hex: string, emptyRgb: string) {
  let bad = 0
  const byLevel: Record<number, number> = {}
  for (const c of cells) {
    byLevel[c.level] = (byLevel[c.level] ?? 0) + 1
    const expected = c.level === 0 ? emptyRgb : tint(hex, c.level as 1 | 2 | 3 | 4 | 5)
    if (c.fill !== expected) bad++
  }
  return { bad, byLevel }
}

test('a Tatami switch without reload: data-theme, ground, strip fills intact under the woven overlay', async ({ page }) => {
  await openApp(page, 'grid')
  expect(await themeAttr(page)).toBe('newsprint')
  const before = await tokenRgb(page, '--ground')
  console.log(`[a] newsprint --ground ${before}`)
  expect(before).toBe('rgb(255, 255, 255)')
  await page.evaluate(() => ((window as unknown as { __s15Marker: number }).__s15Marker = 1511))

  await toTatami(page)
  const marker = await page.evaluate(() => (window as unknown as { __s15Marker?: number }).__s15Marker)
  const screenBg = await page.locator('.grid-screen').evaluate((el) => getComputedStyle(el).backgroundColor)
  console.log(`[a] data-theme ${await themeAttr(page)}, --ground ${await tokenRgb(page, '--ground')}, grid-screen bg ${screenBg}, marker ${marker}`)
  expect(marker).toBe(1511)
  expect(screenBg).toBe('rgb(244, 239, 228)')

  const emptyRgb = await tokenRgb(page, '--grid-empty')
  expect(emptyRgb).toBe('rgb(230, 223, 207)')

  // All filter: one ink layer, re-resolved to the Tatami ink.
  await expect.poll(async () => checkFills(await stripCells(page), TATAMI_INK, emptyRgb).bad).toBe(0)
  const all = checkFills(await stripCells(page), TATAMI_INK, emptyRgb)
  console.log(`[a] All: ${Object.values(all.byLevel).reduce((s, n) => s + n, 0)} in-range cells, levels ${JSON.stringify(all.byLevel)}, fill mismatches ${all.bad}`)

  // Bloating chip: Brick tints at each cell's data-level (S11 rule).
  await page.getByRole('button', { name: /Bloating/ }).first().click()
  await expect.poll(async () => checkFills(await stripCells(page), '#B5462F', emptyRgb).bad).toBe(0)
  const blo = checkFills(await stripCells(page), '#B5462F', emptyRgb)
  console.log(`[a] Bloating: levels ${JSON.stringify(blo.byLevel)}, fill mismatches ${blo.bad}`)
  expect(Object.keys(blo.byLevel).filter((l) => l !== '0').length).toBeGreaterThan(0)

  // Woven overlay present: strip overlay pseudo-element and calendar day ::before layers.
  const weave = await page.evaluate(() => {
    const wrap = document.querySelector('.ys-wrap')!
    const after = getComputedStyle(wrap, '::after')
    const days = [...document.querySelectorAll('.mc-day')]
    const woven = days.filter((d) => getComputedStyle(d, '::before').backgroundImage.includes('repeating-linear-gradient')).length
    const pastDays = days.filter((d) => !d.classList.contains('mc-day--future')).length
    const first = days.find((d) => !d.classList.contains('mc-day--future')) as HTMLElement
    return {
      stripBg: after.backgroundImage,
      stripMask: after.maskImage || after.getPropertyValue('-webkit-mask-image'),
      stripPointer: after.pointerEvents,
      woven,
      pastDays,
      dayInlineBg: first.style.background,
      dayBeforePointer: getComputedStyle(first, '::before').pointerEvents,
    }
  })
  console.log(`[a] strip ::after ${weave.stripBg.slice(0, 80)}… pointer-events ${weave.stripPointer}; mask ${weave.stripMask.slice(0, 60)}…; calendar woven ${weave.woven}/${weave.pastDays} past days, first day inline bg "${weave.dayInlineBg}", ::before pointer-events ${weave.dayBeforePointer}`)
  expect(weave.stripBg).toContain('repeating-linear-gradient')
  expect(weave.stripPointer).toBe('none')
  expect(weave.woven).toBe(weave.pastDays)
  expect(weave.woven).toBeGreaterThan(0)
  expect(weave.dayBeforePointer).toBe('none')

  // A calendar day still takes the click through the overlay.
  const day = page.locator('.mc-day:not(.mc-day--future)').first()
  await day.click()
  await expect(day).toHaveAttribute('aria-pressed', 'true')
})

test('b Weave Triggers card text uses the Tatami ink', async ({ page }) => {
  await openApp(page, 'weave', 'ibs', { weaveUnlocked: true })
  await toTatami(page)
  const ink = await tokenRgb(page, '--ink')
  const text = page.locator('.wv-card .wv-text').first()
  await expect(text).toBeVisible()
  const color = await text.evaluate((el) => getComputedStyle(el).color)
  console.log(`[b] Tatami --ink ${ink}, first Triggers card text colour ${color}, text "${await text.innerText()}"`)
  expect(ink).toBe('rgb(42, 38, 34)')
  expect(color).toBe(ink)
})

test('c Newsprint switches back to white without reload', async ({ page }) => {
  await openApp(page, 'grid')
  await page.evaluate(() => ((window as unknown as { __s15Marker: number }).__s15Marker = 1512))
  await toTatami(page)
  await themeButton(page, 'Newsprint').click()
  await expect.poll(() => themeAttr(page)).toBe('newsprint')
  await expect.poll(() => tokenRgb(page, '--ground')).toBe('rgb(255, 255, 255)')
  const marker = await page.evaluate(() => (window as unknown as { __s15Marker?: number }).__s15Marker)
  const overlay = await page.evaluate(() => getComputedStyle(document.querySelector('.ys-wrap')!, '::after').backgroundImage)
  console.log(`[c] back: data-theme ${await themeAttr(page)}, --ground ${await tokenRgb(page, '--ground')}, marker ${marker}, strip overlay "${overlay}"`)
  expect(marker).toBe(1512)
  expect(overlay).toBe('none')
})

test('d Tatami captures: home, grid, Weave Triggers (phone frame) + stage', async ({ page }) => {
  const frame = page.getByTestId('phone-frame')
  const ready = () => page.evaluate(() => document.fonts.ready.then(() => true))

  await openSeeded(page, 'ibs')
  await toTatami(page)
  await ready()
  await frame.screenshot({ path: `${IMG}/Igusa_S15_TatamiHome_v1.0.png`, omitBackground: true })

  await openApp(page, 'grid')
  await toTatami(page)
  await ready()
  await frame.screenshot({ path: `${IMG}/Igusa_S15_TatamiGrid_v1.0.png`, omitBackground: true })
  await page.screenshot({ path: `${IMG}/Igusa_S15_TatamiStage_v1.0.png`, fullPage: true })

  await openApp(page, 'weave', 'ibs', { weaveUnlocked: true })
  await toTatami(page)
  await expect(page.getByRole('button', { name: 'Triggers segment' })).toHaveAttribute('aria-pressed', 'true')
  await ready()
  await frame.screenshot({ path: `${IMG}/Igusa_S15_TatamiWeave_v1.0.png`, omitBackground: true })
  console.log('[d] saved Igusa_S15_TatamiHome/Grid/Weave/Stage_v1.0.png')
})

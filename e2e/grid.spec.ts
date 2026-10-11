// GridSpec_v1.0 — This section is intended to check the S11 Grid tab end to end: 371 strip cells with non-empty days matching the seeded data, drag-scrub changing the month header, Brick tints for Bloating at known counts, two-event diagonal split, day panel rows / delete / level recompute, edit time within the same day, the summary line against the store selectors, and the 44 px + aria-label button audit.
import { test, expect, type Page } from '@playwright/test'
import { openApp, readState, buttonAudit, type StoredEntry } from './helpers'
import { dayKey, shadeLevel, tint } from '../src/engine'
import { daysSinceLast, totalLast12Months } from '../src/state/selectors'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function windowKeys(now = Date.now()) {
  const t = new Date(now)
  return {
    today: dayKey(now),
    start: dayKey(new Date(t.getFullYear(), t.getMonth(), t.getDate() - 364, 12).getTime()),
  }
}

function countsBy(entries: StoredEntry[], eventId?: string) {
  const m = new Map<string, number>()
  for (const e of entries) if (!eventId || e.eventId === eventId) m.set(dayKey(e.ts), (m.get(dayKey(e.ts)) ?? 0) + 1)
  return m
}

const grid = (page: Page) => page.getByTestId('grid-screen')
const strip = (page: Page) => page.getByTestId('year-strip')
const stripCell = (page: Page, key: string) => strip(page).locator(`.ys-cell[data-day="${key}"]`)
const calDay = (page: Page, key: string) => page.getByTestId('month-calendar').locator(`button[data-day="${key}"]`)
const chip = (page: Page, name: string) => grid(page).getByRole('button', { name, exact: true })

async function open(page: Page) {
  await openApp(page, 'grid')
  await expect(grid(page)).toBeVisible()
  await expect(strip(page)).toBeVisible()
}

/** A day in the current month (≤ today) with 2–5 entries for All, else any with ≥ 2. */
function pickBusyDay(entries: StoredEntry[]) {
  const counts = countsBy(entries)
  const { today } = windowKeys()
  const prefix = today.slice(0, 8)
  const days = [...counts].filter(([k, n]) => k.startsWith(prefix) && k <= today && n >= 2).sort()
  const pick = days.find(([, n]) => n <= 5) ?? days[0]
  expect(pick, 'a current-month day with ≥ 2 entries').toBeTruthy()
  return { key: pick[0], n: pick[1] }
}

test('1 year strip has 371 cells; non-empty cells = distinct seeded days in the last 365', async ({ page }) => {
  await open(page)
  const s = await readState(page)
  const { today, start } = windowKeys()
  const distinct = new Set(s.entries.map((e) => dayKey(e.ts)).filter((k) => k >= start && k <= today))
  const total = await strip(page).locator('.ys-cell').count()
  const nonEmpty = await strip(page).locator('.ys-cell:not([data-level="0"])').count()
  const out = await strip(page).locator('.ys-cell[data-out]').count()
  const emptyFill = await strip(page)
    .locator('.ys-cell[data-level="0"]:not([data-out])')
    .first()
    .evaluate((el) => getComputedStyle(el).fill)
  console.log(`[1] cells ${total}, non-empty ${nonEmpty}, distinct dayKeys in window ${distinct.size} (${start} → ${today}), out-of-window/future cells ${out}, empty fill ${emptyFill}`)
  expect(total).toBe(371)
  expect(nonEmpty).toBe(distinct.size)
  expect(emptyFill).toBe('rgb(240, 240, 240)')
})

test('2 dragging from column 10 to column 40 changes the month header', async ({ page }) => {
  await open(page)
  const header = page.getByTestId('month-header')
  const initial = (await header.textContent())!.trim()
  const box = (await strip(page).boundingBox())!
  const x = (c: number) => box.x + 0.5 + c * 6.5 + 2.5
  const y = box.y + box.height / 2
  const t = new Date()
  const sundayMonth = (c: number) => {
    const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() - t.getDay() - (52 - c) * 7, 12)
    return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
  }
  await page.mouse.move(x(10), y)
  await page.mouse.down()
  const h10 = (await header.textContent())!.trim()
  await page.mouse.move(x(40), y, { steps: 12 })
  await page.mouse.up()
  const h40 = (await header.textContent())!.trim()
  const col = await page.getByTestId('scrub-week').getAttribute('data-col')
  console.log(`[2] initial "${initial}" → column 10 "${h10}" (expected ${sundayMonth(10)}) → column 40 "${h40}" (expected ${sundayMonth(40)}), outlined week column ${col}`)
  expect(h10).toBe(sundayMonth(10))
  expect(h40).toBe(sundayMonth(40))
  expect(h40).not.toBe(h10)
  expect(col).toBe('40')
})

test('3 Bloating chip shades cells in Brick tints at shadeLevel(count)', async ({ page }) => {
  await open(page)
  const s = await readState(page)
  const ev = s.events.find((e) => e.name === 'Bloating')!
  expect(ev.color).toBe('#B5462F')
  await chip(page, 'Bloating').click()
  await expect(chip(page, 'Bloating')).toHaveAttribute('aria-pressed', 'true')
  const { today, start } = windowKeys()
  const counts = [...countsBy(s.entries, ev.id)].filter(([k]) => k >= start && k <= today).sort()
  const want = [
    counts.find(([, n]) => n === 1),
    counts.find(([, n]) => n === 3),
    counts.find(([, n]) => n >= 5) ?? counts.reduce((a, b) => (b[1] > a[1] ? b : a)),
  ]
  for (const w of want) {
    expect(w).toBeTruthy()
    const [key, n] = w!
    const level = shadeLevel(n) as 1 | 2 | 3 | 4 | 5
    const expected = tint('#B5462F', level)
    const cell = stripCell(page, key)
    const fill = await cell.evaluate((el) => getComputedStyle(el).fill)
    const domLevel = await cell.getAttribute('data-level')
    console.log(`[3] ${key}: count ${n} → shadeLevel ${level}, DOM level ${domLevel}, fill ${fill}, expected ${expected}`)
    expect(fill).toBe(expected)
    expect(Number(domLevel)).toBe(level)
  }
})

test('4 Dairy as second chip gives diagonal-split cells', async ({ page }) => {
  await open(page)
  await chip(page, 'Bloating').click()
  await chip(page, 'Dairy').click()
  await expect(chip(page, 'Dairy')).toHaveAttribute('aria-pressed', 'true')
  await expect(chip(page, 'Bloating')).toHaveAttribute('aria-pressed', 'true')
  const split = await strip(page).locator('g.ys-cell').evaluateAll((gs) => gs.filter((g) => g.querySelectorAll('polygon').length === 2).length)
  const both = await strip(page).locator('g.ys-cell:not([data-level-a="0"]):not([data-level-b="0"])').count()
  const polys = await strip(page).locator('g.ys-cell polygon').count()
  console.log(`[4] cells with two polygons ${split}, polygons ${polys}, cells with both events non-empty ${both}`)
  expect(split).toBeGreaterThan(0)
  // A third chip replaces the second.
  await chip(page, 'Caffeine').click()
  await expect(chip(page, 'Dairy')).toHaveAttribute('aria-pressed', 'false')
  await expect(chip(page, 'Caffeine')).toHaveAttribute('aria-pressed', 'true')
})

test('5 day panel lists the day in time order; delete removes one row, one entry and recomputes the level', async ({ page }) => {
  await open(page)
  const s = await readState(page)
  const { key, n } = pickBusyDay(s.entries)
  await calDay(page, key).click()
  const rows = page.getByTestId('day-row')
  await expect(rows).toHaveCount(n)
  const ts = await rows.evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-ts'))))
  expect(ts).toEqual([...ts].sort((a, b) => a - b))
  const before = Number(await stripCell(page, key).getAttribute('data-level'))
  const calBefore = await calDay(page, key).getAttribute('aria-label')
  await rows.first().getByRole('button', { name: /^Delete / }).click()
  await expect(rows).toHaveCount(n - 1)
  await expect.poll(async () => (await readState(page)).entries.length).toBe(s.entries.length - 1)
  const after = Number(await stripCell(page, key).getAttribute('data-level'))
  const calAfter = await calDay(page, key).getAttribute('aria-label')
  console.log(`[5] ${key}: rows ${n} → ${n - 1}, entries ${s.entries.length} → ${s.entries.length - 1}, strip level ${before} → ${after} (shadeLevel ${shadeLevel(n)} → ${shadeLevel(n - 1)}), calendar "${calBefore}" → "${calAfter}"`)
  expect(before).toBe(shadeLevel(n))
  expect(after).toBe(shadeLevel(n - 1))
})

test('6 edit time to 08:15 keeps the day key', async ({ page }) => {
  await open(page)
  const s = await readState(page)
  const { key } = pickBusyDay(s.entries)
  await calDay(page, key).click()
  const row = page.getByTestId('day-row').last()
  const id = (await row.getAttribute('data-entry-id'))!
  const orig = s.entries.find((e) => e.id === id)!
  await row.getByRole('button', { name: /^Edit time for / }).click()
  await page.getByLabel('New time').fill('08:15')
  await expect.poll(async () => (await readState(page)).entries.find((e) => e.id === id)!.ts).not.toBe(orig.ts)
  const ts = (await readState(page)).entries.find((e) => e.id === id)!.ts
  const d = new Date(ts)
  console.log(`[6] ${id}: ${new Date(orig.ts).toString().slice(0, 24)} → ${d.toString().slice(0, 24)}; dayKey ${dayKey(orig.ts)} → ${dayKey(ts)}, hour ${d.getHours()}, minute ${d.getMinutes()}`)
  expect(dayKey(ts)).toBe(dayKey(orig.ts))
  expect(d.getHours()).toBe(8)
  expect(d.getMinutes()).toBe(15)
  await expect(page.locator(`[data-entry-id="${id}"] .dp-time`)).toHaveText('08:15')
})

test('7 summary line for Bloating matches daysSinceLast / totalLast12Months', async ({ page }) => {
  await open(page)
  const s = await readState(page)
  const allLine = (await page.getByTestId('summary-line').first().textContent())!.trim()
  const allTotal = s.events.reduce((n, e) => n + totalLast12Months(s.entries, e.id), 0)
  await chip(page, 'Bloating').click()
  const line = (await page.getByTestId('summary-line').first().textContent())!.trim()
  const days = daysSinceLast(s.entries, 'ibs-bloating')!
  const total = totalLast12Months(s.entries, 'ibs-bloating')
  const expected = `${days} ${days === 1 ? 'day' : 'days'} since last · ${total} in past 12 months`
  console.log(`[7] All: "${allLine}" (expected ${allTotal}) · Bloating: "${line}" (daysSinceLast ${days}, totalLast12Months ${total})`)
  expect(allLine).toBe(`${allTotal} entries in past 12 months`)
  expect(line).toBe(expected)
  await chip(page, 'Dairy').click()
  const lines = await page.getByTestId('summary-line').allTextContents()
  console.log(`[7] two-event: ${lines.map((l) => `"${l}"`).join(' | ')}`)
  expect(lines).toHaveLength(2)
})

test('8 every Grid button is ≥ 44×44 with an aria-label', async ({ page }) => {
  await open(page)
  const s = await readState(page)
  const { key } = pickBusyDay(s.entries)
  await chip(page, 'Bloating').click()
  await chip(page, 'Bloating').click() // back to All so the busy day lists rows
  await calDay(page, key).click()
  await page.getByTestId('day-row').first().getByRole('button', { name: /^Edit time for / }).click()
  const a = await buttonAudit(page, 'grid-screen')
  const range = await page.getByRole('slider', { name: 'Choose week' }).count()
  const svgLabel = await strip(page).getAttribute('aria-label')
  console.log(`[8] buttons ${a.count}, unlabelled ${a.noLabel.length}, under 44 px ${a.tooSmall}, smallest ${a.min.w.toFixed(1)}×${a.min.h.toFixed(1)} (${a.min.label}); range input ${range}; strip "${svgLabel}"`)
  expect(a.noLabel).toEqual([])
  expect(a.tooSmall).toBe(0)
  expect(range).toBe(1)
})

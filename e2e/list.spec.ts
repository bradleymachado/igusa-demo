// ListSpec_v1.0 — This section is intended to check the S10 in-app view end to end: the Log tab lists the template's events with today's counts, a tap logs one entry, a ≥ 500 ms press-and-hold opens the severity sheet and the rating lands on the hold-start timestamp, a short hold logs once without the sheet, the tab bar routes to Grid / Weave / Summary, Home returns to the home screen, every button passes the 44 px + aria-label audit, and the screen sources carry no banned words.
import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { openApp, readState, buttonAudit } from './helpers'

const IDS = ['ibs-bloating', 'ibs-cramping', 'ibs-dairy', 'ibs-fried-food', 'ibs-caffeine']
const NAMES = ['Bloating', 'Cramping', 'Dairy', 'Fried food', 'Caffeine']

function localDay(ts: number) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

async function countText(page: Page, id: string) {
  return Number(await page.getByTestId(`count-${id}`).innerText())
}

async function center(page: Page, name: string) {
  const box = (await page.getByRole('button', { name: `${name}: tap to log, hold for severity` }).boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

test('1 Log tab lists 5 events in template order with today counts', async ({ page }) => {
  await openApp(page, 'log')
  const rows = page.getByTestId('event-list').locator('button.event-row')
  await expect(rows).toHaveCount(5)
  const labels = await rows.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))
  expect(labels).toEqual(NAMES.map((n) => `${n}: tap to log, hold for severity`))
  const s = await readState(page)
  const today = localDay(Date.now())
  const dairyToday = s.entries.filter((e) => e.eventId === 'ibs-dairy' && localDay(e.ts) === today).length
  const shown = await countText(page, 'ibs-dairy')
  console.log(`entries ${s.entries.length}; Dairy today seeded ${dairyToday}, shown ${shown}`)
  expect(shown).toBe(dairyToday)
  for (const id of IDS) await expect(page.getByTestId(`event-row-${id}`)).toBeVisible()
})

test('2 tap Bloating logs one entry and bumps the count', async ({ page }) => {
  await openApp(page, 'log')
  const before = await countText(page, 'ibs-bloating')
  const n0 = (await readState(page)).entries.length
  await page.getByRole('button', { name: 'Bloating: tap to log, hold for severity' }).click()
  await expect(page.getByTestId('count-ibs-bloating')).toHaveText(String(before + 1))
  const n1 = (await readState(page)).entries.length
  console.log(`Bloating ${before} -> ${before + 1}; entries ${n0} -> ${n1}`)
  expect(n1).toBe(n0 + 1)
  await expect(page.getByTestId('severity-sheet')).toHaveCount(0)
})

test('3 hold Cramping 650 ms -> sheet -> Severity 4 on the hold-start ts', async ({ page }) => {
  await openApp(page, 'log')
  const s0 = await readState(page)
  const n0 = s0.entries.length
  const ids0 = new Set(s0.entries.map((e) => e.id))
  const c0 = await countText(page, 'ibs-cramping')
  const p = await center(page, 'Cramping')
  await page.mouse.move(p.x, p.y)
  const holdStart = Date.now()
  await page.mouse.down()
  await page.waitForTimeout(650)
  await page.mouse.up()
  await expect(page.getByTestId('severity-sheet')).toBeVisible()
  expect((await readState(page)).entries.length).toBe(n0) // nothing logged until a choice
  await page.getByRole('button', { name: 'Severity 4' }).click()
  await expect(page.getByTestId('severity-sheet')).toHaveCount(0)
  const s = await readState(page)
  const added = s.entries.filter((e) => !ids0.has(e.id))
  const entry = added[0]
  const delta = entry.ts - holdStart
  console.log(`entries ${n0} -> ${s.entries.length}; newest ${entry.eventId} severity ${entry.severity}; ts - holdStart = ${delta} ms`)
  expect(s.entries.length).toBe(n0 + 1)
  expect(entry.eventId).toBe('ibs-cramping')
  expect(entry.severity).toBe(4)
  expect(Math.abs(delta)).toBeLessThanOrEqual(50)
  await expect(page.getByTestId('count-ibs-cramping')).toHaveText(String(c0 + 1))
})

test('4 a 200 ms hold logs once and opens no sheet', async ({ page }) => {
  await openApp(page, 'log')
  const n0 = (await readState(page)).entries.length
  const c0 = await countText(page, 'ibs-cramping')
  const p = await center(page, 'Cramping')
  await page.mouse.move(p.x, p.y)
  await page.mouse.down()
  await page.waitForTimeout(200)
  await page.mouse.up()
  await page.waitForTimeout(500)
  await expect(page.getByTestId('severity-sheet')).toHaveCount(0)
  const n1 = (await readState(page)).entries.length
  console.log(`200 ms hold: entries ${n0} -> ${n1}, Cramping ${c0} -> ${await countText(page, 'ibs-cramping')}`)
  expect(n1).toBe(n0 + 1)
  await expect(page.getByTestId('count-ibs-cramping')).toHaveText(String(c0 + 1))
})

test('5 tab bar routes Grid / Weave / Summary', async ({ page }) => {
  await openApp(page, 'log')
  await expect(page.getByRole('button', { name: 'Log tab' })).toHaveAttribute('aria-current', 'page')
  await page.getByRole('button', { name: 'Grid tab' }).click()
  await expect(page.getByTestId('grid-screen')).toBeVisible()
  expect((await readState(page)).appTab).toBe('grid')
  await expect(page.getByRole('button', { name: 'Grid tab' })).toHaveAttribute('aria-current', 'page')
  await page.getByRole('button', { name: 'Weave tab' }).click()
  await expect(page.getByTestId('weave-screen')).toBeVisible()
  await page.getByRole('button', { name: 'Summary tab' }).click()
  await expect(page.getByTestId('summary-screen')).toBeVisible()
  expect((await readState(page)).appTab).toBe('summary')
})

test('6 Home returns to the home screen', async ({ page }) => {
  await openApp(page, 'log')
  await page.getByRole('button', { name: 'Back to home screen' }).click()
  await expect(page.getByTestId('home-screen')).toBeVisible()
  expect((await readState(page)).appOpen).toBe(false)
})

test('7 every button in app-view is >= 44x44 with an aria-label', async ({ page }) => {
  await openApp(page, 'log')
  const rest = await buttonAudit(page, 'app-view')
  const p = await center(page, 'Bloating')
  await page.mouse.move(p.x, p.y)
  await page.mouse.down()
  await page.waitForTimeout(650)
  await page.mouse.up()
  await expect(page.getByTestId('severity-sheet')).toBeVisible()
  const sheet = await buttonAudit(page, 'app-view')
  const rowH = await page.getByTestId('event-row-ibs-dairy').evaluate((b) => b.getBoundingClientRect().height)
  console.log(`audit rest ${JSON.stringify(rest)}; sheet ${JSON.stringify(sheet)}; row height ${rowH}`)
  for (const a of [rest, sheet]) {
    expect(a.noLabel).toEqual([])
    expect(a.tooSmall).toBe(0)
  }
  expect(rowH).toBeGreaterThanOrEqual(56)
})

test('8 screen sources carry no banned words', async () => {
  const files = ['src/screens/AppView.tsx', 'src/screens/TabBar.tsx', 'src/screens/EventList.tsx']
  const hits = files.flatMap((f) => readFileSync(f, 'utf8').split('\n').filter((l) => /cause|diagnos|treat|cure/i.test(l)).map((l) => `${f}: ${l.trim()}`))
  console.log(`banned-word hits: ${hits.length}`)
  expect(hits).toEqual([])
})

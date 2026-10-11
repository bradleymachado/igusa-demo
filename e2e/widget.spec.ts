// WidgetSpec_v1.0 — This section is intended to check the S7 iPhone widgets end to end: a medium-widget tap adds one entry and bumps today's count, a severity tap opens the 1–5 row and the rating keeps the original tap timestamp, "Logged." + Undo removes the entry, the severity row hides itself (2 s override on a second dev server), colour tiles carry no text, every button is ≥ 44×44 with an aria-label, and the large widget's mini grid has 112 cells.
//
// Severity auto-hide (test 4): the default dev server (playwright.config.ts webServer, port 5173) runs with
// SEVERITY_MS = 15000. This spec starts its own Vite dev server on port 5174 with VITE_SEVERITY_MS=2000 in
// test.beforeAll (child_process.spawn of node_modules/vite/bin/vite.js) and stops it in afterAll, so the shared
// config is untouched. Run: `npx playwright test e2e/widget.spec.ts`.
import { test, expect, type Page } from '@playwright/test'
import { spawn, type ChildProcess } from 'node:child_process'
import path from 'node:path'
import { generate, getTemplate } from '../src/data'

const KEY = 'igusa-demo-v1'
const FAST_PORT = 5174
const FAST_URL = `http://localhost:${FAST_PORT}/igusa-demo/`

interface StoredEntry { id: string; eventId: string; ts: number; severity?: number }
interface StoredState { entries: StoredEntry[]; events: { id: string; name: string }[]; setupDone: boolean }

async function readState(page: Page): Promise<StoredState> {
  return page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null')?.state, KEY)
}

/** Same state applyTemplate('ibs', true) produces — used only when the setup stub button is gone (S9 replaced it). */
function ibsSeed(): string {
  const t = getTemplate('ibs')!
  const state = {
    setupDone: true,
    templateId: 'ibs',
    events: t.events.map((e) => ({ ...e })),
    entries: generate(t),
    theme: 'newsprint',
    weaveUnlocked: false,
    presenterStep: 1,
    appTab: 'log',
    appOpen: false,
  }
  return JSON.stringify({ state, version: 1 })
}

let seedVia = ''

async function openWithIbs(page: Page, url = './') {
  await page.goto(url)
  await page.getByTestId('phone-screen').waitFor()
  const stub = page.getByRole('button', { name: 'Use IBS sample data' })
  await page.waitForLoadState('networkidle')
  if (await stub.count()) {
    await stub.click()
    seedVia = 'stub button "Use IBS sample data"'
  } else {
    const seed = ibsSeed()
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, seed] as const)
    await page.reload()
    seedVia = 'localStorage seed (stub button absent)'
  }
  await expect(page.getByTestId('widget-medium')).toBeVisible()
}

function medium(page: Page) {
  return page.getByTestId('widget-medium')
}

async function buttonAudit(page: Page) {
  return page.getByTestId('phone-screen').evaluate((root) => {
    const buttons = [...root.querySelectorAll('button')].filter((b) => {
      const r = b.getBoundingClientRect()
      return r.width > 0 && r.height > 0
    })
    const noLabel = buttons.filter((b) => !(b.getAttribute('aria-label') ?? '').trim()).map((b) => b.outerHTML.slice(0, 80))
    let min = { w: Infinity, h: Infinity, label: '' }
    for (const b of buttons) {
      const r = b.getBoundingClientRect()
      if (Math.min(r.width, r.height) < Math.min(min.w, min.h)) min = { w: r.width, h: r.height, label: b.getAttribute('aria-label') ?? '' }
    }
    const tooSmall = buttons.filter((b) => {
      const r = b.getBoundingClientRect()
      return r.width < 44 || r.height < 44
    }).length
    return { count: buttons.length, noLabel, tooSmall, min }
  })
}

test.describe('S7 widgets', () => {
  test.beforeEach(async ({ page }) => {
    await openWithIbs(page)
  })

  test('1 tap "Log Dairy" → today count +1 and entries +1', async ({ page }) => {
    const count = medium(page).getByTestId('count-ibs-dairy')
    const before = Number(await count.textContent())
    const entriesBefore = (await readState(page)).entries.length
    await medium(page).getByRole('button', { name: 'Log Dairy' }).click()
    await expect(count).toHaveText(String(before + 1))
    const entriesAfter = (await readState(page)).entries.length
    console.log(`[S7 t1] setup via ${seedVia} | Dairy today ${before} → ${before + 1} | entries ${entriesBefore} → ${entriesAfter}`)
    expect(entriesAfter).toBe(entriesBefore + 1)
  })

  test('2 tap "Log Bloating" → severity row → "Severity 3" keeps the tap ts', async ({ page }) => {
    const t0 = await page.evaluate(() => Date.now())
    await medium(page).getByRole('button', { name: 'Log Bloating' }).click()
    const t1 = await page.evaluate(() => Date.now())
    const row = medium(page).getByTestId('severity-row')
    await expect(row).toBeVisible()
    const s1 = await readState(page)
    const newest = s1.entries[s1.entries.length - 1]
    expect(newest.eventId).toBe('ibs-bloating')
    expect(newest.severity).toBeUndefined()
    expect(newest.ts).toBeGreaterThanOrEqual(t0)
    expect(newest.ts).toBeLessThanOrEqual(t1)
    await page.waitForTimeout(400) // the rating comes later than the tap
    await row.getByRole('button', { name: 'Severity 3' }).click()
    await expect(row).toHaveCount(0)
    const s2 = await readState(page)
    const rated = s2.entries.find((e) => e.id === newest.id)!
    console.log(`[S7 t2] tap window ${t0}–${t1} | entry ${newest.id} ts before ${newest.ts} after ${rated.ts} | equal ${rated.ts === newest.ts} | severity ${rated.severity} | entries ${s2.entries.length}`)
    expect(rated.ts).toBe(newest.ts)
    expect(rated.severity).toBe(3)
    expect(s2.entries.length).toBe(s1.entries.length)
  })

  test('3 "Logged." + Undo appear → Undo removes the entry; the line hides after ≈ 3 s', async ({ page }) => {
    const count = medium(page).getByTestId('count-ibs-fried-food')
    const before = Number(await count.textContent())
    const s0 = await readState(page)
    await medium(page).getByRole('button', { name: 'Log Fried food' }).click()
    const line = medium(page).getByTestId('logged-line')
    await expect(line).toBeVisible()
    await expect(line).toContainText('Logged.')
    const s1 = await readState(page)
    const added = s1.entries[s1.entries.length - 1]
    expect(s1.entries.length).toBe(s0.entries.length + 1)
    await line.getByRole('button', { name: 'Undo' }).click()
    await expect(line).toHaveCount(0)
    await expect(count).toHaveText(String(before))
    const s2 = await readState(page)
    expect(s2.entries.length).toBe(s0.entries.length)
    expect(s2.entries.some((e) => e.id === added.id)).toBe(false)

    // Timed hide: LOGGED_MS = 3000.
    await medium(page).getByRole('button', { name: 'Log Caffeine' }).click()
    const shown = Date.now()
    await expect(line).toBeVisible()
    await expect(line).toHaveCount(0, { timeout: 4000 })
    const hiddenAfter = Date.now() - shown
    console.log(`[S7 t3] entries ${s0.entries.length} → ${s1.entries.length} → ${s2.entries.length} after Undo (entry ${added.id} gone) | Fried food count back to ${before} | Logged. hid after ${hiddenAfter} ms`)
    expect(hiddenAfter).toBeGreaterThanOrEqual(2700)
    expect(hiddenAfter).toBeLessThanOrEqual(3700)
  })

  test('5 no text node inside any colour tile', async ({ page }) => {
    const result = await page.getByTestId('phone-screen').evaluate((root) => {
      const tiles = [...root.querySelectorAll('[data-tile="event"]')]
      let textNodes = 0
      for (const t of tiles) {
        const walker = document.createTreeWalker(t, NodeFilter.SHOW_TEXT)
        while (walker.nextNode()) textNodes++
      }
      return { tiles: tiles.length, textNodes }
    })
    console.log(`[S7 t5] colour tiles ${result.tiles} | text nodes inside tiles ${result.textNodes}`)
    expect(result.tiles).toBe(11) // medium 5 + small 1 + large 5
    expect(result.textNodes).toBe(0)
  })

  test('6 every button ≥ 44×44 with an aria-label (rest, severity row, Logged. + Undo)', async ({ page }) => {
    const rest = await buttonAudit(page)
    // One pending severity at a time (store rule): audit the medium row, then the small widget's 3 + 2 grid.
    await medium(page).getByRole('button', { name: 'Log Bloating' }).click()
    await expect(medium(page).getByTestId('severity-row')).toBeVisible()
    await expect(medium(page).getByTestId('logged-line')).toBeVisible()
    const open = await buttonAudit(page)
    await page.getByTestId('widget-small').getByRole('button', { name: 'Log Bloating' }).click()
    await expect(page.getByTestId('widget-small').getByTestId('severity-row')).toBeVisible()
    const small = await buttonAudit(page)
    for (const a of [rest, open, small]) {
      expect(a.noLabel).toEqual([])
      expect(a.tooSmall).toBe(0)
    }
    const fmt = (a: typeof rest) => `${a.count} buttons, smallest ${a.min.w.toFixed(1)}×${a.min.h.toFixed(1)} (${a.min.label})`
    console.log(`[S7 t6] rest: ${fmt(rest)} | medium severity + Undo: ${fmt(open)} | small 3+2 grid: ${fmt(small)} | unlabelled 0`)
  })

  test('7 large widget mini grid: 112 cells, ≥ 20 non-empty for IBS sample data', async ({ page }) => {
    const grid = page.getByTestId('widget-large').getByTestId('mini-grid')
    const cells = grid.getByTestId('mini-cell')
    await expect(cells).toHaveCount(112)
    const stats = await grid.evaluate((g) => {
      const cs = [...g.querySelectorAll<HTMLElement>('[data-testid="mini-cell"]')]
      const levels = cs.map((c) => Number(c.dataset.level))
      const emptyPast = cs.filter((c) => c.dataset.level === '0' && !c.classList.contains('wl-cell--future'))
      const emptyBg = emptyPast.length ? getComputedStyle(emptyPast[0]).backgroundColor : ''
      const token = getComputedStyle(document.documentElement).getPropertyValue('--grid-empty').trim()
      const hist = [0, 1, 2, 3, 4, 5].map((l) => levels.filter((x) => x === l).length)
      return {
        nonEmpty: levels.filter((l) => l > 0).length,
        future: cs.filter((c) => c.classList.contains('wl-cell--future')).length,
        hist,
        emptyBg,
        token,
        last: cs[cs.length - 1].dataset.day,
      }
    })
    console.log(`[S7 t7] cells 112 | non-empty ${stats.nonEmpty} | future ${stats.future} | levels 0–5 ${stats.hist.join('/')} | empty cell bg ${stats.emptyBg} (--grid-empty ${stats.token}) | last cell ${stats.last}`)
    expect(stats.nonEmpty).toBeGreaterThanOrEqual(20)
    expect(stats.emptyBg).toBe('rgb(240, 240, 240)')
  })

  test('8 the Igusa app icon opens the app view', async ({ page }) => {
    await page.getByRole('button', { name: 'Open Igusa' }).click()
    await expect(page.getByTestId('home-screen')).toHaveCount(0)
    expect((await readState(page) as unknown as { appOpen: boolean }).appOpen).toBe(true)
  })
})

test.describe('S7 severity auto-hide (VITE_SEVERITY_MS=2000 server on 5174)', () => {
  let server: ChildProcess | undefined

  test.beforeAll(async () => {
    test.setTimeout(90_000)
    const vite = path.join(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js')
    server = spawn(process.execPath, [vite, '--port', String(FAST_PORT), '--strictPort'], {
      cwd: process.cwd(),
      env: { ...process.env, VITE_SEVERITY_MS: '2000' },
      stdio: 'ignore',
    })
    const deadline = Date.now() + 60_000
    for (;;) {
      try {
        const r = await fetch(FAST_URL)
        if (r.ok) break
      } catch {
        /* not up yet */
      }
      if (Date.now() > deadline) throw new Error('fast dev server did not start')
      await new Promise((res) => setTimeout(res, 250))
    }
  })

  test.afterAll(() => {
    server?.kill()
  })

  test('4 severity row hides by itself after 2 s; entry stays unrated', async ({ page }) => {
    await openWithIbs(page, FAST_URL)
    await medium(page).getByRole('button', { name: 'Log Bloating' }).click()
    const tapped = Date.now()
    const row = medium(page).getByTestId('severity-row')
    await expect(row).toBeVisible()
    await page.waitForTimeout(1200)
    const visibleAt1200 = await row.count()
    let goneAt = -1
    while (Date.now() - tapped < 2500) {
      if ((await row.count()) === 0) {
        goneAt = Date.now() - tapped
        break
      }
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(Math.max(0, 2500 - (Date.now() - tapped)))
    const countAt2500 = await row.count()
    const s = await readState(page)
    const newest = s.entries[s.entries.length - 1]
    console.log(`[S7 t4] SEVERITY_MS override 2000 | row visible at 1.2 s: ${visibleAt1200 === 1} | gone at ≈ ${goneAt} ms after tap | row count at 2.5 s: ${countAt2500} | entry ${newest.eventId} severity ${newest.severity ?? 'unrated'}`)
    expect(visibleAt1200).toBe(1)
    expect(countAt2500).toBe(0)
    expect(goneAt).toBeGreaterThanOrEqual(1900)
    expect(newest.eventId).toBe('ibs-bloating')
    expect(newest.severity).toBeUndefined()
  })
})

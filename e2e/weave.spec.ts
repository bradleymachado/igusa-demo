// WeaveSpec_v1.0 — This section is intended to check the S12 Weave tab end to end: the unlocked Triggers list matches the engine ranking, the locked list hides every multiplier behind blurred aria-hidden pills and "See patterns" opens the paywall and unlocks, the Overlay strip draws 365 split cells and recaptions on a new pair, the When heatmap's 168 buckets sum to the symptom's entries in the past 365 days, every button passes the 44 px + aria-label audit, and the Weave sources carry no banned words.
import { test, expect, type Locator, type Page } from '@playwright/test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { openApp, readState, buttonAudit, type StoredState } from './helpers'
import { WINDOW_MS, dayKey, defaultBaselineStarts, pairLift, pairText, rankPairs } from '../src/engine'
import type { Entry, EventDef } from '../src/engine'

const weave = (page: Page) => page.getByTestId('weave-screen')
const seg = (page: Page, name: 'Triggers' | 'Overlay' | 'When') => page.getByRole('button', { name: `${name} segment` })

function engineRank(s: StoredState) {
  return rankPairs(s.entries as Entry[], s.events as EventDef[])
}

/** Engine sentence for any pair (same shared baseline as rankPairs). */
function engineText(s: StoredState, exposureId: string, symptomId: string) {
  const entries = s.entries as Entry[]
  const r = pairLift(entries, exposureId, symptomId, WINDOW_MS, defaultBaselineStarts(entries, WINDOW_MS))
  const name = (id: string) => s.events.find((e) => e.id === id)!.name
  return r.shown ? pairText(name(symptomId), name(exposureId), r.lift) : r.teaser!
}

/** Text a reader gets: the element's text with aria-hidden parts (blurred pills) removed, whitespace collapsed. */
async function readable(loc: Locator) {
  return loc.evaluate((el) => {
    const c = el.cloneNode(true) as HTMLElement
    c.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove())
    return (c.textContent ?? '').replace(/\s+/g, ' ').trim()
  })
}

async function storeFlag(page: Page, key: 'paywallOpen' | 'weaveUnlocked') {
  return page.evaluate(`import('/igusa-demo/src/state/store.ts').then((m) => m.igusaStore.getState().${key})`) as Promise<boolean>
}

test('1 unlocked Triggers list matches the engine ranking', async ({ page }) => {
  await openApp(page, 'weave', 'ibs', { weaveUnlocked: true })
  await expect(weave(page)).toBeVisible()
  await expect(seg(page, 'Triggers')).toHaveAttribute('aria-pressed', 'true')
  const s = await readState(page)
  const pairs = engineRank(s)
  const shown = pairs.filter((p) => p.shown)
  const cards = page.getByTestId('pair-card')
  const firstText = (await cards.first().getByTestId('pair-text').innerText()).trim()
  const shownLift = Number(/(\d+\.\d)×/.exec(firstText)?.[1])
  const shownCards = await page.locator('[data-testid="pair-card"][data-shown="1"]').count()
  const allTexts = await page.getByTestId('pair-text').allInnerTexts()
  const counts = (await cards.first().getByTestId('pair-counts').innerText()).trim()
  console.log(`[1] first card "${firstText}" · engine top ${pairs[0].exposureId}×${pairs[0].symptomId} lift ${pairs[0].lift.toFixed(4)} → displayed ${shownLift} · counts "${counts}" · shown cards ${shownCards} = engine shown ${shown.length} (of ${pairs.length} returned)`)
  console.log(`[1] all card texts: ${allTexts.map((t) => t.trim()).join(' | ')}`)
  expect(firstText).toMatch(/^Bloating followed Dairy 2\.[5-9]× more often\.$/)
  expect(shownLift).toBe(Number(pairs[0].lift.toFixed(1)))
  expect(shownCards).toBe(shown.length)
  expect(allTexts.length).toBe(pairs.length)
  pairs.forEach((p, i) => {
    if (p.shown) expect(allTexts[i].trim()).toBe(p.text)
  })
  expect(counts).toBe(`${pairs[0].exposures} exposures · ${pairs[0].followed} followed (${Math.round(pairs[0].pFollow * 100)}%) · base ${Math.round(pairs[0].pBase * 100)}%`)
  const h = await cards.first().evaluate((el) => el.getBoundingClientRect().height)
  expect(h).toBeGreaterThanOrEqual(64)
  await expect(page.getByRole('button', { name: 'See patterns, unlock Weave' })).toHaveCount(0)
})

test('2 locked list hides multipliers; See patterns → paywall → Continue unlocks', async ({ page }) => {
  await openApp(page, 'weave')
  const list = page.getByTestId('weave-list')
  await expect(list).toBeVisible()
  const text = await readable(list)
  const firstReadable = await readable(page.getByTestId('pair-text').first())
  const pills = page.getByTestId('weave-triggers').locator('.wv-pill')
  const pillCount = await pills.count()
  const pillFilter = await pills.first().evaluate((el) => getComputedStyle(el).filter)
  const pillHidden = await pills.first().getAttribute('aria-hidden')
  console.log(`[2] locked first card readable "${firstReadable}" · /\\d\\.\\d×/ in readable list: ${/\d\.\d×/.test(text)} · pills ${pillCount}, filter ${pillFilter}, aria-hidden ${pillHidden}`)
  expect(text).not.toMatch(/\d\.\d×/)
  expect(text).not.toMatch(/\d+%/)
  expect(firstReadable).toBe('Bloating followed Dairy — more often.')
  expect(pillFilter).toBe('blur(4px)')
  expect(pillHidden).toBe('true')

  const see = page.getByRole('button', { name: 'See patterns, unlock Weave' })
  await expect(see).toBeVisible()
  expect(await storeFlag(page, 'paywallOpen')).toBe(false)
  await see.click()
  await expect(page.getByTestId('paywall')).toBeVisible()
  const open = await storeFlag(page, 'paywallOpen')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByTestId('paywall')).toHaveCount(0)
  const s = await readState(page)
  const after = await page.getByTestId('pair-text').first().innerText()
  console.log(`[2] paywallOpen after See patterns: ${open} · after Continue: weaveUnlocked ${s.weaveUnlocked}, paywallOpen ${await storeFlag(page, 'paywallOpen')}, first card "${after.trim()}"`)
  expect(open).toBe(true)
  expect(s.weaveUnlocked).toBe(true)
  expect(after).toMatch(/\d\.\d×/)
  await expect(see).toHaveCount(0)
})

test('3 Overlay strip: 365 split cells, legend, caption follows the picker', async ({ page }) => {
  await openApp(page, 'weave', 'ibs', { weaveUnlocked: true })
  await seg(page, 'Overlay').click()
  const strip = page.getByTestId('overlay-strip')
  await expect(strip).toBeVisible()
  const cells = await strip.locator('g.ov-cell').count()
  const polys = await strip.locator('g.ov-cell polygon').count()
  const legend = await page.getByTestId('overlay-legend').innerText()
  const s = await readState(page)
  const ids = Object.fromEntries(s.events.map((e) => [e.name, e.id]))
  const caption = page.getByTestId('overlay-caption-text')
  const before = (await caption.innerText()).trim()
  console.log(`[3] cells ${cells}, polygons ${polys}, legend "${legend.replace(/\n/g, ' | ')}", caption "${before}"`)
  expect(cells).toBe(365)
  expect(polys).toBe(730)
  expect(legend).toContain('Dairy')
  expect(legend).toContain('Bloating')
  expect(before).toBe(engineText(s, ids['Dairy'], ids['Bloating']))

  await page.getByLabel('Overlay exposure').selectOption({ label: 'Fried food' })
  const symptomId = await page.getByLabel('Overlay symptom').inputValue()
  const after = (await caption.innerText()).trim()
  const expected = engineText(s, ids['Fried food'], symptomId)
  console.log(`[3] after Fried food: symptom ${symptomId}, caption "${after}", engine "${expected}"`)
  expect(after).toBe(expected)
  expect([engineText(s, ids['Fried food'], ids['Cramping']), engineText(s, ids['Fried food'], ids['Bloating'])]).toContain(after)
  await expect(page.getByTestId('overlay-legend')).toContainText('Fried food')

  // Fill check: one day's exposure half = tint(shadeLevel(count)).
  const fills = await strip.locator('g.ov-cell[data-exp="0"][data-sym="0"]').first().evaluate((g) => [...g.querySelectorAll('polygon')].map((p) => getComputedStyle(p).fill))
  expect(fills).toEqual(['rgb(240, 240, 240)', 'rgb(240, 240, 240)'])
})

test('4 When heatmap: 168 buckets sum to Bloating entries in the past 365 days', async ({ page }) => {
  await openApp(page, 'weave')
  await seg(page, 'When').click()
  const grid = page.getByTestId('when-grid')
  await expect(grid).toBeVisible()
  await expect(page.getByRole('button', { name: 'When for Bloating' })).toHaveAttribute('aria-pressed', 'true')
  const cells = grid.locator('rect.wh-cell')
  const n = await cells.count()
  const sum = await grid.evaluate((g) => [...g.querySelectorAll('rect.wh-cell')].reduce((a, r) => a + Number(r.getAttribute('data-count')), 0))
  const s = await readState(page)
  const now = Date.now()
  const t = new Date(now)
  const start = dayKey(new Date(t.getFullYear(), t.getMonth(), t.getDate() - 364, 12).getTime())
  const today = dayKey(now)
  const bloatingId = s.events.find((e) => e.name === 'Bloating')!.id
  const expected = s.entries.filter((e) => e.eventId === bloatingId && dayKey(e.ts) >= start && dayKey(e.ts) <= today).length
  const cellBox = await cells.first().boundingBox()
  const lockedLine = await readable(page.getByTestId('when-most'))

  await page.evaluate(`import('/igusa-demo/src/state/store.ts').then((m) => m.igusaStore.getState().unlockWeave())`)
  const most = (await page.getByTestId('when-most').innerText()).trim()
  console.log(`[4] cells ${n} (${cellBox?.width}×${cellBox?.height} px), Σ data-count ${sum} = Bloating entries ${start} → ${today} ${expected} · locked line "${lockedLine}" · unlocked "${most}"`)
  expect(n).toBe(168)
  expect(sum).toBe(expected)
  expect(lockedLine).toBe('Most often: —')
  expect(most).toMatch(/^Most often: (Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday) around \d{1,2} h$/)

  await page.getByRole('button', { name: 'When for Cramping' }).click()
  await expect(page.getByRole('button', { name: 'When for Cramping' })).toHaveAttribute('aria-pressed', 'true')
})

test('5 every Weave button is ≥ 44 × 44 with an aria-label (each segment, locked and unlocked)', async ({ page }) => {
  await openApp(page, 'weave')
  const results: string[] = []
  for (const name of ['Triggers', 'Overlay', 'When'] as const) {
    await seg(page, name).click()
    const a = await buttonAudit(page, 'app-view')
    results.push(`${name}: ${a.count} buttons, unlabelled ${a.noLabel.length}, under 44 ${a.tooSmall}, smallest ${a.min.w.toFixed(1)}×${a.min.h.toFixed(1)} (${a.min.label})`)
    expect(a.noLabel).toEqual([])
    expect(a.tooSmall).toBe(0)
  }
  await page.evaluate(`import('/igusa-demo/src/state/store.ts').then((m) => m.igusaStore.getState().unlockWeave())`)
  for (const name of ['Triggers', 'Overlay', 'When'] as const) {
    await seg(page, name).click()
    const a = await buttonAudit(page, 'app-view')
    results.push(`unlocked ${name}: ${a.count} buttons, unlabelled ${a.noLabel.length}, under 44 ${a.tooSmall}`)
    expect(a.noLabel).toEqual([])
    expect(a.tooSmall).toBe(0)
  }
  const selects = await page.getByTestId('weave-screen').locator('select').count()
  await seg(page, 'Overlay').click()
  const selBoxes = await page.getByTestId('weave-screen').locator('select').evaluateAll((els) => els.map((e) => [e.getAttribute('aria-label'), e.getBoundingClientRect().height]))
  console.log(`[5] ${results.join(' · ')} · overlay selects ${JSON.stringify(selBoxes)} (when tab selects ${selects})`)
  for (const [label, h] of selBoxes) {
    expect(label).toBeTruthy()
    expect(h as number).toBeGreaterThanOrEqual(44)
  }
})

test('6 no banned words in src/screens/Weave', async () => {
  const dir = 'src/screens/Weave'
  const files = readdirSync(dir)
  let hits = 0
  for (const f of files) {
    const lines = readFileSync(join(dir, f), 'utf8').split('\n')
    lines.forEach((l, i) => {
      if (/cause|diagnos|treat|cure/i.test(l)) {
        hits++
        console.log(`  ${f}:${i + 1}: ${l.trim()}`)
      }
    })
  }
  console.log(`[6] banned-word hits over ${files.length} files in ${dir}: ${hits}`)
  expect(hits).toBe(0)
})

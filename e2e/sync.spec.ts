// SyncSpec_v1.0 — This section is intended to check D3 end to end: both devices read the same store, so a Watch tile tap bumps the iPhone medium widget's count and the Watch badge in the same render (no reload), a Watch severity rating attaches to the original tap timestamp, Watch Undo removes the entry, repeated Bloating taps step the large widget's today cell level up monotonically, every Watch button is ≥ 44×44 with an aria-label and the colour tiles carry no text, and on a 390×844 viewport the Watch overlay tap reaches the iPhone widget too.
import { test, expect, type Page } from '@playwright/test'
import { openSeeded, readState, buttonAudit } from './helpers'
import { dayKey } from '../src/engine'

const BLOATING = 'ibs-bloating'
const DAIRY = 'ibs-dairy'
const CAFFEINE = 'ibs-caffeine'

function watch(page: Page) {
  return page.getByTestId('watch-screen')
}
function medium(page: Page) {
  return page.getByTestId('widget-medium')
}
async function mediumCount(page: Page, eventId: string): Promise<number> {
  return Number(await medium(page).getByTestId(`count-${eventId}`).textContent())
}
async function watchCount(page: Page, eventId: string): Promise<number> {
  return Number(await watch(page).getByTestId(`watch-count-${eventId}`).textContent())
}
async function todayCellLevel(page: Page): Promise<number> {
  const key = dayKey(Date.now())
  const cell = page.getByTestId('widget-large').locator(`[data-testid="mini-cell"][data-day="${key}"]`)
  await expect(cell).toHaveCount(1)
  return Number(await cell.getAttribute('data-level'))
}
type E = { ts: number; eventId: string; severity?: number; id: string }
/** The one entry present now that was not in the snapshot — sample data has entries later today than "now", so "newest by ts" would pick a sample row. */
function addedSince(before: E[], after: E[]): E {
  const ids = new Set(before.map((e) => e.id))
  const added = after.filter((e) => !ids.has(e.id))
  if (added.length !== 1) throw new Error(`expected exactly one new entry, got ${added.length}`)
  return added[0]
}

test.describe('S8 Watch + sync (wide 1440×900)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await openSeeded(page, 'ibs')
    await expect(watch(page).getByTestId('watch-face')).toBeVisible()
  })

  test('1 Watch Dairy tap → iPhone medium count +1 in the same render, store +1, Watch badge +1', async ({ page }) => {
    const before = await mediumCount(page, DAIRY)
    const wBefore = await watchCount(page, DAIRY)
    const levelBefore = await todayCellLevel(page)
    const entriesBefore = (await readState(page)).entries.length
    const totalBefore = Number(await watch(page).getByTestId('watch-complication').getAttribute('data-total'))

    const tile = watch(page).getByRole('button', { name: 'Watch log Dairy' })
    await tile.click()
    const pulsed = await tile.evaluate((el) => el.classList.contains('wf-pulse'))
    await expect.poll(() => mediumCount(page, DAIRY), { timeout: 500 }).toBe(before + 1)
    const after = await mediumCount(page, DAIRY)
    const wAfter = await watchCount(page, DAIRY)
    const entriesAfter = (await readState(page)).entries.length
    const totalAfter = Number(await watch(page).getByTestId('watch-complication').getAttribute('data-total'))
    const levelAfter = await todayCellLevel(page)
    await expect(watch(page).getByTestId('watch-logged-line')).toBeVisible()

    console.log(
      `t1 medium Dairy ${before} → ${after}; watch badge ${wBefore} → ${wAfter}; entries ${entriesBefore} → ${entriesAfter}; ` +
        `complication total ${totalBefore} → ${totalAfter}; large today cell (Bloating) level ${levelBefore} → ${levelAfter}; pulse class right after click: ${pulsed}`,
    )
    expect(after).toBe(before + 1)
    expect(wAfter).toBe(wBefore + 1)
    expect(entriesAfter).toBe(entriesBefore + 1)
    expect(totalAfter).toBe(totalBefore + 1)
    expect(levelAfter).toBe(levelBefore) // Dairy is not the large widget's grid event
  })

  test('2 Watch Bloating tap opens the picker; severity 4 attaches to the original ts', async ({ page }) => {
    const snapshot = (await readState(page)).entries
    const tapStart = Date.now()
    await watch(page).getByRole('button', { name: 'Watch log Bloating' }).click()
    const tapEnd = Date.now()
    const picker = watch(page).getByTestId('watch-severity-picker')
    await expect(picker).toBeVisible()
    await expect(picker.getByRole('button')).toHaveCount(6)
    const e1 = addedSince(snapshot, (await readState(page)).entries)
    expect(e1.eventId).toBe(BLOATING)
    expect(e1.severity).toBeUndefined()

    await page.waitForTimeout(400) // make the rating time clearly later than the tap
    await picker.getByRole('button', { name: 'Watch severity 4' }).click()
    await expect(picker).toBeHidden()
    const state = await readState(page)
    const e2 = state.entries.find((e) => e.id === e1.id)!
    console.log(
      `t2 tap window ${tapStart}–${tapEnd}; entry ts before ${e1.ts} = after ${e2.ts} (${e1.ts === e2.ts ? 'strict equality' : 'MISMATCH'}); ` +
        `severity ${e2.severity}; picker closed; medium widget severity row visible: ${await medium(page).getByTestId('severity-row').isVisible()}`,
    )
    expect(e2.ts).toBe(e1.ts)
    expect(e1.ts).toBeGreaterThanOrEqual(tapStart - 5)
    expect(e1.ts).toBeLessThanOrEqual(tapEnd + 5)
    expect(e2.severity).toBe(4)
  })

  test('3 Watch Undo removes the entry', async ({ page }) => {
    const snapshot = (await readState(page)).entries
    const n0 = snapshot.length
    const c0 = await mediumCount(page, 'ibs-fried-food')
    await watch(page).getByRole('button', { name: 'Watch log Fried food' }).click()
    const added = addedSince(snapshot, (await readState(page)).entries)
    const n1 = (await readState(page)).entries.length
    await watch(page).getByRole('button', { name: 'Watch undo' }).click()
    await expect.poll(() => mediumCount(page, 'ibs-fried-food'), { timeout: 500 }).toBe(c0)
    const after = await readState(page)
    console.log(`t3 entries ${n0} → ${n1} → ${after.entries.length}; removed id present: ${after.entries.some((e) => e.id === added.id)}; Fried food medium ${c0} → ${c0 + 1} → ${await mediumCount(page, 'ibs-fried-food')}`)
    expect(n1).toBe(n0 + 1)
    expect(after.entries.length).toBe(n0)
    expect(after.entries.some((e) => e.id === added.id)).toBe(false)
    await expect(watch(page).getByTestId('watch-logged-line')).toBeHidden()
  })

  test('4 repeated Watch Bloating taps step the large widget today cell level up monotonically', async ({ page }) => {
    const levels = [await todayCellLevel(page)]
    const counts = [await mediumCount(page, BLOATING)]
    for (let i = 0; i < 6 && levels[levels.length - 1] < 5; i++) {
      await watch(page).getByRole('button', { name: 'Watch log Bloating' }).click()
      const picker = watch(page).getByTestId('watch-severity-picker')
      await expect(picker).toBeVisible()
      await picker.getByRole('button', { name: 'Watch skip severity' }).click()
      await expect(picker).toBeHidden()
      counts.push(await mediumCount(page, BLOATING))
      levels.push(await todayCellLevel(page))
    }
    console.log(`t4 Bloating today count sequence ${counts.join(' → ')}; large today cell level sequence ${levels.join(' → ')}`)
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i]).toBeGreaterThanOrEqual(levels[i - 1])
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1)
      expect(counts[i]).toBe(counts[i - 1] + 1)
      expect(levels[i]).toBe(Math.min(counts[i], 5)) // shadeLevel(count)
    }
    if (levels[0] < 5) expect(levels[levels.length - 1]).toBeGreaterThan(levels[0])
  })

  test('5 every Watch button ≥ 44×44 with aria-label; no text inside colour tiles', async ({ page }) => {
    const rest = await buttonAudit(page, 'watch-screen')
    const tileText = await watch(page).evaluate((root) =>
      [...root.querySelectorAll('[data-tile="event"]')].map((t) => (t.textContent ?? '').trim()).filter(Boolean).length,
    )
    const tileCount = await watch(page).locator('[data-tile="event"]').count()
    const face = await watch(page).boundingBox()
    const overflow = await watch(page).getByTestId('watch-face').evaluate((el) => ({ sw: el.scrollWidth, sh: el.scrollHeight, cw: el.clientWidth, ch: el.clientHeight }))

    await watch(page).getByRole('button', { name: 'Watch log Cramping' }).click()
    await expect(watch(page).getByTestId('watch-severity-picker')).toBeVisible()
    await page.waitForTimeout(350) // let the 300 ms pulse (scale 0.9) finish before measuring
    const picker = await buttonAudit(page, 'watch-screen')
    await watch(page).getByRole('button', { name: 'Watch severity 2' }).click()
    await expect(watch(page).getByTestId('watch-logged-line')).toBeVisible()
    await page.waitForTimeout(350)
    const logged = await buttonAudit(page, 'watch-screen')

    console.log(
      `t5 watch screen ${face?.width}×${face?.height}; face scroll ${overflow.sw}×${overflow.sh} in ${overflow.cw}×${overflow.ch}; ` +
        `rest: ${rest.count} buttons, min ${rest.min.w.toFixed(1)}×${rest.min.h.toFixed(1)} (${rest.min.label}), unlabelled ${rest.noLabel.length}, under 44 ${rest.tooSmall}; ` +
        `picker: ${picker.count} buttons, min ${picker.min.w.toFixed(1)}×${picker.min.h.toFixed(1)} (${picker.min.label}), unlabelled ${picker.noLabel.length}, under 44 ${picker.tooSmall}; ` +
        `logged: ${logged.count} buttons, min ${logged.min.w.toFixed(1)}×${logged.min.h.toFixed(1)} (${logged.min.label}), unlabelled ${logged.noLabel.length}, under 44 ${logged.tooSmall}; ` +
        `colour tiles ${tileCount}, with text ${tileText}`,
    )
    expect(face?.width).toBe(198)
    expect(face?.height).toBe(242)
    expect(overflow.sw).toBeLessThanOrEqual(overflow.cw)
    for (const a of [rest, picker, logged]) {
      expect(a.noLabel).toEqual([])
      expect(a.tooSmall).toBe(0)
    }
    expect(tileCount).toBe(5)
    expect(tileText).toBe(0)
  })
})

test('6 narrow 390×844: Watch overlay tap → iPhone widget Caffeine count +1', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openSeeded(page, 'ibs')
  const snapshot = (await readState(page)).entries
  const before = await mediumCount(page, CAFFEINE)
  await expect(page.getByTestId('watch-frame')).toBeHidden()
  await page.getByTestId('watch-toggle').click()
  await expect(page.getByTestId('watch-frame')).toBeVisible()
  await watch(page).getByRole('button', { name: 'Watch log Caffeine' }).click()
  await page.getByTestId('watch-toggle').click()
  await expect(page.getByTestId('watch-frame')).toBeHidden()
  await expect(medium(page)).toBeVisible()
  const after = await mediumCount(page, CAFFEINE)
  const added = addedSince(snapshot, (await readState(page)).entries)
  console.log(`t6 narrow: medium Caffeine ${before} → ${after}; added entry ${added.eventId} (${added.id}); watch frame hidden after close`)
  expect(after).toBe(before + 1)
  expect(added.eventId).toBe(CAFFEINE)
})

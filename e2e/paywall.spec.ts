// PaywallSpec_v1.0 — This section is intended to check the S13 Summary tab and Weave paywall end to end: the summary page's date range, rows, 90-day counts, mini grids and locked pattern lines; the paywall's three exact prices, yearly preselection, live Continue label and unlock; no reopen once unlocked; Not now closing without unlocking; the Share toast's lifetime; the 44 px + aria-label button audit; and no banned words in the four S13 sources.
import { test, expect, type Locator, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { openApp, readState, buttonAudit } from './helpers'
import { dayKey } from '../src/engine'

/** Text a reader gets: aria-hidden parts (blurred pills) removed, whitespace collapsed. */
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

function windowKeys() {
  const t = new Date()
  const start = dayKey(new Date(t.getFullYear(), t.getMonth(), t.getDate() - 89, 12).getTime())
  return { start, today: dayKey(t.getTime()) }
}

function longDate(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 12).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const seePatterns = (page: Page) => page.getByRole('button', { name: 'See patterns, unlock Weave' })

test('1 summary page: header, rows, 90-day counts, mini grids, locked patterns', async ({ page }) => {
  await openApp(page, 'summary')
  const sum = page.getByTestId('summary-screen')
  await expect(sum).toBeVisible()
  await expect(sum.getByRole('heading', { name: 'Igusa summary' })).toBeVisible()
  const { start, today } = windowKeys()
  const range = (await page.getByTestId('summary-range').innerText()).trim()
  expect(range).toBe(`Last 90 days · ${longDate(start)} – ${longDate(today)}`)

  const s = await readState(page)
  const symptoms = page.getByTestId('summary-symptom')
  const exposures = page.getByTestId('summary-exposure')
  await expect(symptoms).toHaveCount(2)
  await expect(exposures).toHaveCount(3)
  const out: string[] = []
  for (const row of [...(await symptoms.all()), ...(await exposures.all())]) {
    const id = (await row.getAttribute('data-event'))!
    const shown = (await row.getByTestId('summary-count').innerText()).trim()
    const expected = s.entries.filter((e) => e.eventId === id && dayKey(e.ts) >= start && dayKey(e.ts) <= today).length
    out.push(`${id} shown "${shown}" = state ${expected}`)
    expect(shown).toBe(`${expected} entries`)
  }
  const metas = await symptoms.locator('.sm-meta').allInnerTexts()
  const grids = page.getByTestId('summary-grid')
  await expect(grids).toHaveCount(2)
  const cells = await grids.evaluateAll((gs) => gs.map((g) => g.querySelectorAll('rect').length))
  const patterns = page.getByTestId('summary-pattern')
  await expect(patterns).toHaveCount(3)
  const patternText = await readable(page.getByTestId('summary-patterns'))
  const pageText = await readable(page.getByTestId('summary-page'))
  console.log(`[1] range "${range}" · ${out.join(' · ')}`)
  console.log(`[1] symptom meta: ${metas.join(' | ')} · grid cells ${cells.join(', ')} · patterns (locked, readable) "${patternText}" · /\\d\\.\\d×/ in readable page: ${/\d\.\d×/.test(pageText)}`)
  expect(cells).toEqual([91, 91])
  expect(pageText).not.toMatch(/\d\.\d×/)
  expect(pageText).toContain('Logbook only. Prototype. Sample data. Not medical advice.')
  const pills = await page.getByTestId('summary-patterns').locator('.sm-pill').evaluateAll((ps) => ps.map((p) => `${p.getAttribute('aria-hidden')}/${getComputedStyle(p).filter}`))
  expect(pills).toEqual(['true/blur(4px)', 'true/blur(4px)', 'true/blur(4px)'])
})

test('2 See patterns → three exact prices, yearly preselected, label follows selection, Continue unlocks', async ({ page }) => {
  await openApp(page, 'weave')
  await seePatterns(page).click()
  const pw = page.getByTestId('paywall')
  await expect(pw).toBeVisible()
  await expect(pw.getByRole('radiogroup', { name: 'Plan' })).toBeVisible()
  const cards = pw.getByRole('radio')
  await expect(cards).toHaveCount(3)
  const texts = (await cards.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim())
  const prices = texts.map((t) => /\$\d+\.\d\d/.exec(t)?.[0])
  const heights = await cards.evaluateAll((cs) => cs.map((c) => Math.round(c.getBoundingClientRect().height)))
  console.log(`[2] cards: ${texts.join(' | ')} · prices ${prices.join(' / ')} · heights ${heights.join(', ')}`)
  expect(prices).toEqual(['$2.99', '$14.99', '$29.99'])
  expect(texts).toEqual(['Monthly — $2.99 / month', 'Yearly — $14.99 / year Save 58 %', 'Lifetime — $29.99 once'])
  heights.forEach((h) => expect(h).toBeGreaterThanOrEqual(64))
  await expect(cards.nth(1)).toHaveAttribute('aria-checked', 'true')
  await expect(cards.nth(0)).toHaveAttribute('aria-checked', 'false')
  await expect(pw.getByRole('button', { name: 'Continue with Yearly' })).toBeVisible()
  await cards.nth(2).click()
  await expect(cards.nth(2)).toHaveAttribute('aria-checked', 'true')
  await expect(cards.nth(1)).toHaveAttribute('aria-checked', 'false')
  const cont = pw.getByRole('button', { name: /^Continue with / })
  const label = await cont.getAttribute('aria-label')
  expect(label).toBe('Continue with Lifetime')
  await cont.click()
  await expect(pw).toHaveCount(0)
  const s = await readState(page)
  const open = await storeFlag(page, 'paywallOpen')
  const first = (await page.getByTestId('pair-text').first().innerText()).trim()
  console.log(`[2] label after Lifetime "${label}" · after Continue: weaveUnlocked ${s.weaveUnlocked}, paywallOpen ${open}, first card "${first}"`)
  expect(s.weaveUnlocked).toBe(true)
  expect(open).toBe(false)
  expect(first).toContain('2.7×')
})

test('3 once unlocked the paywall cannot be reopened', async ({ page }) => {
  await openApp(page, 'weave')
  const before = await seePatterns(page).count()
  await seePatterns(page).first().click()
  await page.getByRole('button', { name: /^Continue with / }).click()
  await expect(page.getByTestId('paywall')).toHaveCount(0)
  const after = await seePatterns(page).count()
  await page.reload()
  await expect(page.getByTestId('weave-screen')).toBeVisible()
  const afterReload = await seePatterns(page).count()
  console.log(`[3] See patterns buttons locked ${before} → unlocked ${after} → after reload ${afterReload}`)
  expect(before).toBeGreaterThan(0)
  expect(after).toBe(0)
  expect(afterReload).toBe(0)
})

test('4 Not now (text button and close) closes without unlocking', async ({ page }) => {
  await openApp(page, 'weave')
  const results: string[] = []
  for (const which of ['text', 'close'] as const) {
    await seePatterns(page).first().click()
    const pw = page.getByTestId('paywall')
    await expect(pw).toBeVisible()
    const notNow = pw.getByRole('button', { name: 'Not now', exact: true })
    await expect(notNow).toHaveCount(2)
    await (which === 'close' ? notNow.first() : notNow.last()).click()
    await expect(pw).toHaveCount(0)
    const unlocked = await storeFlag(page, 'weaveUnlocked')
    results.push(`${which}: weaveUnlocked ${unlocked}, paywallOpen ${await storeFlag(page, 'paywallOpen')}`)
    expect(unlocked).toBe(false)
  }
  await expect(seePatterns(page).first()).toBeVisible()
  // Restore purchase → toast only.
  await seePatterns(page).first().click()
  await page.getByRole('button', { name: 'Restore purchase' }).click()
  await expect(page.getByTestId('paywall').getByRole('status')).toHaveText('Nothing to restore in the prototype.')
  expect(await storeFlag(page, 'weaveUnlocked')).toBe(false)
  console.log(`[4] ${results.join(' · ')} · Restore toast shown, still locked`)
})

test('5 Share shows the toast and it clears within 3.5 s', async ({ page }) => {
  await openApp(page, 'summary')
  const share = page.getByRole('button', { name: 'Share summary' })
  const h = await share.evaluate((b) => b.getBoundingClientRect().height)
  await share.click()
  const t0 = Date.now()
  const status = page.getByTestId('summary-screen').getByRole('status')
  await expect(status).toHaveText('PDF export arrives with the native app.')
  await expect(page.getByTestId('summary-toast')).toHaveCount(0, { timeout: 3500 })
  const gone = Date.now() - t0
  console.log(`[5] Share height ${h} px · toast visible then gone after ${gone} ms`)
  expect(gone).toBeLessThan(3500)
})

test('6 button audit on Summary and on the open paywall', async ({ page }) => {
  await openApp(page, 'summary')
  const a = await buttonAudit(page, 'app-view')
  await page.getByRole('button', { name: 'Share summary' }).click()
  const a2 = await buttonAudit(page, 'app-view')
  await page.getByRole('button', { name: 'Weave', exact: false }).first().click()
  await expect(page.getByTestId('weave-screen')).toBeVisible()
  await seePatterns(page).first().click()
  await expect(page.getByTestId('paywall')).toBeVisible()
  const b = await buttonAudit(page, 'app-view')
  const cont = await page.getByRole('button', { name: /^Continue with / }).evaluate((el) => el.getBoundingClientRect().height)
  console.log(`[6] summary ${a.count} buttons (toast open ${a2.count}), unlabelled ${a.noLabel.length}, under 44 ${a.tooSmall}, smallest ${a.min.w.toFixed(1)}×${a.min.h.toFixed(1)} (${a.min.label}) · paywall ${b.count} buttons, unlabelled ${b.noLabel.length}, under 44 ${b.tooSmall}, smallest ${b.min.w.toFixed(1)}×${b.min.h.toFixed(1)} (${b.min.label}) · Continue height ${cont}`)
  for (const r of [a, a2, b]) {
    expect(r.noLabel).toEqual([])
    expect(r.tooSmall).toBe(0)
  }
  expect(cont).toBeGreaterThanOrEqual(50)
})

test('7 no banned words in the four S13 sources', () => {
  const files = ['src/screens/DoctorSummary.tsx', 'src/screens/Paywall.tsx', 'src/screens/summary.css', 'src/screens/paywall.css']
  const re = /cause|diagnos|treat|cure/gi
  const hits = files.map((f) => `${f}: ${(readFileSync(f, 'utf8').match(re) ?? []).length}`)
  const total = files.reduce((n, f) => n + (readFileSync(f, 'utf8').match(re) ?? []).length, 0)
  console.log(`[7] banned-word hits ${hits.join(' · ')} · total ${total}`)
  expect(total).toBe(0)
})

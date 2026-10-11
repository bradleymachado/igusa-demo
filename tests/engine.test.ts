// EngineTests_v1.0 — This section is intended to verify the engine against the plan's check values: set A lift, suppression teaser, shade levels, day keys, tint, strings and ranking (D1, D2).

import { describe, expect, it } from 'vitest'
import {
  BASELINE_STARTS,
  MIN_EXPOSURES,
  MIN_SYMPTOMS,
  WINDOW_MS,
  dayKey,
  dayStart,
  defaultBaselineStarts,
  pairLift,
  pairText,
  rankPairs,
  severityLevel,
  shadeLevel,
  teaserText,
  tint,
  type Entry,
  type EventDef,
} from '../src/engine'

const H = 3600 * 1000
const DAY = 24 * H
const T0 = Date.UTC(2026, 8, 1, 12, 0, 0)

let nextId = 0
function entry(eventId: string, ts: number): Entry {
  nextId += 1
  return { id: `e${nextId}`, eventId, ts }
}

/** Set A: 20 exposures one day apart; the first 12 are followed by a symptom 1 h later. */
function buildSetA(): { entries: Entry[]; starts: number[] } {
  const entries: Entry[] = []
  const expTs: number[] = []
  for (let i = 0; i < 20; i++) {
    const t = T0 + i * DAY
    expTs.push(t)
    entries.push(entry('dairy', t))
    if (i < 12) entries.push(entry('bloating', t + H))
  }
  // 100 injected baseline starts: 20 whose 6-h window holds a symptom, 80 that do not.
  const starts: number[] = []
  for (let i = 0; i < 12; i++) starts.push(expTs[i]) // (t, t+6h] holds t+1h → hit
  for (let i = 0; i < 8; i++) starts.push(expTs[i] + 0.5 * H) // (t+0.5h, t+6.5h] holds t+1h → hit
  for (const off of [7 * H, 8 * H, 9 * H, 12 * H]) {
    for (let i = 0; i < 20; i++) starts.push(expTs[i] + off) // next symptom is ≥ 25 h away → miss
  }
  return { entries, starts }
}

describe('Weave lift — synthetic set A (D1)', () => {
  const { entries, starts } = buildSetA()
  const r = pairLift(entries, 'dairy', 'bloating', WINDOW_MS, starts)

  it('counts 20 exposures, 12 symptoms, 12 followed', () => {
    expect(starts).toHaveLength(100)
    expect(r.exposures).toBe(20)
    expect(r.symptoms).toBe(12)
    expect(r.followed).toBe(12)
  })
  it('pFollow = 0.60', () => expect(r.pFollow).toBeCloseTo(0.6, 10))
  it('pBase = 0.20', () => expect(r.pBase).toBeCloseTo(0.2, 10))
  it('lift = 3.00 ± 0.05', () => {
    expect(Math.abs(r.lift - 3.0)).toBeLessThanOrEqual(0.05)
  })
  it('is shown with the association sentence via rankPairs', () => {
    expect(r.shown).toBe(true)
    expect(r.teaser).toBeUndefined()
  })
  it('ignores entry order', () => {
    const shuffled = [...entries].reverse()
    const r2 = pairLift(shuffled, 'dairy', 'bloating', WINDOW_MS, starts)
    expect(r2.lift).toBeCloseTo(r.lift, 10)
  })
  it('a symptom at exactly the exposure time or past the window does not count', () => {
    const e = [entry('x', T0), entry('s', T0), entry('s', T0 + WINDOW_MS + 1)]
    expect(pairLift(e, 'x', 's', WINDOW_MS, [T0 - DAY]).followed).toBe(0)
    const e2 = [entry('x', T0), entry('s', T0 + WINDOW_MS)]
    expect(pairLift(e2, 'x', 's', WINDOW_MS, [T0 - DAY]).followed).toBe(1)
  })
})

describe('Weave suppression (D1)', () => {
  const entries: Entry[] = []
  for (let i = 0; i < 8; i++) entries.push(entry('coffee', T0 + i * DAY))
  for (let i = 0; i < 4; i++) entries.push(entry('headache', T0 + i * DAY + 2 * H))
  const r = pairLift(entries, 'coffee', 'headache')

  it('8 exposures, 4 symptoms → not shown', () => {
    expect(r.exposures).toBe(8)
    expect(r.symptoms).toBe(4)
    expect(r.shown).toBe(false)
  })
  it('teaser names both needs', () => {
    expect(r.teaser).toBe('2 more exposures needed · 1 more symptom entry needed')
  })
  it('thresholds are 10 and 5', () => {
    expect(MIN_EXPOSURES).toBe(10)
    expect(MIN_SYMPTOMS).toBe(5)
    expect(WINDOW_MS).toBe(6 * 3600 * 1000)
  })
  it('lift is 0 with no exposures or zero baseline', () => {
    expect(pairLift([], 'a', 'b').lift).toBe(0)
    expect(pairLift([entry('a', T0), entry('b', T0 + H)], 'a', 'b', WINDOW_MS, [T0 - DAY]).lift).toBe(0)
  })
})

describe('Default baseline starts', () => {
  const { entries } = buildSetA()
  it('draws 100 starts inside [minTs, maxTs − window], identically on each call', () => {
    const a = defaultBaselineStarts(entries)
    const b = defaultBaselineStarts(entries)
    expect(a).toHaveLength(BASELINE_STARTS)
    expect(a).toEqual(b)
    const minTs = T0
    const maxTs = T0 + 19 * DAY
    for (const s of a) {
      expect(s).toBeGreaterThanOrEqual(minTs)
      expect(s).toBeLessThanOrEqual(maxTs - WINDOW_MS)
    }
  })
  it('gives a finite non-negative lift when no starts are injected', () => {
    const r = pairLift(entries, 'dairy', 'bloating')
    expect(Number.isFinite(r.lift)).toBe(true)
    expect(r.lift).toBeGreaterThanOrEqual(0)
  })
})

describe('Ranking', () => {
  const events: EventDef[] = [
    { id: 'bloating', name: 'Bloating', color: '#B5462F', kind: 'symptom', askSeverity: true },
    { id: 'cramps', name: 'Cramps', color: '#3F6694', kind: 'symptom', askSeverity: true },
    { id: 'dairy', name: 'Dairy', color: '#C08A2E', kind: 'exposure', askSeverity: false },
    { id: 'coffee', name: 'Coffee', color: '#7A4E82', kind: 'exposure', askSeverity: false },
    { id: 'stress', name: 'Stress', color: '#5E7F3A', kind: 'exposure', askSeverity: false },
  ]
  const entries: Entry[] = []
  for (let i = 0; i < 60; i++) {
    const t = T0 + i * DAY
    entries.push(entry('dairy', t))
    if (i % 2 === 0) entries.push(entry('bloating', t + H))
    if (i % 3 === 0) entries.push(entry('coffee', t + 10 * H))
    if (i % 6 === 0) entries.push(entry('cramps', t + 11 * H))
    if (i < 4) entries.push(entry('stress', t + 15 * H))
  }

  it('returns at most 5 pairs, lift desc then exposures desc, with text or teaser', () => {
    const ranked = rankPairs(entries, events)
    expect(ranked.length).toBeLessThanOrEqual(5)
    expect(ranked.length).toBe(5) // 3 exposures × 2 symptoms = 6 pairs → top 5
    for (let i = 1; i < ranked.length; i++) {
      const a = ranked[i - 1]
      const b = ranked[i]
      expect(a.lift > b.lift || (a.lift === b.lift && a.exposures >= b.exposures)).toBe(true)
    }
    for (const r of ranked) {
      if (r.shown) {
        expect(r.text).toMatch(/^.+ followed .+ \d+\.\d× more often\.$/)
        expect(r.teaser).toBeUndefined()
      } else {
        expect(r.teaser).toMatch(/needed/)
        expect(r.text).toBeUndefined()
      }
    }
  })
  it('is deterministic across two runs', () => {
    expect(rankPairs(entries, events)).toEqual(rankPairs(entries, events))
  })
  it('suppresses the thin exposure (stress: 4 entries)', () => {
    const stress = rankPairs(entries, events).filter((r) => r.exposureId === 'stress')
    for (const r of stress) {
      expect(r.shown).toBe(false)
      expect(r.teaser).toContain('6 more exposures needed')
    }
  })
})

describe('Shade levels (D2)', () => {
  it('counts 0,1,2,3,4,5,7 → 0,1,2,3,4,5,5', () => {
    expect([0, 1, 2, 3, 4, 5, 7].map(shadeLevel)).toEqual([0, 1, 2, 3, 4, 5, 5])
  })
  it('severityLevel: 0 when unrated, rounded and clamped otherwise', () => {
    expect(severityLevel(0)).toBe(0)
    expect(severityLevel(NaN)).toBe(0)
    expect(severityLevel(1)).toBe(1)
    expect(severityLevel(2.4)).toBe(2)
    expect(severityLevel(2.5)).toBe(3)
    expect(severityLevel(4.6)).toBe(5)
    expect(severityLevel(9)).toBe(5)
    expect(severityLevel(0.2)).toBe(1)
  })
  it("tint('#B5462F', 5) → 'rgb(181, 70, 47)' and lighter levels move toward white", () => {
    expect(tint('#B5462F', 5)).toBe('rgb(181, 70, 47)')
    expect(tint('#B5462F', 1)).toBe('rgb(239, 214, 209)') // 255 + (c − 255) × 0.22
    expect(tint('#3F6694', 3)).toBe('rgb(144, 166, 193)') // 0.58
    expect(tint('#FFFFFF', 2)).toBe('rgb(255, 255, 255)')
  })
})

describe('Day key (D2)', () => {
  it('23:59 and 00:00 local fall on different days', () => {
    expect(dayKey(new Date(2026, 8, 27, 23, 59).getTime())).toBe('2026-09-27')
    expect(dayKey(new Date(2026, 8, 28, 0, 0).getTime())).toBe('2026-09-28')
  })
  it('respects an explicit zone', () => {
    const ts = Date.UTC(2026, 8, 27, 23, 30) // 23:30 UTC
    expect(dayKey(ts, 'UTC')).toBe('2026-09-27')
    expect(dayKey(ts, 'Asia/Tokyo')).toBe('2026-09-28')
    expect(dayKey(ts, 'America/Los_Angeles')).toBe('2026-09-27')
  })
  it('dayStart returns local midnight that round-trips through dayKey', () => {
    const start = dayStart('2026-09-27')
    expect(new Date(start).getHours()).toBe(0)
    expect(new Date(start).getMinutes()).toBe(0)
    expect(dayKey(start)).toBe('2026-09-27')
    expect(dayKey(start - 1)).toBe('2026-09-26')
  })
})

describe('Strings', () => {
  it('pairText uses the association wording', () => {
    expect(pairText('Bloating', 'Dairy', 2.96)).toBe('Bloating followed Dairy 3.0× more often.')
    expect(pairText('Bloating', 'Dairy', 2.94)).toBe('Bloating followed Dairy 2.9× more often.')
  })
  it('teaserText handles singular, plural and either half alone', () => {
    expect(teaserText(2, 1)).toBe('2 more exposures needed · 1 more symptom entry needed')
    expect(teaserText(1, 2)).toBe('1 more exposure needed · 2 more symptom entries needed')
    expect(teaserText(3, 0)).toBe('3 more exposures needed')
    expect(teaserText(0, 4)).toBe('4 more symptom entries needed')
    expect(teaserText(0, 0)).toBe('')
  })
})

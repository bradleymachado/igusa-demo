// DataTests_v1.0 — This section is intended to verify the condition templates (shape, palette, language) and the seeded generator (determinism, counts, hours, severities) and to confirm every planted pattern's measured Weave lift lands within ± 0.3 of its target, printing a template → pattern → lift table (D4).
import { describe, expect, it } from 'vitest'
import { TEMPLATES, PALETTE, getTemplate, generate, rng } from '../src/data'
import type { Entry, EventDef, Template } from '../src/data'

// ---------------------------------------------------------------------------
// Lift maths. Prefer the real engine (S3); fall back to a private copy so this
// file runs standalone (IGUSA_STANDALONE=1 forces the fallback).
// ---------------------------------------------------------------------------
const WINDOW_MS = 6 * 3_600_000
const MIN_EXPOSURES = 10
const MIN_SYMPTOMS = 5

interface Lift {
  exposureId: string
  symptomId: string
  exposures: number
  symptoms: number
  followed: number
  pFollow: number
  pBase: number
  lift: number
  shown: boolean
}
type PairLiftFn = (entries: Entry[], exposureId: string, symptomId: string) => Lift
type RankFn = (entries: Entry[], events: EventDef[]) => Lift[]

function localPairLift(entries: Entry[], exposureId: string, symptomId: string): Lift {
  const ex = entries.filter((e) => e.eventId === exposureId).map((e) => e.ts)
  const sy = entries.filter((e) => e.eventId === symptomId).map((e) => e.ts).sort((a, b) => a - b)
  const has = (start: number) => sy.some((t) => t > start && t <= start + WINDOW_MS)
  const followed = ex.filter(has).length
  const pFollow = ex.length ? followed / ex.length : 0
  let min = Infinity
  let max = -Infinity
  for (const e of entries) {
    if (e.ts < min) min = e.ts
    if (e.ts > max) max = e.ts
  }
  const span = Math.max(0, max - min - WINDOW_MS)
  const r = rng(20261011)
  let hits = 0
  for (let i = 0; i < 100; i++) if (has(min + r() * span)) hits++
  const pBase = hits / 100
  return {
    exposureId,
    symptomId,
    exposures: ex.length,
    symptoms: sy.length,
    followed,
    pFollow,
    pBase,
    lift: ex.length && pBase ? pFollow / pBase : 0,
    shown: ex.length >= MIN_EXPOSURES && sy.length >= MIN_SYMPTOMS,
  }
}
function localRankPairs(entries: Entry[], events: EventDef[]): Lift[] {
  const out: Lift[] = []
  for (const x of events.filter((e) => e.kind === 'exposure'))
    for (const s of events.filter((e) => e.kind === 'symptom')) out.push(localPairLift(entries, x.id, s.id))
  return out.sort((a, b) => b.lift - a.lift || b.exposures - a.exposures).slice(0, 5)
}

let pairLift: PairLiftFn = localPairLift
let rankPairs: RankFn = localRankPairs
let liftSource = 'private copy (standalone)'
if (!process.env.IGUSA_STANDALONE) {
  try {
    const engine = await import('../src/engine')
    if (typeof engine.pairLift === 'function' && typeof engine.rankPairs === 'function') {
      pairLift = (entries, x, s) => engine.pairLift(entries, x, s)
      rankPairs = (entries, events) => engine.rankPairs(entries, events)
      liftSource = 'src/engine (S3)'
    }
  } catch {
    /* engine not present yet — S5 re-runs the suite */
  }
}

// ---------------------------------------------------------------------------
const END_DAY = '2026-10-11'
const DAYS = 183
const BANNED = /cause|diagnos|treat|cure/i
const CONDITIONS = TEMPLATES.filter((t) => t.id !== 'blank')
const PAIR_TOL = 0.3

function eventsById(t: Template): Map<string, EventDef> {
  return new Map(t.events.map((e) => [e.id, e]))
}

describe('templates', () => {
  it('has the six templates in order, with unique kebab-case ids', () => {
    expect(TEMPLATES.map((t) => t.name)).toEqual(['IBS', 'Migraine', 'Heartburn/GERD', 'Food allergy', 'Hives/eczema', 'Start blank'])
    const ids = TEMPLATES.map((t) => t.id)
    expect(new Set(ids).size).toBe(6)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    expect(getTemplate('ibs')?.name).toBe('IBS')
    expect(getTemplate('blank')?.events).toEqual([])
    expect(getTemplate('nope')).toBeUndefined()
  })

  it('gives each condition 2 severity-aware symptoms + 3 exposures, coloured in palette order', () => {
    for (const t of CONDITIONS) {
      expect(t.events).toHaveLength(5)
      const symptoms = t.events.filter((e) => e.kind === 'symptom')
      const exposures = t.events.filter((e) => e.kind === 'exposure')
      expect(symptoms).toHaveLength(2)
      expect(exposures).toHaveLength(3)
      for (const e of exposures) expect(e.askSeverity).toBe(false)
      expect(symptoms[0].askSeverity).toBe(true)
      expect(t.events.map((e) => e.color)).toEqual([...PALETTE])
      const firstFour = t.events.slice(0, 4).map((e) => e.color)
      expect(firstFour.includes('#B5462F') && firstFour.includes('#5E7F3A')).toBe(false)
      expect(t.events.some((e) => e.color.toUpperCase() === '#3F8A84')).toBe(false)
      for (const e of t.events) expect(e.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
    const allIds = CONDITIONS.flatMap((t) => t.events.map((e) => e.id))
    expect(new Set(allIds).size).toBe(allIds.length)
  })

  it('declares 3 patterns per condition that reference its own exposure → symptom ids', () => {
    for (const t of CONDITIONS) {
      expect(t.patterns).toHaveLength(3)
      const byId = eventsById(t)
      for (const p of t.patterns) {
        expect(byId.get(p.exposureId)?.kind).toBe('exposure')
        expect(byId.get(p.symptomId)?.kind).toBe('symptom')
        expect(p.targetLift).toBeGreaterThan(1)
      }
    }
    expect(getTemplate('blank')?.patterns).toEqual([])
  })

  it('keeps blurbs to one plain line with none of the banned words', () => {
    for (const t of TEMPLATES) {
      expect(t.blurb.length).toBeGreaterThan(20)
      expect(t.blurb).not.toMatch(/\n/)
      expect(t.blurb).not.toMatch(BANNED)
      expect(t.name).not.toMatch(BANNED)
      for (const e of t.events) expect(e.name).not.toMatch(BANNED)
    }
  })
})

describe('generator', () => {
  it('is deterministic for a fixed seed and differs for another seed', () => {
    const t = getTemplate('ibs')!
    const a = generate(t, { endDay: END_DAY })
    const b = generate(t, { endDay: END_DAY })
    expect(a).toEqual(b)
    const c = generate(t, { endDay: END_DAY, seed: 1 })
    expect(c).not.toEqual(a)
    expect(generate(getTemplate('blank')!, { endDay: END_DAY })).toEqual([])
  })

  it('yields 400–1,200 well-formed entries per condition for 183 days', () => {
    for (const t of CONDITIONS) {
      const entries = generate(t, { endDay: END_DAY, days: DAYS })
      expect(entries.length).toBeGreaterThanOrEqual(400)
      expect(entries.length).toBeLessThanOrEqual(1200)
      expect(new Set(entries.map((e) => e.id)).size).toBe(entries.length)
      const [y, m, d] = END_DAY.split('-').map(Number)
      const first = new Date(y, m - 1, d - (DAYS - 1)).getTime() - 3_600_000 // ± 1 h: fixed 24 h days vs a DST change
      const last = new Date(y, m - 1, d + 1).getTime() + 3_600_000
      const byId = eventsById(t)
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i]
        expect(e.ts).toBeGreaterThanOrEqual(first)
        expect(e.ts).toBeLessThan(last)
        if (i) expect(e.ts).toBeGreaterThanOrEqual(entries[i - 1].ts)
        expect(byId.has(e.eventId)).toBe(true)
        if (e.severity !== undefined) expect([1, 2, 3, 4, 5]).toContain(e.severity)
      }
    }
  })

  it('logs exposures 2–4 per week at plausible local hours (06–22) and symptoms at a base rate', () => {
    for (const t of CONDITIONS) {
      const entries = generate(t, { endDay: END_DAY, days: DAYS })
      const weeks = DAYS / 7
      for (const ex of t.events.filter((e) => e.kind === 'exposure')) {
        const mine = entries.filter((e) => e.eventId === ex.id)
        expect(mine.length / weeks).toBeGreaterThanOrEqual(1.6)
        expect(mine.length / weeks).toBeLessThanOrEqual(4.4)
        for (const e of mine) {
          const h = new Date(e.ts).getHours()
          expect(h).toBeGreaterThanOrEqual(5) // profiles 06–22 h, ± 1 h across a DST change
          expect(h).toBeLessThan(23)
          expect(e.severity).toBeUndefined()
        }
      }
      for (const sym of t.events.filter((e) => e.kind === 'symptom')) {
        const mine = entries.filter((e) => e.eventId === sym.id)
        expect(mine.length).toBeGreaterThanOrEqual(MIN_SYMPTOMS)
        expect(mine.length / DAYS).toBeLessThan(2)
      }
    }
  })

  it('rates about 85 % of severity-aware symptoms, weighted toward 2–3; others are unrated', () => {
    for (const t of CONDITIONS) {
      const entries = generate(t, { endDay: END_DAY, days: DAYS })
      for (const sym of t.events.filter((e) => e.kind === 'symptom')) {
        const mine = entries.filter((e) => e.eventId === sym.id)
        const rated = mine.filter((e) => e.severity !== undefined)
        if (!sym.askSeverity) {
          expect(rated).toHaveLength(0)
          continue
        }
        const share = rated.length / mine.length
        expect(share).toBeGreaterThan(0.75)
        expect(share).toBeLessThan(0.95)
        const mid = rated.filter((e) => e.severity === 2 || e.severity === 3).length / rated.length
        expect(mid).toBeGreaterThan(0.5)
      }
    }
  })
})

describe('planted patterns (D4)', () => {
  const rows: string[] = []
  const measured = CONDITIONS.map((t) => {
    const entries = generate(t, { endDay: END_DAY, days: DAYS })
    const name = (id: string) => t.events.find((e) => e.id === id)?.name ?? id
    const lifts = t.patterns.map((p) => ({ p, m: pairLift(entries, p.exposureId, p.symptomId) }))
    const allPairs: Lift[] = []
    for (const x of t.events.filter((e) => e.kind === 'exposure'))
      for (const s of t.events.filter((e) => e.kind === 'symptom')) allPairs.push(pairLift(entries, x.id, s.id))
    for (const { p, m } of lifts) {
      rows.push(
        `${t.name.padEnd(15)} ${`${name(p.symptomId)} × ${name(p.exposureId)}`.padEnd(30)} target ${p.targetLift.toFixed(1)}  lift ${m.lift.toFixed(2)}  ` +
          `(pFollow ${m.pFollow.toFixed(2)} / pBase ${m.pBase.toFixed(2)}; ${m.exposures} exp, ${m.symptoms} sym)  Δ ${(m.lift - p.targetLift >= 0 ? '+' : '') + (m.lift - p.targetLift).toFixed(2)}`,
      )
    }
    return { t, entries, lifts, allPairs }
  })
  console.log(`\nLift source: ${liftSource} · endDay ${END_DAY} · ${DAYS} days\n` + rows.join('\n') + '\n')
  console.log(
    'Entry counts: ' + measured.map(({ t, entries }) => `${t.name} ${entries.length}`).join(' · ') +
      '\nShown pairs: ' + measured.map(({ t, allPairs }) => `${t.name} ${allPairs.filter((p) => p.shown).length}/${allPairs.length}`).join(' · ') + '\n',
  )

  it('shows at least 3 pairs above threshold for every condition', () => {
    for (const { allPairs } of measured) expect(allPairs.filter((p) => p.shown).length).toBeGreaterThanOrEqual(3)
  })

  it('puts IBS Bloating × Dairy lift in [2.5, 3.2]', () => {
    const ibs = measured.find((m) => m.t.id === 'ibs')!
    const bd = ibs.lifts.find(({ p }) => p.exposureId === 'ibs-dairy' && p.symptomId === 'ibs-bloating')!.m
    expect(bd.shown).toBe(true)
    expect(bd.lift).toBeGreaterThanOrEqual(2.5)
    expect(bd.lift).toBeLessThanOrEqual(3.2)
  })

  it('lands every planted pattern within ± 0.3 of its target lift', () => {
    for (const { t, lifts } of measured)
      for (const { p, m } of lifts) {
        expect(m.shown, `${t.id} ${p.exposureId}→${p.symptomId} shown`).toBe(true)
        expect(Math.abs(m.lift - p.targetLift), `${t.id} ${p.exposureId}→${p.symptomId} lift ${m.lift.toFixed(2)} vs ${p.targetLift}`).toBeLessThanOrEqual(PAIR_TOL)
      }
  })

  it('ranks pairs identically across two runs', () => {
    for (const t of CONDITIONS) {
      const a = rankPairs(generate(t, { endDay: END_DAY }), t.events)
      const b = rankPairs(generate(t, { endDay: END_DAY }), t.events)
      expect(a).toEqual(b)
      expect(a.length).toBeGreaterThanOrEqual(3)
      expect(a[0].lift).toBeGreaterThanOrEqual(a[a.length - 1].lift)
    }
  })

  it('holds its lifts as the local today moves (default endDay and later dates)', () => {
    const otherDays = [undefined, '2026-10-23', '2026-11-20', '2027-01-15', '2027-04-10']
    for (const endDay of otherDays)
      for (const t of CONDITIONS) {
        const entries = generate(t, endDay ? { endDay } : {})
        for (const p of t.patterns) {
          const m = pairLift(entries, p.exposureId, p.symptomId)
          expect(Math.abs(m.lift - p.targetLift), `${endDay ?? 'today'} ${t.id} ${p.exposureId}→${p.symptomId} lift ${m.lift.toFixed(2)} vs ${p.targetLift}`).toBeLessThanOrEqual(PAIR_TOL)
        }
      }
  })
})

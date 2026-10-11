// Generator_v1.0 — This section is intended to produce deterministic sample entries (183 days ending on the viewer's local today) for a condition template: exposures 2–4 per week at plausible local hours, symptoms at a base rate plus a planted bump 0.5–5.5 h after each pattern exposure, tuned so the measured Weave lift lands on each pattern's target.
import { rng } from './rng.ts'
import { TEMPLATES } from './templates.ts'
import type { Entry, EventDef, Severity, Template } from './types.ts'

export interface GenerateOptions {
  /** 'YYYY-MM-DD' in local time; default = local today. */
  endDay?: string
  /** Number of days including endDay; default 183. */
  days?: number
  /** Default 20261011 + index of the template in TEMPLATES. */
  seed?: number
}

/** Per-template generator constants: symptom base rate per day and planted-bump probability per pattern. */
export interface Tuning {
  base: Record<string, number>
  bump: Record<string, number>
}

export const SEED_BASE = 20261011
const HOUR = 3_600_000
const DAY = 24 * HOUR
const SEVERITY_WEIGHTS: Array<[Severity, number]> = [[1, 0.15], [2, 0.35], [3, 0.3], [4, 0.15], [5, 0.05]]
const UNRATED_SHARE = 0.15

/** Local-hour windows [start, endExclusive, weight]. */
type HourWindow = [number, number, number]
const PROFILES: Record<string, HourWindow[]> = {
  meal: [[7, 9, 1], [12, 14, 1.2], [18, 21, 1.2]],
  lunchDinner: [[12, 14, 1], [18, 21, 1.2]],
  coffee: [[7, 10, 1.5], [13, 16, 1]],
  evening: [[18, 22, 1]],
  lateMeal: [[20, 22, 1]],
  wake: [[6, 9, 1]],
  morning: [[7, 11, 1]],
  daytime: [[10, 18, 1]],
  dressing: [[7, 10, 1]],
  snack: [[10, 12, 1], [15, 17, 1.2]],
  symptom: [[0, 7, 0.4], [7, 23, 1], [23, 24, 0.6]],
}

/** Exposure hour profile and weekly rate (2–4 per week). */
const EXPOSURES: Record<string, { profile: keyof typeof PROFILES; perWeek: number }> = {
  'ibs-dairy': { profile: 'meal', perWeek: 3.5 },
  'ibs-fried-food': { profile: 'lunchDinner', perWeek: 2.5 },
  'ibs-caffeine': { profile: 'coffee', perWeek: 4 },
  'migraine-short-sleep': { profile: 'wake', perWeek: 2.5 },
  'migraine-alcohol': { profile: 'evening', perWeek: 2.5 },
  'migraine-skipped-meal': { profile: 'lunchDinner', perWeek: 3 },
  'gerd-fried-food': { profile: 'lunchDinner', perWeek: 3 },
  'gerd-late-meal': { profile: 'lateMeal', perWeek: 3 },
  'gerd-coffee': { profile: 'coffee', perWeek: 4 },
  'allergy-ate-out': { profile: 'lunchDinner', perWeek: 3 },
  'allergy-new-food': { profile: 'meal', perWeek: 2.5 },
  'allergy-packaged-snack': { profile: 'snack', perWeek: 3.5 },
  'hives-heat-sweat': { profile: 'daytime', perWeek: 3 },
  'hives-stress': { profile: 'morning', perWeek: 3 },
  'hives-wool-fragrance': { profile: 'dressing', perWeek: 3 },
}

/** Tuned against the private lift copy in tests/data.test.ts for seed 20261011 + index, 183 days. Key for bump: `${exposureId}>${symptomId}`. */
export const TUNING: Record<string, Tuning> = {
  ibs: {
    base: { 'ibs-bloating': 0.6, 'ibs-cramping': 0.5 },
    bump: { 'ibs-dairy>ibs-bloating': 0.695, 'ibs-fried-food>ibs-cramping': 0.411, 'ibs-caffeine>ibs-bloating': 0.249 },
  },
  migraine: {
    base: { 'migraine-headache': 0.6, 'migraine-aura': 0.5 },
    bump: { 'migraine-short-sleep>migraine-headache': 0.578, 'migraine-alcohol>migraine-headache': 0.436, 'migraine-skipped-meal>migraine-aura': 0.142 },
  },
  'heartburn-gerd': {
    base: { 'gerd-heartburn': 0.55, 'gerd-regurgitation': 0.65 },
    bump: { 'gerd-fried-food>gerd-heartburn': 0.673, 'gerd-late-meal>gerd-heartburn': 0.527, 'gerd-coffee>gerd-regurgitation': 0.126 },
  },
  'food-allergy': {
    base: { 'allergy-reaction': 0.45, 'allergy-itching': 0.5 },
    bump: { 'allergy-ate-out>allergy-reaction': 0.721, 'allergy-new-food>allergy-itching': 0.262, 'allergy-packaged-snack>allergy-reaction': 0.181 },
  },
  'hives-eczema': {
    base: { 'hives-flare': 0.6, 'hives-itch': 0.5 },
    bump: { 'hives-heat-sweat>hives-flare': 0.626, 'hives-wool-fragrance>hives-itch': 0.421, 'hives-stress>hives-flare': 0.319 },
  },
  blank: { base: {}, bump: {} },
}

function localToday(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function pickHour(windows: HourWindow[], u1: number, u2: number): number {
  const total = windows.reduce((s, [a, b, w]) => s + (b - a) * w, 0)
  let r = u1 * total
  for (const [a, b, w] of windows) {
    const span = (b - a) * w
    if (r < span) return a + (b - a) * u2
    r -= span
  }
  const [a, b] = windows[windows.length - 1]
  return a + (b - a) * u2
}

function severityFor(ev: EventDef, next: () => number): Severity | undefined {
  if (!ev.askSeverity) return undefined
  const u = next()
  const v = next()
  if (u < UNRATED_SHARE) return undefined
  let acc = 0
  for (const [sev, w] of SEVERITY_WEIGHTS) {
    acc += w
    if (v < acc) return sev
  }
  return 3
}

/** Generate with explicit tuning constants (used by generate() and by the offline tuner). */
export function generateWithTuning(template: Template, opts: GenerateOptions, tuning: Tuning): Entry[] {
  const days = opts.days ?? 183
  const endDay = opts.endDay ?? localToday()
  const index = TEMPLATES.findIndex((t) => t.id === template.id)
  const seed = opts.seed ?? SEED_BASE + Math.max(index, 0)
  const [y, m, d] = endDay.split('-').map(Number)

  // Independent streams so a tuning change moves only the outcomes it concerns.
  const rExposure = rng(seed)
  const rBase = rng(seed + 1_000)
  const rBump = rng(seed + 2_000)
  const rSev = rng(seed + 3_000)

  const symptoms = template.events.filter((e) => e.kind === 'symptom')
  const exposures = template.events.filter((e) => e.kind === 'exposure')
  // Fixed 24 h days back from endDay's local midnight: the whole set shifts rigidly as today moves,
  // so measured lifts are identical for every endDay (a DST change would otherwise perturb the baseline sample).
  const endMidnight = new Date(y, m - 1, d).getTime()
  const at = (dayOffset: number, hour: number) => endMidnight - (days - 1 - dayOffset) * DAY + Math.floor(hour * 60) * 60_000

  const raw: Array<{ eventId: string; ts: number; severity?: Severity }> = []

  for (let day = 0; day < days; day++) {
    for (const ex of exposures) {
      const spec = EXPOSURES[ex.id] ?? { profile: 'meal', perWeek: 3 }
      const u = rExposure()
      const h1 = rExposure()
      const h2 = rExposure()
      if (u >= spec.perWeek / 7) continue
      const ts = at(day, pickHour(PROFILES[spec.profile], h1, h2))
      raw.push({ eventId: ex.id, ts })
      for (const p of template.patterns) {
        if (p.exposureId !== ex.id) continue
        const hit = rBump()
        const lag = rBump()
        const prob = tuning.bump[`${p.exposureId}>${p.symptomId}`] ?? 0
        if (hit >= prob) continue
        const sym = symptoms.find((s) => s.id === p.symptomId)
        if (!sym) continue
        raw.push({ eventId: sym.id, ts: ts + (0.5 + lag * 5) * HOUR, severity: severityFor(sym, rSev) })
      }
    }
    for (const sym of symptoms) {
      const base = tuning.base[sym.id] ?? 0.3
      const u1 = rBase()
      const h1 = rBase()
      const h2 = rBase()
      const u2 = rBase()
      const h3 = rBase()
      const h4 = rBase()
      if (u1 < base) raw.push({ eventId: sym.id, ts: at(day, pickHour(PROFILES.symptom, h1, h2)), severity: severityFor(sym, rSev) })
      if (u2 < base * 0.3) raw.push({ eventId: sym.id, ts: at(day, pickHour(PROFILES.symptom, h3, h4)), severity: severityFor(sym, rSev) })
    }
  }

  const todayEnd = at(days - 1, 23.99)
  raw.sort((a, b) => a.ts - b.ts || a.eventId.localeCompare(b.eventId))
  const prefix = `${template.id}-${seed.toString(36)}`
  return raw
    .filter((e) => e.ts <= todayEnd)
    .map((e, i) => {
      const entry: Entry = { id: `${prefix}-${i.toString(36).padStart(3, '0')}`, eventId: e.eventId, ts: e.ts }
      if (e.severity !== undefined) entry.severity = e.severity
      return entry
    })
}

/** Deterministic sample data for a template; same template + opts → identical array. */
export function generate(template: Template, opts: GenerateOptions = {}): Entry[] {
  return generateWithTuning(template, opts, TUNING[template.id] ?? { base: {}, bump: {} })
}

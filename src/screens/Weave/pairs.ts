// WeavePairs_v1.0 — This section is intended to count symptom entries per hour × weekday for the When view, compute every exposure × symptom pair with the engine (same shared baseline draw and sentence as rankPairs), so the Overlay picker can caption any pair, not only the top five, and to split an engine sentence around its lift for the locked view.
import { WINDOW_MS, dayKey, defaultBaselineStarts, pairLift, pairText } from '../../engine'
import { buildStrip } from '../Grid/shading'
import type { Entry, EventDef, PairResult } from '../../engine'

/** All exposure × symptom pairs, unranked; shown pairs carry the engine `text`, others the engine `teaser`. */
export function allPairs(entries: Entry[], events: EventDef[]): PairResult[] {
  const exposures = events.filter((e) => e.kind === 'exposure')
  const symptoms = events.filter((e) => e.kind === 'symptom')
  const starts = defaultBaselineStarts(entries, WINDOW_MS)
  const out: PairResult[] = []
  for (const x of exposures) {
    for (const s of symptoms) {
      const r = pairLift(entries, x.id, s.id, WINDOW_MS, starts)
      if (r.shown) r.text = pairText(s.name, x.name, r.lift)
      out.push(r)
    }
  }
  return out
}

/** The multiplier inside an engine sentence, e.g. "2.7×". */
export const LIFT_RE = /\d+(?:\.\d+)?×/

/** Splits "Bloating followed Dairy 2.7× more often." into before / lift / after; null when no multiplier is present. */
export function splitLift(text: string): { before: string; lift: string; after: string } | null {
  const m = LIFT_RE.exec(text)
  if (!m) return null
  return {
    before: text.slice(0, m.index).trimEnd(),
    lift: m[0],
    after: text.slice(m.index + m[0].length).trimStart(),
  }
}

/** Whole-number percentage, e.g. 0.42 → "42%". */
export function pct(p: number): string {
  return `${Math.round(p * 100)}%`
}

/** counts[weekday][hour] for `eventId` entries whose local day falls in the 365-day strip window. */
export function hourWeekdayCounts(entries: Entry[], eventId: string, now: number): number[][] {
  const { startKey, todayKey } = buildStrip(now)
  const counts = Array.from({ length: 7 }, () => new Array<number>(24).fill(0))
  for (const e of entries) {
    if (e.eventId !== eventId) continue
    const k = dayKey(e.ts)
    if (k < startKey || k > todayKey) continue
    const d = new Date(e.ts)
    counts[d.getDay()][d.getHours()] += 1
  }
  return counts
}

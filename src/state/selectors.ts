// Selectors_v1.0 — This section is intended to provide pure, store-independent read functions over entries and events (today's count, per-day counts and mean severity, days since last, 12-month total, entries on a day, ranked Weave pairs) for widgets, grid, list and summary screens.
import { dayKey, dayStart, rankPairs } from '../engine'
import type { Entry, EventDef, PairResult } from '../engine'

const DAY_MS = 86_400_000

export interface DayStat {
  count: number
  /** Mean of rated severities on the day; 0 when no entry was rated. */
  meanSeverity: number
}

/** Entries for one event, in timestamp order. */
export function forEvent(entries: Entry[], eventId: string): Entry[] {
  return entries.filter((e) => e.eventId === eventId).sort((a, b) => a.ts - b.ts)
}

/** How many entries of `eventId` fall on the local day containing `now`. */
export function todayCount(entries: Entry[], eventId: string, now: number = Date.now()): number {
  const today = dayKey(now)
  let n = 0
  for (const e of entries) if (e.eventId === eventId && dayKey(e.ts) === today) n += 1
  return n
}

/** Per-day count and mean severity for `eventId`, keyed by local day key. */
export function countsByDay(entries: Entry[], eventId: string): Map<string, DayStat> {
  const out = new Map<string, DayStat>()
  const sums = new Map<string, { sum: number; rated: number }>()
  for (const e of entries) {
    if (e.eventId !== eventId) continue
    const k = dayKey(e.ts)
    const stat = out.get(k) ?? { count: 0, meanSeverity: 0 }
    stat.count += 1
    out.set(k, stat)
    if (e.severity !== undefined) {
      const s = sums.get(k) ?? { sum: 0, rated: 0 }
      s.sum += e.severity
      s.rated += 1
      sums.set(k, s)
    }
  }
  for (const [k, s] of sums) {
    const stat = out.get(k)
    if (stat && s.rated > 0) stat.meanSeverity = s.sum / s.rated
  }
  return out
}

/** Whole local days between the latest `eventId` entry and `now`; null when there is none. 0 = today. */
export function daysSinceLast(entries: Entry[], eventId: string, now: number = Date.now()): number | null {
  let last = -Infinity
  for (const e of entries) if (e.eventId === eventId && e.ts <= now && e.ts > last) last = e.ts
  if (last === -Infinity) return null
  const diff = dayStart(dayKey(now)) - dayStart(dayKey(last))
  return Math.max(0, Math.round(diff / DAY_MS))
}

/** Entries of `eventId` with ts in (now − 12 calendar months, now]. */
export function totalLast12Months(entries: Entry[], eventId: string, now: number = Date.now()): number {
  const d = new Date(now)
  d.setMonth(d.getMonth() - 12)
  const start = d.getTime()
  let n = 0
  for (const e of entries) if (e.eventId === eventId && e.ts > start && e.ts <= now) n += 1
  return n
}

/** All entries (any event) whose local day key equals `key`, in timestamp order. */
export function entriesOn(entries: Entry[], key: string): Entry[] {
  return entries.filter((e) => dayKey(e.ts) === key).sort((a, b) => a.ts - b.ts)
}

/** Ranked exposure→symptom pairs from the engine (top 5, lift desc). */
export function ranked(entries: Entry[], events: EventDef[]): PairResult[] {
  return rankPairs(entries, events)
}

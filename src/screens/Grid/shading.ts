// GridShading_v1.0 — This section is intended to turn entries plus the current filter (All / one event / two events, Count or Severity) into per-day shade levels and fills, and to lay out the 53 × 7 year strip and month geometry shared by the strip, calendar and summary.
import { dayKey, severityLevel, shadeLevel, tint } from '../../engine'
import type { Entry } from '../../engine'
import type { DayStat } from '../../state/selectors'

export type ShadeMode = 'count' | 'severity'

export const WEEKS = 53
export const CELL = 5
export const GAP = 1.5
export const STEP = CELL + GAP
export const STRIP_W = WEEKS * CELL + (WEEKS - 1) * GAP
export const STRIP_H = 7 * CELL + 6 * GAP

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** One data layer: a colour (hex) and its per-day stats. All = one ink layer; two-event mode = two layers. */
export interface Layer {
  id: string
  name: string
  color: string
  stats: Map<string, DayStat>
}

export interface DayPaint {
  /** Levels per layer (0 = empty). */
  levels: number[]
  /** Fill per layer; null = empty (--grid-empty). */
  fills: (string | null)[]
  /** Entries on the day across the layers. */
  count: number
}

/** Per-day count and mean severity over every entry (the All filter). */
export function statsAll(entries: Entry[]): Map<string, DayStat> {
  const out = new Map<string, DayStat>()
  const sums = new Map<string, { sum: number; rated: number }>()
  for (const e of entries) {
    const k = dayKey(e.ts)
    const st = out.get(k) ?? { count: 0, meanSeverity: 0 }
    st.count += 1
    out.set(k, st)
    if (e.severity !== undefined) {
      const s = sums.get(k) ?? { sum: 0, rated: 0 }
      s.sum += e.severity
      s.rated += 1
      sums.set(k, s)
    }
  }
  for (const [k, s] of sums) {
    const st = out.get(k)
    if (st && s.rated > 0) st.meanSeverity = s.sum / s.rated
  }
  return out
}

export function levelOf(stat: DayStat | undefined, mode: ShadeMode): number {
  if (!stat) return 0
  return mode === 'count' ? shadeLevel(stat.count) : severityLevel(stat.meanSeverity)
}

export function paintDay(key: string, layers: Layer[], mode: ShadeMode): DayPaint {
  const levels: number[] = []
  const fills: (string | null)[] = []
  let count = 0
  for (const l of layers) {
    const st = l.stats.get(key)
    const lv = levelOf(st, mode)
    count += st?.count ?? 0
    levels.push(lv)
    fills.push(lv > 0 ? tint(l.color, lv as 1 | 2 | 3 | 4 | 5) : null)
  }
  return { levels, fills, count }
}

/** Used only where no DOM exists to resolve --ink (never in the browser). */
export const NO_DOM_INK = '#111111'

/** Resolves a CSS colour token (e.g. --ink) to '#rrggbb' through a probe element, so no colour is hard-coded here. */
export function resolveTokenHex(token: string): string | null {
  if (typeof document === 'undefined' || !document.body) return null
  const probe = document.createElement('span')
  probe.style.color = `var(${token})`
  probe.style.display = 'none'
  document.body.appendChild(probe)
  const rgb = getComputedStyle(probe).color
  probe.remove()
  const m = rgb.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/)
  if (!m) return null
  return '#' + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')
}

export interface StripDay {
  key: string
  col: number
  row: number
  /** Within the 365 days ending today. */
  inRange: boolean
  date: Date
}

/** 53 weeks (Sunday → Saturday columns); last column = the current week; covers the 365 days ending today. */
export function buildStrip(now: number): { days: StripDay[]; todayKey: string; startKey: string } {
  const t = new Date(now)
  const y = t.getFullYear()
  const m = t.getMonth()
  const d = t.getDate()
  const todayKey = dayKey(now)
  // Noon keeps whole-day steps clear of DST edges.
  const startKey = dayKey(new Date(y, m, d - 364, 12).getTime())
  const firstSunday = d - t.getDay() - (WEEKS - 1) * 7
  const days: StripDay[] = []
  for (let i = 0; i < WEEKS * 7; i++) {
    const date = new Date(y, m, firstSunday + i, 12)
    const key = dayKey(date.getTime())
    days.push({ key, col: Math.floor(i / 7), row: i % 7, inRange: key >= startKey && key <= todayKey, date })
  }
  return { days, todayKey, startKey }
}

export interface MonthRef {
  y: number
  m: number
}

export function monthIndex(r: MonthRef): number {
  return r.y * 12 + r.m
}

export function keyOf(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** 'Mon 5 Oct' for a day key. */
export function dayLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d, 12)
  return `${WEEKDAY_SHORT[date.getDay()]} ${d} ${MONTH_SHORT[m - 1]}`
}

export function hhmm(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

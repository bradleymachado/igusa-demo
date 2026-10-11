// DayKey_v1.0 — This section is intended to turn an entry timestamp into a local-calendar day key ('YYYY-MM-DD') and back to that day's local midnight.

const formatters = new Map<string, Intl.DateTimeFormat>()

function formatterFor(timeZone?: string): Intl.DateTimeFormat {
  const cacheKey = timeZone ?? '__local__'
  let fmt = formatters.get(cacheKey)
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    formatters.set(cacheKey, fmt)
  }
  return fmt
}

/**
 * Day key for a timestamp in the viewer's local zone (or an explicit IANA zone).
 * 23:59 and 00:00 one minute later fall on different keys.
 */
export function dayKey(ts: number, timeZone?: string): string {
  const parts = formatterFor(timeZone).formatToParts(new Date(ts))
  let y = ''
  let m = ''
  let d = ''
  for (const p of parts) {
    if (p.type === 'year') y = p.value
    else if (p.type === 'month') m = p.value
    else if (p.type === 'day') d = p.value
  }
  return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

/** Local midnight (epoch ms) for a 'YYYY-MM-DD' key, in the viewer's local zone. */
export function dayStart(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime()
}

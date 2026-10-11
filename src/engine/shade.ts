// Shade_v1.0 — This section is intended to map a day's count or mean severity to a grid shade level 0–5 and to tint an event colour at the fixed 22/40/58/78/100 % ramp.

export type ShadeLevel = 0 | 1 | 2 | 3 | 4 | 5

/** Ramp strengths for levels 1–5, as fractions of the full event colour. */
export const TINT_RAMP: readonly [number, number, number, number, number] = [0.22, 0.4, 0.58, 0.78, 1]

/** Count of entries in a day → shade level; 0 stays empty, 5 or more caps at 5. */
export function shadeLevel(count: number): ShadeLevel {
  if (!Number.isFinite(count) || count <= 0) return 0
  const n = Math.floor(count)
  return (n >= 5 ? 5 : n) as ShadeLevel
}

/** Mean severity of rated entries → shade level; 0 when there were no rated entries, else rounded and clamped to 1–5. */
export function severityLevel(meanSeverity: number): ShadeLevel {
  if (!Number.isFinite(meanSeverity) || meanSeverity <= 0) return 0
  const r = Math.round(meanSeverity)
  return (r < 1 ? 1 : r > 5 ? 5 : r) as ShadeLevel
}

function parseHex(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`tint: bad hex colour '${hex}'`)
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

/** White blended toward `hex` by the ramp strength for `level`; returns 'rgb(r, g, b)'. Level 5 is the full colour. */
export function tint(hex: string, level: 1 | 2 | 3 | 4 | 5): string {
  const [r, g, b] = parseHex(hex)
  const k = TINT_RAMP[level - 1]
  const mix = (c: number) => Math.round(255 + (c - 255) * k)
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}

// SetupDraft_v1.0 — This section is intended to hold the pure helpers for the setup draft: copying a template's events, giving new rows an id and a palette colour, cycling a row's swatch through the free palette colours, and keeping Brick and Moss out of the first four together.
import { PALETTE, getTemplate } from '../data'
import type { EventDef } from '../data'
import { MAX_EVENTS, nextColor } from '../state'

const BRICK = PALETTE[0]
const MOSS = PALETTE[4]

/** A fresh, editable copy of a template's events. The blank template starts with one unnamed symptom row. */
export function draftFromTemplate(templateId: string): EventDef[] {
  const template = getTemplate(templateId)
  if (!template) return []
  if (template.events.length === 0) return [newRow(templateId, [], 'symptom')]
  return template.events.map((e) => ({ ...e }))
}

/** A new unnamed row with a unique id and the store's next allowed palette colour. */
export function newRow(templateId: string, events: EventDef[], kind: EventDef['kind'] = 'exposure'): EventDef {
  const ids = new Set(events.map((e) => e.id))
  let n = events.length + 1
  while (ids.has(`${templateId}-custom-${n}`)) n += 1
  return {
    id: `${templateId}-custom-${n}`,
    name: '',
    color: nextColor(events),
    kind,
    askSeverity: kind === 'symptom',
  }
}

/** True when the colour may sit at `index` given the other rows (free, and no Brick + Moss pair in the first four). */
function allowed(events: EventDef[], index: number, color: string): boolean {
  const others = events.filter((_, i) => i !== index)
  if (others.some((e) => e.color.toUpperCase() === color)) return false
  if (index < 4) {
    const firstFour = events.slice(0, 4).filter((_, i) => i !== index).map((e) => e.color.toUpperCase())
    if (color === BRICK && firstFour.includes(MOSS)) return false
    if (color === MOSS && firstFour.includes(BRICK)) return false
  }
  return true
}

/** The next allowed palette colour after the row's current one, wrapping; the current colour when none is free. */
export function cycleColor(events: EventDef[], index: number): string {
  const current = events[index].color.toUpperCase()
  const start = PALETTE.indexOf(current as (typeof PALETTE)[number])
  for (let step = 1; step <= PALETTE.length; step += 1) {
    const c = PALETTE[(start + step + PALETTE.length) % PALETTE.length]
    if (c !== current && allowed(events, index, c)) return c
  }
  return current
}

/** After a removal shifts rows up, recolour the later row of a Brick/Moss pair in the first four. */
export function normalizeColors(events: EventDef[]): EventDef[] {
  const out = events.map((e) => ({ ...e }))
  for (let i = Math.min(4, out.length) - 1; i >= 0; i -= 1) {
    if (!allowed(out, i, out[i].color.toUpperCase())) {
      const free = PALETTE.find((c) => allowed(out, i, c))
      if (free) out[i] = { ...out[i], color: free }
    }
  }
  return out
}

export function canAdd(events: EventDef[]): boolean {
  return events.length < MAX_EVENTS
}

/** True when the draft differs from the template's own events (names trimmed). */
export function draftChanged(templateId: string, events: EventDef[]): boolean {
  const base = getTemplate(templateId)?.events ?? []
  return JSON.stringify(base) !== JSON.stringify(cleanDraft(events))
}

export function cleanDraft(events: EventDef[]): EventDef[] {
  return events.map((e) => ({ id: e.id, name: e.name.trim(), color: e.color, kind: e.kind, askSeverity: e.askSeverity }))
}

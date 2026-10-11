// StoreTests_v1.0 — This section is intended to verify the shared store: severity attaches to the original tap timestamp (D3 check value), undo and reset behave, templates load with or without sample data, addEvent honours the 5-cap and the Brick/Moss rule, persistence writes and clears the localStorage key, and the pure selectors count correctly against a fixed clock.
import { beforeEach, describe, expect, it } from 'vitest'

// ---------------------------------------------------------------------------
// Node has no window/localStorage: install a Storage-shaped shim before the
// store module is evaluated so the persist middleware picks it up.
// ---------------------------------------------------------------------------
class MemoryStorage implements Storage {
  private m = new Map<string, string>()
  get length() {
    return this.m.size
  }
  clear() {
    this.m.clear()
  }
  getItem(k: string) {
    return this.m.get(k) ?? null
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null
  }
  removeItem(k: string) {
    this.m.delete(k)
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v))
  }
}
const ls = new MemoryStorage()
const g = globalThis as unknown as { window?: unknown; localStorage?: Storage }
g.localStorage = ls
g.window = globalThis

const state = await import('../src/state')
const { useIgusaStore, STORAGE_KEY, SEVERITY_MS, LOGGED_MS, MAX_EVENTS, todayCount, countsByDay, daysSinceLast, totalLast12Months, entriesOn, ranked, nextColor } = state
const { PALETTE } = await import('../src/data')

const [BRICK, SLATE, OCHRE, PLUM, MOSS] = PALETTE
const S = () => useIgusaStore.getState()

/** Fixed tap instant: 2026-10-11 22:14:05 local. */
const T = new Date(2026, 9, 11, 22, 14, 5).getTime()
const SEC = 1000
const DAY = 86_400_000

const EV_SYMPTOM = { id: 't-sym', name: 'Bloating', kind: 'symptom' as const, askSeverity: true }
const EV_TAP = { id: 't-exp', name: 'Dairy', kind: 'exposure' as const, askSeverity: false }

beforeEach(() => {
  S().reset()
  ls.clear()
})

describe('severity attach (D3)', () => {
  it('log at 22:14:05, setSeverity 3 at 22:14:12 → ts unchanged, severity 3, pendingSeverity null', () => {
    S().addEvent(EV_SYMPTOM)
    const id = S().log('t-sym', T)
    expect(id).not.toBeNull()
    const pend = S().pendingSeverity
    expect(pend?.entryId).toBe(id)
    expect(pend!.expiresAt - T).toBe(SEVERITY_MS)
    expect(S().lastLogged).toEqual({ entryId: id, expiresAt: T + LOGGED_MS })

    // 7 s later the presenter picks severity 3 (the clock is irrelevant to the entry's ts).
    const later = T + 7 * SEC
    expect(later - T).toBe(7000)
    S().setSeverity(id!, 3)

    const entry = S().entries.find((e) => e.id === id)!
    console.log(
      `severity attach: tap ${new Date(T).toTimeString().slice(0, 8)} → entry ts ${new Date(entry.ts).toTimeString().slice(0, 8)} (${entry.ts === T ? 'unchanged' : 'CHANGED'}), severity ${entry.severity}, pendingSeverity ${JSON.stringify(S().pendingSeverity)}, expiresAt − ts = ${pend!.expiresAt - T} ms`,
    )
    expect(entry.ts).toBe(T)
    expect(entry.severity).toBe(3)
    expect(S().pendingSeverity).toBeNull()
  })

  it('SEVERITY_MS defaults to 15000 and a tap-only event sets no pendingSeverity', () => {
    expect(SEVERITY_MS).toBe(15000)
    S().addEvent(EV_TAP)
    const id = S().log('t-exp', T)
    expect(id).not.toBeNull()
    expect(S().pendingSeverity).toBeNull()
    expect(S().lastLogged?.entryId).toBe(id)
  })

  it('entry ids are deterministic `${eventId}-${ts}-${counter}` and unique', () => {
    S().addEvent(EV_TAP)
    const a = S().log('t-exp', T)!
    const b = S().log('t-exp', T)!
    expect(a).toMatch(/^t-exp-\d+-\d+$/)
    expect(a.startsWith(`t-exp-${T}-`)).toBe(true)
    expect(a).not.toBe(b)
    console.log(`entry ids: ${a}, ${b}`)
  })

  it('log of an unknown event returns null and adds nothing', () => {
    expect(S().log('nope', T)).toBeNull()
    expect(S().entries).toHaveLength(0)
  })

  it('clearPendingSeverity leaves the entry unrated', () => {
    S().addEvent(EV_SYMPTOM)
    const id = S().log('t-sym', T)!
    S().clearPendingSeverity()
    expect(S().pendingSeverity).toBeNull()
    expect(S().entries.find((e) => e.id === id)!.severity).toBeUndefined()
  })
})

describe('undo / delete / edit', () => {
  it('undo removes the entry and clears lastLogged and pendingSeverity', () => {
    S().addEvent(EV_SYMPTOM)
    const id = S().log('t-sym', T)!
    expect(S().entries).toHaveLength(1)
    S().undo(id)
    console.log(`undo: entries after undo = ${S().entries.length}, lastLogged = ${S().lastLogged}, pendingSeverity = ${S().pendingSeverity}`)
    expect(S().entries).toHaveLength(0)
    expect(S().lastLogged).toBeNull()
    expect(S().pendingSeverity).toBeNull()
  })

  it('undo of an older entry keeps pointers at the newer one', () => {
    S().addEvent(EV_SYMPTOM)
    const a = S().log('t-sym', T)!
    const b = S().log('t-sym', T + SEC)!
    S().undo(a)
    expect(S().entries.map((e) => e.id)).toEqual([b])
    expect(S().lastLogged?.entryId).toBe(b)
    expect(S().pendingSeverity?.entryId).toBe(b)
  })

  it('deleteEntry and updateEntryTime', () => {
    S().addEvent(EV_TAP)
    const a = S().log('t-exp', T)!
    const b = S().log('t-exp', T + SEC)!
    S().updateEntryTime(a, T - DAY)
    expect(S().entries.find((e) => e.id === a)!.ts).toBe(T - DAY)
    S().deleteEntry(b)
    expect(S().entries.map((e) => e.id)).toEqual([a])
    expect(S().lastLogged).toBeNull()
  })
})

describe('templates', () => {
  it("applyTemplate('ibs', true) → 682 entries, 5 events, setupDone", () => {
    S().applyTemplate('ibs', true)
    const s = S()
    console.log(`applyTemplate('ibs', true): entries ${s.entries.length}, events ${s.events.length}, setupDone ${s.setupDone}, templateId ${s.templateId}`)
    expect(s.entries).toHaveLength(682)
    expect(s.events).toHaveLength(5)
    expect(s.setupDone).toBe(true)
    expect(s.templateId).toBe('ibs')
    expect(s.events.map((e) => e.color)).toEqual([BRICK, SLATE, OCHRE, PLUM, MOSS])
  })

  it("applyTemplate('blank', false) → 0 entries, 0 events, setupDone", () => {
    S().applyTemplate('blank', false)
    const s = S()
    console.log(`applyTemplate('blank', false): entries ${s.entries.length}, events ${s.events.length}, setupDone ${s.setupDone}`)
    expect(s.entries).toHaveLength(0)
    expect(s.events).toHaveLength(0)
    expect(s.setupDone).toBe(true)
  })

  it("applyTemplate('migraine', false) → 5 events, 0 entries; unknown id is a no-op", () => {
    S().applyTemplate('migraine', false)
    expect(S().events).toHaveLength(5)
    expect(S().entries).toHaveLength(0)
    S().applyTemplate('not-a-template', true)
    expect(S().templateId).toBe('migraine')
  })

  it('ranked() on IBS sample data returns shown pairs with association text', () => {
    S().applyTemplate('ibs', true)
    const r = ranked(S().entries, S().events)
    expect(r.length).toBeGreaterThan(0)
    expect(r[0].shown).toBe(true)
    expect(r[0].text).toMatch(/followed/)
    console.log(`ranked IBS top pair: ${r[0].text} (lift ${r[0].lift.toFixed(2)})`)
  })
})

describe('events: cap and palette', () => {
  const mk = (n: number) => ({ id: `e${n}`, name: `Event ${n}`, kind: 'exposure' as const, askSeverity: false })

  it('addEvent assigns palette colours in order and refuses a sixth', () => {
    const got: string[] = []
    for (let i = 1; i <= 6; i++) {
      const ev = S().addEvent(mk(i))
      got.push(ev ? ev.color : 'null')
    }
    console.log(`addEvent ×6: ${got.join(', ')} → events ${S().events.length} (cap ${MAX_EVENTS})`)
    expect(got.slice(0, 5)).toEqual([BRICK, SLATE, OCHRE, PLUM, MOSS])
    expect(got[5]).toBe('null')
    expect(S().events).toHaveLength(5)
  })

  it('Brick and Moss are never both in the first four', () => {
    S().addEvent(mk(1)) // Brick
    S().updateEvent('e1', { color: MOSS }) // user recolours the first event to Moss
    const b = S().addEvent(mk(2))!.color
    const c = S().addEvent(mk(3))!.color
    const d = S().addEvent(mk(4))!.color
    const e = S().addEvent(mk(5))!.color
    const colours = S().events.map((x) => x.color)
    console.log(`Brick/Moss rule: first event recoloured Moss → next four ${[b, c, d, e].join(', ')}; first four = ${colours.slice(0, 4).join(', ')}`)
    const firstFour = colours.slice(0, 4)
    expect(firstFour.includes(BRICK) && firstFour.includes(MOSS)).toBe(false)
    expect(b).toBe(SLATE)
    expect(e).toBe(BRICK) // position 5 may take the partner colour
    expect(new Set(colours).size).toBe(5)
  })

  it('nextColor honours a preferred free colour and skips a taken one', () => {
    expect(nextColor([], PLUM)).toBe(PLUM)
    const ev = { id: 'x', name: 'x', kind: 'exposure' as const, askSeverity: false, color: PLUM }
    expect(nextColor([ev], PLUM)).toBe(BRICK)
    // Brick in the first four blocks Moss for positions 1–4
    expect(nextColor([{ ...ev, color: BRICK }], MOSS)).toBe(SLATE)
  })

  it('addEvent rejects a duplicate id; setEvents truncates to 5; updateEvent patches', () => {
    expect(S().addEvent(mk(1))).not.toBeNull()
    expect(S().addEvent(mk(1))).toBeNull()
    S().setEvents([1, 2, 3, 4, 5, 6].map((n) => ({ ...mk(n), color: BRICK })))
    expect(S().events).toHaveLength(5)
    S().updateEvent('e2', { name: 'Renamed', askSeverity: true })
    const e2 = S().events.find((e) => e.id === 'e2')!
    expect(e2.name).toBe('Renamed')
    expect(e2.askSeverity).toBe(true)
    expect(e2.id).toBe('e2')
  })
})

describe('reset and persistence', () => {
  it('state changes are written under igusa-demo-v1; reset empties state and removes the key', () => {
    S().applyTemplate('ibs', true)
    S().setTheme('tatami')
    S().unlockWeave()
    S().setPresenterStep(4)
    S().setAppTab('weave')
    S().setAppOpen(true)
    const raw = ls.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    const persisted = JSON.parse(raw!)
    expect(persisted.state.entries).toHaveLength(682)
    expect(persisted.state.theme).toBe('tatami')
    expect(persisted.state).not.toHaveProperty('pendingSeverity')

    S().reset()
    const s = S()
    console.log(
      `reset: entries ${s.entries.length}, events ${s.events.length}, setupDone ${s.setupDone}, templateId ${s.templateId}, weaveUnlocked ${s.weaveUnlocked}, presenterStep ${s.presenterStep}, appTab ${s.appTab}, appOpen ${s.appOpen}, theme ${s.theme} (kept), localStorage['${STORAGE_KEY}'] = ${ls.getItem(STORAGE_KEY)}`,
    )
    expect(s.entries).toEqual([])
    expect(s.events).toEqual([])
    expect(s.setupDone).toBe(false)
    expect(s.templateId).toBeNull()
    expect(s.weaveUnlocked).toBe(false)
    expect(s.presenterStep).toBe(1)
    expect(s.appTab).toBe('log')
    expect(s.appOpen).toBe(false)
    expect(s.theme).toBe('tatami')
    expect(ls.getItem(STORAGE_KEY)).toBeNull()
    S().setTheme('newsprint')
  })

  it('setTheme without a document does not throw and stores the theme', () => {
    expect(typeof document).toBe('undefined')
    S().setTheme('tatami')
    expect(S().theme).toBe('tatami')
    S().setTheme('newsprint')
    expect(S().theme).toBe('newsprint')
  })

  it('presenter / app fields', () => {
    S().setPresenterStep(6)
    S().setAppTab('summary')
    S().setAppOpen(true)
    S().unlockWeave()
    expect(S().presenterStep).toBe(6)
    expect(S().appTab).toBe('summary')
    expect(S().appOpen).toBe(true)
    expect(S().weaveUnlocked).toBe(true)
  })
})

describe('selectors (fixed clock)', () => {
  const E = 'ibs-bloating'
  const O = 'ibs-dairy'
  const entries = [
    { id: '1', eventId: E, ts: T, severity: 2 as const },
    { id: '2', eventId: E, ts: T - 3 * 3_600_000, severity: 4 as const }, // same day, 19:14
    { id: '3', eventId: E, ts: T - DAY }, // yesterday, unrated
    { id: '4', eventId: E, ts: T - 40 * DAY },
    { id: '5', eventId: E, ts: T - 400 * DAY },
    { id: '6', eventId: O, ts: T - 2 * 3_600_000 },
    { id: '7', eventId: E, ts: T + 2 * 3_600_000 }, // 00:14 next day — not "today" for now = T
  ]

  it('todayCount counts only entries on the local day of `now`', () => {
    const n = todayCount(entries, E, T)
    console.log(`todayCount(now = ${new Date(T).toISOString()}): ${n} (entries today: 2, yesterday: 1, tomorrow: 1)`)
    expect(n).toBe(2)
    expect(todayCount(entries, E, T - DAY)).toBe(1)
    expect(todayCount(entries, O, T)).toBe(1)
    expect(todayCount(entries, 'none', T)).toBe(0)
  })

  it('countsByDay gives count and mean severity per day key', () => {
    const m = countsByDay(entries, E)
    const today = m.get('2026-10-11')!
    expect(today.count).toBe(2)
    expect(today.meanSeverity).toBe(3)
    expect(m.get('2026-10-10')).toEqual({ count: 1, meanSeverity: 0 })
    expect(m.get('2026-10-12')!.count).toBe(1)
    expect(m.size).toBe(5)
    console.log(`countsByDay: ${[...m.entries()].map(([k, v]) => `${k} ${v.count}/${v.meanSeverity}`).join(', ')}`)
  })

  it('daysSinceLast and totalLast12Months', () => {
    expect(daysSinceLast(entries, E, T)).toBe(0)
    expect(daysSinceLast(entries, O, T + 3 * DAY)).toBe(3)
    expect(daysSinceLast(entries, 'none', T)).toBeNull()
    const total = totalLast12Months(entries, E, T)
    console.log(`daysSinceLast(dairy, now+3d) = ${daysSinceLast(entries, O, T + 3 * DAY)}, totalLast12Months(bloating) = ${total} (of ${entries.filter((e) => e.eventId === E).length}; one is 400 d old, one is in the future)`)
    expect(total).toBe(4)
  })

  it('entriesOn returns all events on a day in time order', () => {
    const on = entriesOn(entries, '2026-10-11')
    expect(on.map((e) => e.id)).toEqual(['2', '6', '1'])
  })
})

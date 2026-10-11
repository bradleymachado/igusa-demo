// EventList_v1.0 — This section is intended to be the Log tab: a "Today" headline, one row per event with its colour dot, name, today's count and days since last; tap logs (300 ms row flash), press-and-hold ≥ 500 ms opens a "How strong?" sheet whose choice is attached to the hold-start timestamp.
import { useEffect, useRef, useState } from 'react'
import { useIgusaStore, todayCount, daysSinceLast } from '../state'
import { tint, type EventDef, type Severity } from '../engine'

const HOLD_MS = 500
const FLASH_MS = 300
const LEVELS: Severity[] = [1, 2, 3, 4, 5]

function sinceText(days: number | null): string {
  if (days === null) return 'no entries yet'
  if (days === 0) return 'today'
  return days === 1 ? '1 day since last' : `${days} days since last`
}

interface Hold { event: EventDef; ts: number }

export function EventList() {
  const events = useIgusaStore((s) => s.events)
  const entries = useIgusaStore((s) => s.entries)
  const log = useIgusaStore((s) => s.log)
  const setSeverity = useIgusaStore((s) => s.setSeverity)
  const clearPendingSeverity = useIgusaStore((s) => s.clearPendingSeverity)

  const [flash, setFlash] = useState<string | null>(null)
  const [sheet, setSheet] = useState<Hold | null>(null)
  const timer = useRef<number | null>(null)
  const flashTimer = useRef<number | null>(null)
  const held = useRef(false)

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    if (flashTimer.current !== null) window.clearTimeout(flashTimer.current)
  }, [])

  const now = Date.now()
  const dateText = new Date(now).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const cancelHold = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }

  const startHold = (ev: EventDef) => {
    held.current = false
    cancelHold()
    const ts = Date.now()
    timer.current = window.setTimeout(() => {
      timer.current = null
      held.current = true
      setSheet({ event: ev, ts })
    }, HOLD_MS)
  }

  const tap = (ev: EventDef) => {
    // A completed hold already opened the sheet; swallow the click that follows the release.
    if (held.current) {
      held.current = false
      return
    }
    log(ev.id)
    setFlash(ev.id)
    if (flashTimer.current !== null) window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(null), FLASH_MS)
  }

  const choose = (level: Severity | null) => {
    if (!sheet) return
    const id = log(sheet.event.id, sheet.ts)
    if (id) {
      if (level !== null) setSeverity(id, level)
      else if (useIgusaStore.getState().pendingSeverity?.entryId === id) clearPendingSeverity()
    }
    held.current = false
    setSheet(null)
  }

  return (
    <section className="event-list" data-testid="event-list">
      <h1 className="event-list-head">
        Today <span className="event-list-date">{dateText}</span>
      </h1>
      <ul className="event-rows">
        {events.map((ev) => {
          const count = todayCount(entries, ev.id, now)
          const since = daysSinceLast(entries, ev.id, now)
          return (
            <li key={ev.id}>
              <button
                type="button"
                className="event-row"
                data-testid={`event-row-${ev.id}`}
                aria-label={`${ev.name}: tap to log, hold for severity`}
                style={flash === ev.id ? { background: tint(ev.color, 1) } : undefined}
                onPointerDown={() => startHold(ev)}
                onPointerUp={cancelHold}
                onPointerLeave={cancelHold}
                onPointerCancel={cancelHold}
                onClick={() => tap(ev)}
              >
                <span className="event-dot" style={{ background: ev.color }} aria-hidden="true" />
                <span className="event-name">{ev.name}</span>
                <span className="event-stats">
                  <span className="event-count" data-testid={`count-${ev.id}`}>{count}</span>
                  <span className="event-since">{sinceText(since)}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {sheet && (
        <div className="sheet-layer">
          <div className="sheet-scrim" aria-hidden="true" />
          <div className="severity-sheet" role="dialog" aria-label="How strong?" data-testid="severity-sheet">
            <h2 className="sheet-title">How strong?</h2>
            <p className="sheet-sub">{sheet.event.name}</p>
            <div className="sheet-levels">
              {LEVELS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className="sheet-level"
                  aria-label={`Severity ${n}`}
                  style={{ background: tint(sheet.event.color, n) }}
                  onClick={() => choose(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <button type="button" className="sheet-skip" aria-label="Skip severity" onClick={() => choose(null)}>
              Skip
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

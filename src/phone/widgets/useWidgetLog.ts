// UseWidgetLog_v1.0 — This section is intended to give each Igusa widget its own tap state: log an event through the shared store, remember the entry this widget logged, derive the severity row and "Logged." + Undo visibility from the store's absolute expiresAt values on a 250 ms clock, and drive the 300 ms pulse on the tile just tapped.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useIgusaStore, todayCount } from '../../state'
import type { EntryCounts } from './types'
import type { EventDef, Severity } from '../../engine'

const TICK_MS = 250
const PULSE_MS = 300

/** Epoch-ms clock that ticks every 250 ms while `active`, and is refreshed the moment it becomes active. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS)
    return () => window.clearInterval(id)
  }, [active])
  return now
}

export interface WidgetLog {
  /** Event id of the tap whose severity row is open, or null. */
  severityEventId: string | null
  /** True while "Logged." + Undo shows for this widget's last tap. */
  loggedOpen: boolean
  /** Pulse marker for the tile just tapped: event id plus a parity bit that restarts the animation on repeat taps. */
  pulse: { eventId: string; parity: 0 | 1 } | null
  tap: (eventId: string) => void
  rate: (severity: Severity) => void
  undoLast: () => void
}

export function useWidgetLog(): WidgetLog {
  const log = useIgusaStore((s) => s.log)
  const setSeverity = useIgusaStore((s) => s.setSeverity)
  const undo = useIgusaStore((s) => s.undo)
  const clearPendingSeverity = useIgusaStore((s) => s.clearPendingSeverity)
  const pending = useIgusaStore((s) => s.pendingSeverity)
  const lastLogged = useIgusaStore((s) => s.lastLogged)

  const [mine, setMine] = useState<{ entryId: string; eventId: string } | null>(null)
  const [pulse, setPulse] = useState<WidgetLog['pulse']>(null)
  const pulseTimer = useRef<number | undefined>(undefined)

  const pendingMine = !!mine && pending?.entryId === mine.entryId
  const loggedMine = !!mine && lastLogged?.entryId === mine.entryId
  const now = useNow(pendingMine || loggedMine)

  const severityOpen = pendingMine && pending!.expiresAt > now
  const loggedOpen = loggedMine && lastLogged!.expiresAt > now

  // Ignored severity row: once its time is up the entry stays unrated and the store pointer is cleared.
  useEffect(() => {
    if (pendingMine && pending!.expiresAt <= now) clearPendingSeverity()
  }, [pendingMine, pending, now, clearPendingSeverity])

  useEffect(() => () => window.clearTimeout(pulseTimer.current), [])

  const tap = useCallback(
    (eventId: string) => {
      const id = log(eventId)
      if (!id) return
      setMine({ entryId: id, eventId })
      setPulse((p) => ({ eventId, parity: p && p.parity === 0 ? 1 : 0 }))
      window.clearTimeout(pulseTimer.current)
      pulseTimer.current = window.setTimeout(() => setPulse(null), PULSE_MS)
    },
    [log],
  )

  const rate = useCallback(
    (severity: Severity) => {
      if (mine) setSeverity(mine.entryId, severity)
    },
    [mine, setSeverity],
  )

  const undoLast = useCallback(() => {
    if (mine) undo(mine.entryId)
  }, [mine, undo])

  return {
    severityEventId: severityOpen && mine ? mine.eventId : null,
    loggedOpen,
    pulse,
    tap,
    rate,
    undoLast,
  }
}

/** Today's count per event, recomputed when events or entries change. */
export function useTodayCounts(): EntryCounts {
  const events = useIgusaStore((s) => s.events)
  const entries = useIgusaStore((s) => s.entries)
  return useMemo(() => {
    const now = Date.now()
    const out: EntryCounts = {}
    for (const ev of events) out[ev.id] = todayCount(entries, ev.id, now)
    return out
  }, [events, entries])
}

/** Class list for a colour tile; adds the 300 ms pulse (with a parity name) to the tile just tapped. */
export function tileClass(ev: EventDef, pulse: WidgetLog['pulse'], base = 'w-tile'): string {
  return pulse && pulse.eventId === ev.id ? `${base} pulse pulse-${pulse.parity}` : base
}

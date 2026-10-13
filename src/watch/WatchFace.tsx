// WatchFace_v1.0 — This section is intended to draw the Apple Watch face inside the 198×242 screen: digital time and a short date line, a brand-colour complication ring holding today's total count across all events, a 2-column grid of text-free event tiles with today's count in an ink-on-tint badge beneath each, the 1–5 severity picker after a symptom tap (auto-dismissed from the store's pendingSeverity.expiresAt), "Logged." + Undo for LOGGED_MS, and a 300 ms pulse on the tile just tapped — all read from and written to the same shared store as the iPhone widgets.
import { useEffect, useState } from 'react'
import { tint } from '../engine'
import type { EventDef } from '../engine'
import { useIgusaStore } from '../state'
import { useTodayCounts, useWidgetLog } from '../phone/widgets'
import type { WidgetLog } from '../phone/widgets'
import { SeverityPicker } from './SeverityPicker'
import './watch.css'

const CLOCK_TICK_MS = 10_000
const RING_R = 19
const RING_C = 2 * Math.PI * RING_R
/** Ring fills once today's total reaches this many taps (a demo pacing choice, not a target). */
const RING_FULL = 12

/** Local time, refreshed every 10 s. */
function useClock(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), CLOCK_TICK_MS)
    return () => window.clearInterval(id)
  }, [])
  return now
}

function formatTime(d: Date): string {
  const h = d.getHours() % 12 || 12
  return `${h}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(d)
}

function tileClass(ev: EventDef, pulse: WidgetLog['pulse']): string {
  return pulse && pulse.eventId === ev.id ? `wf-tile wf-pulse wf-pulse-${pulse.parity}` : 'wf-tile'
}

export function Complication({ total }: { total: number }) {
  const frac = Math.min(total, RING_FULL) / RING_FULL
  return (
    <svg
      className="wf-ring"
      viewBox="0 0 44 44"
      role="img"
      aria-label={`Igusa, ${total} logged today`}
      data-testid="watch-complication"
      data-total={total}
    >
      <circle className="wf-ring-track" cx="22" cy="22" r={RING_R} />
      <circle
        className="wf-ring-arc"
        cx="22"
        cy="22"
        r={RING_R}
        strokeDasharray={`${RING_C * frac} ${RING_C}`}
        transform="rotate(-90 22 22)"
      />
      <text className="wf-ring-count" x="22" y="22" textAnchor="middle" dominantBaseline="central">
        {total}
      </text>
    </svg>
  )
}

export function WatchFace() {
  const events = useIgusaStore((s) => s.events).slice(0, 5)
  const clearPendingSeverity = useIgusaStore((s) => s.clearPendingSeverity)
  const counts = useTodayCounts()
  const w = useWidgetLog()
  const now = useClock()
  const total = events.reduce((n, ev) => n + (counts[ev.id] ?? 0), 0)
  const sevEvent = w.severityEventId ? events.find((e) => e.id === w.severityEventId) : undefined

  return (
    <div className="wf" data-testid="watch-face">
      <div className="wf-header">
        <Complication total={total} />
        {w.loggedOpen ? (
          <div className="wf-logged" data-testid="watch-logged-line">
            <span className="wf-logged-text">Logged.</span>
            <button type="button" className="wf-undo" aria-label="Watch undo" onClick={w.undoLast}>
              Undo
            </button>
          </div>
        ) : (
          <div className="wf-clock">
            <time className="wf-time" data-testid="watch-time" dateTime={now.toISOString()}>
              {formatTime(now)}
            </time>
            <span className="wf-date" data-testid="watch-date">
              {formatDate(now)}
            </span>
          </div>
        )}
      </div>

      {events.length === 0 && <p className="wf-empty">Finish setup on iPhone</p>}
      <div className="wf-tiles" data-testid="watch-tiles">
        {events.map((ev) => (
          <div key={ev.id} className="wf-cell">
            <button
              type="button"
              className={tileClass(ev, w.pulse)}
              data-tile="event"
              data-event-id={ev.id}
              aria-label={`Watch log ${ev.name}`}
              style={{ background: ev.color }}
              onClick={() => w.tap(ev.id)}
            />
            <span
              className="wf-badge"
              data-testid={`watch-count-${ev.id}`}
              style={{ background: tint(ev.color, 1) }}
              aria-label={`${ev.name}, ${counts[ev.id] ?? 0} today`}
            >
              {counts[ev.id] ?? 0}
            </span>
          </div>
        ))}
      </div>

      {sevEvent && <SeverityPicker event={sevEvent} onRate={w.rate} onSkip={clearPendingSeverity} />}
    </div>
  )
}

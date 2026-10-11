// SmallWidget_v1.0 — This section is intended to draw the 170×170 Igusa widget for one event (the first symptom): a full-bleed, text-free colour tile that logs on tap, today's count large beneath it with Undo for three seconds, and a 3 + 2 severity grid while that tap's severity is open.
import { tint } from '../../engine'
import type { Severity } from '../../engine'
import { useIgusaStore } from '../../state'
import { tileClass, useTodayCounts, useWidgetLog } from './useWidgetLog'
import './widgets.css'

const LEVELS: Severity[] = [1, 2, 3, 4, 5]

export function SmallWidget() {
  const events = useIgusaStore((s) => s.events)
  const ev = events.find((e) => e.kind === 'symptom') ?? events[0]
  const counts = useTodayCounts()
  const w = useWidgetLog()

  if (!ev) return <section className="widget widget--small" data-testid="widget-small" aria-label="Igusa widget, small" />

  const severityOpen = w.severityEventId === ev.id

  return (
    <section className="widget widget--small" data-testid="widget-small" aria-label={`Igusa widget, small, ${ev.name}`}>
      {severityOpen ? (
        <div className="ws-sev" data-testid="severity-row">
          {LEVELS.map((n) => (
            <button
              key={n}
              type="button"
              className={`w-sev ws-sev-${n}`}
              data-tile="severity"
              aria-label={`Severity ${n}`}
              style={{ background: tint(ev.color, n) }}
              onClick={() => w.rate(n)}
            >
              {n}
            </button>
          ))}
        </div>
      ) : (
        <>
          <button
            type="button"
            className={tileClass(ev, w.pulse, 'ws-tile')}
            data-tile="event"
            data-event-id={ev.id}
            aria-label={`Log ${ev.name}`}
            style={{ background: ev.color }}
            onClick={() => w.tap(ev.id)}
          />
          <div className="ws-foot">
            <span className="ws-count" data-testid={`count-${ev.id}`}>
              {counts[ev.id] ?? 0}
            </span>
            {w.loggedOpen ? (
              <span className="w-logged" data-testid="logged-line">
                <span className="w-logged-text">Logged.</span>
                <button type="button" className="w-undo" aria-label="Undo" onClick={w.undoLast}>
                  Undo
                </button>
              </span>
            ) : (
              <span className="ws-name">{ev.name} today</span>
            )}
          </div>
        </>
      )}
    </section>
  )
}

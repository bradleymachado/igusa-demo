// WidgetParts_v1.0 — This section is intended to provide the pieces the medium and large Igusa widgets share: the header row that turns into "Logged." + Undo, the row of text-free colour tiles with today's count under each, and the 1–5 severity row tinted from the tapped event's colour.
import type { CSSProperties } from 'react'
import { tint } from '../../engine'
import type { EventDef, Severity } from '../../engine'
import { tileClass, type WidgetLog } from './useWidgetLog'

const LEVELS: Severity[] = [1, 2, 3, 4, 5]

export function WidgetHeader({ loggedOpen, onUndo }: { loggedOpen: boolean; onUndo: () => void }) {
  return (
    <div className="w-header">
      <span className="w-brand">Igusa</span>
      {loggedOpen ? (
        <span className="w-logged" data-testid="logged-line">
          <span className="w-logged-text">Logged.</span>
          <button type="button" className="w-undo" aria-label="Undo" onClick={onUndo}>
            Undo
          </button>
        </span>
      ) : (
        <span className="w-today">Today</span>
      )}
    </div>
  )
}

export function EventTiles({
  events,
  counts,
  pulse,
  onTap,
}: {
  events: EventDef[]
  counts: Record<string, number>
  pulse: WidgetLog['pulse']
  onTap: (eventId: string) => void
}) {
  return (
    <div className="w-tiles-block">
      <div className="w-tiles" style={{ gridTemplateColumns: `repeat(${Math.max(events.length, 1)}, 1fr)` }}>
        {events.map((ev) => (
          <button
            key={ev.id}
            type="button"
            className={tileClass(ev, pulse)}
            data-tile="event"
            data-event-id={ev.id}
            aria-label={`Log ${ev.name}`}
            style={{ background: ev.color }}
            onClick={() => onTap(ev.id)}
          />
        ))}
      </div>
      <div className="w-counts" style={{ gridTemplateColumns: `repeat(${Math.max(events.length, 1)}, 1fr)` }}>
        {events.map((ev) => (
          <span key={ev.id} className="w-count" data-testid={`count-${ev.id}`}>
            {counts[ev.id] ?? 0}
          </span>
        ))}
      </div>
    </div>
  )
}

export function SeverityRow({ event, onRate }: { event: EventDef; onRate: (s: Severity) => void }) {
  return (
    <div className="w-tiles-block" data-testid="severity-row">
      <div className="w-tiles" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {LEVELS.map((n) => (
          <button
            key={n}
            type="button"
            className="w-sev"
            data-tile="severity"
            aria-label={`Severity ${n}`}
            style={{ background: tint(event.color, n) } as CSSProperties}
            onClick={() => onRate(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="w-caption">{event.name} · how strong, 1–5</div>
    </div>
  )
}

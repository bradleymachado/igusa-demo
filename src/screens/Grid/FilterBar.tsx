// FilterBar_v1.0 — This section is intended to show the Grid filter chips (All plus one per event; a second event chip gives two-event mode, a third replaces the second) and the Count / Severity segmented toggle.
import type { EventDef } from '../../engine'
import type { ShadeMode } from './shading'

interface Props {
  events: EventDef[]
  selected: string[]
  mode: ShadeMode
  onToggleEvent: (id: string) => void
  onAll: () => void
  onMode: (m: ShadeMode) => void
}

export function FilterBar({ events, selected, mode, onToggleEvent, onAll, onMode }: Props) {
  const all = selected.length === 0
  return (
    <div className="gr-filters">
      <div className="gr-chips" role="group" aria-label="Filter events">
        <button type="button" className="gr-chip" aria-pressed={all} aria-label="All events" onClick={onAll}>
          All
        </button>
        {events.map((e) => {
          const on = selected.includes(e.id)
          const order = selected.indexOf(e.id)
          return (
            <button
              key={e.id}
              type="button"
              className="gr-chip"
              aria-pressed={on}
              aria-label={e.name}
              data-order={on ? order + 1 : undefined}
              onClick={() => onToggleEvent(e.id)}
            >
              <span className="gr-dot" style={{ background: e.color }} aria-hidden="true" />
              {e.name}
            </button>
          )
        })}
      </div>
      <div className="gr-seg" role="group" aria-label="Shade mode">
        <button type="button" className="gr-seg-btn" aria-pressed={mode === 'count'} aria-label="Shade by count" onClick={() => onMode('count')}>
          Count
        </button>
        <button type="button" className="gr-seg-btn" aria-pressed={mode === 'severity'} aria-label="Shade by severity" onClick={() => onMode('severity')}>
          Severity
        </button>
      </div>
    </div>
  )
}

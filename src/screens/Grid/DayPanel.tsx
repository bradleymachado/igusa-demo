// DayPanel_v1.0 — This section is intended to list the selected day's entries in time order (time, colour dot, event name, severity) with a per-row Edit time control (an <input type="time"> that moves the entry within the same day) and a Delete control.
import { useState } from 'react'
import type { Entry, EventDef } from '../../engine'
import { dayLabel, hhmm } from './shading'

interface Props {
  dayKey: string
  entries: Entry[]
  events: EventDef[]
  onDelete: (id: string) => void
  onUpdateTime: (id: string, ts: number) => void
}

/** Same local day as `ts`, at hh:mm (seconds zeroed). */
function sameDayAt(ts: number, value: string): number | null {
  const m = value.match(/^(\d{2}):(\d{2})/)
  if (!m) return null
  const d = new Date(ts)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), Number(m[1]), Number(m[2]), 0, 0).getTime()
}

export function DayPanel({ dayKey, entries, events, onDelete, onUpdateTime }: Props) {
  const [editing, setEditing] = useState<string | null>(null)
  const byId = new Map(events.map((e) => [e.id, e]))

  return (
    <section className="dp" data-testid="day-panel" aria-label={`Entries on ${dayLabel(dayKey)}`}>
      <h3 className="dp-title">
        {dayLabel(dayKey)}
        <span className="dp-count">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </span>
      </h3>
      {entries.length === 0 && <p className="dp-empty">No entries on this day.</p>}
      <ul className="dp-list">
        {entries.map((en) => {
          const ev = byId.get(en.eventId)
          const name = ev?.name ?? en.eventId
          const time = hhmm(en.ts)
          const open = editing === en.id
          return (
            <li key={en.id} className="dp-row" data-testid="day-row" data-entry-id={en.id} data-ts={en.ts}>
              <div className="dp-main">
                <span className="dp-time">{time}</span>
                <span className="dp-dot" style={{ background: ev?.color }} aria-hidden="true" />
                <span className="dp-name">
                  {name}
                  {en.severity !== undefined && <span className="dp-sev"> · {en.severity}</span>}
                </span>
                <button
                  type="button"
                  className="dp-btn"
                  aria-label={`Edit time for ${name} at ${time}`}
                  aria-expanded={open}
                  onClick={() => setEditing(open ? null : en.id)}
                >
                  Edit time
                </button>
                <button type="button" className="dp-btn" aria-label={`Delete ${name} at ${time}`} onClick={() => onDelete(en.id)}>
                  Delete
                </button>
              </div>
              {open && (
                <div className="dp-edit">
                  <input
                    className="dp-time-input"
                    type="time"
                    aria-label="New time"
                    defaultValue={time}
                    autoFocus
                    onChange={(e) => {
                      const ts = sameDayAt(en.ts, e.target.value)
                      if (ts !== null && ts !== en.ts) onUpdateTime(en.id, ts)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Escape') setEditing(null)
                    }}
                  />
                  <button type="button" className="dp-btn" aria-label="Done editing time" onClick={() => setEditing(null)}>
                    Done
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

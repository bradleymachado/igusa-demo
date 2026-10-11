// EditEvents_v1.0 — This section is intended to render setup Step 2, "Your events": one editable row per event (colour swatch that cycles the free palette colours, name input, fixed kind label, ask-severity switch, remove), "+ Add event" up to five, and the continue button that waits until every row has a name.
import type { EventDef } from '../../data'
import { canAdd, cycleColor, newRow, normalizeColors } from '../draft'

interface Props {
  templateId: string
  events: EventDef[]
  onChange: (events: EventDef[]) => void
  onContinue: () => void
}

export function EditEvents({ templateId, events, onChange, onContinue }: Props) {
  const ready = events.length > 0 && events.every((e) => e.name.trim().length > 0)
  const patch = (index: number, p: Partial<EventDef>) => onChange(events.map((e, i) => (i === index ? { ...e, ...p } : e)))
  const label = (e: EventDef) => e.name.trim() || 'new event'

  return (
    <>
      <div className="setup-step" data-testid="setup-step-2">
        <h1 className="setup-headline">Your events</h1>
        <p className="setup-lede">Rename, recolour or remove. Up to five, one tap each.</p>
        <ul className="setup-events">
          {events.map((e, i) => (
            <li key={e.id} className="setup-event" data-testid="event-row">
              <button
                type="button"
                className="setup-swatch"
                aria-label={`Colour for ${label(e)}`}
                onClick={() => patch(i, { color: cycleColor(events, i) })}
              >
                <span className="setup-swatch-dot" style={{ background: e.color }} />
              </button>
              <input
                className="setup-name"
                type="text"
                value={e.name}
                placeholder="New event"
                aria-label="Event name"
                maxLength={24}
                autoComplete="off"
                onChange={(ev) => patch(i, { name: ev.target.value })}
              />
              <button
                type="button"
                className="setup-remove"
                aria-label={`Remove ${label(e)}`}
                disabled={events.length <= 1}
                onClick={() => onChange(normalizeColors(events.filter((_, j) => j !== i)))}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
              <span className="setup-kind">{e.kind === 'symptom' ? 'Symptom' : 'Exposure'}</span>
              <span className="setup-severity">
                <span className="setup-severity-label" aria-hidden="true">
                  Ask severity
                </span>
                <button
                  type="button"
                  role="switch"
                  className="setup-switch"
                  aria-checked={e.askSeverity}
                  aria-label={`Ask severity for ${label(e)}`}
                  onClick={() => patch(i, { askSeverity: !e.askSeverity })}
                >
                  <span className="setup-switch-track">
                    <span className="setup-switch-knob" />
                  </span>
                </button>
              </span>
            </li>
          ))}
        </ul>
        {canAdd(events) && (
          <button type="button" className="setup-add" aria-label="Add event" onClick={() => onChange([...events, newRow(templateId, events)])}>
            + Add event
          </button>
        )}
      </div>
      <div className="setup-footer">
        <button type="button" className="setup-primary" aria-label="Continue to widget" disabled={!ready} onClick={onContinue}>
          Continue
        </button>
      </div>
    </>
  )
}

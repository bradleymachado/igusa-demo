// SeverityPicker_v1.0 — This section is intended to show the Watch's 1–5 severity picker after a symptom tap: five stacked 44 px rows tinted at levels 1–5 of the event colour with the numeral in ink, plus a "Skip" row; it covers the face and scrolls inside the 198×242 screen, and the caller closes it when the store's pendingSeverity is rated, skipped or expires.
import type { CSSProperties } from 'react'
import { tint } from '../engine'
import type { EventDef, Severity } from '../engine'

const LEVELS: Severity[] = [1, 2, 3, 4, 5]

export function SeverityPicker({
  event,
  onRate,
  onSkip,
}: {
  event: EventDef
  onRate: (severity: Severity) => void
  onSkip: () => void
}) {
  return (
    <div className="wf-picker" data-testid="watch-severity-picker" role="group" aria-label={`${event.name} severity, 1 to 5`}>
      <div className="wf-picker-title">{event.name} · how strong, 1–5</div>
      {LEVELS.map((n) => (
        <button
          key={n}
          type="button"
          className="wf-sev"
          data-tile="severity"
          data-level={n}
          aria-label={`Watch severity ${n}`}
          style={{ background: tint(event.color, n) } as CSSProperties}
          onClick={() => onRate(n)}
        >
          {n}
        </button>
      ))}
      <button type="button" className="wf-skip" aria-label="Watch skip severity" onClick={onSkip}>
        Skip
      </button>
    </div>
  )
}

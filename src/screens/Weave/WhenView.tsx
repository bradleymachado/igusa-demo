// WeaveWhen_v1.0 — This section is intended to draw a 24 × 7 hour-by-weekday heatmap for one chosen symptom over the last 365 days (cells shaded by count with the symptom's colour), with symptom chips and a "Most often" line from the busiest bucket (blurred while Weave is locked).
import { useMemo } from 'react'
import { shadeLevel, tint } from '../../engine'
import type { Entry, EventDef } from '../../engine'
import { Pill } from './Pill'
import { hourWeekdayCounts } from './pairs'

const SIZE = 12
const STEP = SIZE + 1
const LABEL_W = 22
const HEAD_H = 14
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const GRID_W = LABEL_W + 7 * STEP - 1
const GRID_H = HEAD_H + 24 * STEP - 1

interface Props {
  entries: Entry[]
  events: EventDef[]
  symptomId: string
  locked: boolean
  onSelect: (symptomId: string) => void
  now: number
}

export function WhenView({ entries, events, symptomId, locked, onSelect, now }: Props) {
  const symptoms = events.filter((e) => e.kind === 'symptom')
  const s = symptoms.find((e) => e.id === symptomId)
  const counts = useMemo(() => hourWeekdayCounts(entries, symptomId, now), [entries, symptomId, now])

  let best = { wd: -1, h: -1, n: 0 }
  for (let wd = 0; wd < 7; wd++) for (let h = 0; h < 24; h++) if (counts[wd][h] > best.n) best = { wd, h, n: counts[wd][h] }

  if (!s) {
    return (
      <section className="wv-section" data-testid="weave-when" aria-label="When">
        <p className="wv-empty">Add a symptom to see when it is logged.</p>
      </section>
    )
  }

  const busiest = best.n > 0 ? `${WEEKDAYS[best.wd]} around ${best.h} h` : null

  return (
    <section className="wv-section" data-testid="weave-when" aria-label="When">
      <p className="wv-lede">Hour of day by weekday, past 12 months.</p>
      <div className="wv-chips">
        {symptoms.map((e) => (
          <button key={e.id} type="button" className="wv-chip" aria-label={`When for ${e.name}`} aria-pressed={e.id === symptomId} onClick={() => onSelect(e.id)}>
            <span className="wv-dot" style={{ background: e.color }} aria-hidden="true" />
            {e.name}
          </button>
        ))}
      </div>

      <svg
        className="wv-when"
        data-testid="when-grid"
        role="img"
        aria-label={`Hour by weekday heatmap for ${s.name}`}
        width={GRID_W}
        height={GRID_H}
        viewBox={`0 0 ${GRID_W} ${GRID_H}`}
      >
        {INITIALS.map((c, wd) => (
          <text key={`d${wd}`} className="wv-axis" x={LABEL_W + wd * STEP + SIZE / 2} y={10} textAnchor="middle">
            {c}
          </text>
        ))}
        {[0, 6, 12, 18].map((h) => (
          <text key={`h${h}`} className="wv-axis" x={LABEL_W - 4} y={HEAD_H + h * STEP + SIZE - 2} textAnchor="end">
            {h}
          </text>
        ))}
        {counts.map((row, wd) =>
          row.map((n, h) => {
            const lv = shadeLevel(n)
            return (
              <rect
                key={`${wd}-${h}`}
                className="wh-cell"
                data-weekday={wd}
                data-hour={h}
                data-count={n}
                x={LABEL_W + wd * STEP}
                y={HEAD_H + h * STEP}
                width={SIZE}
                height={SIZE}
                rx={1.5}
                style={{ fill: lv > 0 ? tint(s.color, lv as 1 | 2 | 3 | 4 | 5) : 'var(--grid-empty)' }}
              />
            )
          }),
        )}
      </svg>

      <p className="wv-text wv-most" data-testid="when-most">
        {busiest === null ? (
          `No ${s.name} entries in the past 12 months.`
        ) : locked ? (
          <>
            Most often: <Pill>{busiest}</Pill>
          </>
        ) : (
          `Most often: ${busiest}`
        )}
      </p>
    </section>
  )
}

// WeaveOverlay_v1.0 — This section is intended to overlay one exposure and one symptom on the 53 × 7 year strip (each in-range day split diagonally: exposure upper-left, symptom lower-right, shaded by count), with a two-select pair picker, a legend and the pair's engine sentence as caption (multiplier blurred while locked).
import { useMemo } from 'react'
import { shadeLevel, tint } from '../../engine'
import type { Entry, EventDef, PairResult } from '../../engine'
import { countsByDay } from '../../state/selectors'
import { CELL, GAP, STRIP_H, STRIP_W, buildStrip } from '../Grid/shading'
import { LiftText } from './Pill'

const STEP = CELL + GAP

interface Props {
  entries: Entry[]
  events: EventDef[]
  pairs: PairResult[]
  exposureId: string
  symptomId: string
  locked: boolean
  onChange: (exposureId: string, symptomId: string) => void
  now: number
}

function fillFor(color: string | undefined, count: number): string {
  const lv = shadeLevel(count)
  return lv > 0 && color ? tint(color, lv as 1 | 2 | 3 | 4 | 5) : 'var(--grid-empty)'
}

export function OverlayStrip({ entries, events, pairs, exposureId, symptomId, locked, onChange, now }: Props) {
  const exposures = events.filter((e) => e.kind === 'exposure')
  const symptoms = events.filter((e) => e.kind === 'symptom')
  const x = events.find((e) => e.id === exposureId)
  const s = events.find((e) => e.id === symptomId)
  const pair = pairs.find((p) => p.exposureId === exposureId && p.symptomId === symptomId)

  const strip = useMemo(() => buildStrip(now), [now])
  const xCounts = useMemo(() => countsByDay(entries, exposureId), [entries, exposureId])
  const sCounts = useMemo(() => countsByDay(entries, symptomId), [entries, symptomId])

  if (!x || !s) {
    return (
      <section className="wv-section" data-testid="weave-overlay" aria-label="Overlay">
        <p className="wv-empty">Add at least one exposure and one symptom to overlay them.</p>
      </section>
    )
  }

  return (
    <section className="wv-section" data-testid="weave-overlay" aria-label="Overlay">
      <p className="wv-lede">One year, one pair: each day split between the exposure and the symptom.</p>
      <div className="wv-picker">
        <select className="wv-select" aria-label="Overlay exposure" value={exposureId} onChange={(e) => onChange(e.target.value, symptomId)}>
          {exposures.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <select className="wv-select" aria-label="Overlay symptom" value={symptomId} onChange={(e) => onChange(exposureId, e.target.value)}>
          {symptoms.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>

      <svg
        className="wv-strip"
        data-testid="overlay-strip"
        role="img"
        aria-label={`Year strip overlay of ${x.name} and ${s.name}`}
        width={STRIP_W + 1}
        height={STRIP_H + 1}
        viewBox={`-0.5 -0.5 ${STRIP_W + 1} ${STRIP_H + 1}`}
      >
        {strip.days
          .filter((d) => d.inRange)
          .map((d) => {
            const px = d.col * STEP
            const py = d.row * STEP
            const xc = xCounts.get(d.key)?.count ?? 0
            const sc = sCounts.get(d.key)?.count ?? 0
            return (
              <g key={d.key} className="ov-cell" data-day={d.key} data-exp={xc} data-sym={sc}>
                <polygon points={`${px},${py} ${px + CELL},${py} ${px},${py + CELL}`} style={{ fill: fillFor(x.color, xc) }} />
                <polygon points={`${px + CELL},${py} ${px + CELL},${py + CELL} ${px},${py + CELL}`} style={{ fill: fillFor(s.color, sc) }} />
              </g>
            )
          })}
      </svg>

      <div className="wv-legend" data-testid="overlay-legend">
        <span className="wv-legend-item">
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <polygon points="0,0 12,0 0,12" style={{ fill: x.color }} />
          </svg>
          {x.name}
        </span>
        <span className="wv-legend-item">
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <polygon points="12,0 12,12 0,12" style={{ fill: s.color }} />
          </svg>
          {s.name}
        </span>
      </div>

      <div className="wv-caption" data-testid="overlay-caption">
        {pair?.shown && pair.text ? (
          <LiftText text={pair.text} locked={locked} testId="overlay-caption-text" />
        ) : (
          <>
            <p className="wv-text wv-text--muted" data-testid="overlay-caption-text">
              {x.name} · {s.name}
            </p>
            {pair?.teaser && <p className="wv-sub">{pair.teaser}</p>}
          </>
        )}
      </div>
    </section>
  )
}

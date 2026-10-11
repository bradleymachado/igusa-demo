// YearStrip_v1.0 — This section is intended to draw the 53 × 7 year strip as an SVG (5 px cells, 1.5 px gaps, last column = this week), shade each day by the current filter, split cells diagonally in two-event mode, and scrub a week by dragging (or by an invisible range input for keyboards).
import { memo, useRef } from 'react'
import type { PointerEvent } from 'react'
import { CELL, GAP, STEP, STRIP_H, STRIP_W, WEEKS, type DayPaint, type StripDay } from './shading'

interface Props {
  days: StripDay[]
  paint: (key: string) => DayPaint
  twoEvent: boolean
  scrubCol: number | null
  /** Column used by the keyboard range input when nothing has been scrubbed yet. */
  defaultCol: number
  onScrub: (col: number) => void
  /** Changes whenever the shading changes, so the memoised cells redraw. */
  paintKey: string
}

const Cells = memo(function Cells({ days, paint, twoEvent }: Pick<Props, 'days' | 'paint' | 'twoEvent' | 'paintKey'>) {
  return (
    <>
      {days.map((d) => {
        const x = d.col * STEP
        const y = d.row * STEP
        if (!d.inRange) {
          return <rect key={d.key} className="ys-cell" data-day={d.key} data-level={0} data-out="1" x={x} y={y} width={CELL} height={CELL} style={{ fill: 'transparent' }} />
        }
        const p = paint(d.key)
        if (twoEvent) {
          const a = p.fills[0] ?? 'var(--grid-empty)'
          const b = p.fills[1] ?? 'var(--grid-empty)'
          return (
            <g key={d.key} className="ys-cell" data-day={d.key} data-level={Math.max(p.levels[0], p.levels[1])} data-level-a={p.levels[0]} data-level-b={p.levels[1]}>
              <polygon points={`${x},${y} ${x + CELL},${y} ${x},${y + CELL}`} style={{ fill: a }} />
              <polygon points={`${x + CELL},${y} ${x + CELL},${y + CELL} ${x},${y + CELL}`} style={{ fill: b }} />
            </g>
          )
        }
        return (
          <rect
            key={d.key}
            className="ys-cell"
            data-day={d.key}
            data-level={p.levels[0]}
            x={x}
            y={y}
            width={CELL}
            height={CELL}
            style={{ fill: p.fills[0] ?? 'var(--grid-empty)' }}
          />
        )
      })}
    </>
  )
})

export function YearStrip({ days, paint, twoEvent, scrubCol, defaultCol, onScrub, paintKey }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const dragging = useRef(false)

  const colAt = (clientX: number) => {
    const svg = svgRef.current
    if (!svg) return 0
    const r = svg.getBoundingClientRect()
    const vbW = STRIP_W + 1
    const x = ((clientX - r.left) * vbW) / (r.width || vbW) - 0.5
    return Math.max(0, Math.min(WEEKS - 1, Math.floor((x + GAP / 2) / STEP)))
  }

  const down = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true
    e.currentTarget.setPointerCapture?.(e.pointerId)
    onScrub(colAt(e.clientX))
  }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    onScrub(colAt(e.clientX))
  }
  const up = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = false
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }

  return (
    <div className="ys-wrap" data-testid="year-strip-wrap" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <svg
        ref={svgRef}
        className="ys-svg"
        data-testid="year-strip"
        role="img"
        aria-label="Year strip, drag to choose a week"
        width={STRIP_W + 1}
        height={STRIP_H + 1}
        viewBox={`-0.5 -0.5 ${STRIP_W + 1} ${STRIP_H + 1}`}
      >
        <Cells days={days} paint={paint} twoEvent={twoEvent} paintKey={paintKey} />
        {scrubCol !== null && (
          <rect
            className="ys-week"
            data-testid="scrub-week"
            data-col={scrubCol}
            x={scrubCol * STEP - 0.5}
            y={-0.5}
            width={CELL + 1}
            height={STRIP_H + 1}
          />
        )}
      </svg>
      <input
        className="gr-visually-hidden"
        type="range"
        min={0}
        max={WEEKS - 1}
        step={1}
        value={scrubCol ?? defaultCol}
        aria-label="Choose week"
        onChange={(e) => onScrub(Number(e.target.value))}
      />
    </div>
  )
}

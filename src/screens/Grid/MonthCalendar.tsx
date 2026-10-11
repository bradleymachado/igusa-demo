// MonthCalendar_v1.0 — This section is intended to show one month as 44 px tappable day cells shaded by the current filter (diagonal split in two-event mode), with a month header, previous/next buttons, a ring on the selected day and a brand dot on today.
import { MONTH_LONG, keyOf, dayLabel, type DayPaint, type MonthRef } from './shading'

interface Props {
  month: MonthRef
  paint: (key: string) => DayPaint
  twoEvent: boolean
  selectedDay: string
  todayKey: string
  canPrev: boolean
  canNext: boolean
  onPrev: () => void
  onNext: () => void
  onSelect: (key: string) => void
}

const INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function background(p: DayPaint, twoEvent: boolean): string {
  if (twoEvent) {
    const a = p.fills[0] ?? 'var(--grid-empty)'
    const b = p.fills[1] ?? 'var(--grid-empty)'
    return `linear-gradient(to bottom right, ${a} 0 50%, ${b} 50% 100%)`
  }
  return p.fills[0] ?? 'var(--grid-empty)'
}

export function MonthCalendar({ month, paint, twoEvent, selectedDay, todayKey, canPrev, canNext, onPrev, onNext, onSelect }: Props) {
  const lead = new Date(month.y, month.m, 1, 12).getDay()
  const days = new Date(month.y, month.m + 1, 0, 12).getDate()
  const slots: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]

  return (
    <section className="mc" data-testid="month-calendar" aria-label="Month calendar">
      <div className="mc-head">
        <button type="button" className="mc-nav" aria-label="Previous month" disabled={!canPrev} onClick={onPrev}>
          <span aria-hidden="true">‹</span>
        </button>
        <h3 className="mc-title" data-testid="month-header">
          {MONTH_LONG[month.m]} {month.y}
        </h3>
        <button type="button" className="mc-nav" aria-label="Next month" disabled={!canNext} onClick={onNext}>
          <span aria-hidden="true">›</span>
        </button>
      </div>
      <div className="mc-grid mc-initials" aria-hidden="true">
        {INITIALS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="mc-grid">
        {slots.map((d, i) => {
          if (d === null) return <span key={`b${i}`} className="mc-blank" />
          const key = keyOf(month.y, month.m, d)
          const future = key > todayKey
          const p = paint(key)
          const level = Math.max(0, ...p.levels)
          const n = future ? 0 : p.count
          const cls = ['mc-day']
          if (key === selectedDay) cls.push('mc-day--selected')
          if (!future && !twoEvent && level >= 4) cls.push('mc-day--dark')
          if (future) cls.push('mc-day--future')
          return (
            <button
              key={key}
              type="button"
              className={cls.join(' ')}
              data-day={key}
              data-level={future ? 0 : level}
              aria-pressed={key === selectedDay}
              aria-label={`${dayLabel(key)}: ${n} ${n === 1 ? 'entry' : 'entries'}`}
              disabled={future}
              style={{ background: future ? 'transparent' : background(p, twoEvent) }}
              onClick={() => onSelect(key)}
            >
              <span className="mc-num">{d}</span>
              {key === todayKey && <span className="mc-today" aria-hidden="true" />}
            </button>
          )
        })}
      </div>
    </section>
  )
}

// LargeWidget_v1.0 — This section is intended to draw the 364×382 Igusa widget: the same tiles, severity row and "Logged." + Undo as the medium widget, above a 16-week × 7-day mini grid for the first symptom shaded with shadeLevel/tint (empty days in --grid-empty, days after today left blank).
import { useMemo } from 'react'
import { dayKey, shadeLevel, tint } from '../../engine'
import type { EventDef } from '../../engine'
import { countsByDay, useIgusaStore } from '../../state'
import { EventTiles, SeverityRow, WidgetHeader } from './WidgetParts'
import { useTodayCounts, useWidgetLog } from './useWidgetLog'
import './widgets.css'

export const MINI_WEEKS = 16

interface MiniCell {
  key: string
  level: number
  future: boolean
}

/** 16 columns (weeks, oldest left) × 7 rows (Sunday → Saturday); the last column is the current week. */
function buildCells(ev: EventDef, entries: ReturnType<typeof useIgusaStore.getState>['entries']): MiniCell[] {
  const byDay = countsByDay(entries, ev.id)
  const today = new Date()
  const todayKey = dayKey(today.getTime())
  const y = today.getFullYear()
  const m = today.getMonth()
  const firstDay = today.getDate() - today.getDay() - (MINI_WEEKS - 1) * 7
  const cells: MiniCell[] = []
  for (let i = 0; i < MINI_WEEKS * 7; i++) {
    // Noon avoids DST edges when stepping whole days.
    const key = dayKey(new Date(y, m, firstDay + i, 12).getTime())
    const future = key > todayKey
    cells.push({ key, future, level: future ? 0 : shadeLevel(byDay.get(key)?.count ?? 0) })
  }
  return cells
}

export function LargeWidget() {
  const events = useIgusaStore((s) => s.events).slice(0, 5)
  const entries = useIgusaStore((s) => s.entries)
  const counts = useTodayCounts()
  const w = useWidgetLog()
  const symptom = events.find((e) => e.kind === 'symptom') ?? events[0]
  const sevEvent = w.severityEventId ? events.find((e) => e.id === w.severityEventId) : undefined
  const cells = useMemo(() => (symptom ? buildCells(symptom, entries) : []), [symptom, entries])

  return (
    <section className="widget widget--large" data-testid="widget-large" aria-label="Igusa widget, large">
      <WidgetHeader loggedOpen={w.loggedOpen} onUndo={w.undoLast} />
      {sevEvent ? (
        <SeverityRow event={sevEvent} onRate={w.rate} />
      ) : (
        <EventTiles events={events} counts={counts} pulse={w.pulse} onTap={w.tap} />
      )}
      {symptom && (
        <div className="wl-grid-block">
          <div className="wl-grid-label">{symptom.name} · 16 weeks</div>
          <div className="wl-grid" data-testid="mini-grid" role="img" aria-label={`${symptom.name}, last 16 weeks`}>
            {cells.map((c) => (
              <span
                key={c.key}
                className={c.future ? 'wl-cell wl-cell--future' : 'wl-cell'}
                data-testid="mini-cell"
                data-day={c.key}
                data-level={c.level}
                style={c.level > 0 ? { background: tint(symptom.color, c.level as 1 | 2 | 3 | 4 | 5) } : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

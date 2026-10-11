// MediumWidget_v1.0 — This section is intended to draw the primary 364×170 Igusa widget: up to five text-free colour tiles with today's count under each, a tap that logs through the shared store, a 1–5 severity row for severity events until rated or timed out, and "Logged." + Undo for three seconds after a tap.
import { useIgusaStore } from '../../state'
import { EventTiles, SeverityRow, WidgetHeader } from './WidgetParts'
import { useTodayCounts, useWidgetLog } from './useWidgetLog'
import './widgets.css'

export function MediumWidget() {
  const events = useIgusaStore((s) => s.events).slice(0, 5)
  const counts = useTodayCounts()
  const w = useWidgetLog()
  const sevEvent = w.severityEventId ? events.find((e) => e.id === w.severityEventId) : undefined

  return (
    <section className="widget widget--medium" data-testid="widget-medium" aria-label="Igusa widget, medium">
      <WidgetHeader loggedOpen={w.loggedOpen} onUndo={w.undoLast} />
      {sevEvent ? (
        <SeverityRow event={sevEvent} onRate={w.rate} />
      ) : (
        <EventTiles events={events} counts={counts} pulse={w.pulse} onTap={w.tap} />
      )}
    </section>
  )
}

// GridScreen_v1.0 — This section is intended to be the Grid tab: filter chips and Count / Severity toggle, the summary line, the 53 × 7 year strip whose scrub picks the month, the month calendar and the day panel, all reading the shared store.
import { useCallback, useMemo, useState } from 'react'
import { useIgusaStore } from '../../state'
import { countsByDay, daysSinceLast, entriesOn, totalLast12Months } from '../../state/selectors'
import { FilterBar } from './FilterBar'
import { YearStrip } from './YearStrip'
import { MonthCalendar } from './MonthCalendar'
import { DayPanel } from './DayPanel'
import { WEEKS, buildStrip, monthIndex, paintDay, resolveTokenHex, statsAll, NO_DOM_INK, type Layer, type MonthRef, type ShadeMode } from './shading'
import './grid.css'

function sinceText(days: number | null, total: number): string {
  const since = days === null ? 'None logged yet' : `${days} ${days === 1 ? 'day' : 'days'} since last`
  return `${since} · ${total} in past 12 months`
}

export function GridScreen() {
  const events = useIgusaStore((s) => s.events)
  const entries = useIgusaStore((s) => s.entries)
  const theme = useIgusaStore((s) => s.theme)
  const deleteEntry = useIgusaStore((s) => s.deleteEntry)
  const updateEntryTime = useIgusaStore((s) => s.updateEntryTime)

  // Recomputed whenever entries change, so a tap logged elsewhere lands on today's cell at once.
  const now = useMemo(() => Date.now(), [entries]) // eslint-disable-line react-hooks/exhaustive-deps
  const strip = useMemo(() => buildStrip(now), [now])
  const today = new Date(now)
  const currentMonth: MonthRef = { y: today.getFullYear(), m: today.getMonth() }

  const [selected, setSelected] = useState<string[]>([])
  const [mode, setMode] = useState<ShadeMode>('count')
  const [month, setMonth] = useState<MonthRef>(currentMonth)
  const [selectedDay, setSelectedDay] = useState<string>(strip.todayKey)
  const [scrubCol, setScrubCol] = useState<number | null>(null)

  const selectedEvents = selected.map((id) => events.find((e) => e.id === id)).filter((e) => e !== undefined)
  const inkHex = useMemo(() => resolveTokenHex('--ink'), [theme]) // eslint-disable-line react-hooks/exhaustive-deps

  const selKey = selected.join('|')
  const layers: Layer[] = useMemo(() => {
    if (selectedEvents.length === 0) return [{ id: 'all', name: 'All', color: inkHex ?? NO_DOM_INK, stats: statsAll(entries) }]
    return selectedEvents.map((e) => ({ id: e.id, name: e.name, color: e.color, stats: countsByDay(entries, e.id) }))
  }, [selKey, events, entries, inkHex]) // eslint-disable-line react-hooks/exhaustive-deps

  const twoEvent = layers.length === 2
  const paint = useCallback((key: string) => paintDay(key, layers, mode), [layers, mode])

  const toggleEvent = (id: string) => {
    setSelected((cur) => {
      if (cur.length === 0) return [id]
      if (cur.length === 1) return cur[0] === id ? [] : [cur[0], id]
      if (cur[0] === id) return [cur[1]]
      if (cur[1] === id) return [cur[0]]
      return [cur[0], id]
    })
  }

  const scrub = useCallback(
    (col: number) => {
      setScrubCol(col)
      const sunday = strip.days[col * 7].date
      setMonth((cur) => (cur.y === sunday.getFullYear() && cur.m === sunday.getMonth() ? cur : { y: sunday.getFullYear(), m: sunday.getMonth() }))
    },
    [strip],
  )

  const firstDate = strip.days.find((d) => d.inRange)?.date ?? today
  const minMonth = monthIndex({ y: firstDate.getFullYear(), m: firstDate.getMonth() })
  const maxMonth = monthIndex(currentMonth)
  const shiftMonth = (delta: number) => {
    setScrubCol(null)
    setMonth((cur) => {
      const idx = Math.max(minMonth, Math.min(maxMonth, monthIndex(cur) + delta))
      return { y: Math.floor(idx / 12), m: idx % 12 }
    })
  }
  const monthCol = (() => {
    const i = strip.days.findIndex((d) => d.date.getFullYear() === month.y && d.date.getMonth() === month.m)
    return i < 0 ? WEEKS - 1 : Math.floor(i / 7)
  })()

  const ids = new Set(selected)
  const dayEntries = entriesOn(entries, selectedDay).filter((e) => ids.size === 0 || ids.has(e.eventId))

  const summary: string[] =
    selectedEvents.length === 0
      ? [`${events.reduce((n, e) => n + totalLast12Months(entries, e.id, now), 0)} entries in past 12 months`]
      : selectedEvents.map((e) => {
          const line = sinceText(daysSinceLast(entries, e.id, now), totalLast12Months(entries, e.id, now))
          return selectedEvents.length === 2 ? `${e.name}: ${line}` : line
        })

  const severityNote = mode === 'severity' && (selectedEvents.length > 0 ? selectedEvents : events).some((e) => !e.askSeverity)

  return (
    <div className="grid-screen" data-testid="grid-screen">
      <FilterBar events={events} selected={selected} mode={mode} onToggleEvent={toggleEvent} onAll={() => setSelected([])} onMode={setMode} />
      <div className="gr-summary" data-testid="grid-summary">
        {summary.map((s, i) => (
          <p key={i} className="gr-summary-line" data-testid="summary-line">
            {s}
          </p>
        ))}
        {severityNote && <p className="gr-note">Severity shading uses rated symptom entries; other events stay blank.</p>}
      </div>
      <YearStrip
        days={strip.days}
        paint={paint}
        twoEvent={twoEvent}
        scrubCol={scrubCol}
        defaultCol={monthCol}
        onScrub={scrub}
        paintKey={`${selKey}:${mode}`}
      />
      <MonthCalendar
        month={month}
        paint={paint}
        twoEvent={twoEvent}
        selectedDay={selectedDay}
        todayKey={strip.todayKey}
        canPrev={monthIndex(month) > minMonth}
        canNext={monthIndex(month) < maxMonth}
        onPrev={() => shiftMonth(-1)}
        onNext={() => shiftMonth(1)}
        onSelect={setSelectedDay}
      />
      <DayPanel dayKey={selectedDay} entries={dayEntries} events={events} onDelete={deleteEntry} onUpdateTime={updateEntryTime} />
    </div>
  )
}

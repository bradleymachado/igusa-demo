// DoctorSummary_v1.0 — This section is intended to be the Summary tab: one printable page for a clinician (date range only, no personal data) with per-symptom counts, mean severity, days since last and a 13-week mini grid, per-exposure counts, the top three Weave lines (multiplier blurred while locked), the logbook footer, and a Share button that shows a toast.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useIgusaStore, countsByDay, daysSinceLast, ranked } from '../state'
import { dayKey, shadeLevel, tint } from '../engine'
import type { Entry, EventDef } from '../engine'
import { CELL, GAP } from './Grid/shading'
import './summary.css'

/** Days in the summary window (today included). */
const WINDOW_DAYS = 90
/** Mini grid: 13 columns × 7 rows = 91 consecutive days ending today. */
const WEEKS = 13
const STEP = CELL + GAP
const GRID_W = WEEKS * CELL + (WEEKS - 1) * GAP
const GRID_H = 7 * CELL + 6 * GAP
const TOAST_MS = 2500
const LIFT_RE = /\d+(?:\.\d+)?×/

interface Day {
  key: string
  inWindow: boolean
}

/** 91 consecutive local days ending today (noon steps avoid DST edges); the first one sits just outside the 90-day window. */
function buildDays(now: number): { days: Day[]; startKey: string; todayKey: string } {
  const t = new Date(now)
  const y = t.getFullYear()
  const m = t.getMonth()
  const d = t.getDate()
  const todayKey = dayKey(now)
  const startKey = dayKey(new Date(y, m, d - (WINDOW_DAYS - 1), 12).getTime())
  const days: Day[] = []
  for (let i = WEEKS * 7 - 1; i >= 0; i--) {
    const key = dayKey(new Date(y, m, d - i, 12).getTime())
    days.push({ key, inWindow: key >= startKey && key <= todayKey })
  }
  return { days, startKey, todayKey }
}

function longDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 12).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Local blurred pill: real value hidden from readers, a dash read instead (same styling idea as Weave). */
function Pill({ value }: { value: string }) {
  return (
    <>
      <span className="sm-pill" aria-hidden="true">{value}</span>
      <span className="sm-sr">—</span>
    </>
  )
}

function PatternLine({ text, locked }: { text: string; locked: boolean }) {
  const m = locked ? LIFT_RE.exec(text) : null
  if (!m) return <li className="sm-pattern" data-testid="summary-pattern">{text}</li>
  return (
    <li className="sm-pattern" data-testid="summary-pattern" data-locked="1">
      {text.slice(0, m.index).trimEnd()} <Pill value={m[0]} /> {text.slice(m.index + m[0].length).trimStart()}
    </li>
  )
}

function MiniGrid({ ev, days, byDay }: { ev: EventDef; days: Day[]; byDay: Map<string, { count: number }> }) {
  return (
    <svg
      className="sm-grid"
      data-testid="summary-grid"
      width={GRID_W}
      height={GRID_H}
      viewBox={`0 0 ${GRID_W} ${GRID_H}`}
      role="img"
      aria-label={`${ev.name}, daily entries over the last 13 weeks`}
    >
      {days.map((day, i) => {
        const col = Math.floor(i / 7)
        const row = i % 7
        const count = day.inWindow ? (byDay.get(day.key)?.count ?? 0) : 0
        const level = shadeLevel(count)
        const style = !day.inWindow
          ? { fill: 'transparent', stroke: 'var(--grid-empty)', strokeWidth: 0.5 }
          : level === 0
            ? { fill: 'var(--grid-empty)' }
            : { fill: tint(ev.color, level) }
        return (
          <rect
            key={day.key}
            data-cell={day.key}
            data-level={level}
            x={col * STEP}
            y={row * STEP}
            width={CELL}
            height={CELL}
            rx={1}
            style={style}
          />
        )
      })}
    </svg>
  )
}

function inWindowEntries(entries: Entry[], eventId: string, startKey: string, todayKey: string): Entry[] {
  return entries.filter((e) => {
    if (e.eventId !== eventId) return false
    const k = dayKey(e.ts)
    return k >= startKey && k <= todayKey
  })
}

export function DoctorSummary() {
  const events = useIgusaStore((s) => s.events)
  const entries = useIgusaStore((s) => s.entries)
  const weaveUnlocked = useIgusaStore((s) => s.weaveUnlocked)
  const [toast, setToast] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  const now = useMemo(() => Date.now(), [entries]) // eslint-disable-line react-hooks/exhaustive-deps
  const { days, startKey, todayKey } = useMemo(() => buildDays(now), [now])
  const symptoms = events.filter((e) => e.kind === 'symptom')
  const exposures = events.filter((e) => e.kind === 'exposure')
  const patterns = useMemo(
    () => ranked(entries, events).filter((p) => p.shown && p.text).slice(0, 3).map((p) => p.text as string),
    [entries, events],
  )

  useEffect(() => () => window.clearTimeout(timer.current), [])

  function share() {
    window.clearTimeout(timer.current)
    setToast(true)
    timer.current = window.setTimeout(() => setToast(false), TOAST_MS)
  }

  return (
    <div className="sm-screen" data-testid="summary-screen">
      <article className="sm-page" data-testid="summary-page" aria-label="Igusa summary page">
        <header className="sm-head">
          <h1 className="sm-title">Igusa summary</h1>
          <p className="sm-sub" data-testid="summary-range">
            Last {WINDOW_DAYS} days · {longDate(startKey)} – {longDate(todayKey)}
          </p>
        </header>

        <section className="sm-section" aria-label="Symptoms">
          <h2 className="sm-h2">Symptoms</h2>
          {symptoms.length === 0 && <p className="sm-empty">No symptom events.</p>}
          {symptoms.map((ev) => {
            const list = inWindowEntries(entries, ev.id, startKey, todayKey)
            const rated = list.filter((e) => e.severity !== undefined)
            const mean = rated.length ? rated.reduce((a, e) => a + (e.severity ?? 0), 0) / rated.length : null
            const since = daysSinceLast(entries, ev.id, now)
            const sinceText = since === null ? 'none yet' : since === 0 ? 'today' : `last: ${since} ${since === 1 ? 'day' : 'days'} ago`
            return (
              <div className="sm-row sm-row-symptom" data-testid="summary-symptom" data-event={ev.id} key={ev.id}>
                <div className="sm-row-line">
                  <span className="sm-dot" style={{ background: ev.color }} aria-hidden="true" />
                  <span className="sm-name">{ev.name}</span>
                  <span className="sm-count" data-testid="summary-count">{list.length} entries</span>
                </div>
                <p className="sm-meta">
                  {mean !== null && <span data-testid="summary-mean">mean severity {mean.toFixed(1)} · </span>}
                  <span data-testid="summary-since">{sinceText}</span>
                </p>
                <MiniGrid ev={ev} days={days} byDay={countsByDay(list, ev.id)} />
              </div>
            )
          })}
        </section>

        <section className="sm-section" aria-label="Exposures">
          <h2 className="sm-h2">Exposures</h2>
          {exposures.length === 0 && <p className="sm-empty">No exposure events.</p>}
          {exposures.map((ev) => (
            <div className="sm-row" data-testid="summary-exposure" data-event={ev.id} key={ev.id}>
              <div className="sm-row-line">
                <span className="sm-dot" style={{ background: ev.color }} aria-hidden="true" />
                <span className="sm-name">{ev.name}</span>
                <span className="sm-count" data-testid="summary-count">
                  {inWindowEntries(entries, ev.id, startKey, todayKey).length} entries
                </span>
              </div>
            </div>
          ))}
        </section>

        <section className="sm-section" aria-label="Patterns (Weave)" data-testid="summary-patterns">
          <h2 className="sm-h2">Patterns (Weave)</h2>
          {patterns.length === 0 ? (
            <p className="sm-empty">Not enough entries for patterns yet.</p>
          ) : (
            <ol className="sm-patterns">
              {patterns.map((t) => (
                <PatternLine key={t} text={t} locked={!weaveUnlocked} />
              ))}
            </ol>
          )}
        </section>

        <footer className="sm-foot">Logbook only. Prototype. Sample data. Not medical advice.</footer>
      </article>

      <button type="button" className="sm-share" aria-label="Share summary" onClick={share}>
        Share
      </button>
      <div className="sm-toast-wrap" role="status" aria-live="polite">
        {toast && <p className="sm-toast" data-testid="summary-toast">PDF export arrives with the native app.</p>}
      </div>
    </div>
  )
}

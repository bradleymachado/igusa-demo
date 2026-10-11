// WeaveScreen_v1.0 — This section is intended to be the Weave tab: a three-way segmented control (Triggers, Overlay, When) over the engine's ranked pairs, the year-strip overlay and the hour-by-weekday view, all reading the shared store and honouring the locked state (weaveUnlocked=false → multipliers blurred, "See patterns" opens the paywall).
import { useMemo, useState } from 'react'
import { useIgusaStore } from '../../state'
import { ranked } from '../../state/selectors'
import { OverlayStrip } from './OverlayStrip'
import { Triggers } from './Triggers'
import { WhenView } from './WhenView'
import { allPairs } from './pairs'
import './weave.css'

type Segment = 'triggers' | 'overlay' | 'when'

const SEGMENTS: { id: Segment; label: string }[] = [
  { id: 'triggers', label: 'Triggers' },
  { id: 'overlay', label: 'Overlay' },
  { id: 'when', label: 'When' },
]

export function WeaveScreen() {
  const entries = useIgusaStore((s) => s.entries)
  const events = useIgusaStore((s) => s.events)
  const unlocked = useIgusaStore((s) => s.weaveUnlocked)
  const setPaywallOpen = useIgusaStore((s) => s.setPaywallOpen)
  const locked = !unlocked

  const [segment, setSegment] = useState<Segment>('triggers')
  const [now] = useState(() => Date.now())
  const top = useMemo(() => ranked(entries, events), [entries, events])
  const every = useMemo(() => allPairs(entries, events), [entries, events])

  const exposures = events.filter((e) => e.kind === 'exposure')
  const symptoms = events.filter((e) => e.kind === 'symptom')
  const firstShown = top.find((p) => p.shown) ?? top[0]
  const [pick, setPick] = useState<{ x: string; s: string } | null>(null)
  const ovX = pick && exposures.some((e) => e.id === pick.x) ? pick.x : (firstShown?.exposureId ?? exposures[0]?.id ?? '')
  const ovS = pick && symptoms.some((e) => e.id === pick.s) ? pick.s : (firstShown?.symptomId ?? symptoms[0]?.id ?? '')
  const [whenPick, setWhenPick] = useState<string | null>(null)
  const whenS = whenPick && symptoms.some((e) => e.id === whenPick) ? whenPick : (symptoms[0]?.id ?? '')

  return (
    <div className="weave-screen" data-testid="weave-screen" data-locked={locked ? '1' : '0'}>
      <div className="wv-seg" role="group" aria-label="Weave view">
        {SEGMENTS.map((g) => (
          <button
            key={g.id}
            type="button"
            className="wv-seg-btn"
            aria-label={`${g.label} segment`}
            aria-pressed={segment === g.id}
            onClick={() => setSegment(g.id)}
          >
            {g.label}
          </button>
        ))}
      </div>

      {segment === 'triggers' && <Triggers pairs={top} events={events} locked={locked} onSeePatterns={() => setPaywallOpen(true)} />}
      {segment === 'overlay' && (
        <OverlayStrip
          entries={entries}
          events={events}
          pairs={every}
          exposureId={ovX}
          symptomId={ovS}
          locked={locked}
          onChange={(x, s) => setPick({ x, s })}
          now={now}
        />
      )}
      {segment === 'when' && <WhenView entries={entries} events={events} symptomId={whenS} locked={locked} onSelect={setWhenPick} now={now} />}
    </div>
  )
}

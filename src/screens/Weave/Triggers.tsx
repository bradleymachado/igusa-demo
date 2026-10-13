// WeaveTriggers_v1.0 — This section is intended to list the engine's ranked exposure → symptom pairs as cards (colour dots, engine sentence, muted counts), blur the multiplier and percentages while Weave is locked behind a "See patterns" button that opens the paywall, and always show real partial counts for pairs below the thresholds.
import type { EventDef, PairResult } from '../../engine'
import { LiftText, Pill } from './Pill'
import { pct } from './pairs'

interface Props {
  pairs: PairResult[]
  events: EventDef[]
  locked: boolean
  onSeePatterns: () => void
}

export function Triggers({ pairs, events, locked, onSeePatterns }: Props) {
  const byId = new Map(events.map((e) => [e.id, e]))
  return (
    <section className="wv-section" data-testid="weave-triggers" aria-label="Triggers">
      <p className="wv-lede">Which exposures are followed by which symptoms within 6 hours.</p>
      {locked && (
        <button type="button" className="wv-see" aria-label="See patterns, unlock Weave" onClick={onSeePatterns}>
          See patterns
        </button>
      )}
      {pairs.length === 0 ? (
        <p className="wv-empty">Add at least one exposure and one symptom to see pairs.</p>
      ) : (
        <ul className="wv-list" data-testid="weave-list">
          {pairs.map((p) => {
            const x = byId.get(p.exposureId)
            const s = byId.get(p.symptomId)
            const xName = x?.name ?? p.exposureId
            const sName = s?.name ?? p.symptomId
            return (
              <li key={`${p.exposureId}|${p.symptomId}`} className="wv-card" data-testid="pair-card" data-shown={p.shown ? '1' : '0'} data-exposure={p.exposureId} data-symptom={p.symptomId}>
                <span className="wv-dots" aria-hidden="true">
                  <span className="wv-dot" style={{ background: x?.color }} />
                  <span className="wv-dot" style={{ background: s?.color }} />
                </span>
                <div className="wv-card-body">
                  {p.shown && p.text ? (
                    <>
                      <LiftText text={p.text} locked={locked} testId="pair-text" />
                      <p className="wv-sub" data-testid="pair-counts">
                        {p.exposures} {p.exposures === 1 ? 'exposure' : 'exposures'} · {p.followed} followed{' '}
                        {locked ? <Pill>{`(${pct(p.pFollow)})`}</Pill> : `(${pct(p.pFollow)})`} · base{' '}
                        {locked ? <Pill>{pct(p.pBase)}</Pill> : pct(p.pBase)}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="wv-text wv-text--muted" data-testid="pair-text">
                        {xName} · {sName}
                      </p>
                      <p className="wv-sub" data-testid="pair-partial">
                        {p.exposures} {p.exposures === 1 ? 'exposure' : 'exposures'} · {p.symptoms} {p.symptoms === 1 ? 'symptom entry' : 'symptom entries'} so far
                      </p>
                      <p className="wv-sub" data-testid="pair-teaser">
                        {p.teaser}
                      </p>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

// PresenterBar_v1.0 — This section is intended to render the presenter bar under the devices: six numbered step buttons wired to the screens through the shared store (current step in --brand, aria-current="step"), ArrowRight / ArrowLeft stepping, `#step=N&theme=…` deep links read on load and kept in sync, the Newsprint / Tatami theme switch via the store, Reset, and the mandatory footer line.
import { useCallback, useEffect, useRef } from 'react'
import { useIgusaStore } from '../state'
import { arrowKeysBlocked, clampStep, parseHash, runStep, writeStepHash, FIRST_STEP, LAST_STEP } from './presenter'
import type { Flash, ThemeId } from './presenter'

export const STEPS = [
  { n: 1, label: 'Set up' },
  { n: 2, label: 'Widget' },
  { n: 3, label: 'Watch' },
  { n: 4, label: 'Grid' },
  { n: 5, label: 'Weave' },
  { n: 6, label: 'Summary' },
] as const

const THEMES = [
  { id: 'newsprint', label: 'Newsprint' },
  { id: 'tatami', label: 'Tatami' },
] as const

export function PresenterBar({ onReset, onFlash }: { onReset?: () => void; onFlash?: (flash: Flash) => void }) {
  const step = useIgusaStore((s) => s.presenterStep)
  const theme = useIgusaStore((s) => s.theme)
  const setTheme = useIgusaStore((s) => s.setTheme)
  const reset = useIgusaStore((s) => s.reset)
  const setPresenterStep = useIgusaStore((s) => s.setPresenterStep)

  const goStep = useCallback(
    (n: number, syncHash = true) => {
      const target = clampStep(n)
      const flash = runStep(target)
      onFlash?.(flash)
      if (syncHash) writeStepHash(target)
    },
    [onFlash],
  )

  // Deep links: read `#step=N` and `#theme=…` once on load (and on manual hash edits); never written on load.
  const loaded = useRef(false)
  useEffect(() => {
    const apply = () => {
      const { step: s, theme: t } = parseHash(window.location.hash)
      if (t) setTheme(t as ThemeId)
      if (s !== null) goStep(s, false)
    }
    if (!loaded.current) {
      loaded.current = true
      apply()
    }
    window.addEventListener('hashchange', apply)
    return () => window.removeEventListener('hashchange', apply)
  }, [goStep, setTheme])

  // Keyboard: → / ← move steps unless typing or inside the phone screen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.defaultPrevented) return
      if (arrowKeysBlocked(e.target) || arrowKeysBlocked(document.activeElement)) return
      const current = useIgusaStore.getState().presenterStep
      const next = e.key === 'ArrowRight' ? Math.min(LAST_STEP, current + 1) : Math.max(FIRST_STEP, current - 1)
      if (next === current) return
      e.preventDefault()
      goStep(next)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [goStep])

  const doReset = () => {
    if (onReset) onReset()
    else reset()
    setPresenterStep(1)
    onFlash?.(null)
    writeStepHash(1)
  }

  return (
    <div className="presenter" data-testid="presenter-bar">
      <div className="presenter-controls">
        <div className="presenter-group" role="group" aria-label="Pitch steps">
          {STEPS.map((s) => (
            <button
              key={s.n}
              type="button"
              className="stage-button presenter-step"
              aria-label={`Step ${s.n}: ${s.label}`}
              aria-pressed={step === s.n}
              aria-current={step === s.n ? 'step' : undefined}
              onClick={() => goStep(s.n)}
            >
              <span className="step-num">{s.n}</span> {s.label}
            </button>
          ))}
        </div>
        <div className="presenter-group" role="group" aria-label="Theme">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              className="stage-button"
              aria-label={`${t.label} theme`}
              aria-pressed={theme === t.id}
              onClick={() => setTheme(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="presenter-group presenter-group--reset">
          <button type="button" className="stage-button presenter-reset" aria-label="Reset demo" onClick={doReset}>
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M2.5 7a4.5 4.5 0 1 0 1.4-3.3M2.5 1.5v2.7h2.7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Reset
          </button>
        </div>
      </div>
      <footer className="presenter-footer">Prototype. Sample data. Not medical advice.</footer>
    </div>
  )
}

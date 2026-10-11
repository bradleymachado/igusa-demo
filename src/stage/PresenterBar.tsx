// PresenterBar_v1.0 — This section is intended to render the presenter bar under the devices: six numbered step buttons (selected state only until S14), the Newsprint / Tatami theme switch that sets <html data-theme>, a placeholder Reset, and the mandatory footer line.
import { useState } from 'react'

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

type ThemeId = (typeof THEMES)[number]['id']

export function PresenterBar({ onReset }: { onReset?: () => void }) {
  const [step, setStep] = useState<number>(1)
  const [theme, setTheme] = useState<ThemeId>(() =>
    document.documentElement.dataset.theme === 'tatami' ? 'tatami' : 'newsprint',
  )

  const chooseTheme = (id: ThemeId) => {
    document.documentElement.dataset.theme = id
    setTheme(id)
  }

  return (
    <div className="presenter" data-testid="presenter-bar">
      <div className="presenter-controls">
        <div className="presenter-group" role="group" aria-label="Pitch steps">
          {STEPS.map((s) => (
            <button
              key={s.n}
              type="button"
              className="stage-button"
              aria-label={`Step ${s.n}: ${s.label}`}
              aria-pressed={step === s.n}
              onClick={() => setStep(s.n)}
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
              onClick={() => chooseTheme(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="presenter-group">
          <button
            type="button"
            className="stage-button"
            aria-label="Reset demo"
            onClick={() => onReset?.()}
          >
            Reset
          </button>
        </div>
      </div>
      <footer className="presenter-footer">Prototype. Sample data. Not medical advice.</footer>
    </div>
  )
}

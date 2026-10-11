// ChooseCondition_v1.0 — This section is intended to render setup Step 1, "What are you tracking?": six condition rows (name, one-line blurb, chevron) where one tap selects a template and advances.
import { TEMPLATES } from '../../data'

export function ChooseCondition({ selected, onChoose }: { selected: string | null; onChoose: (templateId: string) => void }) {
  return (
    <div className="setup-step" data-testid="setup-step-1">
      <h1 className="setup-headline">What are you tracking?</h1>
      <p className="setup-lede">Pick a starting point. You can rename everything next.</p>
      <ul className="setup-list">
        {TEMPLATES.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              className="setup-condition"
              aria-label={`Choose ${t.name}`}
              aria-current={selected === t.id ? 'true' : undefined}
              onClick={() => onChoose(t.id)}
            >
              <span className="setup-row-text">
                <span className="setup-row-name">{t.name}</span>
                <span className="setup-row-note">{t.blurb}</span>
              </span>
              <svg className="setup-chevron" width="10" height="16" viewBox="0 0 10 16" aria-hidden="true">
                <path d="M2 2l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

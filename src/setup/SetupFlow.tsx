// SetupFlow_v1.0 — This section is intended to run the four-step setup tutorial inside the iPhone screen (condition pick, events, widget, sample data) with local step state, progress dots and back arrows, then write the choice to the shared store with applyTemplate and, when edited, setEvents.
import { useState } from 'react'
import type { EventDef } from '../data'
import { useIgusaStore } from '../state'
import { cleanDraft, draftChanged, draftFromTemplate } from './draft'
import { ChooseCondition } from './steps/ChooseCondition'
import { EditEvents } from './steps/EditEvents'
import { AddWidget } from './steps/AddWidget'
import { SampleData } from './steps/SampleData'
import './setup.css'

type Step = 1 | 2 | 3 | 4

export function SetupFlow() {
  const applyTemplate = useIgusaStore((s) => s.applyTemplate)
  const setEvents = useIgusaStore((s) => s.setEvents)
  const [step, setStep] = useState<Step>(1)
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [draft, setDraft] = useState<EventDef[]>([])
  const [withSample, setWithSample] = useState(true)

  const isBlank = templateId === 'blank'

  // Picking the same condition again keeps the edits; a different one starts from its own events.
  const choose = (id: string) => {
    if (id !== templateId) {
      setTemplateId(id)
      setDraft(draftFromTemplate(id))
      setWithSample(id !== 'blank')
    }
    setStep(2)
  }

  const done = () => {
    if (!templateId) return
    applyTemplate(templateId, isBlank ? false : withSample)
    if (draftChanged(templateId, draft)) setEvents(cleanDraft(draft))
  }

  return (
    <div className="setup-flow" data-testid="setup-flow" data-step={step}>
      <div className="setup-top">
        {step > 1 ? (
          <button type="button" className="setup-back" aria-label="Back" onClick={() => setStep((s) => (s - 1) as Step)}>
            <svg width="11" height="18" viewBox="0 0 11 18" aria-hidden="true">
              <path d="M9 2L2 9l7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : (
          <span className="setup-back-spacer" aria-hidden="true" />
        )}
        <ol className="setup-dots" aria-label={`Step ${step} of 4`}>
          {[1, 2, 3, 4].map((n) => (
            <li key={n} className={n === step ? 'is-current' : n < step ? 'is-done' : undefined} />
          ))}
        </ol>
        <span className="setup-back-spacer setup-count" aria-hidden="true">{step} of 4</span>
      </div>
      {step === 1 && <ChooseCondition selected={templateId} onChoose={choose} />}
      {step === 2 && templateId && <EditEvents templateId={templateId} events={draft} onChange={setDraft} onContinue={() => setStep(3)} />}
      {step === 3 && <AddWidget events={draft} onContinue={() => setStep(4)} />}
      {step === 4 && (
        <SampleData allowSample={!isBlank} withSample={isBlank ? false : withSample} onSelect={setWithSample} onDone={done} />
      )}
    </div>
  )
}

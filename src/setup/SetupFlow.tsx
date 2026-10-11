// SetupFlow_v1.0 — This section is intended to be the first-run setup tutorial; stub until S9 replaces it. The stub lets S7 tests skip setup with one tap.
import { useIgusaStore } from '../state'

export function SetupFlow() {
  const applyTemplate = useIgusaStore((s) => s.applyTemplate)
  return (
    <div data-testid="setup-flow" style={{ padding: 16, fontFamily: 'var(--font-ui)', color: 'var(--ink)' }}>
      <p style={{ color: 'var(--muted)' }}>Setup tutorial (S9)</p>
      <button type="button" aria-label="Use IBS sample data" style={{ minHeight: 44, minWidth: 44 }} onClick={() => applyTemplate('ibs', true)}>
        Use IBS sample data
      </button>
    </div>
  )
}

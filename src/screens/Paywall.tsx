// Paywall_v1.0 — This section is intended to be the Weave unlock sheet ($2.99 / $14.99 / $29.99); stub until S13 replaces it. Rendered by AppView when store.paywallOpen is true.
import { useIgusaStore } from '../state'

export function Paywall() {
  const unlockWeave = useIgusaStore((s) => s.unlockWeave)
  return (
    <div data-testid="paywall" style={{ padding: 16, color: 'var(--muted)', fontFamily: 'var(--font-ui)' }}>
      Paywall (S13)
      <button type="button" aria-label="Continue" style={{ minHeight: 44, minWidth: 44, display: 'block', marginTop: 8 }} onClick={() => unlockWeave()}>
        Continue
      </button>
    </div>
  )
}

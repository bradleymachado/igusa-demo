// AppView_v1.0 — This section is intended to be the in-app view behind the Igusa icon (tab bar + screens); stub until S10 replaces it.
import { useIgusaStore } from '../state'

export function AppView() {
  const setAppOpen = useIgusaStore((s) => s.setAppOpen)
  return (
    <div data-testid="app-view" style={{ padding: 16, fontFamily: 'var(--font-ui)', color: 'var(--ink)' }}>
      <p style={{ color: 'var(--muted)' }}>Igusa app (S10–S13)</p>
      <button type="button" aria-label="Back to home screen" style={{ minHeight: 44, minWidth: 44 }} onClick={() => setAppOpen(false)}>
        Home
      </button>
    </div>
  )
}

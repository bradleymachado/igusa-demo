// TabBar_v1.0 — This section is intended to draw the app's bottom tab bar (Log · Grid · Weave · Summary) with inline-SVG glyphs in currentColor and small labels, and route between tabs through store.appTab.
import type { ReactElement } from 'react'
import { useIgusaStore, type AppTab } from '../state'

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

const GLYPHS: Record<AppTab, ReactElement> = {
  log: (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="5" cy="7" r="1.6" fill="currentColor" />
      <circle cx="5" cy="12" r="1.6" fill="currentColor" />
      <circle cx="5" cy="17" r="1.6" fill="currentColor" />
      <path d="M9 7h11M9 12h11M9 17h11" {...S} />
    </svg>
  ),
  grid: (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" {...S} />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" {...S} />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" {...S} />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" {...S} />
    </svg>
  ),
  weave: (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 8c4 0 5 8 9 8s5-8 9-8" {...S} />
      <path d="M3 16c4 0 5-8 9-8s5 8 9 8" {...S} />
    </svg>
  ),
  summary: (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h9l4 4v14H6z" {...S} />
      <path d="M9 11h7M9 15h7M9 7h4" {...S} />
    </svg>
  ),
}

const TABS: { id: AppTab; label: string }[] = [
  { id: 'log', label: 'Log' },
  { id: 'grid', label: 'Grid' },
  { id: 'weave', label: 'Weave' },
  { id: 'summary', label: 'Summary' },
]

export function TabBar() {
  const appTab = useIgusaStore((s) => s.appTab)
  const setAppTab = useIgusaStore((s) => s.setAppTab)
  return (
    <nav className="app-tabbar" aria-label="App tabs">
      {TABS.map((t) => {
        const active = t.id === appTab
        return (
          <button
            key={t.id}
            type="button"
            className={active ? 'app-tab is-active' : 'app-tab'}
            aria-label={`${t.label} tab`}
            aria-current={active ? 'page' : undefined}
            onClick={() => setAppTab(t.id)}
          >
            {GLYPHS[t.id]}
            <span className="app-tab-label">{t.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

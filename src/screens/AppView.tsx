// AppView_v1.0 — This section is intended to be the in-app view behind the Igusa icon: a top bar with the wordmark and a Home button, the active tab's screen (Log, Grid, Weave, Summary) routed from store.appTab, the bottom tab bar, and the paywall sheet over the content when store.paywallOpen is true.
import { useIgusaStore } from '../state'
import { GridScreen } from './Grid'
import { WeaveScreen } from './Weave'
import { DoctorSummary } from './DoctorSummary'
import { Paywall } from './Paywall'
import { EventList } from './EventList'
import { TabBar } from './TabBar'
import './screens.css'

export function AppView() {
  const appTab = useIgusaStore((s) => s.appTab)
  const paywallOpen = useIgusaStore((s) => s.paywallOpen)
  const setAppOpen = useIgusaStore((s) => s.setAppOpen)

  return (
    <div className="app-view" data-testid="app-view">
      <header className="app-topbar">
        <button type="button" className="app-home" aria-label="Back to home screen" onClick={() => setAppOpen(false)}>
          <svg width="10" height="16" viewBox="0 0 10 16" aria-hidden="true">
            <path d="M8 2 L2 8 L8 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Home</span>
        </button>
        <span className="app-wordmark">Igusa</span>
        <span aria-hidden="true" />
      </header>
      <main className="app-content">
        {appTab === 'log' && <EventList />}
        {appTab === 'grid' && <GridScreen />}
        {appTab === 'weave' && <WeaveScreen />}
        {appTab === 'summary' && <DoctorSummary />}
      </main>
      <TabBar />
      {paywallOpen && (
        <div className="app-paywall-layer">
          <Paywall />
        </div>
      )}
    </div>
  )
}

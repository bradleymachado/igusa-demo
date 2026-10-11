// Presenter_v1.0 — This section is intended to run the six guided pitch steps against the shared store (Set up, Widget, Watch, Grid, Weave, Summary), parse and write the `#step=N&theme=…` URL hash, and decide when arrow keys should move the presenter.
import { igusaStore } from '../state'

export type Flash = 'widget' | 'watch' | null
export type ThemeId = 'newsprint' | 'tatami'

export const FIRST_STEP = 1
export const LAST_STEP = 6
export const FLASH_MS = 1200

export function clampStep(n: number): number {
  return Math.min(LAST_STEP, Math.max(FIRST_STEP, Math.round(n)))
}

/** Steps 2–6 need a finished setup; a viewer who skipped the tutorial gets the IBS template with sample data so the demo never dead-ends. */
function ensureSetup(): void {
  const s = igusaStore.getState()
  if (!s.setupDone) s.applyTemplate('ibs', true)
}

/** Applies step n to the store and returns which device (if any) should flash. */
export function runStep(n: number): Flash {
  const step = clampStep(n)
  const s = igusaStore.getState()
  if (step === 1) {
    s.reset()
    igusaStore.getState().setPresenterStep(1)
    return null
  }
  ensureSetup()
  const st = igusaStore.getState()
  switch (step) {
    case 2:
      st.setAppOpen(false)
      st.setPaywallOpen(false)
      st.setPresenterStep(2)
      return 'widget'
    case 3:
      st.setAppOpen(false)
      st.setPaywallOpen(false)
      st.setPresenterStep(3)
      return 'watch'
    case 4:
      st.setAppOpen(true)
      st.setAppTab('grid')
      st.setPaywallOpen(false)
      st.setPresenterStep(4)
      return null
    case 5:
      st.setAppOpen(true)
      st.setAppTab('weave')
      st.setPaywallOpen(false)
      st.setPresenterStep(5)
      return null
    default:
      st.setAppOpen(true)
      st.setAppTab('summary')
      st.setPaywallOpen(false)
      st.setPresenterStep(6)
      return null
  }
}

export interface HashState { step: number | null; theme: ThemeId | null }

export function parseHash(hash: string): HashState {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const raw = params.get('step')
  const n = raw !== null && /^\d+$/.test(raw) ? Number(raw) : NaN
  const step = n >= FIRST_STEP && n <= LAST_STEP ? n : null
  const t = params.get('theme')
  const theme: ThemeId | null = t === 'tatami' || t === 'newsprint' ? t : null
  return { step, theme }
}

/** Keeps the address bar in sync without a reload or a history entry. */
export function writeStepHash(step: number): void {
  const url = `${window.location.pathname}${window.location.search}#step=${clampStep(step)}`
  window.history.replaceState(window.history.state, '', url)
}

/** Arrow keys are ignored while typing or while the focus is inside the phone screen (its own controls use arrows). */
export function arrowKeysBlocked(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  if (target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]')) return true
  return target.closest('[data-testid="phone-screen"]') !== null
}

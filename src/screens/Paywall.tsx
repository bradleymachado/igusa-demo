// Paywall_v1.0 — This section is intended to be the Weave unlock sheet shown over the app view: a close button, the headline and the free/paid line, three plan cards as a radiogroup ($2.99 / month, $14.99 / year preselected, $29.99 once), Continue (unlocks Weave and closes), Restore purchase (toast) and Not now.
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useIgusaStore } from '../state'
import './paywall.css'

type PlanId = 'monthly' | 'yearly' | 'lifetime'

interface Plan {
  id: PlanId
  name: string
  price: string
  per: string
  spoken: string
  badge?: string
}

const PLANS: readonly Plan[] = [
  { id: 'monthly', name: 'Monthly', price: '$2.99', per: '/ month', spoken: 'Monthly, $2.99 per month' },
  { id: 'yearly', name: 'Yearly', price: '$14.99', per: '/ year', spoken: 'Yearly, $14.99 per year, save 58 %', badge: 'Save 58 %' },
  { id: 'lifetime', name: 'Lifetime', price: '$29.99', per: 'once', spoken: 'Lifetime, $29.99 once' },
]

const TOAST_MS = 2500

export function Paywall() {
  const unlockWeave = useIgusaStore((s) => s.unlockWeave)
  const setPaywallOpen = useIgusaStore((s) => s.setPaywallOpen)
  const [plan, setPlan] = useState<PlanId>('yearly')
  const [toast, setToast] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const cards = useRef<Record<PlanId, HTMLButtonElement | null>>({ monthly: null, yearly: null, lifetime: null })

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const selected = PLANS.find((p) => p.id === plan) ?? PLANS[1]
  const close = () => setPaywallOpen(false)

  function restore() {
    window.clearTimeout(timer.current)
    setToast('Nothing to restore in the prototype.')
    timer.current = window.setTimeout(() => setToast(null), TOAST_MS)
  }

  /** Arrow keys move the selection inside the radiogroup (roving tabindex). */
  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const i = PLANS.findIndex((p) => p.id === plan)
    const next = PLANS[(i + step + PLANS.length) % PLANS.length].id
    setPlan(next)
    cards.current[next]?.focus()
  }

  return (
    <div className="pw-sheet" data-testid="paywall" role="dialog" aria-modal="true" aria-labelledby="pw-title">
      <button type="button" className="pw-close" aria-label="Not now" onClick={close}>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3 3 L13 13 M13 3 L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      <h1 className="pw-title" id="pw-title">Unlock Weave</h1>
      <p className="pw-lede">Trigger rankings, overlays and the When view. Tracking, widgets and the grid stay free.</p>

      <div className="pw-plans" role="radiogroup" aria-label="Plan" onKeyDown={onKey}>
        {PLANS.map((p) => {
          const on = p.id === plan
          return (
            <button
              key={p.id}
              ref={(el) => {
                cards.current[p.id] = el
              }}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={p.spoken}
              tabIndex={on ? 0 : -1}
              className={`pw-plan${on ? ' is-on' : ''}`}
              data-testid="plan-card"
              data-plan={p.id}
              onClick={() => setPlan(p.id)}
            >
              <span className="pw-radio" aria-hidden="true" />
              <span className="pw-plan-label">
                <span className="pw-plan-name">{p.name}</span> — <span className="pw-plan-price">{p.price}</span> {p.per}
              </span>
              {p.badge && <span className="pw-badge">{p.badge}</span>}
            </button>
          )
        })}
      </div>

      <button type="button" className="pw-continue" aria-label={`Continue with ${selected.name}`} onClick={() => unlockWeave()}>
        Continue
      </button>
      <button type="button" className="pw-text" aria-label="Restore purchase" onClick={restore}>
        Restore purchase
      </button>
      <button type="button" className="pw-text" aria-label="Not now" onClick={close}>
        Not now
      </button>

      <div className="pw-toast-wrap" role="status" aria-live="polite">
        {toast && <p className="pw-toast" data-testid="paywall-toast">{toast}</p>}
      </div>
    </div>
  )
}

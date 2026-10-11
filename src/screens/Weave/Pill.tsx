// WeavePill_v1.0 — This section is intended to render the locked-state styling shared by the Weave segments: a blurred, aria-hidden pill holding the real value, a visually hidden dash for readers, and an engine sentence with its multiplier swapped for that pill.
import { splitLift } from './pairs'

/** Blurred real value; hidden from assistive tech, replaced there by a dash. */
export function Pill({ children }: { children: string }) {
  return (
    <>
      <span className="wv-pill" aria-hidden="true" data-blurred="1">
        {children}
      </span>
      <span className="wv-sr">—</span>
    </>
  )
}

interface LiftTextProps {
  text: string
  locked: boolean
  className?: string
  testId?: string
}

/** The engine sentence as-is when unlocked; with the multiplier blurred when locked ("Bloating followed Dairy — more often."). */
export function LiftText({ text, locked, className = 'wv-text', testId }: LiftTextProps) {
  const parts = locked ? splitLift(text) : null
  if (!parts) {
    return (
      <p className={className} data-testid={testId}>
        {text}
      </p>
    )
  }
  return (
    <p className={className} data-testid={testId} data-locked="1">
      {parts.before} <Pill>{parts.lift}</Pill> {parts.after}
    </p>
  )
}

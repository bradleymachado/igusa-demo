// PhoneFrame_v1.0 — This section is intended to draw the iPhone frame in CSS (rounded bezel, dark rim, Dynamic Island) around a 390×844 screen with the status bar, and render its children as the screen content.
import type { ReactNode } from 'react'
import { StatusBar } from './StatusBar'

export function PhoneFrame({ children }: { children?: ReactNode }) {
  return (
    <section className="phone-frame" data-testid="phone-frame" aria-label="iPhone">
      <div className="phone-screen" data-testid="phone-screen">
        <div className="phone-island" aria-hidden="true" />
        <StatusBar />
        <div className="phone-content">{children}</div>
      </div>
    </section>
  )
}

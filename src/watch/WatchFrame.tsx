// WatchFrame_v1.0 — This section is intended to draw the Apple Watch 45 mm frame in CSS (squircle bezel, digital-crown nub and side button on the right) around a 198×242 screen and render its children as the screen content.
import type { ReactNode } from 'react'

export function WatchFrame({ children }: { children?: ReactNode }) {
  return (
    <section className="watch-frame" data-testid="watch-frame" aria-label="Apple Watch">
      <div className="watch-screen" data-testid="watch-screen">{children}</div>
      <div className="watch-crown" aria-hidden="true" />
      <div className="watch-side-button" aria-hidden="true" />
    </section>
  )
}

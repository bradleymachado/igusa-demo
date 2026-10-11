// Stage_v1.0 — This section is intended to lay out the demo stage: iPhone and Apple Watch side by side (64 px gap) on viewports ≥ 1024 px, the pair scaled down with transform: scale() between 768 and 1023 px, and below 768 px the iPhone screen filling the viewport with the Watch behind a "Watch" toggle overlay; the presenter bar sits underneath.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { PhoneFrame } from '../phone'
import { WatchFrame } from '../watch'
import { PresenterBar } from './PresenterBar'
import './stage.css'

export const WIDE_MIN = 1024
export const NARROW_MAX = 767
const FIT_MARGIN = 48

type Mode = 'wide' | 'mid' | 'narrow'

function useViewport() {
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return vp
}

function DevicePlaceholder({ label }: { label: string }) {
  return <div className="device-placeholder">{label}</div>
}

export function Stage({ phone, watch, onReset }: { phone?: ReactNode; watch?: ReactNode; onReset?: () => void }) {
  const { w, h } = useViewport()
  const mode: Mode = w >= WIDE_MIN ? 'wide' : w > NARROW_MAX ? 'mid' : 'narrow'
  const pairRef = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState({ scale: 1, w: 0, h: 0 })
  const [watchOpen, setWatchOpen] = useState(false)

  // Mid mode: measure the unscaled pair (offset sizes ignore transforms) and scale it to fit the viewport.
  useLayoutEffect(() => {
    if (mode !== 'mid' || !pairRef.current) return
    const pw = pairRef.current.offsetWidth
    const ph = pairRef.current.offsetHeight
    const scale = Math.min(1, (w - FIT_MARGIN) / pw, (h - FIT_MARGIN) / ph)
    setFit({ scale, w: pw, h: ph })
  }, [mode, w, h])

  useEffect(() => {
    if (!watchOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setWatchOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [watchOpen])

  const scaled = mode === 'mid' && fit.w > 0
  const fitStyle: CSSProperties | undefined = scaled
    ? { width: fit.w * fit.scale, height: fit.h * fit.scale }
    : undefined
  const pairStyle: CSSProperties | undefined = scaled ? { transform: `scale(${fit.scale})` } : undefined
  const narrow = mode === 'narrow'

  return (
    <div className={`stage stage--${mode}`} data-testid="stage" data-mode={mode} data-scale={scaled ? fit.scale.toFixed(3) : '1'}>
      <main className="stage-main" aria-label="Device stage">
        <div className="stage-fit" style={fitStyle}>
          <div className="stage-pair" ref={pairRef} style={pairStyle}>
            <PhoneFrame>{phone ?? <DevicePlaceholder label="iPhone" />}</PhoneFrame>
            <div
              className="stage-watch-slot"
              data-testid="watch-slot"
              data-open={narrow ? String(watchOpen) : undefined}
              onClick={narrow ? (e) => { if (e.target === e.currentTarget) setWatchOpen(false) } : undefined}
            >
              <WatchFrame>{watch ?? <DevicePlaceholder label="Watch" />}</WatchFrame>
            </div>
          </div>
        </div>
        {narrow && (
          <button
            type="button"
            className="stage-button watch-toggle"
            data-testid="watch-toggle"
            aria-label={watchOpen ? 'Hide Watch' : 'Show Watch'}
            aria-pressed={watchOpen}
            onClick={() => setWatchOpen((o) => !o)}
          >
            Watch
          </button>
        )}
      </main>
      <PresenterBar onReset={onReset} />
    </div>
  )
}

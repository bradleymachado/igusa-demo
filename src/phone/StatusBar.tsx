// StatusBar_v1.0 — This section is intended to draw the iPhone status bar: the system-clock time on the left and signal, Wi-Fi and battery glyphs (inline SVG, currentColor) on the right of the Dynamic Island.
import { useEffect, useState } from 'react'

function formatTime(d: Date): string {
  const h = d.getHours() % 12 || 12
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function useClock(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 10_000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

function SignalGlyph() {
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true" focusable="false">
      <rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor" />
      <rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor" />
      <rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor" />
      <rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor" />
    </svg>
  )
}

function WifiGlyph() {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true" focusable="false">
      <path d="M8 2.2c2.4 0 4.6.9 6.3 2.5l1.2-1.3C13.5 1.5 10.9.4 8 .4S2.5 1.5.5 3.4l1.2 1.3C3.4 3.1 5.6 2.2 8 2.2Z" fill="currentColor" />
      <path d="M8 5.6c1.5 0 2.8.6 3.9 1.5l1.2-1.3C11.7 4.6 9.9 3.8 8 3.8s-3.7.8-5.1 2l1.2 1.3c1.1-.9 2.4-1.5 3.9-1.5Z" fill="currentColor" />
      <path d="M8 9c.6 0 1.1.2 1.5.6L8 11.4 6.5 9.6C6.9 9.2 7.4 9 8 9Z" fill="currentColor" />
    </svg>
  )
}

function BatteryGlyph() {
  return (
    <svg width="27" height="13" viewBox="0 0 27 13" aria-hidden="true" focusable="false">
      <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" strokeOpacity="0.4" />
      <rect x="2" y="2" width="17" height="9" rx="2" fill="currentColor" />
      <path d="M25 4.5v4c.8-.3 1.5-1.1 1.5-2s-.7-1.7-1.5-2Z" fill="currentColor" fillOpacity="0.4" />
    </svg>
  )
}

export function StatusBar() {
  const now = useClock()
  return (
    <div className="status-bar" data-testid="status-bar">
      <time className="status-time" dateTime={now.toISOString()}>{formatTime(now)}</time>
      <span aria-hidden="true" />
      <span className="status-glyphs" role="img" aria-label="Signal, Wi-Fi and battery">
        <SignalGlyph />
        <WifiGlyph />
        <BatteryGlyph />
      </span>
    </div>
  )
}

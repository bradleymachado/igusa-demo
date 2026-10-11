// HomeScreen_v1.0 — This section is intended to draw the iPhone home screen on a flat token wallpaper: a 4-column icon grid with the medium Igusa widget in rows 1–2, the small widget beside four apps in rows 3–4, the large widget below (the screen scrolls), neutral placeholder apps without logos, a dock of four neutral icons, and the "Igusa" app icon that opens the app view.
import { useIgusaStore } from '../state'
import { LargeWidget, MediumWidget, SmallWidget } from './widgets'
import './home.css'

type Tint = 1 | 2 | 3 | 4

function PlaceholderApp({ name, tint, label = true }: { name: string; tint: Tint; label?: boolean }) {
  return (
    <div className="home-app">
      <div className={`home-icon home-icon--tint-${tint}`} role="img" aria-label={`${name} (placeholder app)`} />
      {label && <span className="home-label" aria-hidden="true">{name}</span>}
    </div>
  )
}

/** Finger with a string tied in a bow — single-line glyph after the logo sketch, brand colour on white. */
function IgusaGlyph() {
  return (
    <svg className="home-igusa-glyph" viewBox="0 0 60 60" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 53 V20 a7 7 0 0 1 14 0 V53" />
        <path d="M30 33 C24 28 14 26 13 30.5 C12.5 34.5 22 35 30 33 Z" />
        <path d="M30 33 C36 28 46 26 47 30.5 C47.5 34.5 38 35 30 33 Z" />
        <path d="M30 33 L25.5 39.5 M30 33 L34.5 39.5" />
      </g>
    </svg>
  )
}

function IgusaAppIcon() {
  const setAppOpen = useIgusaStore((s) => s.setAppOpen)
  return (
    <div className="home-app">
      <button type="button" className="home-icon home-icon--igusa" aria-label="Open Igusa" data-testid="igusa-app-icon" onClick={() => setAppOpen(true)}>
        <IgusaGlyph />
      </button>
      <span className="home-label" aria-hidden="true">Igusa</span>
    </div>
  )
}

export function HomeScreen() {
  return (
    <div className="home" data-testid="home-screen">
      <div className="home-grid">
        <div className="home-span-medium">
          <MediumWidget />
        </div>
        <div className="home-span-small">
          <SmallWidget />
        </div>
        <IgusaAppIcon />
        <PlaceholderApp name="Mail" tint={1} />
        <PlaceholderApp name="Photos" tint={2} />
        <PlaceholderApp name="Notes" tint={3} />
      </div>
      <div className="home-large">
        <LargeWidget />
      </div>
      <div className="home-grid">
        <PlaceholderApp name="Maps" tint={3} />
        <PlaceholderApp name="Clock" tint={1} />
        <PlaceholderApp name="Camera" tint={4} />
        <PlaceholderApp name="Weather" tint={2} />
        <PlaceholderApp name="Music" tint={4} />
      </div>
      <nav className="home-dock" aria-label="Dock">
        <PlaceholderApp name="Phone" tint={3} label={false} />
        <PlaceholderApp name="Messages" tint={1} label={false} />
        <PlaceholderApp name="Browser" tint={2} label={false} />
        <PlaceholderApp name="Calendar" tint={4} label={false} />
      </nav>
    </div>
  )
}

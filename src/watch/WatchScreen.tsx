// WatchScreen_v1.0 — This section is intended to be the Apple Watch screen content passed into the Stage's watch slot: it renders the WatchFace (time, complication, event tiles, severity picker) bound to the shared store.
import { WatchFace } from './WatchFace'

export function WatchScreen() {
  return <WatchFace />
}

// App_v1.0 — This section is intended to render the device stage (iPhone + Watch, presenter bar, footer) with the routed phone screen and the watch face, wired to the shared store's reset.
import { Stage } from './stage'
import { PhoneScreen } from './phone/PhoneScreen'
import { WatchScreen } from './watch/WatchScreen'
import { useIgusaStore } from './state'

export default function App() {
  const reset = useIgusaStore((s) => s.reset)
  return <Stage phone={<PhoneScreen />} watch={<WatchScreen />} onReset={reset} />
}

// PhoneScreen_v1.0 — This section is intended to route the iPhone screen between the setup tutorial (S9), the home screen with widgets (S7) and the in-app view (S10–S13), reading the shared store; S7 and S9 replace the stubs it imports, not this file.
import { useIgusaStore } from '../state'
import { SetupFlow } from '../setup'
import { HomeScreen } from './HomeScreen'
import { AppView } from '../screens'

export function PhoneScreen() {
  const setupDone = useIgusaStore((s) => s.setupDone)
  const appOpen = useIgusaStore((s) => s.appOpen)
  if (!setupDone) return <SetupFlow />
  if (appOpen) return <AppView />
  return <HomeScreen />
}

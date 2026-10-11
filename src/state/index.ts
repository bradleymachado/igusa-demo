// StateIndex_v1.0 — This section is intended to re-export the shared store, its types and constants, and the pure selectors as the public surface of src/state.
export {
  useIgusaStore,
  igusaStore,
  STORAGE_KEY,
  SEVERITY_MS,
  LOGGED_MS,
  MAX_EVENTS,
  INITIAL_STATE,
  makeEntryId,
  nextColor,
} from './store'
export type { IgusaState, IgusaActions, IgusaStore, Theme, PresenterStep, AppTab, Expiring, NewEvent } from './store'
export {
  forEvent,
  todayCount,
  countsByDay,
  daysSinceLast,
  totalLast12Months,
  entriesOn,
  ranked,
} from './selectors'
export type { DayStat } from './selectors'

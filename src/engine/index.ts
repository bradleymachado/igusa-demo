// EngineIndex_v1.0 — This section is intended to re-export the engine's public API (types, day key, shade, Weave lift and ranking, strings) for the data, store and screen modules.

export type { EventKind, EventDef, Severity, Entry } from './types'
export { dayKey, dayStart } from './dayKey'
export { shadeLevel, severityLevel, tint, TINT_RAMP } from './shade'
export type { ShadeLevel } from './shade'
export {
  WINDOW_MS,
  MIN_EXPOSURES,
  MIN_SYMPTOMS,
  BASELINE_STARTS,
  BASELINE_SEED,
  seededRng,
  defaultBaselineStarts,
  pairLift,
  rankPairs,
} from './weave'
export type { PairResult } from './weave'
export { pairText, teaserText } from './strings'

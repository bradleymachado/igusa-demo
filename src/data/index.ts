// DataIndex_v1.0 — This section is intended to re-export the condition templates, the seeded generator and the data types as the public surface of src/data.
export type { Entry, EventDef, EventKind, Pattern, Severity, Template } from './types.ts'
export { rng } from './rng.ts'
export { PALETTE, TEMPLATES, getTemplate } from './templates.ts'
export { generate, generateWithTuning, TUNING, type GenerateOptions, type Tuning } from './generator.ts'

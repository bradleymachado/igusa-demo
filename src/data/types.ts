// DataTypes_v1.0 — This section is intended to declare the template and pattern shapes used by the templates and generator, re-exporting the engine's event and entry types so sample data flows into the Weave engine without casts.
export type { Entry, EventDef, EventKind, Severity } from '../engine'

export interface Pattern {
  exposureId: string
  symptomId: string
  targetLift: number
}

export interface Template {
  id: string
  name: string
  /** One plain-language line; association wording only, no medical claims. */
  blurb: string
  events: import('../engine').EventDef[]
  patterns: Pattern[]
}

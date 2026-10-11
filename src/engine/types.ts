// EngineTypes_v1.0 — This section is intended to define the shared event and entry types used by the engine, data generator, store and screens.

/** An event is either something felt (symptom) or something done/eaten/encountered (exposure). */
export type EventKind = 'symptom' | 'exposure'

/** A user-defined event: one colour tile on the widgets, one row in the grid. */
export interface EventDef {
  id: string
  name: string
  /** Event hex colour from the palette, e.g. '#B5462F'. */
  color: string
  kind: EventKind
  /** When true, a tap offers a 1–5 severity row for ≈ 15 s. */
  askSeverity: boolean
}

/** Severity rating 1 (mild) to 5 (severe). */
export type Severity = 1 | 2 | 3 | 4 | 5

/** One logged tap. `ts` is epoch milliseconds of the original tap; severity attaches to it later. */
export interface Entry {
  id: string
  eventId: string
  ts: number
  severity?: Severity
}

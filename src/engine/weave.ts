// Weave_v1.0 — This section is intended to compute lagged co-occurrence lift for exposure → symptom pairs, suppress pairs below the data thresholds, and rank the top pairs with their display strings.

import type { Entry, EventDef } from './types'
import { pairText, teaserText } from './strings'

/** Exposure → symptom window: a symptom counts when it lands within (0, 6 h] after the exposure. */
export const WINDOW_MS = 6 * 3600 * 1000
/** Minimum exposures of the pair's exposure event before the pair is shown. */
export const MIN_EXPOSURES = 10
/** Minimum entries of the pair's symptom event before the pair is shown. */
export const MIN_SYMPTOMS = 5
/** Number of baseline window starts drawn when none are injected. */
export const BASELINE_STARTS = 100
/** Seed for the baseline start RNG; fixed so rankings are identical across runs. */
export const BASELINE_SEED = 20261011

export interface PairResult {
  exposureId: string
  symptomId: string
  /** Count of exposure entries. */
  exposures: number
  /** Count of symptom entries. */
  symptoms: number
  /** Exposures followed by ≥ 1 symptom within the window. */
  followed: number
  /** followed / exposures (0 when there are no exposures). */
  pFollow: number
  /** Fraction of baseline windows containing ≥ 1 symptom. */
  pBase: number
  /** pFollow / pBase (0 when pBase is 0 or there are no exposures). */
  lift: number
  /** True when both thresholds are met. */
  shown: boolean
  /** Present when not shown: what is still needed. */
  teaser?: string
  /** Present when shown: the association sentence. */
  text?: string
}

/** mulberry32 — small seeded RNG returning floats in [0, 1). */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Default baseline starts: `count` seeded draws spread over [minTs, maxTs − windowMs] of all entries. */
export function defaultBaselineStarts(entries: Entry[], windowMs = WINDOW_MS, count = BASELINE_STARTS, seed = BASELINE_SEED): number[] {
  if (entries.length === 0) return []
  let minTs = Infinity
  let maxTs = -Infinity
  for (const e of entries) {
    if (e.ts < minTs) minTs = e.ts
    if (e.ts > maxTs) maxTs = e.ts
  }
  const hi = Math.max(minTs, maxTs - windowMs)
  const span = hi - minTs
  const rng = seededRng(seed)
  const starts: number[] = []
  for (let i = 0; i < count; i++) starts.push(minTs + rng() * span)
  return starts
}

/** Index of the first value in a sorted array strictly greater than `x`. */
function upperBound(sorted: number[], x: number): number {
  let lo = 0
  let hi = sorted.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (sorted[mid] <= x) lo = mid + 1
    else hi = mid
  }
  return lo
}

/** True when a value lies in (start, start + windowMs]. */
function windowHasHit(sortedTs: number[], start: number, windowMs: number): boolean {
  const i = upperBound(sortedTs, start)
  return i < sortedTs.length && sortedTs[i] <= start + windowMs
}

function sortedTsFor(entries: Entry[], eventId: string): number[] {
  const out: number[] = []
  for (const e of entries) if (e.eventId === eventId) out.push(e.ts)
  out.sort((a, b) => a - b)
  return out
}

/**
 * Lift of one exposure → symptom pair.
 * pFollow = exposures with ≥ 1 symptom in (0, windowMs] after them / exposures.
 * pBase = baseline starts whose window holds ≥ 1 symptom / starts.
 */
export function pairLift(
  entries: Entry[],
  exposureId: string,
  symptomId: string,
  windowMs: number = WINDOW_MS,
  baselineStarts?: number[],
): PairResult {
  const expTs = sortedTsFor(entries, exposureId)
  const symTs = sortedTsFor(entries, symptomId)
  const starts = baselineStarts ?? defaultBaselineStarts(entries, windowMs)

  let followed = 0
  for (const t of expTs) if (windowHasHit(symTs, t, windowMs)) followed++
  const pFollow = expTs.length === 0 ? 0 : followed / expTs.length

  let baseHits = 0
  for (const s of starts) if (windowHasHit(symTs, s, windowMs)) baseHits++
  const pBase = starts.length === 0 ? 0 : baseHits / starts.length

  const lift = expTs.length === 0 || pBase === 0 ? 0 : pFollow / pBase
  const shown = expTs.length >= MIN_EXPOSURES && symTs.length >= MIN_SYMPTOMS

  const result: PairResult = {
    exposureId,
    symptomId,
    exposures: expTs.length,
    symptoms: symTs.length,
    followed,
    pFollow,
    pBase,
    lift,
    shown,
  }
  if (!shown) {
    result.teaser = teaserText(Math.max(0, MIN_EXPOSURES - expTs.length), Math.max(0, MIN_SYMPTOMS - symTs.length))
  }
  return result
}

/** Top 5 exposure × symptom pairs, lift desc, then exposures desc; shown pairs carry `text`, others `teaser`. */
export function rankPairs(entries: Entry[], events: EventDef[], windowMs: number = WINDOW_MS): PairResult[] {
  const exposures = events.filter((e) => e.kind === 'exposure')
  const symptoms = events.filter((e) => e.kind === 'symptom')
  const nameOf = (id: string) => events.find((e) => e.id === id)?.name ?? id
  const starts = defaultBaselineStarts(entries, windowMs)

  const results: PairResult[] = []
  for (const x of exposures) {
    for (const s of symptoms) {
      const r = pairLift(entries, x.id, s.id, windowMs, starts)
      if (r.shown) r.text = pairText(nameOf(s.id), nameOf(x.id), r.lift)
      results.push(r)
    }
  }

  results.sort(
    (a, b) =>
      b.lift - a.lift ||
      b.exposures - a.exposures ||
      a.exposureId.localeCompare(b.exposureId) ||
      a.symptomId.localeCompare(b.symptomId),
  )
  return results.slice(0, 5)
}

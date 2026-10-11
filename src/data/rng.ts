// Rng_v1.0 — This section is intended to provide a small deterministic seeded random-number generator (mulberry32) so sample data and tests are reproducible for a fixed seed.

/** Returns a function yielding floats in [0, 1); identical sequence for an identical seed. */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

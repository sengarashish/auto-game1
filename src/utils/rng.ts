/**
 * Seedable pseudo-random number generator (mulberry32).
 *
 * Generators use this instead of Math.random so quizzes are reproducible — the
 * same seed always produces the same questions, which makes them unit-testable
 * and lets features like a "Daily Challenge" share one seed.
 */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** Random element of a non-empty array. */
  pick<T>(arr: readonly T[]): T;
  /** Returns a shuffled copy (Fisher–Yates), does not mutate the input. */
  shuffle<T>(arr: readonly T[]): T[];
  /** True with the given probability (0..1). */
  chance(p: number): boolean;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number): number => {
    if (max < min) [min, max] = [max, min];
    return min + Math.floor(next() * (max - min + 1));
  };

  const pick = <T,>(arr: readonly T[]): T => {
    if (arr.length === 0) throw new Error('rng.pick called on empty array');
    return arr[int(0, arr.length - 1)];
  };

  const shuffle = <T,>(arr: readonly T[]): T[] => {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(0, i);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  const chance = (p: number): boolean => next() < p;

  return { next, int, pick, shuffle, chance };
}

/** Convenience: derive a seed from the current time. */
export function timeSeed(): number {
  return (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
}

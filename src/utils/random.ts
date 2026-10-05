/**
 * Small, fast, seedable PRNG (mulberry32).
 *
 * Math.random() is never used by gameplay code: every random decision goes through
 * a SeededRandom so matches are reproducible from their seeds.
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    // Force into uint32; avoid the degenerate all-zero state.
    this.state = (seed >>> 0) || 0x9e3779b9;
  }

  /** Returns a float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Float in [min, max). */
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Picks one element of a non-empty array. */
  pick<T>(items: readonly T[]): T {
    const item = items[Math.floor(this.next() * items.length)];
    if (item === undefined) {
      throw new Error('SeededRandom.pick called with an empty array');
    }
    return item;
  }
}

/** Generates a fresh seed for a new match. This is the only non-deterministic entry point. */
export function createRandomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

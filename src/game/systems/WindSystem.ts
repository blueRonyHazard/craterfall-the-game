import { PHYSICS, WIND } from '../config/gameBalance';
import type { Wind } from '../../types/game';
import { SeededRandom } from '../../utils/random';
import { roundTo } from '../../utils/math';

export interface WindOptions {
  maxStrength: number;
  precision: number;
}

/**
 * Produces the sequence of wind values for a match from a seed. Because the
 * generator is seeded, the n-th wind of a match is always the same.
 */
export class WindSystem {
  private readonly rng: SeededRandom;
  private readonly options: WindOptions;

  constructor(seed: number, options: WindOptions = WIND) {
    this.rng = new SeededRandom(seed);
    this.options = options;
  }

  next(): Wind {
    const direction: -1 | 1 = this.rng.next() < 0.5 ? -1 : 1;
    const strength = roundTo(this.rng.range(0, this.options.maxStrength), this.options.precision);
    return { direction, strength };
  }
}

/** Horizontal acceleration (units/s²) the wind applies to projectiles. */
export function windAcceleration(wind: Wind, influence: number = PHYSICS.windInfluence): number {
  return wind.direction * wind.strength * influence;
}

import { describe, expect, it } from 'vitest';
import { WindSystem, windAcceleration } from '../src/game/systems/WindSystem';
import { PHYSICS, WIND } from '../src/game/config/gameBalance';

describe('WindSystem', () => {
  it('produces the same sequence for the same seed', () => {
    const a = new WindSystem(1234);
    const b = new WindSystem(1234);
    for (let i = 0; i < 20; i++) {
      expect(a.next()).toEqual(b.next());
    }
  });

  it('produces different sequences for different seeds', () => {
    const a = new WindSystem(1);
    const b = new WindSystem(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('stays within configured bounds and precision', () => {
    const wind = new WindSystem(99);
    for (let i = 0; i < 500; i++) {
      const w = wind.next();
      expect([-1, 1]).toContain(w.direction);
      expect(w.strength).toBeGreaterThanOrEqual(0);
      expect(w.strength).toBeLessThanOrEqual(WIND.maxStrength);
      expect(Math.round(w.strength * 10) / 10).toBe(w.strength);
    }
  });

  it('uses both directions over many rolls', () => {
    const wind = new WindSystem(7);
    const directions = new Set(Array.from({ length: 100 }, () => wind.next().direction));
    expect(directions.size).toBe(2);
  });
});

describe('windAcceleration', () => {
  it('is direction × strength × influence', () => {
    expect(windAcceleration({ direction: 1, strength: 4 }, 10)).toBe(40);
    expect(windAcceleration({ direction: -1, strength: 4 }, 10)).toBe(-40);
  });

  it('uses the configured influence by default', () => {
    expect(windAcceleration({ direction: 1, strength: 2 })).toBe(2 * PHYSICS.windInfluence);
  });

  it('is zero in calm conditions', () => {
    expect(windAcceleration({ direction: -1, strength: 0 })).toBeCloseTo(0);
  });
});

import { describe, expect, it } from 'vitest';
import { applyExplosionDamage, fallDamage, falloffDamage } from '../src/game/systems/DamageSystem';
import { createTank } from '../src/game/entities/Tank';
import { TANK } from '../src/game/config/gameBalance';

describe('falloffDamage', () => {
  it('deals full damage at the centre', () => {
    expect(falloffDamage(0, 50, 40)).toBe(40);
  });

  it('falls off linearly', () => {
    expect(falloffDamage(25, 50, 40)).toBe(20);
    expect(falloffDamage(10, 50, 40)).toBe(32);
  });

  it('deals nothing at or beyond the radius', () => {
    expect(falloffDamage(50, 50, 40)).toBe(0);
    expect(falloffDamage(50.01, 50, 40)).toBe(0);
    expect(falloffDamage(500, 50, 40)).toBe(0);
  });

  it('respects a steeper exponent', () => {
    expect(falloffDamage(25, 50, 40, 2)).toBe(10);
  });

  it('handles zero-radius and zero-damage warheads', () => {
    expect(falloffDamage(0, 0, 40)).toBe(0);
    expect(falloffDamage(0, 50, 0)).toBe(0);
  });
});

describe('applyExplosionDamage', () => {
  it('damages only tanks in range, measured to the hull', () => {
    const near = createTank(0, 100, 200, 'x');
    const far = createTank(1, 400, 200, 'x');
    const centerY = 200 - TANK.centerHeight;
    const results = applyExplosionDamage([near, far], { x: 100, y: centerY, radius: 40, damage: 30 });
    expect(results).toHaveLength(1);
    expect(results[0]?.playerId).toBe(0);
    expect(near.health).toBe(TANK.maxHealth - 30);
    expect(far.health).toBe(TANK.maxHealth);
  });

  it('never drops health below zero and reports destruction', () => {
    const tank = createTank(0, 100, 200, 'x');
    tank.health = 5;
    const [result] = applyExplosionDamage([tank], { x: 100, y: 190, radius: 40, damage: 60 });
    expect(tank.health).toBe(0);
    expect(result?.destroyed).toBe(true);
  });

  it('ignores tanks that are already destroyed', () => {
    const tank = createTank(0, 100, 200, 'x');
    tank.health = 0;
    expect(applyExplosionDamage([tank], { x: 100, y: 190, radius: 40, damage: 60 })).toHaveLength(0);
  });
});

describe('fallDamage', () => {
  it('is zero for short drops', () => {
    expect(fallDamage(TANK.fallDamageThreshold)).toBe(0);
  });

  it('grows with distance beyond the threshold', () => {
    expect(fallDamage(TANK.fallDamageThreshold + 40)).toBe(Math.round(40 * TANK.fallDamagePerUnit));
  });
});

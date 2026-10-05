import { DAMAGE, TANK } from '../config/gameBalance';
import type { Explosion } from '../entities/Explosion';
import { isTankAlive, tankCenter } from '../entities/Tank';
import type { PlayerId, TankState } from '../../types/game';
import { distance } from '../../utils/math';

/**
 * Damage at a distance from an explosion centre:
 *
 *   d <= r :  maxDamage * (1 - d / r) ^ exponent
 *   d >  r :  0
 *
 * With exponent 1 (the default) this is the linear falloff. Nothing outside the
 * radius is ever damaged.
 */
export function falloffDamage(
  dist: number,
  radius: number,
  maxDamage: number,
  exponent: number = DAMAGE.falloffExponent,
): number {
  if (radius <= 0 || maxDamage <= 0 || dist > radius) {
    return 0;
  }
  const raw = maxDamage * (1 - dist / radius) ** exponent;
  return DAMAGE.roundDamage ? Math.round(raw) : raw;
}

export interface DamageResult {
  playerId: PlayerId;
  amount: number;
  health: number;
  destroyed: boolean;
}

/**
 * Applies an explosion to every living tank. Distance is measured to the
 * nearest point of the tank's hit circle, so a blast touching the hull counts.
 */
export function applyExplosionDamage(tanks: readonly TankState[], explosion: Explosion): DamageResult[] {
  const results: DamageResult[] = [];
  for (const tank of tanks) {
    if (!isTankAlive(tank)) continue;
    const center = tankCenter(tank);
    const toCenter = distance(explosion.x, explosion.y, center.x, center.y);
    const dist = Math.max(0, toCenter - TANK.hitRadius);
    const amount = falloffDamage(dist, explosion.radius, explosion.damage);
    if (amount > 0) {
      results.push(applyDamage(tank, amount));
    }
  }
  return results;
}

/** Damage for falling `fallDistance` units after the ground beneath a tank is destroyed. */
export function fallDamage(fallDistance: number): number {
  const excess = fallDistance - TANK.fallDamageThreshold;
  return excess > 0 ? Math.round(excess * TANK.fallDamagePerUnit) : 0;
}

export function applyDamage(tank: TankState, amount: number): DamageResult {
  tank.health = Math.max(0, tank.health - amount);
  return { playerId: tank.playerId, amount, health: tank.health, destroyed: tank.health <= 0 };
}

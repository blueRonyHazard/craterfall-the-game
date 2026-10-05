import type { Warhead } from '../../types/weapons';

/** A resolved detonation at a point in the world. */
export interface Explosion {
  x: number;
  y: number;
  radius: number;
  damage: number;
}

export function createExplosion(x: number, y: number, warhead: Warhead): Explosion {
  return { x, y, radius: warhead.explosionRadius, damage: warhead.damage };
}

import type { PlayerId } from '../../types/game';
import type { ExplosionVisual, HazardSpec, TerrainEffect, Warhead } from '../../types/weapons';

const CARVE: TerrainEffect = Object.freeze({ kind: 'carve' });

/** A resolved detonation at a point in the world. */
export interface Explosion {
  x: number;
  y: number;
  radius: number;
  damage: number;
  terrain: TerrainEffect;
  visual: ExplosionVisual;
  hazard: HazardSpec | null;
  ownerId: PlayerId;
}

export function createExplosion(x: number, y: number, warhead: Warhead, ownerId: PlayerId): Explosion {
  return {
    x,
    y,
    radius: warhead.explosionRadius,
    damage: warhead.damage,
    terrain: warhead.terrain ?? CARVE,
    visual: warhead.visual ?? 'fire',
    hazard: warhead.hazard ?? null,
    ownerId,
  };
}

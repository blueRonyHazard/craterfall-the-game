import { PHYSICS, TANK } from '../config/gameBalance';
import type { Terrain } from '../entities/Terrain';
import type { Projectile } from '../entities/Projectile';
import { isTankAlive } from '../entities/Tank';
import type { PlayerId, TankState } from '../../types/game';
import { isInsideTerrain } from './TerrainCollision';

export type Collision =
  | { readonly kind: 'none' }
  | { readonly kind: 'outOfBounds' }
  | { readonly kind: 'terrain' }
  | { readonly kind: 'tank'; readonly playerId: PlayerId };

// Shared immutable results so the per-step check never allocates.
const NONE: Collision = { kind: 'none' };
const OUT_OF_BOUNDS: Collision = { kind: 'outOfBounds' };
const TERRAIN_HIT: Collision = { kind: 'terrain' };
const TANK_HITS: Record<PlayerId, Collision> = {
  0: { kind: 'tank', playerId: 0 },
  1: { kind: 'tank', playerId: 1 },
};

/**
 * Classifies what a projectile is touching after a physics step. Priority:
 * out of bounds → tank → terrain. The sky above the playable area is open:
 * projectiles may leave the top and fall back in.
 */
export function detectCollision(
  projectile: Projectile,
  terrain: Terrain,
  tanks: readonly TankState[],
): Collision {
  const { x, y } = projectile;
  if (x < -PHYSICS.sideMargin || x > terrain.width + PHYSICS.sideMargin || y > terrain.height) {
    return OUT_OF_BOUNDS;
  }

  for (const tank of tanks) {
    if (!isTankAlive(tank)) continue;
    if (tank.playerId === projectile.ownerId && projectile.age < TANK.ownerArmingTime) continue;
    // Inline tank centre (see tankCenter) to keep this hot path allocation-free.
    const dx = x - tank.x;
    const dy = y - (tank.y - TANK.centerHeight);
    if (dx * dx + dy * dy <= TANK.hitRadius * TANK.hitRadius) {
      return TANK_HITS[tank.playerId];
    }
  }

  if (isInsideTerrain(terrain, x, y)) {
    return TERRAIN_HIT;
  }
  return NONE;
}

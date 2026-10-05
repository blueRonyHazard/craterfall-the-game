import { Terrain } from '../src/game/entities/Terrain';
import { Projectile, type ProjectileSpawn } from '../src/game/entities/Projectile';
import type { BehaviorConfig } from '../src/types/weapons';

/** A perfectly flat terrain whose surface sits at `surfaceY`. */
export function flatTerrain(width = 400, height = 300, surfaceY = 200): Terrain {
  return new Terrain(width, height, new Float32Array(width).fill(surfaceY));
}

export function makeProjectile(overrides: Partial<ProjectileSpawn> = {}, behavior?: BehaviorConfig): Projectile {
  return new Projectile(1, {
    ownerId: 0,
    weaponId: 'test',
    x: 100,
    y: 100,
    vx: 0,
    vy: 0,
    warhead: { explosionRadius: 30, damage: 40 },
    behavior: behavior ?? { kind: 'impact' },
    radius: 4,
    color: 0xffffff,
    ...overrides,
  });
}

import { TERRAIN } from '../config/gameBalance';
import type { Explosion } from '../entities/Explosion';
import type { DirtyRange, Terrain } from '../entities/Terrain';
import { isTankAlive } from '../entities/Tank';
import type { SimEvent, TankState } from '../../types/game';
import { applyDamage, applyExplosionDamage, fallDamage, type DamageResult } from './DamageSystem';
import type { HazardSystem } from './HazardSystem';

export type EventSink = (event: SimEvent) => void;

/** Everything an explosion can affect. */
export interface ExplosionWorld {
  terrain: Terrain;
  tanks: readonly TankState[];
  hazards: HazardSystem;
  emit: EventSink;
}

/**
 * Resolves an explosion against the world, in this order:
 *   1. terrain effect (carve a crater / drop a pyramid of earth / nothing)
 *   2. blast damage with distance falloff
 *   3. lingering hazard (magma pool)
 *   4. tanks settle onto the new surface (falls hurt, rises do not)
 */
export function resolveExplosion(explosion: Explosion, world: ExplosionWorld): void {
  const { terrain, tanks, emit } = world;
  emit({
    type: 'explosion',
    x: explosion.x,
    y: explosion.y,
    radius: explosion.radius,
    damage: explosion.damage,
    visual: explosion.visual,
  });

  applyTerrainEffect(explosion, terrain, emit);

  if (explosion.damage > 0) {
    for (const result of applyExplosionDamage(tanks, explosion)) {
      emitDamage(result, emit);
    }
  }

  if (explosion.hazard) {
    world.hazards.create(explosion.hazard, explosion.x, explosion.ownerId);
  }

  settleTanks(terrain, tanks, emit);
}

function applyTerrainEffect(explosion: Explosion, terrain: Terrain, emit: EventSink): void {
  const effect = explosion.terrain;
  let dirty: DirtyRange | null = null;
  switch (effect.kind) {
    case 'none':
      return;
    case 'carve':
      // Earth-moving (dust) blasts leave freshly dug soil instead of a charred rim.
      dirty = terrain.carveCircle(explosion.x, explosion.y, explosion.radius, explosion.visual === 'dust' ? 'freshEarth' : 'scorched');
      if (dirty) emit({ type: 'terrainChanged', minX: dirty.minX, maxX: dirty.maxX, cause: 'carve' });
      return;
    case 'pyramid': {
      const apexY = Math.max(TERRAIN.buildCeiling, explosion.y - effect.height);
      const slope = effect.height / effect.halfWidth;
      dirty = terrain.raisePyramid(
        explosion.x,
        apexY,
        slope,
        effect.halfWidth * TERRAIN.pyramidMaxSpread,
        TERRAIN.buildCeiling,
      );
      if (dirty) {
        emit({ type: 'terrainBuilt', x: explosion.x, apexY, height: effect.height, halfWidth: effect.halfWidth });
        emit({ type: 'terrainChanged', minX: dirty.minX, maxX: dirty.maxX, cause: 'build' });
      }
      return;
    }
  }
}

/**
 * Puts every living tank back on the terrain surface. Tanks whose ground was
 * removed drop (with fall damage); tanks under new earth are lifted on top of it.
 */
export function settleTanks(terrain: Terrain, tanks: readonly TankState[], emit: EventSink): void {
  for (const tank of tanks) {
    if (!isTankAlive(tank)) continue;
    const ground = terrain.heightAt(tank.x);
    const drop = ground - tank.y;
    if (drop === 0) continue;
    tank.y = ground;
    emit({ type: 'tankMoved', playerId: tank.playerId, x: tank.x, y: tank.y });
    const damage = drop > 0 ? fallDamage(drop) : 0;
    if (damage > 0) {
      emitDamage(applyDamage(tank, damage), emit);
    }
  }
}

export function emitDamage(result: DamageResult, emit: EventSink): void {
  emit({ type: 'tankDamaged', playerId: result.playerId, amount: result.amount, health: result.health });
  if (result.destroyed) {
    emit({ type: 'tankDestroyed', playerId: result.playerId });
  }
}

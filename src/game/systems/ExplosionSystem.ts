import type { Explosion } from '../entities/Explosion';
import type { Terrain } from '../entities/Terrain';
import { isTankAlive } from '../entities/Tank';
import type { SimEvent, TankState } from '../../types/game';
import { applyDamage, applyExplosionDamage, fallDamage, type DamageResult } from './DamageSystem';

export type EventSink = (event: SimEvent) => void;

/**
 * Resolves an explosion against the world: carve the crater, damage tanks in
 * range, then drop any tank whose ground was removed (with fall damage).
 */
export function resolveExplosion(
  explosion: Explosion,
  terrain: Terrain,
  tanks: readonly TankState[],
  emit: EventSink,
): void {
  emit({ type: 'explosion', x: explosion.x, y: explosion.y, radius: explosion.radius, damage: explosion.damage });

  const dirty = terrain.carveCircle(explosion.x, explosion.y, explosion.radius);
  if (dirty) {
    emit({ type: 'terrainChanged', minX: dirty.minX, maxX: dirty.maxX });
  }

  for (const result of applyExplosionDamage(tanks, explosion)) {
    emitDamage(result, emit);
  }
  settleTanks(terrain, tanks, emit);
}

/** Moves every living tank down onto the (possibly lowered) terrain surface. */
export function settleTanks(terrain: Terrain, tanks: readonly TankState[], emit: EventSink): void {
  for (const tank of tanks) {
    if (!isTankAlive(tank)) continue;
    const ground = terrain.heightAt(tank.x);
    const fall = ground - tank.y;
    if (fall <= 0) continue;
    tank.y = ground;
    emit({ type: 'tankMoved', playerId: tank.playerId, x: tank.x, y: tank.y });
    const damage = fallDamage(fall);
    if (damage > 0) {
      emitDamage(applyDamage(tank, damage), emit);
    }
  }
}

function emitDamage(result: DamageResult, emit: EventSink): void {
  emit({ type: 'tankDamaged', playerId: result.playerId, amount: result.amount, health: result.health });
  if (result.destroyed) {
    emit({ type: 'tankDestroyed', playerId: result.playerId });
  }
}

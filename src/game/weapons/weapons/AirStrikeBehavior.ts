import type { Projectile, ProjectileSpawn } from '../../entities/Projectile';
import type { AirStrikeBehaviorConfig } from '../../../types/weapons';
import type { BehaviorOutcome, ProjectileBehavior } from '../Weapon';
import { IMPACT_CONFIG } from './ImpactBehavior';

const BOMB_RADIUS_FACTOR = 1.3;

/**
 * The fired projectile is only a marker. Wherever it lands, a line of bombs is
 * dropped from above the playable area, centred on the marker and spaced
 * `spacing` apart. Each bomb is a plain impact projectile and is still pushed by
 * the wind, so a strong breeze smears the strike sideways.
 */
export const AirStrikeBehavior: ProjectileBehavior<AirStrikeBehaviorConfig> = {
  kind: 'airstrike',
  onTerrainContact: (projectile, config) => callStrike(projectile, config),
  onTankContact: (projectile, config) => callStrike(projectile, config),
};

function callStrike(projectile: Projectile, config: AirStrikeBehaviorConfig): BehaviorOutcome {
  return { action: 'remove', cue: 'airstrikeCalled', spawns: createBombs(projectile, config) };
}

export function createBombs(marker: Projectile, config: AirStrikeBehaviorConfig): ProjectileSpawn[] {
  const spawns: ProjectileSpawn[] = [];
  const middle = (config.bombCount - 1) / 2;
  for (let i = 0; i < config.bombCount; i++) {
    spawns.push({
      ownerId: marker.ownerId,
      weaponId: marker.weaponId,
      x: marker.x + (i - middle) * config.spacing,
      y: -config.spawnAltitude - i * config.stagger,
      vx: 0,
      vy: config.dropSpeed,
      warhead: config.bomb,
      behavior: IMPACT_CONFIG,
      radius: marker.radius * BOMB_RADIUS_FACTOR,
      color: marker.color,
    });
  }
  return spawns;
}

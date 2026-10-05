import type { Projectile, ProjectileSpawn } from '../../entities/Projectile';
import type { ClusterBehaviorConfig } from '../../../types/weapons';
import { degToRad } from '../../../utils/math';
import { CONTINUE, EXPLODE, type BehaviorOutcome, type ProjectileBehavior } from '../Weapon';
import { IMPACT_CONFIG } from './ImpactBehavior';

const FRAGMENT_RADIUS_FACTOR = 0.6;

/**
 * Splits into a fan of fragments at the apex of its flight (the first step on
 * which it stops climbing, i.e. vy >= 0 in screen coordinates). If it hits
 * something before the apex it explodes as a single bomb.
 */
export const ClusterBehavior: ProjectileBehavior<ClusterBehaviorConfig> = {
  kind: 'cluster',

  afterStep(projectile, config): BehaviorOutcome {
    if (projectile.age < config.minSplitTime || projectile.vy < 0) {
      return CONTINUE;
    }
    return { action: 'remove', cue: 'split', spawns: createFragments(projectile, config) };
  },

  onTerrainContact: () => EXPLODE,
};

/**
 * Fragments fan out evenly around the parent's direction of travel. The fan is
 * deterministic (no randomness), so a given shot always scatters the same way.
 */
export function createFragments(parent: Projectile, config: ClusterBehaviorConfig): ProjectileSpawn[] {
  const baseAngle = Math.atan2(parent.vy, parent.vx);
  const speed = Math.max(parent.speed * config.fragmentSpeedFactor, config.minFragmentSpeed);
  const spread = degToRad(config.spreadDegrees);
  const count = Math.max(1, config.fragmentCount);
  const spawns: ProjectileSpawn[] = [];

  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1) - 0.5;
    const angle = baseAngle + spread * t;
    spawns.push({
      ownerId: parent.ownerId,
      weaponId: parent.weaponId,
      x: parent.x,
      y: parent.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      warhead: config.fragment,
      behavior: IMPACT_CONFIG,
      radius: Math.max(2, parent.radius * FRAGMENT_RADIUS_FACTOR),
      color: parent.color,
    });
  }
  return spawns;
}

import type { DrillBehaviorConfig } from '../../../types/weapons';
import { CONTINUE, EXPLODE, type ProjectileBehavior } from '../Weapon';

/**
 * Keeps travelling through solid ground, slowed by linear drag, and detonates
 * once it has bored `maxDrillDistance` units or slowed below `minSpeed`. If it
 * pops out of a hill it flies on with whatever drilling budget remains.
 */
export const DrillBehavior: ProjectileBehavior<DrillBehaviorConfig> = {
  kind: 'drill',

  afterStep(projectile, _config, ctx) {
    if (projectile.inTerrain && !ctx.terrain.isSolid(projectile.x, projectile.y)) {
      projectile.inTerrain = false;
    }
    return CONTINUE;
  },

  onTerrainContact(projectile, config, ctx) {
    projectile.inTerrain = true;
    const speed = projectile.speed;
    projectile.drilledDistance += speed * ctx.dt;

    // Linear drag: v ← v · (1 − k·dt). Clamped so a huge dt can never reverse direction.
    const damping = Math.max(0, 1 - config.drag * ctx.dt);
    projectile.vx *= damping;
    projectile.vy *= damping;

    if (projectile.drilledDistance >= config.maxDrillDistance || speed < config.minSpeed) {
      return EXPLODE;
    }
    return CONTINUE;
  },
};

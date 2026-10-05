import type { BounceBehaviorConfig } from '../../../types/weapons';
import { liftAboveSurface, reflectOffSurface } from '../../physics/TerrainCollision';
import { CONTINUE, EXPLODE, type BehaviorOutcome, type ProjectileBehavior } from '../Weapon';

/** Seconds after a bounce during which further ground contact just re-lifts the shell. */
const BOUNCE_GRACE = 0.06;

const BOUNCED: BehaviorOutcome = Object.freeze({ action: 'continue', bounced: true });

/**
 * Reflects off the ground `bounces` times (losing speed by `restitution` each
 * time), then explodes on the next contact. Tank hits explode immediately.
 */
export const BounceBehavior: ProjectileBehavior<BounceBehaviorConfig> = {
  kind: 'bounce',

  onTerrainContact(projectile, config, ctx) {
    if (projectile.terrainGrace > 0) {
      liftAboveSurface(ctx.terrain, projectile);
      return CONTINUE;
    }
    if (projectile.bouncesUsed >= config.bounces) {
      return EXPLODE;
    }
    liftAboveSurface(ctx.terrain, projectile);
    reflectOffSurface(ctx.terrain, projectile, config.restitution);
    projectile.bouncesUsed++;
    projectile.terrainGrace = BOUNCE_GRACE;
    return BOUNCED;
  },
};

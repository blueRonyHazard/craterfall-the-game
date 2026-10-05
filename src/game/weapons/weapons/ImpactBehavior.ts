import type { ImpactBehaviorConfig } from '../../../types/weapons';
import { EXPLODE, type ProjectileBehavior } from '../Weapon';

/** Detonates on first contact with anything. */
export const ImpactBehavior: ProjectileBehavior<ImpactBehaviorConfig> = {
  kind: 'impact',
  onTerrainContact: () => EXPLODE,
};

/** Shared config for child projectiles (fragments, bombs) that simply explode on impact. */
export const IMPACT_CONFIG: ImpactBehaviorConfig = Object.freeze({ kind: 'impact' });

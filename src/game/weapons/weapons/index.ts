import type { BehaviorConfig, BehaviorKind } from '../../../types/weapons';
import type { ProjectileBehavior } from '../Weapon';
import { AirStrikeBehavior } from './AirStrikeBehavior';
import { BounceBehavior } from './BounceBehavior';
import { ClusterBehavior } from './ClusterBehavior';
import { DrillBehavior } from './DrillBehavior';
import { ImpactBehavior } from './ImpactBehavior';

type BehaviorRegistry = {
  [K in BehaviorKind]: ProjectileBehavior<Extract<BehaviorConfig, { kind: K }>>;
};

/**
 * Every behaviour kind maps to its implementation. The mapped type makes the
 * compiler reject a BehaviorConfig kind that has no registered implementation.
 */
export const BEHAVIORS: BehaviorRegistry = {
  impact: ImpactBehavior,
  cluster: ClusterBehavior,
  bounce: BounceBehavior,
  drill: DrillBehavior,
  airstrike: AirStrikeBehavior,
};

export function behaviorFor<C extends BehaviorConfig>(config: C): ProjectileBehavior<C> {
  // The registry type guarantees BEHAVIORS[k] handles configs of kind k; TypeScript
  // cannot correlate the generic key with the union member, hence the cast.
  return BEHAVIORS[config.kind] as unknown as ProjectileBehavior<C>;
}

export function isRegisteredBehavior(kind: string): kind is BehaviorKind {
  return Object.prototype.hasOwnProperty.call(BEHAVIORS, kind);
}

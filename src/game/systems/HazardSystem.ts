import { isTankAlive } from '../entities/Tank';
import type { HazardState, PlayerId, TankState } from '../../types/game';
import type { HazardSpec } from '../../types/weapons';
import { applyDamage } from './DamageSystem';
import { emitDamage, type EventSink } from './ExplosionSystem';

/**
 * Owns the magma pools in the game state.
 *
 * A pool lies along the terrain surface between x − radius and x + radius.
 * At the end of every turn, each living tank whose centre is inside a pool takes
 * `damagePerTurn`, then every pool ages by one turn and cooled pools are removed.
 * Pools are stored in GameStateData.hazards, so they serialise and replay.
 */
export class HazardSystem {
  private nextId: number;

  constructor(
    private readonly hazards: HazardState[],
    private readonly emit: EventSink,
  ) {
    this.nextId = hazards.reduce((max, h) => Math.max(max, h.id), 0) + 1;
  }

  get active(): readonly HazardState[] {
    return this.hazards;
  }

  create(spec: HazardSpec, x: number, ownerId: PlayerId): HazardState {
    const hazard: HazardState = {
      id: this.nextId++,
      kind: spec.kind,
      ownerId,
      x,
      radius: spec.radius,
      damagePerTurn: spec.damagePerTurn,
      turnsLeft: spec.turns,
    };
    this.hazards.push(hazard);
    this.emit({ type: 'hazardCreated', hazardId: hazard.id, x: hazard.x, radius: hazard.radius });
    return hazard;
  }

  /** End-of-turn update: burn tanks standing in pools, then age and expire pools. */
  endOfTurn(tanks: readonly TankState[]): void {
    for (const hazard of this.hazards) {
      for (const tank of tanks) {
        if (!isTankAlive(tank) || !isInside(hazard, tank.x)) continue;
        this.emit({ type: 'hazardTriggered', hazardId: hazard.id, playerId: tank.playerId, x: tank.x, y: tank.y });
        emitDamage(applyDamage(tank, hazard.damagePerTurn), this.emit);
      }
      hazard.turnsLeft -= 1;
    }

    let write = 0;
    for (const hazard of this.hazards) {
      if (hazard.turnsLeft > 0) {
        this.hazards[write++] = hazard;
      } else {
        this.emit({ type: 'hazardExpired', hazardId: hazard.id });
      }
    }
    this.hazards.length = write;
  }
}

export function isInside(hazard: HazardState, x: number): boolean {
  return Math.abs(x - hazard.x) <= hazard.radius;
}

import type { PlayerId } from '../../types/game';
import type { BehaviorConfig, Warhead } from '../../types/weapons';

/** Everything needed to put a new projectile into the world. */
export interface ProjectileSpawn {
  ownerId: PlayerId;
  weaponId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  warhead: Warhead;
  behavior: BehaviorConfig;
  radius: number;
  color: number;
}

/**
 * Simulation state of one projectile. Mutated in place by the physics step so
 * the hot loop does not allocate.
 */
export class Projectile {
  readonly id: number;
  readonly ownerId: PlayerId;
  readonly weaponId: string;
  readonly warhead: Warhead;
  readonly behavior: BehaviorConfig;
  readonly radius: number;
  readonly color: number;

  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Seconds since launch. */
  age = 0;
  alive = true;

  // Behaviour-specific scratch state. Kept as plain fields so behaviours stay allocation-free.
  bouncesUsed = 0;
  drilledDistance = 0;
  inTerrain = false;
  /** Seconds remaining during which terrain contact is ignored (e.g. right after a bounce). */
  terrainGrace = 0;

  constructor(id: number, spawn: ProjectileSpawn) {
    this.id = id;
    this.ownerId = spawn.ownerId;
    this.weaponId = spawn.weaponId;
    this.warhead = spawn.warhead;
    this.behavior = spawn.behavior;
    this.radius = spawn.radius;
    this.color = spawn.color;
    this.x = spawn.x;
    this.y = spawn.y;
    this.vx = spawn.vx;
    this.vy = spawn.vy;
  }

  get speed(): number {
    return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
  }
}

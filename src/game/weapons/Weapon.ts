import type { Terrain } from '../entities/Terrain';
import type { Projectile, ProjectileSpawn } from '../entities/Projectile';
import { barrelTip } from '../entities/Tank';
import { launchVelocity } from '../physics/ProjectilePhysics';
import type { RemovalCue, TankState } from '../../types/game';
import type { BehaviorConfig, WeaponDefinition } from '../../types/weapons';

export interface BehaviorContext {
  terrain: Terrain;
  /** Fixed timestep of the simulation, seconds. */
  dt: number;
}

/** What should happen to a projectile after a behaviour hook runs. */
export interface BehaviorOutcome {
  action: 'continue' | 'explode' | 'remove';
  /** New projectiles to add to the world (cluster fragments, bombers, ...). */
  spawns?: ProjectileSpawn[];
  /** Cue reported when the projectile is removed. */
  cue?: RemovalCue;
  /** Set when the projectile bounced this step. */
  bounced?: boolean;
}

export const CONTINUE: BehaviorOutcome = Object.freeze({ action: 'continue' });
export const EXPLODE: BehaviorOutcome = Object.freeze({ action: 'explode' });

/**
 * Hooks a projectile behaviour can implement. The engine owns integration and
 * collision detection; behaviours only decide what happens at each event.
 */
export interface ProjectileBehavior<C extends BehaviorConfig> {
  readonly kind: C['kind'];
  /** Called after every physics step, before collision checks. */
  afterStep?(projectile: Projectile, config: C, ctx: BehaviorContext): BehaviorOutcome;
  /** Called on every step the projectile is inside solid ground. */
  onTerrainContact(projectile: Projectile, config: C, ctx: BehaviorContext): BehaviorOutcome;
  /** Called when the projectile touches a tank. Defaults to exploding. */
  onTankContact?(projectile: Projectile, config: C, ctx: BehaviorContext): BehaviorOutcome;
}

export interface FireRequest {
  tank: TankState;
  angle: number;
  power: number;
}

/** Runtime view of a weapon definition, as described in the design brief. */
export interface Weapon {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly projectileSpeed: number;
  readonly explosionRadius: number;
  readonly damage: number;
  readonly ammo: number;
  readonly definition: WeaponDefinition;
  /** Produces the projectile(s) created when this weapon is fired. */
  fire(request: FireRequest): ProjectileSpawn[];
}

/** The default Weapon implementation: one projectile from the barrel tip. */
export class DataWeapon implements Weapon {
  readonly definition: WeaponDefinition;

  constructor(definition: WeaponDefinition) {
    this.definition = definition;
  }

  get id(): string {
    return this.definition.id;
  }
  get name(): string {
    return this.definition.name;
  }
  get description(): string {
    return this.definition.description;
  }
  get projectileSpeed(): number {
    return this.definition.projectileSpeed;
  }
  get explosionRadius(): number {
    return this.definition.explosionRadius;
  }
  get damage(): number {
    return this.definition.damage;
  }
  get ammo(): number {
    return this.definition.ammo;
  }

  fire({ tank, angle, power }: FireRequest): ProjectileSpawn[] {
    const origin = barrelTip(tank, angle);
    const velocity = launchVelocity(angle, power, this.definition.projectileSpeed);
    return [
      {
        ownerId: tank.playerId,
        weaponId: this.definition.id,
        x: origin.x,
        y: origin.y,
        vx: velocity.vx,
        vy: velocity.vy,
        warhead: { explosionRadius: this.definition.explosionRadius, damage: this.definition.damage },
        behavior: this.definition.behavior,
        radius: this.definition.projectileRadius,
        color: this.definition.color,
      },
    ];
  }
}

/**
 * Data-driven weapon definitions.
 *
 * A weapon is pure data: launch parameters, a warhead, and a `behavior` block that
 * selects one of the registered projectile behaviours (see game/weapons/weapons).
 * New weapons that reuse an existing behaviour need only a new entry in
 * config/weapons.ts.
 */

/** What a detonation does to the ground. */
export type TerrainEffect =
  /** Remove earth inside the explosion radius (the default). */
  | { kind: 'carve' }
  /**
   * Drop a pyramid of earth whose apex sits `height` above the impact point.
   * Its sides slope down at height / halfWidth and run until they meet the ground.
   */
  | { kind: 'pyramid'; height: number; halfWidth: number }
  /** Leave the ground untouched. */
  | { kind: 'none' };

/** How the explosion is drawn and heard. Purely cosmetic. */
export type ExplosionVisual = 'fire' | 'dust' | 'magma';

/** A lingering ground hazard left behind by a detonation. */
export interface MagmaHazardSpec {
  kind: 'magma';
  /** Half-width of the pool along the ground. */
  radius: number;
  /** Damage to each tank standing in the pool at the end of every turn. */
  damagePerTurn: number;
  /** Number of turn-ends the pool survives (including the one it was created in). */
  turns: number;
}

export type HazardSpec = MagmaHazardSpec;

export interface Warhead {
  /** Explosion radius in world units. Also the crater radius when terrain is 'carve'. */
  explosionRadius: number;
  /** Damage dealt at the centre of the explosion. */
  damage: number;
  /** Ground effect. Defaults to { kind: 'carve' }. */
  terrain?: TerrainEffect;
  /** Visual / audio style. Defaults to 'fire'. */
  visual?: ExplosionVisual;
  /** Optional lingering hazard created at the impact point. */
  hazard?: HazardSpec;
}

export interface ImpactBehaviorConfig {
  kind: 'impact';
}

export interface ClusterBehaviorConfig {
  kind: 'cluster';
  fragmentCount: number;
  /** Total fan angle across which fragments are released, in degrees. */
  spreadDegrees: number;
  /** Fragment speed as a multiple of the parent speed at the split point. */
  fragmentSpeedFactor: number;
  /** Lower bound on fragment speed so fragments released near-stationary still spread. */
  minFragmentSpeed: number;
  /** The parent cannot split before this many seconds of flight. */
  minSplitTime: number;
  fragment: Warhead;
}

export interface BounceBehaviorConfig {
  kind: 'bounce';
  bounces: number;
  /** Fraction of speed kept after each bounce (0..1). */
  restitution: number;
}

export interface DrillBehaviorConfig {
  kind: 'drill';
  /** Distance in world units the projectile may travel through solid ground. */
  maxDrillDistance: number;
  /** Linear drag coefficient (1/s) applied while inside terrain. */
  drag: number;
  /** Explode early if speed underground drops below this value. */
  minSpeed: number;
}

export interface AirStrikeBehaviorConfig {
  kind: 'airstrike';
  bombCount: number;
  /** Horizontal distance between consecutive bombs. */
  spacing: number;
  /** Initial downward speed of each bomb. */
  dropSpeed: number;
  /** How far above the top of the playable area bombs appear. */
  spawnAltitude: number;
  /** Vertical stagger between bombs so impacts ripple instead of landing at once. */
  stagger: number;
  bomb: Warhead;
}

export type BehaviorConfig =
  | ImpactBehaviorConfig
  | ClusterBehaviorConfig
  | BounceBehaviorConfig
  | DrillBehaviorConfig
  | AirStrikeBehaviorConfig;

export type BehaviorKind = BehaviorConfig['kind'];

export interface WeaponDefinition extends Warhead {
  id: string;
  name: string;
  description: string;
  /** Launch speed (world units / s) at 100% power. */
  projectileSpeed: number;
  /** Starting ammo per player. Use Infinity for unlimited. */
  ammo: number;
  /** Visual radius of the projectile. */
  projectileRadius: number;
  /** Hex colour used for the projectile and the selector icon. */
  color: number;
  behavior: BehaviorConfig;
}

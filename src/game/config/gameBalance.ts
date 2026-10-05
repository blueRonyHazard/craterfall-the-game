/**
 * All tunable gameplay numbers live here. Nothing in the engine should hard-code
 * a balance value; tweak this file to rebalance the game.
 */

export const WORLD = {
  /** Playable area size in world units (the band between the HUD bars). */
  width: 1600,
  height: 716,
} as const;

export const PHYSICS = {
  /** Downward acceleration, world units / s². */
  gravity: 400,
  /** Multiplier converting wind strength into horizontal acceleration (units / s² per strength point). */
  windInfluence: 9,
  /** Fixed simulation step in seconds. The renderer runs as many steps as real time requires. */
  timestep: 1 / 120,
  /** Hard cap on how many steps one rendered frame may consume (prevents spiral of death). */
  maxStepsPerFrame: 12,
  /** Projectiles are discarded after this many seconds of flight. */
  maxFlightTime: 20,
  /** How far beyond the side edges a projectile may travel before it is removed. */
  sideMargin: 60,
} as const;

export const AIMING = {
  minAngle: 0,
  maxAngle: 180,
  minPower: 5,
  maxPower: 100,
  /** Degrees per second while an angle key is held. */
  angleRate: 45,
  /** Power percent per second while a power key is held. */
  powerRate: 35,
  /** Multiplier applied while the fine-adjust modifier is held. */
  fineAdjustFactor: 0.2,
  defaultAngleP1: 45,
  defaultAngleP2: 135,
  defaultPower: 60,
} as const;

export const TANK = {
  maxHealth: 100,
  /** Collision radius around the tank centre. */
  hitRadius: 22,
  /** Height of the tank centre above its base. */
  centerHeight: 12,
  /** Height of the barrel pivot above the base. */
  turretHeight: 20,
  barrelLength: 30,
  /** Projectiles cannot hit the firing tank for this long after launch. */
  ownerArmingTime: 0.25,
  /** Falls shorter than this deal no damage. */
  fallDamageThreshold: 30,
  fallDamagePerUnit: 0.25,
  /** Spawn ranges as fractions of world width. */
  spawnRangeP1: [0.07, 0.2] as const,
  spawnRangeP2: [0.8, 0.93] as const,
} as const;

export const WIND = {
  maxStrength: 10,
  /** Wind strength is rounded to this many decimals so it displays exactly as simulated. */
  precision: 1,
  /** If true a new wind is rolled at the start of every turn, otherwise once per match. */
  changesEachTurn: true,
} as const;

export const DAMAGE = {
  /**
   * Exponent applied to the linear falloff. 1 gives the classic
   * damage = max * (1 - d / r); larger values concentrate damage near the centre.
   */
  falloffExponent: 1,
  /** Damage values are rounded to whole hit points. */
  roundDamage: true,
} as const;

export const TERRAIN = {
  /** Terrain never gets thinner than this at the bottom of the world. */
  bedrockThickness: 14,
  /** Surface limits as fractions of world height. */
  minSurface: 0.26,
  maxSurface: 0.9,
  baseLevel: 0.62,
  /** Box-blur radius for the generated height map. */
  smoothRadius: 3,
  /** Wider blur for the 'terraces' layout. */
  terraceSmoothRadius: 9,
  /** Half-width of the flat pad created under each tank. */
  padHalfWidth: 34,
  /** Distance over which pads blend back into the surrounding terrain. */
  padBlend: 40,
  /**
   * Octaves of the height function: amplitude in world units and frequency as
   * a [min, max] range of full cycles across the world width.
   */
  octaves: [
    { amplitude: 105, cycles: [1.1, 2.1] },
    { amplitude: 52, cycles: [2.8, 4.8] },
    { amplitude: 22, cycles: [7, 11] },
    { amplitude: 7, cycles: [18, 26] },
  ] as const,
} as const;

export const TIMING = {
  /** Seconds the engine lingers in the EXPLOSION phase so effects can play. */
  explosionHold: 0.9,
  /** Seconds spent in TURN_END before control passes to the next player. */
  turnEndHold: 0.25,
} as const;

export const EFFECTS = {
  /** Explosions at least this large shake the camera. */
  shakeRadiusThreshold: 60,
  shakeDurationMs: 260,
  /** Camera shake intensity per world unit of radius beyond the threshold. */
  shakeIntensityPerRadius: 0.00012,
  maxShakeIntensity: 0.014,
  trailLength: 22,
} as const;

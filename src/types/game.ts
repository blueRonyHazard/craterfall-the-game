/**
 * Core gameplay types shared by the deterministic engine, the renderer and the UI.
 *
 * Coordinate system: world units, origin at the top-left of the playable area,
 * +x to the right and +y DOWN (screen convention). Angles are expressed in degrees
 * where 0° points right, 90° points straight up and 180° points left.
 */

export type PlayerId = 0 | 1;

export const PLAYER_IDS: readonly PlayerId[] = [0, 1];

export enum GamePhase {
  Menu = 'MENU',
  Aiming = 'AIMING',
  ProjectileFlying = 'PROJECTILE_FLYING',
  Explosion = 'EXPLOSION',
  TurnEnd = 'TURN_END',
  GameOver = 'GAME_OVER',
}

export interface Vec2 {
  x: number;
  y: number;
}

/** Horizontal wind. Acceleration applied to projectiles = direction * strength * windInfluence. */
export interface Wind {
  direction: -1 | 1;
  /** 0 .. maxStrength (see gameBalance.wind). */
  strength: number;
}

export interface TankState {
  playerId: PlayerId;
  /** Position of the tank's base, resting on the terrain surface. */
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  /** Aim angle in degrees, 0..180. */
  angle: number;
  /** Launch power in percent, minPower..100. */
  power: number;
  weaponId: string;
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  /** Remaining ammo per weapon id. Infinity means unlimited. */
  ammo: Record<string, number>;
}

export type Winner = PlayerId | 'draw';

/** Full, serialisable description of a match in progress. */
export interface GameStateData {
  players: [PlayerState, PlayerState];
  tanks: [TankState, TankState];
  currentPlayer: PlayerId;
  turnNumber: number;
  terrainSeed: number;
  windSeed: number;
  wind: Wind;
  phase: GamePhase;
  winner: Winner | null;
}

/**
 * A gameplay command. Everything the engine needs to resolve a turn is contained
 * here, so the same action stream can be replayed locally or validated by an
 * authoritative server.
 */
export interface PlayerAction {
  playerId: PlayerId;
  turnNumber: number;
  weaponId: string;
  angle: number;
  power: number;
}

export type ActionResult = { ok: true } | { ok: false; reason: string };

export interface MatchConfig {
  terrainSeed: number;
  windSeed: number;
  playerNames?: [string, string];
  /** Optional explicit tank x positions. Derived from the terrain seed when omitted. */
  tankPositions?: [number, number];
}

/** Events emitted by the engine; the presentation layer reacts to these. */
export type SimEvent =
  | { type: 'turnStarted'; playerId: PlayerId; turnNumber: number; wind: Wind }
  | { type: 'shotFired'; playerId: PlayerId; weaponId: string; x: number; y: number }
  | { type: 'projectileSpawned'; projectileId: number; x: number; y: number }
  | { type: 'projectileRemoved'; projectileId: number; x: number; y: number; cue: RemovalCue }
  | { type: 'projectileBounced'; projectileId: number; x: number; y: number }
  | { type: 'explosion'; x: number; y: number; radius: number; damage: number }
  | { type: 'terrainChanged'; minX: number; maxX: number }
  | { type: 'tankDamaged'; playerId: PlayerId; amount: number; health: number }
  | { type: 'tankMoved'; playerId: PlayerId; x: number; y: number }
  | { type: 'tankDestroyed'; playerId: PlayerId }
  | { type: 'gameOver'; winner: Winner };

/** Why a projectile disappeared; lets renderers/audio pick an effect. */
export type RemovalCue = 'exploded' | 'outOfBounds' | 'split' | 'airstrikeCalled' | 'expired';

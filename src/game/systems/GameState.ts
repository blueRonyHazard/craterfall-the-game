import { GamePhase, type GameStateData, type PlayerId, type TankState, type Wind, type Winner } from '../../types/game';
import type { WeaponDefinition } from '../../types/weapons';
import { createPlayer, DEFAULT_PLAYER_NAMES } from '../entities/Player';
import { createTank, isTankAlive } from '../entities/Tank';

export interface InitialStateOptions {
  terrainSeed: number;
  windSeed: number;
  wind: Wind;
  tankPositions: [{ x: number; y: number }, { x: number; y: number }];
  weapons: readonly WeaponDefinition[];
  defaultWeaponId: string;
  playerNames?: [string, string];
}

/** Builds the state for turn 1 of a new match. */
export function createGameState(options: InitialStateOptions): GameStateData {
  const names = options.playerNames ?? DEFAULT_PLAYER_NAMES;
  const [p1, p2] = options.tankPositions;
  return {
    players: [createPlayer(0, names[0], options.weapons), createPlayer(1, names[1], options.weapons)],
    tanks: [
      createTank(0, p1.x, p1.y, options.defaultWeaponId),
      createTank(1, p2.x, p2.y, options.defaultWeaponId),
    ],
    currentPlayer: 0,
    turnNumber: 1,
    terrainSeed: options.terrainSeed,
    windSeed: options.windSeed,
    wind: options.wind,
    phase: GamePhase.Aiming,
    winner: null,
  };
}

export function otherPlayer(id: PlayerId): PlayerId {
  return id === 0 ? 1 : 0;
}

/**
 * Game-over detection: null while both tanks live, the survivor's id when one
 * remains, or 'draw' when both were destroyed by the same shot.
 */
export function detectWinner(tanks: readonly TankState[]): Winner | null {
  const alive = tanks.filter(isTankAlive);
  if (alive.length === tanks.length) return null;
  const survivor = alive[0];
  if (alive.length === 1 && survivor) return survivor.playerId;
  return 'draw';
}

/** Deep copy suitable for handing to UI code or serialising over the network. */
export function cloneGameState(state: GameStateData): GameStateData {
  return JSON.parse(JSON.stringify(state, infinityReplacer), infinityReviver) as GameStateData;
}

// JSON has no Infinity; unlimited ammo is encoded as the string "Infinity".
function infinityReplacer(_key: string, value: unknown): unknown {
  return value === Number.POSITIVE_INFINITY ? 'Infinity' : value;
}

function infinityReviver(_key: string, value: unknown): unknown {
  return value === 'Infinity' ? Number.POSITIVE_INFINITY : value;
}

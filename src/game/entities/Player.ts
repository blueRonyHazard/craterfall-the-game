import type { PlayerId, PlayerState } from '../../types/game';
import type { WeaponDefinition } from '../../types/weapons';

export const DEFAULT_PLAYER_NAMES: [string, string] = ['Player 1', 'Player 2'];

export function createPlayer(id: PlayerId, name: string, weapons: readonly WeaponDefinition[]): PlayerState {
  const ammo: Record<string, number> = {};
  for (const weapon of weapons) {
    ammo[weapon.id] = weapon.ammo;
  }
  return { id, name, ammo };
}

export function ammoFor(player: PlayerState, weaponId: string): number {
  return player.ammo[weaponId] ?? 0;
}

export function hasAmmo(player: PlayerState, weaponId: string): boolean {
  return ammoFor(player, weaponId) > 0;
}

/** Decrements ammo; unlimited (Infinity) stays unlimited. */
export function consumeAmmo(player: PlayerState, weaponId: string): void {
  const current = ammoFor(player, weaponId);
  if (current <= 0) {
    throw new Error(`Player ${player.id} has no ammo for ${weaponId}`);
  }
  player.ammo[weaponId] = current - 1;
}

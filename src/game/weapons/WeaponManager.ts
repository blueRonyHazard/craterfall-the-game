import type { PlayerState } from '../../types/game';
import type { WeaponDefinition } from '../../types/weapons';
import { hasAmmo } from '../entities/Player';
import { DataWeapon, type Weapon } from './Weapon';
import { isRegisteredBehavior } from './weapons';

/**
 * Owns the weapon roster for a match. Validates definitions up front so a typo
 * in config/weapons.ts fails loudly at startup instead of mid-game.
 */
export class WeaponManager {
  private readonly weapons: readonly Weapon[];
  private readonly byId: ReadonlyMap<string, Weapon>;

  constructor(definitions: readonly WeaponDefinition[]) {
    const errors = validateWeaponDefinitions(definitions);
    if (errors.length > 0) {
      throw new Error(`Invalid weapon configuration:\n${errors.join('\n')}`);
    }
    this.weapons = definitions.map((definition) => new DataWeapon(definition));
    this.byId = new Map(this.weapons.map((weapon) => [weapon.id, weapon]));
  }

  get all(): readonly Weapon[] {
    return this.weapons;
  }

  get definitions(): WeaponDefinition[] {
    return this.weapons.map((weapon) => weapon.definition);
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  get(id: string): Weapon {
    const weapon = this.byId.get(id);
    if (!weapon) {
      throw new Error(`Unknown weapon: ${id}`);
    }
    return weapon;
  }

  /** Weapon at a 0-based selector slot, if any. */
  atIndex(index: number): Weapon | undefined {
    return this.weapons[index];
  }

  indexOf(id: string): number {
    return this.weapons.findIndex((weapon) => weapon.id === id);
  }

  /** First weapon the player still has ammo for, searching forward from `fromId`. */
  firstAvailable(player: PlayerState, fromId?: string): Weapon | undefined {
    const start = fromId ? Math.max(0, this.indexOf(fromId)) : 0;
    for (let i = 0; i < this.weapons.length; i++) {
      const weapon = this.weapons[(start + i) % this.weapons.length];
      if (weapon && hasAmmo(player, weapon.id)) {
        return weapon;
      }
    }
    return undefined;
  }
}

function validateWarheadExtras(label: string, def: WeaponDefinition): string[] {
  const errors: string[] = [];
  if (def.terrain?.kind === 'pyramid') {
    if (!(def.terrain.height > 0)) errors.push(`${label}: pyramid height must be > 0.`);
    if (!(def.terrain.halfWidth > 0)) errors.push(`${label}: pyramid halfWidth must be > 0.`);
  }
  if (def.hazard) {
    if (!(def.hazard.radius > 0)) errors.push(`${label}: hazard radius must be > 0.`);
    if (!(def.hazard.damagePerTurn >= 0)) errors.push(`${label}: hazard damagePerTurn must be >= 0.`);
    if (!(Number.isInteger(def.hazard.turns) && def.hazard.turns > 0)) {
      errors.push(`${label}: hazard turns must be a whole number > 0.`);
    }
  }
  return errors;
}

/** Returns a list of human-readable problems with the weapon definitions (empty when valid). */
export function validateWeaponDefinitions(definitions: readonly WeaponDefinition[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  if (definitions.length === 0) {
    errors.push('At least one weapon must be defined.');
  }
  for (const def of definitions) {
    const label = def.id || '(missing id)';
    if (!def.id) errors.push('A weapon is missing its id.');
    if (seen.has(def.id)) errors.push(`Duplicate weapon id "${def.id}".`);
    seen.add(def.id);
    if (!def.name) errors.push(`${label}: name is required.`);
    if (!(def.projectileSpeed > 0)) errors.push(`${label}: projectileSpeed must be > 0.`);
    if (!(def.explosionRadius >= 0)) errors.push(`${label}: explosionRadius must be >= 0.`);
    if (!(def.damage >= 0)) errors.push(`${label}: damage must be >= 0.`);
    if (!(def.ammo > 0)) errors.push(`${label}: ammo must be > 0 (use Infinity for unlimited).`);
    if (!(def.projectileRadius > 0)) errors.push(`${label}: projectileRadius must be > 0.`);
    errors.push(...validateWarheadExtras(label, def));
    if (!isRegisteredBehavior(def.behavior.kind)) {
      errors.push(`${label}: unknown behavior "${def.behavior.kind}".`);
    }
  }
  return errors;
}

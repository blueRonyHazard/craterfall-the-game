import type { WeaponDefinition } from '../../types/weapons';

/**
 * The weapon roster. Order here is the order of the weapon selector and of the
 * number-key shortcuts (1 = first entry).
 *
 * To add a weapon that reuses an existing behaviour, append an entry. To add a
 * brand-new behaviour, implement it in game/weapons/weapons and register it in
 * game/weapons/weapons/index.ts — no engine changes are needed either way.
 */
export const WEAPONS: readonly WeaponDefinition[] = [
  {
    id: 'standard-shell',
    name: 'Standard Shell',
    description: 'Reliable all-rounder. Medium blast, unlimited supply.',
    projectileSpeed: 900,
    explosionRadius: 46,
    damage: 30,
    ammo: Number.POSITIVE_INFINITY,
    projectileRadius: 5,
    color: 0xfff1c1,
    behavior: { kind: 'impact' },
  },
  {
    id: 'heavy-shell',
    name: 'Heavy Shell',
    description: 'Slow, weighty round that leaves a deep crater and hits hard.',
    projectileSpeed: 760,
    explosionRadius: 80,
    damage: 52,
    ammo: 3,
    projectileRadius: 8,
    color: 0xffb347,
    behavior: { kind: 'impact' },
  },
  {
    id: 'cluster-bomb',
    name: 'Cluster Bomb',
    description: 'Bursts at the top of its arc into a fan of five bomblets.',
    projectileSpeed: 880,
    explosionRadius: 30,
    damage: 14,
    ammo: 2,
    projectileRadius: 6,
    color: 0xc792ea,
    behavior: {
      kind: 'cluster',
      fragmentCount: 5,
      spreadDegrees: 46,
      fragmentSpeedFactor: 0.85,
      minFragmentSpeed: 140,
      minSplitTime: 0.35,
      fragment: { explosionRadius: 28, damage: 15 },
    },
  },
  {
    id: 'bouncer',
    name: 'Bouncer',
    description: 'Ricochets off the first surface it meets, then detonates on the next.',
    projectileSpeed: 860,
    explosionRadius: 50,
    damage: 33,
    ammo: 3,
    projectileRadius: 6,
    color: 0x7ee8fa,
    behavior: { kind: 'bounce', bounces: 1, restitution: 0.6 },
  },
  {
    id: 'drill',
    name: 'Drill',
    description: 'Bores through up to 90 units of ground before it blows.',
    projectileSpeed: 880,
    explosionRadius: 44,
    damage: 36,
    ammo: 2,
    projectileRadius: 5,
    color: 0xa3e635,
    behavior: { kind: 'drill', maxDrillDistance: 90, drag: 1.4, minSpeed: 60 },
  },
  {
    id: 'air-strike',
    name: 'Air Strike',
    description: 'Fires a marker flare. Bombers rake the ground where it lands.',
    projectileSpeed: 870,
    explosionRadius: 0,
    damage: 0,
    ammo: 1,
    projectileRadius: 4,
    color: 0xff5d8f,
    behavior: {
      kind: 'airstrike',
      bombCount: 5,
      spacing: 48,
      dropSpeed: 260,
      spawnAltitude: 60,
      stagger: 26,
      bomb: { explosionRadius: 34, damage: 17 },
    },
  },
];

export const DEFAULT_WEAPON_ID = 'standard-shell';

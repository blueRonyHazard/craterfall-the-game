import { describe, expect, it } from 'vitest';
import { WEAPONS, DEFAULT_WEAPON_ID } from '../src/game/config/weapons';
import { WeaponManager, validateWeaponDefinitions } from '../src/game/weapons/WeaponManager';
import { MatchEngine } from '../src/game/systems/MatchEngine';
import { createFragments } from '../src/game/weapons/weapons/ClusterBehavior';
import { createBombs } from '../src/game/weapons/weapons/AirStrikeBehavior';
import { BounceBehavior } from '../src/game/weapons/weapons/BounceBehavior';
import { DrillBehavior } from '../src/game/weapons/weapons/DrillBehavior';
import { BEHAVIORS } from '../src/game/weapons/weapons';
import type { AirStrikeBehaviorConfig, ClusterBehaviorConfig, WeaponDefinition } from '../src/types/weapons';
import { flatTerrain, makeProjectile } from './helpers';

function weapon(id: string): WeaponDefinition {
  const def = WEAPONS.find((w) => w.id === id);
  if (!def) throw new Error(`missing ${id}`);
  return def;
}

describe('weapon configuration', () => {
  it('passes validation', () => {
    expect(validateWeaponDefinitions(WEAPONS)).toEqual([]);
  });

  it('includes the six required weapons with unique ids', () => {
    const ids = WEAPONS.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ['standard-shell', 'heavy-shell', 'cluster-bomb', 'bouncer', 'drill', 'air-strike']) {
      expect(ids).toContain(id);
    }
    expect(ids).toContain(DEFAULT_WEAPON_ID);
  });

  it('gives the default weapon unlimited ammo', () => {
    expect(weapon(DEFAULT_WEAPON_ID).ammo).toBe(Number.POSITIVE_INFINITY);
  });

  it('makes the heavy shell slower, bigger and stronger than the standard shell', () => {
    const standard = weapon('standard-shell');
    const heavy = weapon('heavy-shell');
    expect(heavy.projectileSpeed).toBeLessThan(standard.projectileSpeed);
    expect(heavy.explosionRadius).toBeGreaterThan(standard.explosionRadius);
    expect(heavy.damage).toBeGreaterThan(standard.damage);
  });

  it('has an implementation registered for every behaviour used', () => {
    for (const def of WEAPONS) {
      expect(Object.keys(BEHAVIORS)).toContain(def.behavior.kind);
    }
  });

  it('flags invalid definitions', () => {
    const broken = [
      { ...weapon('standard-shell') },
      { ...weapon('standard-shell'), projectileSpeed: 0 },
    ];
    const errors = validateWeaponDefinitions(broken);
    expect(errors.some((e) => e.includes('Duplicate'))).toBe(true);
    expect(errors.some((e) => e.includes('projectileSpeed'))).toBe(true);
    expect(() => new WeaponManager(broken)).toThrow();
  });

  it('accepts new data-only weapons without engine changes', () => {
    const custom: WeaponDefinition = {
      ...weapon('standard-shell'),
      id: 'pebble',
      name: 'Pebble',
      ammo: 9,
    };
    const manager = new WeaponManager([...WEAPONS, custom]);
    expect(manager.get('pebble').name).toBe('Pebble');
    const engine = new MatchEngine({ terrainSeed: 3, windSeed: 3 }, { weapons: [...WEAPONS, custom] });
    expect(engine.state.players[0].ammo['pebble']).toBe(9);
  });
});

describe('ammo', () => {
  it('is consumed when firing and blocks firing when empty', () => {
    const engine = new MatchEngine({ terrainSeed: 10, windSeed: 10 });
    const airStrikeAmmo = weapon('air-strike').ammo;
    expect(airStrikeAmmo).toBe(1);
    const fire = () =>
      engine.submitAction({
        playerId: engine.state.currentPlayer,
        turnNumber: engine.state.turnNumber,
        weaponId: 'air-strike',
        angle: 80,
        power: 40,
      });
    expect(fire().ok).toBe(true);
    expect(engine.state.players[0].ammo['air-strike']).toBe(0);
    engine.runUntilIdle();
    // Player 2's turn: fire anything to pass back to player 1.
    engine.submitAction({ playerId: 1, turnNumber: 2, weaponId: 'standard-shell', angle: 100, power: 30 });
    engine.runUntilIdle();
    expect(fire().ok).toBe(false);
    // The tank automatically switched away from the empty weapon.
    expect(engine.state.tanks[0].weaponId).not.toBe('air-strike');
  });
});

describe('weapon behaviours', () => {
  const ctx = { terrain: flatTerrain(400, 300, 200), dt: 1 / 120 };

  it('cluster fragments fan out evenly around the travel direction', () => {
    const config = weapon('cluster-bomb').behavior as ClusterBehaviorConfig;
    const parent = makeProjectile({ vx: 300, vy: 0 }, config);
    const fragments = createFragments(parent, config);
    expect(fragments).toHaveLength(config.fragmentCount);
    const angles = fragments.map((f) => Math.atan2(f.vy, f.vx));
    expect(angles[0]).toBeCloseTo(-angles[angles.length - 1]!);
    expect(fragments.every((f) => f.behavior.kind === 'impact')).toBe(true);
  });

  it('cluster splits only after the apex', () => {
    const config = weapon('cluster-bomb').behavior as ClusterBehaviorConfig;
    const climbing = makeProjectile({ vx: 100, vy: -50 }, config);
    climbing.age = 1;
    expect(BEHAVIORS.cluster.afterStep?.(climbing, config, ctx).action).toBe('continue');
    const falling = makeProjectile({ vx: 100, vy: 5 }, config);
    falling.age = 1;
    const outcome = BEHAVIORS.cluster.afterStep?.(falling, config, ctx);
    expect(outcome?.action).toBe('remove');
    expect(outcome?.spawns).toHaveLength(config.fragmentCount);
  });

  it('bouncer reflects once, then explodes', () => {
    const config = { kind: 'bounce' as const, bounces: 1, restitution: 0.5 };
    const p = makeProjectile({ x: 100, y: 205, vx: 100, vy: 200 }, config);
    const first = BounceBehavior.onTerrainContact(p, config, ctx);
    expect(first.action).toBe('continue');
    expect(first.bounced).toBe(true);
    expect(p.vy).toBeLessThan(0);
    expect(p.y).toBeLessThan(200);
    p.terrainGrace = 0;
    expect(BounceBehavior.onTerrainContact(p, config, ctx).action).toBe('explode');
  });

  it('drill keeps going until its budget is spent', () => {
    const config = { kind: 'drill' as const, maxDrillDistance: 20, drag: 0, minSpeed: 1 };
    const p = makeProjectile({ x: 100, y: 210, vx: 0, vy: 600 }, config);
    // 600 units/s * 1/120 s = 5 units per step → 4 steps to exhaust 20 units.
    expect(DrillBehavior.onTerrainContact(p, config, ctx).action).toBe('continue');
    expect(DrillBehavior.onTerrainContact(p, config, ctx).action).toBe('continue');
    expect(DrillBehavior.onTerrainContact(p, config, ctx).action).toBe('continue');
    expect(DrillBehavior.onTerrainContact(p, config, ctx).action).toBe('explode');
    expect(p.drilledDistance).toBeCloseTo(20);
  });

  it('air strike drops a staggered line of bombs centred on the marker', () => {
    const config = weapon('air-strike').behavior as AirStrikeBehaviorConfig;
    const marker = makeProjectile({ x: 600, y: 300 }, config);
    const bombs = createBombs(marker, config);
    expect(bombs).toHaveLength(config.bombCount);
    const xs = bombs.map((b) => b.x);
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean).toBeCloseTo(600);
    expect(xs[1]! - xs[0]!).toBeCloseTo(config.spacing);
    expect(bombs.every((b) => b.y < 0 && b.vy > 0)).toBe(true);
  });
});

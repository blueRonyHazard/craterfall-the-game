import { describe, expect, it } from 'vitest';
import { TANK, TERRAIN } from '../src/game/config/gameBalance';
import { WEAPONS } from '../src/game/config/weapons';
import { createExplosion } from '../src/game/entities/Explosion';
import { createTank } from '../src/game/entities/Tank';
import type { Terrain } from '../src/game/entities/Terrain';
import { resolveExplosion } from '../src/game/systems/ExplosionSystem';
import { fallDamage } from '../src/game/systems/DamageSystem';
import { HazardSystem } from '../src/game/systems/HazardSystem';
import { MatchEngine } from '../src/game/systems/MatchEngine';
import { warheadOf } from '../src/game/weapons/Weapon';
import { GamePhase, type HazardState, type SimEvent, type TankState } from '../src/types/game';
import type { WeaponDefinition } from '../src/types/weapons';
import { flatTerrain } from './helpers';

function weapon(id: string): WeaponDefinition {
  const def = WEAPONS.find((w) => w.id === id);
  if (!def) throw new Error(`missing ${id}`);
  return def;
}

/** A small world (flat ground at y = 200) for resolving explosions directly. */
function makeWorld(tanks: TankState[] = [], terrain: Terrain = flatTerrain(600, 300, 200)) {
  const events: SimEvent[] = [];
  const emit = (e: SimEvent): void => {
    events.push(e);
  };
  const hazardList: HazardState[] = [];
  const hazards = new HazardSystem(hazardList, emit);
  return { terrain, tanks, emit, hazards, hazardList, events };
}

function detonate(world: ReturnType<typeof makeWorld>, id: string, x: number, y: number): void {
  resolveExplosion(createExplosion(x, y, warheadOf(weapon(id)), 0), world);
}

describe('Terrain.raisePyramid', () => {
  it('builds straight sides from the apex down to the ground', () => {
    const terrain = flatTerrain(600, 300, 200);
    const dirty = terrain.raisePyramid(300, 100, 1, 200, 0);
    expect(terrain.heightAt(300)).toBeCloseTo(100);
    expect(terrain.heightAt(350)).toBeCloseTo(150);
    expect(terrain.heightAt(250)).toBeCloseTo(150);
    // The sides meet the flat ground 100 columns out; beyond that nothing changes.
    expect(terrain.heightAt(420)).toBe(200);
    expect(dirty?.minX).toBeGreaterThanOrEqual(200);
    expect(dirty?.maxX).toBeLessThanOrEqual(400);
  });

  it('never lowers existing ground', () => {
    const terrain = flatTerrain(600, 300, 200);
    terrain.raisePyramid(300, 100, 1, 200, 0);
    // A lower pyramid next to the first must leave the taller one intact.
    terrain.raisePyramid(300, 180, 1, 200, 0);
    expect(terrain.heightAt(300)).toBeCloseTo(100);
  });

  it('respects the build ceiling', () => {
    const terrain = flatTerrain(600, 300, 200);
    terrain.raisePyramid(300, -500, 1, 200, 40);
    expect(terrain.heightAt(300)).toBeCloseTo(40);
  });

  it('returns null when the pyramid is entirely underground', () => {
    const terrain = flatTerrain(600, 300, 200);
    expect(terrain.raisePyramid(300, 250, 1, 100, 0)).toBeNull();
  });
});

describe('Dirt Creator', () => {
  it('drops a pyramid whose apex is `height` above the impact point', () => {
    const world = makeWorld();
    const { height } = weapon('dirt-creator').terrain as { kind: 'pyramid'; height: number; halfWidth: number };
    detonate(world, 'dirt-creator', 300, 200);
    expect(world.terrain.heightAt(300)).toBeCloseTo(200 - height);
    expect(world.events.some((e) => e.type === 'terrainBuilt')).toBe(true);
    expect(world.events.some((e) => e.type === 'terrainChanged' && e.cause === 'build')).toBe(true);
  });

  it('lifts a tank on top of the new earth without damaging it', () => {
    const tank = createTank(1, 330, 200, 'x');
    const world = makeWorld([tank]);
    detonate(world, 'dirt-creator', 300, 200);
    expect(tank.y).toBeCloseTo(world.terrain.heightAt(330));
    expect(tank.y).toBeLessThan(200);
    expect(tank.health).toBe(TANK.maxHealth);
  });

  it('cannot build above the ceiling', () => {
    const world = makeWorld();
    detonate(world, 'dirt-creator', 300, 60);
    expect(world.terrain.heightAt(300)).toBeGreaterThanOrEqual(TERRAIN.buildCeiling - 0.001);
  });
});

describe('Dirt Remover', () => {
  it('carves a large bowl without blast damage, but the tank still falls', () => {
    const tank = createTank(1, 300, 200, 'x');
    // Deep enough that the bowl does not reach the bedrock.
    const world = makeWorld([tank], flatTerrain(600, 450, 200));
    const radius = weapon('dirt-remover').explosionRadius;
    detonate(world, 'dirt-remover', 300, 200);
    const drop = tank.y - 200;
    expect(world.terrain.heightAt(300)).toBeCloseTo(200 + radius);
    expect(drop).toBeCloseTo(radius);
    expect(tank.health).toBe(TANK.maxHealth - fallDamage(drop));
    expect(world.events.some((e) => e.type === 'explosion' && e.visual === 'dust')).toBe(true);
  });
});

describe('Magma Pool', () => {
  const spec = weapon('magma-pool').hazard as NonNullable<WeaponDefinition['hazard']>;

  it('leaves a pool in the game state where it lands', () => {
    const world = makeWorld();
    detonate(world, 'magma-pool', 250, 200);
    expect(world.hazardList).toHaveLength(1);
    expect(world.hazardList[0]).toMatchObject({ kind: 'magma', x: 250, radius: spec.radius, turnsLeft: spec.turns });
  });

  it('burns tanks inside the pool at the end of each turn, and only those', () => {
    const inside = createTank(0, 250 + spec.radius - 1, 200, 'x');
    const outside = createTank(1, 250 + spec.radius + 40, 200, 'x');
    const world = makeWorld([inside, outside]);
    world.hazards.create(spec, 250, 1);
    world.hazards.endOfTurn(world.tanks);
    expect(inside.health).toBe(TANK.maxHealth - spec.damagePerTurn);
    expect(outside.health).toBe(TANK.maxHealth);
    expect(world.events.some((e) => e.type === 'hazardTriggered' && e.playerId === 0)).toBe(true);
  });

  it('cools down after its configured number of turns', () => {
    const tank = createTank(0, 250, 200, 'x');
    const world = makeWorld([tank]);
    world.hazards.create(spec, 250, 1);
    for (let i = 0; i < spec.turns; i++) world.hazards.endOfTurn(world.tanks);
    expect(world.hazardList).toHaveLength(0);
    expect(tank.health).toBe(TANK.maxHealth - spec.damagePerTurn * spec.turns);
    expect(world.events.some((e) => e.type === 'hazardExpired')).toBe(true);
    world.hazards.endOfTurn(world.tanks);
    expect(tank.health).toBe(TANK.maxHealth - spec.damagePerTurn * spec.turns);
  });

  it('burns during a real match and can decide it', () => {
    const engine = new MatchEngine({ terrainSeed: 7, windSeed: 7 });
    const target = engine.state.tanks[1];
    // Put a pool directly under player 2, then let player 1 fire a harmless shot straight up.
    engine.state.hazards.push({ id: 99, kind: 'magma', ownerId: 0, x: target.x, radius: 40, damagePerTurn: 9, turnsLeft: 3 });
    target.health = 5;
    engine.submitAction({ playerId: 0, turnNumber: 1, weaponId: 'dirt-remover', angle: 90, power: 10 });
    engine.runUntilIdle();
    expect(target.health).toBe(0);
    expect(engine.phase).toBe(GamePhase.GameOver);
    expect(engine.state.winner).toBe(0);
  });

  it('survives a state round-trip for replays', () => {
    const engine = new MatchEngine({ terrainSeed: 7, windSeed: 7 });
    engine.state.hazards.push({ id: 1, kind: 'magma', ownerId: 0, x: 500, radius: 40, damagePerTurn: 9, turnsLeft: 3 });
    const copy = JSON.parse(JSON.stringify(engine.state.hazards)) as HazardState[];
    expect(copy).toEqual(engine.state.hazards);
  });
});

describe('new weapon configuration', () => {
  it('includes the three new weapons', () => {
    const ids = WEAPONS.map((w) => w.id);
    for (const id of ['magma-pool', 'dirt-creator', 'dirt-remover']) expect(ids).toContain(id);
  });

  it('keeps the earth-moving weapons harmless on impact', () => {
    expect(weapon('dirt-creator').damage).toBe(0);
    expect(weapon('dirt-remover').damage).toBe(0);
  });
});

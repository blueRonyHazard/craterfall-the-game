import { describe, expect, it } from 'vitest';
import { Terrain } from '../src/game/entities/Terrain';
import { generateTerrain, TERRAIN_LAYOUTS } from '../src/game/entities/TerrainGenerator';
import { detectCollision } from '../src/game/physics/CollisionSystem';
import { isInsideTerrain, reflectOffSurface } from '../src/game/physics/TerrainCollision';
import { createTank } from '../src/game/entities/Tank';
import { TANK, TERRAIN } from '../src/game/config/gameBalance';
import { flatTerrain, makeProjectile } from './helpers';

describe('Terrain', () => {
  it('reports solidity relative to the surface', () => {
    const terrain = flatTerrain(400, 300, 200);
    expect(terrain.isSolid(50, 199)).toBe(false);
    expect(terrain.isSolid(50, 200)).toBe(true);
    expect(terrain.isSolid(50, 250)).toBe(true);
    expect(terrain.isSolid(-1, 250)).toBe(false);
    expect(terrain.isSolid(400, 250)).toBe(false);
  });

  it('interpolates height between columns', () => {
    const surface = new Float32Array([100, 200, 200]);
    const terrain = new Terrain(3, 300, surface);
    expect(terrain.heightAt(0.5)).toBeCloseTo(150);
  });

  it('carves a circular crater and reports the dirty range', () => {
    const terrain = flatTerrain(400, 300, 200);
    const dirty = terrain.carveCircle(200, 200, 30);
    expect(dirty).not.toBeNull();
    expect(dirty?.minX).toBeGreaterThanOrEqual(170);
    expect(dirty?.maxX).toBeLessThanOrEqual(230);
    expect(terrain.heightAt(200)).toBeCloseTo(230);
    expect(terrain.heightAt(100)).toBe(200);
    expect(terrain.isScorched(200)).toBe(true);
  });

  it('does nothing for an explosion entirely in the air', () => {
    const terrain = flatTerrain(400, 300, 200);
    expect(terrain.carveCircle(200, 100, 30)).toBeNull();
  });

  it('never carves through the bedrock', () => {
    const terrain = flatTerrain(400, 300, 200);
    terrain.carveCircle(200, 290, 200);
    expect(terrain.heightAt(200)).toBeLessThanOrEqual(300 - TERRAIN.bedrockThickness);
  });

  it('computes an upward normal on flat ground', () => {
    const n = flatTerrain().normalAt(100, { x: 0, y: 0 });
    expect(n.x).toBeCloseTo(0);
    expect(n.y).toBeCloseTo(-1);
  });
});

describe('generateTerrain', () => {
  it('is deterministic for a seed', () => {
    const a = generateTerrain({ width: 800, height: 400, seed: 42 });
    const b = generateTerrain({ width: 800, height: 400, seed: 42 });
    expect(Array.from(a.terrain.snapshot())).toEqual(Array.from(b.terrain.snapshot()));
    expect(a.tankPositions).toEqual(b.tankPositions);
    expect(a.layout).toBe(b.layout);
  });

  it('produces different terrain for different seeds', () => {
    const a = generateTerrain({ width: 800, height: 400, seed: 1 });
    const b = generateTerrain({ width: 800, height: 400, seed: 2 });
    expect(Array.from(a.terrain.snapshot())).not.toEqual(Array.from(b.terrain.snapshot()));
  });

  it('keeps every layout inside the configured bounds', () => {
    for (const layout of TERRAIN_LAYOUTS) {
      const { terrain } = generateTerrain({ width: 800, height: 400, seed: 5, layout });
      for (const y of terrain.snapshot()) {
        expect(y).toBeGreaterThanOrEqual(400 * TERRAIN.minSurface - 0.01);
        expect(y).toBeLessThanOrEqual(400 * TERRAIN.maxSurface + 0.01);
      }
    }
  });

  it('flattens a pad under each tank', () => {
    const { terrain, tankPositions } = generateTerrain({ width: 1600, height: 716, seed: 77 });
    for (const x of tankPositions) {
      expect(terrain.heightAt(x - 20)).toBeCloseTo(terrain.heightAt(x), 0);
      expect(terrain.heightAt(x + 20)).toBeCloseTo(terrain.heightAt(x), 0);
    }
  });
});

describe('collision detection', () => {
  it('detects terrain contact', () => {
    const terrain = flatTerrain(400, 300, 200);
    expect(detectCollision(makeProjectile({ x: 50, y: 150 }), terrain, []).kind).toBe('none');
    expect(detectCollision(makeProjectile({ x: 50, y: 205 }), terrain, []).kind).toBe('terrain');
    expect(isInsideTerrain(terrain, 50, 205)).toBe(true);
  });

  it('detects leaving the world at the sides and bottom but not the top', () => {
    const terrain = flatTerrain(400, 300, 200);
    expect(detectCollision(makeProjectile({ x: -500, y: 100 }), terrain, []).kind).toBe('outOfBounds');
    expect(detectCollision(makeProjectile({ x: 900, y: 100 }), terrain, []).kind).toBe('outOfBounds');
    expect(detectCollision(makeProjectile({ x: 100, y: 301 }), terrain, []).kind).toBe('outOfBounds');
    expect(detectCollision(makeProjectile({ x: 100, y: -400 }), terrain, []).kind).toBe('none');
  });

  it('detects tank hits and prioritises them over terrain', () => {
    const terrain = flatTerrain(400, 300, 200);
    const tank = createTank(1, 300, 200, 'x');
    const hit = detectCollision(makeProjectile({ x: 300, y: 200 - TANK.centerHeight }), terrain, [tank]);
    expect(hit).toEqual({ kind: 'tank', playerId: 1 });
  });

  it('ignores the firing tank right after launch', () => {
    const terrain = flatTerrain(400, 300, 200);
    const tank = createTank(0, 300, 200, 'x');
    const projectile = makeProjectile({ x: 300, y: 190, ownerId: 0 });
    expect(detectCollision(projectile, terrain, [tank]).kind).toBe('none');
    projectile.age = TANK.ownerArmingTime + 0.01;
    expect(detectCollision(projectile, terrain, [tank]).kind).toBe('tank');
  });

  it('reflects velocity off a flat surface', () => {
    const body = { x: 100, vx: 50, vy: 80 };
    reflectOffSurface(flatTerrain(), body, 0.5);
    expect(body.vx).toBeCloseTo(25);
    expect(body.vy).toBeCloseTo(-40);
  });
});

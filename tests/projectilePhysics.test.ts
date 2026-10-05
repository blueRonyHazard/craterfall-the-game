import { describe, expect, it } from 'vitest';
import { launchVelocity, simulateTrajectory, stepBody } from '../src/game/physics/ProjectilePhysics';

describe('launchVelocity', () => {
  it('fires straight right at 0°', () => {
    const v = launchVelocity(0, 100, 500);
    expect(v.vx).toBeCloseTo(500);
    expect(v.vy).toBeCloseTo(0);
  });

  it('fires straight up at 90° (negative y is up)', () => {
    const v = launchVelocity(90, 100, 500);
    expect(v.vx).toBeCloseTo(0);
    expect(v.vy).toBeCloseTo(-500);
  });

  it('fires up-left at 135°', () => {
    const v = launchVelocity(135, 100, 400);
    expect(v.vx).toBeLessThan(0);
    expect(v.vy).toBeLessThan(0);
    expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(400);
  });

  it('scales speed linearly with power', () => {
    const v = launchVelocity(45, 50, 800);
    expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(400);
  });
});

describe('stepBody', () => {
  it('applies velocity before position (semi-implicit Euler)', () => {
    const body = { x: 0, y: 0, vx: 10, vy: 0, age: 0 };
    stepBody(body, { gravity: 100, windAcceleration: 0, dt: 0.1 });
    expect(body.vy).toBeCloseTo(10);
    expect(body.y).toBeCloseTo(1);
    expect(body.x).toBeCloseTo(1);
    expect(body.age).toBeCloseTo(0.1);
  });

  it('moves in a straight line without gravity or wind', () => {
    const points = simulateTrajectory({ x: 0, y: 0, vx: 30, vy: -40 }, { gravity: 0, windAcceleration: 0, dt: 0.01 }, 100);
    const last = points[points.length - 1];
    expect(last?.x).toBeCloseTo(30);
    expect(last?.y).toBeCloseTo(-40);
  });

  it('approximates the analytic parabola', () => {
    const g = 400;
    const dt = 1 / 120;
    const steps = 120; // one second
    const start = { x: 0, y: 0, vx: 300, vy: -300 };
    const last = simulateTrajectory(start, { gravity: g, windAcceleration: 0, dt }, steps).at(-1);
    const t = steps * dt;
    const analyticY = start.vy * t + 0.5 * g * t * t;
    expect(last?.x).toBeCloseTo(300 * t, 6);
    // Semi-implicit Euler overshoots by g·dt·t/2; well under a world unit here.
    expect(Math.abs((last?.y ?? 0) - analyticY)).toBeLessThan(2);
  });

  it('wind pushes the projectile sideways', () => {
    const calm = simulateTrajectory({ x: 0, y: 0, vx: 0, vy: 0 }, { gravity: 0, windAcceleration: 0, dt: 0.01 }, 100).at(-1);
    const windy = simulateTrajectory({ x: 0, y: 0, vx: 0, vy: 0 }, { gravity: 0, windAcceleration: -50, dt: 0.01 }, 100).at(-1);
    expect(calm?.x).toBeCloseTo(0);
    expect(windy?.x ?? 0).toBeLessThan(-20);
  });

  it('is deterministic', () => {
    const params = { gravity: 400, windAcceleration: 37, dt: 1 / 120 };
    const a = simulateTrajectory({ x: 5, y: 5, vx: 123.4, vy: -456.7 }, params, 500);
    const b = simulateTrajectory({ x: 5, y: 5, vx: 123.4, vy: -456.7 }, params, 500);
    expect(a).toEqual(b);
  });
});

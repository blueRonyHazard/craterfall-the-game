import { degToRad } from '../../utils/math';

/** Minimal mutable body the integrator works on (a Projectile satisfies this). */
export interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
}

export interface PhysicsParams {
  /** Downward acceleration, units/s². */
  gravity: number;
  /** Horizontal acceleration from wind, units/s² (negative = towards the left). */
  windAcceleration: number;
  /** Fixed timestep in seconds. */
  dt: number;
}

/**
 * Initial velocity for a shot.
 *
 *   speed = maxSpeed * power / 100
 *   vx    =  speed * cos(angle)
 *   vy    = -speed * sin(angle)     (negated because +y points down on screen)
 *
 * With angle = 90° the shell goes straight up; 0° fires to the right.
 */
export function launchVelocity(angleDegrees: number, powerPercent: number, maxSpeed: number): { vx: number; vy: number } {
  const speed = (maxSpeed * powerPercent) / 100;
  const radians = degToRad(angleDegrees);
  return { vx: speed * Math.cos(radians), vy: -speed * Math.sin(radians) };
}

/**
 * Advances a body by one fixed step using semi-implicit (symplectic) Euler:
 *
 *   v(t+dt) = v(t) + a * dt
 *   p(t+dt) = p(t) + v(t+dt) * dt
 *
 * Updating velocity first keeps the orbit energy stable and, with a fixed dt,
 * the result is bit-for-bit deterministic across runs on the same JS engine.
 * Acceleration a = (windAcceleration, gravity). Mutates `body` in place.
 */
export function stepBody(body: Body, params: PhysicsParams): void {
  body.vx += params.windAcceleration * params.dt;
  body.vy += params.gravity * params.dt;
  body.x += body.vx * params.dt;
  body.y += body.vy * params.dt;
  body.age += params.dt;
}

/**
 * Pure helper that integrates a body for `steps` steps and returns the sampled
 * positions. Used by tests and could drive an aiming preview.
 */
export function simulateTrajectory(
  start: { x: number; y: number; vx: number; vy: number },
  params: PhysicsParams,
  steps: number,
): Array<{ x: number; y: number }> {
  const body: Body = { ...start, age: 0 };
  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < steps; i++) {
    stepBody(body, params);
    points.push({ x: body.x, y: body.y });
  }
  return points;
}

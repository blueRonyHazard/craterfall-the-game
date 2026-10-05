import type { Terrain } from '../entities/Terrain';

/** True if the point lies inside solid ground. */
export function isInsideTerrain(terrain: Terrain, x: number, y: number): boolean {
  return terrain.isSolid(x, y);
}

/** Moves a point that is inside the ground up to just above the surface. */
export function liftAboveSurface(terrain: Terrain, point: { x: number; y: number }, clearance = 1): void {
  const surface = terrain.heightAt(point.x);
  if (point.y > surface - clearance) {
    point.y = surface - clearance;
  }
}

const normalScratch = { x: 0, y: -1 };

/**
 * Reflects a velocity off the terrain surface at x:
 *   v' = (v - 2 (v·n) n) * restitution
 * where n is the upward surface normal. Mutates `body`.
 */
export function reflectOffSurface(
  terrain: Terrain,
  body: { x: number; vx: number; vy: number },
  restitution: number,
): void {
  const n = terrain.normalAt(body.x, normalScratch);
  const dot = body.vx * n.x + body.vy * n.y;
  if (dot >= 0) {
    // Already moving away from the surface; nothing to reflect.
    return;
  }
  body.vx = (body.vx - 2 * dot * n.x) * restitution;
  body.vy = (body.vy - 2 * dot * n.y) * restitution;
}

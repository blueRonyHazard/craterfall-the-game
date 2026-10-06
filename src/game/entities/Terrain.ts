import { TERRAIN } from '../config/gameBalance';
import { clamp } from '../../utils/math';

const SURFACE_SCORCHED = 1;
const SURFACE_FRESH_EARTH = 2;

export interface DirtyRange {
  minX: number;
  maxX: number;
}

/**
 * Destructible terrain stored as a height map: one surface value per world-unit
 * column. `surface[x]` is the y coordinate of the ground top at column x
 * (remember +y points down, so a larger value means lower ground).
 *
 * A height map cannot represent caves or overhangs, which keeps collision and
 * modification O(radius) and is a good fit for artillery gameplay.
 */
export class Terrain {
  readonly width: number;
  readonly height: number;
  private readonly surface: Float32Array;
  /**
   * Cosmetic state of each column's top, read by the renderer:
   * grass (untouched), scorched (blasted) or fresh earth (built up).
   */
  private readonly surfaceKind: Uint8Array;

  constructor(width: number, height: number, surface: Float32Array) {
    if (surface.length !== width) {
      throw new Error(`Surface length ${surface.length} does not match width ${width}`);
    }
    this.width = width;
    this.height = height;
    this.surface = surface;
    this.surfaceKind = new Uint8Array(width);
  }

  /** Lowest the surface may be pushed (keeps a strip of bedrock). */
  get floorY(): number {
    return this.height - TERRAIN.bedrockThickness;
  }

  /** Surface y at integer column, clamped to the world edges. */
  surfaceAtColumn(column: number): number {
    const c = column < 0 ? 0 : column >= this.width ? this.width - 1 : column | 0;
    return this.surface[c] as number;
  }

  /** Surface y at fractional x with linear interpolation between columns. */
  heightAt(x: number): number {
    const cx = clamp(x, 0, this.width - 1);
    const left = Math.floor(cx);
    const right = Math.min(left + 1, this.width - 1);
    const t = cx - left;
    const a = this.surface[left] as number;
    const b = this.surface[right] as number;
    return a + (b - a) * t;
  }

  /** True if the point is inside solid ground. Points outside the horizontal bounds are never solid. */
  isSolid(x: number, y: number): boolean {
    if (x < 0 || x >= this.width) {
      return false;
    }
    return y >= this.heightAt(x);
  }

  isScorched(column: number): boolean {
    return this.surfaceKind[column] === SURFACE_SCORCHED;
  }

  isFreshEarth(column: number): boolean {
    return this.surfaceKind[column] === SURFACE_FRESH_EARTH;
  }

  /**
   * Upward-facing unit normal of the surface at x, written into `out` to avoid allocation.
   * For a surface y = f(x) the tangent is (1, f'(x)); the normal pointing towards
   * the sky (negative y) is (f'(x), -1) normalised.
   */
  normalAt(x: number, out: { x: number; y: number }): { x: number; y: number } {
    const sample = 3;
    const slope = (this.heightAt(x + sample) - this.heightAt(x - sample)) / (2 * sample);
    const length = Math.sqrt(slope * slope + 1);
    out.x = slope / length;
    out.y = -1 / length;
    return out;
  }

  /**
   * Removes ground inside a circle. For each column the circle covers, the
   * surface is lowered to the bottom of the circle (if ground was above it).
   * Earth above an underground blast collapses into the crater, which is the
   * natural behaviour of a height map.
   *
   * `finish` sets how the exposed surface looks: charred by a blast, or freshly dug.
   *
   * @returns the affected column range, or null if nothing changed.
   */
  carveCircle(cx: number, cy: number, radius: number, finish: 'scorched' | 'freshEarth' = 'scorched'): DirtyRange | null {
    if (radius <= 0) {
      return null;
    }
    const minX = Math.max(0, Math.floor(cx - radius));
    const maxX = Math.min(this.width - 1, Math.ceil(cx + radius));
    const floor = this.floorY;
    let changed = false;
    let changedMin = maxX;
    let changedMax = minX;

    for (let x = minX; x <= maxX; x++) {
      const dx = x - cx;
      const inside = radius * radius - dx * dx;
      if (inside <= 0) {
        continue;
      }
      const bottom = Math.min(cy + Math.sqrt(inside), floor);
      const current = this.surface[x] as number;
      if (bottom > current) {
        this.surface[x] = bottom;
        this.surfaceKind[x] = finish === 'scorched' ? SURFACE_SCORCHED : SURFACE_FRESH_EARTH;
        changed = true;
        if (x < changedMin) changedMin = x;
        if (x > changedMax) changedMax = x;
      }
    }
    return changed ? { minX: changedMin, maxX: changedMax } : null;
  }

  /**
   * Adds a pyramid of earth. The apex is at (cx, apexY); each side falls by
   * `slope` units per column and the pyramid fills every column where that line
   * is above the existing ground, up to `maxSpread` columns either side.
   * Columns are only ever raised, never lowered, and never above `ceiling`.
   * Raised columns are marked as fresh earth.
   *
   * @returns the affected column range, or null if nothing changed.
   */
  raisePyramid(cx: number, apexY: number, slope: number, maxSpread: number, ceiling: number): DirtyRange | null {
    if (slope <= 0 || maxSpread <= 0) {
      return null;
    }
    const minX = Math.max(0, Math.floor(cx - maxSpread));
    const maxX = Math.min(this.width - 1, Math.ceil(cx + maxSpread));
    const apex = Math.max(apexY, ceiling);
    let changed = false;
    let changedMin = maxX;
    let changedMax = minX;

    for (let x = minX; x <= maxX; x++) {
      const top = apex + Math.abs(x - cx) * slope;
      const current = this.surface[x] as number;
      if (top < current) {
        this.surface[x] = top;
        this.surfaceKind[x] = SURFACE_FRESH_EARTH;
        changed = true;
        if (x < changedMin) changedMin = x;
        if (x > changedMax) changedMax = x;
      }
    }
    return changed ? { minX: changedMin, maxX: changedMax } : null;
  }

  /** Copy of the raw height map (used by tests and for state hashing). */
  snapshot(): Float32Array {
    return this.surface.slice();
  }
}

import { TANK, TERRAIN } from '../config/gameBalance';
import { SeededRandom } from '../../utils/random';
import { clamp, smoothstep } from '../../utils/math';
import { Terrain } from './Terrain';

export type TerrainLayout = 'rolling' | 'valley' | 'summit' | 'terraces';

export const TERRAIN_LAYOUTS: readonly TerrainLayout[] = ['rolling', 'valley', 'summit', 'terraces'];

export interface GeneratedTerrain {
  terrain: Terrain;
  layout: TerrainLayout;
  tankPositions: [number, number];
}

export interface TerrainGenerationOptions {
  width: number;
  height: number;
  seed: number;
  /** Force a layout; picked from the seed when omitted. */
  layout?: TerrainLayout;
  /** Force tank x positions; picked from the seed when omitted. */
  tankPositions?: [number, number];
}

/**
 * Builds a height map from a sum of sine octaves with seeded random phases and
 * frequencies, shapes it by layout, smooths it and flattens a pad under each tank.
 * The same seed always yields the same terrain.
 */
export function generateTerrain(options: TerrainGenerationOptions): GeneratedTerrain {
  const { width, height, seed } = options;
  const rng = new SeededRandom(seed);
  const layout = options.layout ?? rng.pick(TERRAIN_LAYOUTS);

  const octaves = TERRAIN.octaves.map((octave) => ({
    amplitude: octave.amplitude * rng.range(0.75, 1.2),
    frequency: (rng.range(octave.cycles[0], octave.cycles[1]) * Math.PI * 2) / width,
    phase: rng.range(0, Math.PI * 2),
  }));

  const base = height * TERRAIN.baseLevel;
  const raw = new Float32Array(width);
  for (let x = 0; x < width; x++) {
    let y = base;
    for (const octave of octaves) {
      y += Math.sin(x * octave.frequency + octave.phase) * octave.amplitude;
    }
    raw[x] = y + layoutOffset(layout, x / width, height);
  }

  if (layout === 'terraces') {
    quantise(raw, height * 0.045);
  }

  // Terraces get extra smoothing so the steps read as eroded ledges rather than walls.
  const smoothRadius = layout === 'terraces' ? TERRAIN.terraceSmoothRadius : TERRAIN.smoothRadius;
  const smoothed = boxBlur(raw, smoothRadius);
  const minY = height * TERRAIN.minSurface;
  const maxY = height * TERRAIN.maxSurface;
  for (let x = 0; x < width; x++) {
    smoothed[x] = clamp(smoothed[x] as number, minY, maxY);
  }

  const tankPositions: [number, number] = options.tankPositions ?? [
    Math.round(rng.range(TANK.spawnRangeP1[0], TANK.spawnRangeP1[1]) * width),
    Math.round(rng.range(TANK.spawnRangeP2[0], TANK.spawnRangeP2[1]) * width),
  ];
  for (const tx of tankPositions) {
    flattenPad(smoothed, tx);
  }

  return { terrain: new Terrain(width, height, smoothed), layout, tankPositions };
}

/** Large-scale shape added on top of the noise, t = x / width in 0..1. */
function layoutOffset(layout: TerrainLayout, t: number, height: number): number {
  switch (layout) {
    case 'valley':
      // A bowl: high at the sides, low in the middle.
      return -Math.cos(t * Math.PI * 2) * height * 0.09;
    case 'summit':
      // A central mountain that blocks direct fire.
      return -Math.exp(-((t - 0.5) ** 2) / 0.012) * height * 0.24;
    case 'rolling':
    case 'terraces':
      return 0;
  }
}

function quantise(values: Float32Array, step: number): void {
  for (let i = 0; i < values.length; i++) {
    values[i] = Math.round((values[i] as number) / step) * step;
  }
}

function boxBlur(values: Float32Array, radius: number): Float32Array {
  const out = new Float32Array(values.length);
  const last = values.length - 1;
  for (let i = 0; i < values.length; i++) {
    let sum = 0;
    let count = 0;
    for (let k = -radius; k <= radius; k++) {
      const j = i + k < 0 ? 0 : i + k > last ? last : i + k;
      sum += values[j] as number;
      count++;
    }
    out[i] = sum / count;
  }
  return out;
}

/** Flattens the ground under a tank and blends it smoothly into its surroundings. */
function flattenPad(surface: Float32Array, centerX: number): void {
  const half = TERRAIN.padHalfWidth;
  const blend = TERRAIN.padBlend;
  const level = surface[clamp(Math.round(centerX), 0, surface.length - 1)] as number;
  const from = Math.max(0, Math.floor(centerX - half - blend));
  const to = Math.min(surface.length - 1, Math.ceil(centerX + half + blend));
  for (let x = from; x <= to; x++) {
    const d = Math.abs(x - centerX);
    const weight = d <= half ? 1 : 1 - smoothstep((d - half) / blend);
    surface[x] = (surface[x] as number) * (1 - weight) + level * weight;
  }
}

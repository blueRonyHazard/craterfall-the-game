import * as Phaser from 'phaser';
import type { Terrain } from '../entities/Terrain';
import { PALETTE } from '../config/theme';
import { SeededRandom } from '../../utils/random';

const GRASS_DEPTH = 7;
const GRASS_HIGHLIGHT = 2;
const SCORCH_DEPTH = 5;
const FRESH_EARTH_DEPTH = 6;
const STRATA_COUNT = 9;
const SPECKLE_DENSITY = 0.0016;

/**
 * Draws the height-map terrain into a CanvasTexture.
 *
 * A full-size "soil" canvas (gradient, wavy strata, pebbles) is painted once.
 * Rendering a column range then means: copy that slice of soil, mask it to the
 * terrain silhouette, and paint the grass / scorch cap. After an explosion only
 * the dirty column range is redrawn.
 */
export class TerrainRenderer {
  private readonly texture: Phaser.Textures.CanvasTexture;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly soil: HTMLCanvasElement;
  readonly image: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    private readonly terrain: Terrain,
    seed: number,
    key = 'terrain',
  ) {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const texture = scene.textures.createCanvas(key, terrain.width, terrain.height);
    if (!texture) throw new Error('Could not create terrain texture');
    this.texture = texture;
    this.ctx = texture.getContext();
    this.soil = paintSoil(terrain.width, terrain.height, new SeededRandom(seed));
    this.image = scene.add.image(0, 0, key).setOrigin(0, 0);
    layer.add(this.image);
    this.redraw(0, terrain.width - 1);
  }

  /** Redraws columns minX..maxX (inclusive) and uploads the texture. */
  redraw(minX: number, maxX: number): void {
    const from = Math.max(0, Math.floor(minX) - 1);
    const to = Math.min(this.terrain.width - 1, Math.ceil(maxX) + 1);
    const w = to - from + 1;
    const h = this.terrain.height;
    const ctx = this.ctx;

    ctx.save();
    ctx.beginPath();
    ctx.rect(from, 0, w, h);
    ctx.clip();

    ctx.clearRect(from, 0, w, h);
    ctx.drawImage(this.soil, from, 0, w, h, from, 0, w, h);

    // Keep only the soil below the surface (destination-in keeps pixels covered by the path).
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.moveTo(from, h);
    for (let x = from; x <= to; x++) {
      ctx.lineTo(x, this.terrain.surfaceAtColumn(x));
      ctx.lineTo(x + 1, this.terrain.surfaceAtColumn(x));
    }
    ctx.lineTo(to + 1, h);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    this.paintCap(from, to);
    ctx.restore();
    this.texture.refresh();
  }

  /** Grass on untouched ground, charred rim on crater walls, light soil on built-up earth. */
  private paintCap(from: number, to: number): void {
    const ctx = this.ctx;
    for (let x = from; x <= to; x++) {
      const top = this.terrain.surfaceAtColumn(x);
      if (top >= this.terrain.height - 1) continue;
      if (this.terrain.isFreshEarth(x)) {
        ctx.fillStyle = PALETTE.freshEarthEdge;
        ctx.fillRect(x, top, 1, 1.5);
        ctx.fillStyle = PALETTE.freshEarth;
        ctx.fillRect(x, top + 1.5, 1, FRESH_EARTH_DEPTH);
      } else if (this.terrain.isScorched(x)) {
        ctx.fillStyle = PALETTE.scorchedEdge;
        ctx.fillRect(x, top, 1, 1.5);
        ctx.fillStyle = PALETTE.scorched;
        ctx.fillRect(x, top + 1.5, 1, SCORCH_DEPTH);
      } else {
        ctx.fillStyle = PALETTE.grassShade;
        ctx.fillRect(x, top, 1, GRASS_DEPTH);
        ctx.fillStyle = PALETTE.grass;
        ctx.fillRect(x, top, 1, GRASS_HIGHLIGHT + (x % 5 === 0 ? 1 : 0));
      }
    }
  }
}

function paintSoil(width: number, height: number, rng: SeededRandom): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const gradient = ctx.createLinearGradient(0, height * 0.25, 0, height);
  gradient.addColorStop(0, PALETTE.soilTop);
  gradient.addColorStop(0.55, PALETTE.soilMid);
  gradient.addColorStop(0.92, PALETTE.soilDeep);
  gradient.addColorStop(1, PALETTE.bedrock);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Wavy sediment strata.
  for (let i = 0; i < STRATA_COUNT; i++) {
    const baseY = height * (0.3 + (0.65 * i) / STRATA_COUNT);
    const amplitude = rng.range(4, 14);
    const frequency = rng.range(2, 5) * ((Math.PI * 2) / width);
    const phase = rng.range(0, Math.PI * 2);
    const thickness = rng.range(3, 9);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 220, 190, 0.05)';
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    for (let x = 0; x <= width; x += 8) {
      ctx.lineTo(x, baseY + Math.sin(x * frequency + phase) * amplitude);
    }
    for (let x = width; x >= 0; x -= 8) {
      ctx.lineTo(x, baseY + thickness + Math.sin(x * frequency + phase) * amplitude);
    }
    ctx.closePath();
    ctx.fill();
  }

  // Pebbles and speckles.
  const speckles = Math.floor(width * height * SPECKLE_DENSITY);
  for (let i = 0; i < speckles; i++) {
    ctx.fillStyle = rng.next() < 0.5 ? 'rgba(0, 0, 0, 0.18)' : 'rgba(255, 235, 210, 0.08)';
    const size = rng.next() < 0.1 ? 3 : rng.next() < 0.4 ? 2 : 1;
    ctx.fillRect(rng.range(0, width), rng.range(0, height), size, size);
  }
  return canvas;
}

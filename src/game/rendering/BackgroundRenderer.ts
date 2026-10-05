import * as Phaser from 'phaser';
import { PALETTE } from '../config/theme';
import { SeededRandom } from '../../utils/random';
import { TEXTURES } from './textures';

const STAR_COUNT = 140;
const CLOUD_COUNT = 6;
const CLOUD_BASE_SPEED = 5;
const CLOUD_WIND_SPEED = 3.5;
const CLOUD_TINT = 0xffc9d6;

interface MountainLayer {
  base: number;
  amplitude: number;
  color: string;
  haze: number;
}

const MOUNTAINS: readonly MountainLayer[] = [
  { base: 0.5, amplitude: 0.12, color: PALETTE.mountainsFar, haze: 0.35 },
  { base: 0.6, amplitude: 0.1, color: PALETTE.mountainsMid, haze: 0.22 },
  { base: 0.7, amplitude: 0.08, color: PALETTE.mountainsNear, haze: 0.12 },
];

/**
 * Layered, procedurally painted backdrop: gradient sky, stars, a low sun,
 * three hazy mountain ranges (baked into one canvas texture) and drifting
 * clouds whose speed follows the wind — a constant ambient wind cue.
 */
export class BackgroundRenderer {
  private readonly clouds: Phaser.GameObjects.Image[] = [];
  private readonly cloudSpeeds: number[] = [];
  private wind = 0;

  constructor(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    private readonly width: number,
    height: number,
    seed: number,
  ) {
    const key = `background-${width}x${height}`;
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const texture = scene.textures.createCanvas(key, width, height);
    if (texture) {
      paintBackdrop(texture.getContext(), width, height, new SeededRandom(seed));
      texture.refresh();
      layer.add(scene.add.image(0, 0, key).setOrigin(0, 0));
    }

    const rng = new SeededRandom(seed ^ 0x5bd1e995);
    for (let i = 0; i < CLOUD_COUNT; i++) {
      const cloud = scene.add
        .image(rng.range(0, width), rng.range(height * 0.06, height * 0.38), TEXTURES.cloud)
        .setAlpha(rng.range(0.18, 0.4))
        .setScale(rng.range(0.7, 1.5), rng.range(0.6, 1))
        .setTint(CLOUD_TINT);
      layer.add(cloud);
      this.clouds.push(cloud);
      this.cloudSpeeds.push(rng.range(0.6, 1.4));
    }
  }

  /** @param windSigned signed wind strength (direction × strength). */
  setWind(windSigned: number): void {
    this.wind = windSigned;
  }

  update(deltaSeconds: number): void {
    const margin = 160;
    this.clouds.forEach((cloud, i) => {
      const direction = this.wind === 0 ? 1 : Math.sign(this.wind);
      const speed = (CLOUD_BASE_SPEED * direction + this.wind * CLOUD_WIND_SPEED) * (this.cloudSpeeds[i] ?? 1);
      cloud.x += speed * deltaSeconds;
      if (cloud.x > this.width + margin) cloud.x = -margin;
      if (cloud.x < -margin) cloud.x = this.width + margin;
    });
  }
}

function paintBackdrop(ctx: CanvasRenderingContext2D, width: number, height: number, rng: SeededRandom): void {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(0.45, PALETTE.skyMid);
  sky.addColorStop(0.82, PALETTE.skyHorizon);
  sky.addColorStop(1, PALETTE.skyGlow);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < STAR_COUNT; i++) {
    const y = rng.range(0, height * 0.5);
    ctx.globalAlpha = (1 - y / (height * 0.5)) * rng.range(0.3, 0.9);
    ctx.fillStyle = '#ffffff';
    const size = rng.next() < 0.15 ? 2 : 1;
    ctx.fillRect(rng.range(0, width), y, size, size);
  }
  ctx.globalAlpha = 1;

  const sunX = width * rng.range(0.55, 0.8);
  const sunY = height * 0.6;
  const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, height * 0.55);
  glow.addColorStop(0, 'rgba(255, 200, 150, 0.45)');
  glow.addColorStop(1, 'rgba(255, 200, 150, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = PALETTE.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, height * 0.09, 0, Math.PI * 2);
  ctx.fill();

  for (const layer of MOUNTAINS) {
    paintRidge(ctx, width, height, layer, rng);
  }
}

function paintRidge(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  layer: MountainLayer,
  rng: SeededRandom,
): void {
  const f1 = rng.range(1.5, 3) * ((Math.PI * 2) / width);
  const f2 = rng.range(5, 9) * ((Math.PI * 2) / width);
  const p1 = rng.range(0, Math.PI * 2);
  const p2 = rng.range(0, Math.PI * 2);
  const step = 4;

  ctx.beginPath();
  ctx.moveTo(0, height);
  for (let x = 0; x <= width; x += step) {
    const n = Math.sin(x * f1 + p1) * 0.7 + Math.sin(x * f2 + p2) * 0.3;
    ctx.lineTo(x, height * (layer.base - n * layer.amplitude));
  }
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fillStyle = layer.color;
  ctx.fill();

  // Atmospheric haze: fade the base of each range into the horizon colour.
  const top = height * (layer.base - layer.amplitude);
  const haze = ctx.createLinearGradient(0, top, 0, height);
  haze.addColorStop(0, `rgba(196, 88, 122, 0)`);
  haze.addColorStop(1, `rgba(196, 88, 122, ${layer.haze})`);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = haze;
  ctx.fillRect(0, top, width, height - top);
  ctx.restore();
}

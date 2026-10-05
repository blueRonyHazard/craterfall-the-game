import * as Phaser from 'phaser';

/** Keys of textures generated at boot. No image files are loaded. */
export const TEXTURES = {
  glow: 'tex-glow',
  spark: 'tex-spark',
  smoke: 'tex-smoke',
  debris: 'tex-debris',
  cloud: 'tex-cloud',
} as const;

const GLOW_SIZE = 64;
const SPARK_SIZE = 16;
const SMOKE_SIZE = 48;
const DEBRIS_SIZE = 6;
const CLOUD_WIDTH = 260;
const CLOUD_HEIGHT = 90;

/** Creates all procedural textures used by the effects and background. */
export function generateTextures(scene: Phaser.Scene): void {
  radial(scene, TEXTURES.glow, GLOW_SIZE, [
    [0, 'rgba(255,255,255,1)'],
    [0.35, 'rgba(255,255,255,0.55)'],
    [1, 'rgba(255,255,255,0)'],
  ]);
  radial(scene, TEXTURES.spark, SPARK_SIZE, [
    [0, 'rgba(255,255,255,1)'],
    [0.5, 'rgba(255,255,255,0.8)'],
    [1, 'rgba(255,255,255,0)'],
  ]);
  radial(scene, TEXTURES.smoke, SMOKE_SIZE, [
    [0, 'rgba(255,255,255,0.55)'],
    [0.6, 'rgba(255,255,255,0.2)'],
    [1, 'rgba(255,255,255,0)'],
  ]);

  const debris = scene.textures.createCanvas(TEXTURES.debris, DEBRIS_SIZE, DEBRIS_SIZE);
  if (debris) {
    const ctx = debris.getContext();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, DEBRIS_SIZE, DEBRIS_SIZE);
    debris.refresh();
  }

  const cloud = scene.textures.createCanvas(TEXTURES.cloud, CLOUD_WIDTH, CLOUD_HEIGHT);
  if (cloud) {
    const ctx = cloud.getContext();
    // A soft cloud built from overlapping radial puffs (fixed layout → identical every run).
    const puffs: Array<[number, number, number]> = [
      [60, 58, 34],
      [105, 44, 42],
      [155, 50, 38],
      [200, 60, 28],
      [130, 64, 36],
    ];
    for (const [x, y, r] of puffs) {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, 'rgba(255,255,255,0.5)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    cloud.refresh();
  }
}

function radial(scene: Phaser.Scene, key: string, size: number, stops: Array<[number, string]>): void {
  const texture = scene.textures.createCanvas(key, size, size);
  if (!texture) return;
  const ctx = texture.getContext();
  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  texture.refresh();
}

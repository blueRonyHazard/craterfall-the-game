import * as Phaser from 'phaser';
import { EFFECTS } from '../config/gameBalance';
import { FONT_FAMILY, PALETTE } from '../config/theme';
import { TEXTURES } from './textures';

const FIRE_PER_RADIUS = 0.9;
const DEBRIS_PER_RADIUS = 0.7;
const SMOKE_PER_RADIUS = 0.25;
const DUST_INTERVAL_MS = 40;
/** How far above its landing spot the pyramid appears before it falls. */
const PYRAMID_FALL_DISTANCE = 240;
const PYRAMID_SHAKE_MS = 180;
const PYRAMID_SHAKE_INTENSITY = 0.006;

/**
 * Explosions, debris, smoke, muzzle flashes, floating damage numbers and screen
 * shake. Particle emitters are created once and re-used with explode().
 */
export class EffectsRenderer {
  private readonly fire: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly smoke: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly debris: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly dustCloud: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly droplets: Phaser.GameObjects.Particles.ParticleEmitter;
  private lastDust = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
    private readonly camera: Phaser.Cameras.Scene2D.Camera,
    private readonly shakeEnabled: () => boolean,
  ) {
    this.smoke = scene.add.particles(0, 0, TEXTURES.smoke, {
      emitting: false,
      lifespan: { min: 900, max: 1700 },
      speed: { min: 10, max: 60 },
      angle: { min: 230, max: 310 },
      scale: { start: 0.6, end: 2.2 },
      alpha: { start: 0.55, end: 0 },
      tint: PALETTE.smoke,
      gravityY: -20,
    });
    this.debris = scene.add.particles(0, 0, TEXTURES.debris, {
      emitting: false,
      lifespan: { min: 600, max: 1300 },
      speed: { min: 120, max: 420 },
      angle: { min: 200, max: 340 },
      scale: { min: 0.5, max: 1.3 },
      rotate: { min: 0, max: 360 },
      gravityY: 700,
      tint: [...PALETTE.debris],
    });
    this.fire = scene.add.particles(0, 0, TEXTURES.glow, {
      emitting: false,
      lifespan: { min: 280, max: 650 },
      speed: { min: 40, max: 260 },
      scale: { start: 0.9, end: 0.05 },
      alpha: { start: 1, end: 0 },
      color: [...PALETTE.explosionFire],
      colorEase: 'quad.out',
      blendMode: Phaser.BlendModes.ADD,
    });
    this.sparks = scene.add.particles(0, 0, TEXTURES.spark, {
      emitting: false,
      lifespan: { min: 200, max: 500 },
      speed: { min: 150, max: 450 },
      scale: { start: 0.7, end: 0 },
      gravityY: 300,
      tint: PALETTE.accent,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.dustCloud = scene.add.particles(0, 0, TEXTURES.smoke, {
      emitting: false,
      lifespan: { min: 900, max: 1900 },
      speed: { min: 20, max: 140 },
      angle: { min: 190, max: 350 },
      scale: { start: 0.7, end: 2.8 },
      alpha: { start: 0.65, end: 0 },
      tint: PALETTE.dust,
      gravityY: -10,
    });
    this.droplets = scene.add.particles(0, 0, TEXTURES.spark, {
      emitting: false,
      lifespan: { min: 500, max: 1100 },
      speed: { min: 120, max: 380 },
      angle: { min: 215, max: 325 },
      scale: { start: 0.8, end: 0.2 },
      gravityY: 650,
      tint: [PALETTE.magmaOuter, PALETTE.magmaInner, PALETTE.magmaHot],
      blendMode: Phaser.BlendModes.ADD,
    });
    layer.add([this.smoke, this.dustCloud, this.debris, this.fire, this.droplets, this.sparks]);
  }

  /** Earth-moving burst: a cloud of dust and clods, no fire and no shake. */
  dustBurst(x: number, y: number, radius: number): void {
    const size = Math.max(20, radius);
    this.dustCloud.explode(Math.round(size * 0.35), x, y);
    this.debris.explode(Math.round(size * 0.6), x, y);
    const ring = this.scene.add.circle(x, y, size).setStrokeStyle(3, PALETTE.dust, 0.7);
    this.layer.add(ring);
    this.scene.tweens.add({
      targets: ring,
      scale: { from: 0.5, to: 1.2 },
      alpha: { from: 0.7, to: 0 },
      duration: 500,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  /** Molten splash on impact (on top of a normal small explosion). */
  magmaSplash(x: number, y: number, radius: number): void {
    this.explosion(x, y, radius);
    this.droplets.explode(Math.round(radius * 1.2), x, y);
  }

  /** A single ember rising from a magma pool. */
  ember(x: number, y: number): void {
    this.droplets.explode(1, x, y);
  }

  /** Flames licking a tank that is standing in magma. */
  burn(x: number, y: number): void {
    this.fire.explode(14, x, y);
    this.droplets.explode(8, x, y);
    this.smoke.explode(4, x, y);
  }

  /**
   * A pyramid of earth falls from the sky and lands with its apex at
   * (x, apexY). The terrain itself is redrawn by WorldView when it lands.
   */
  pyramidDrop(x: number, apexY: number, height: number, halfWidth: number): void {
    const shape = this.scene.add.graphics();
    const baseY = apexY + height;
    shape.fillStyle(PALETTE.dust, 1);
    shape.fillTriangle(x, apexY, x - halfWidth, baseY, x + halfWidth, baseY);
    shape.lineStyle(2, 0xa8825a, 1);
    shape.lineBetween(x - halfWidth, baseY, x, apexY);
    shape.lineBetween(x, apexY, x + halfWidth, baseY);
    this.layer.add(shape);

    shape.y = -PYRAMID_FALL_DISTANCE;
    shape.setAlpha(0);
    this.scene.tweens.add({
      targets: shape,
      y: 0,
      alpha: 1,
      duration: EFFECTS.pyramidDropMs,
      ease: 'Quad.easeIn',
      onComplete: () => {
        shape.destroy();
        this.dustCloud.explode(22, x - halfWidth * 0.6, baseY);
        this.dustCloud.explode(22, x + halfWidth * 0.6, baseY);
        this.debris.explode(30, x, baseY);
        if (this.shakeEnabled()) this.camera.shake(PYRAMID_SHAKE_MS, PYRAMID_SHAKE_INTENSITY);
      },
    });
  }

  explosion(x: number, y: number, radius: number): void {
    if (radius <= 0) return;
    const scale = radius / 40;
    this.flash(x, y, radius);
    this.shockwave(x, y, radius);
    this.fire.explode(Math.round(radius * FIRE_PER_RADIUS), x, y);
    this.debris.explode(Math.round(radius * DEBRIS_PER_RADIUS), x, y);
    this.smoke.explode(Math.max(3, Math.round(radius * SMOKE_PER_RADIUS)), x, y);
    this.sparks.explode(Math.round(8 * scale), x, y);

    if (radius >= EFFECTS.shakeRadiusThreshold && this.shakeEnabled()) {
      const intensity = Math.min(
        EFFECTS.maxShakeIntensity,
        (radius - EFFECTS.shakeRadiusThreshold + 20) * EFFECTS.shakeIntensityPerRadius,
      );
      this.camera.shake(EFFECTS.shakeDurationMs, intensity);
    }
  }

  /** Larger, longer blast for a destroyed tank. */
  tankDestroyed(x: number, y: number): void {
    this.explosion(x, y, 70);
    this.scene.time.delayedCall(180, () => this.explosion(x + 12, y - 8, 40));
    this.smoke.explode(18, x, y);
  }

  muzzleFlash(x: number, y: number, color: number): void {
    const flash = this.scene.add.image(x, y, TEXTURES.glow).setTint(color).setBlendMode(Phaser.BlendModes.ADD).setScale(0.9);
    this.layer.add(flash);
    this.scene.tweens.add({ targets: flash, scale: 0.2, alpha: 0, duration: 160, onComplete: () => flash.destroy() });
    this.smoke.explode(3, x, y);
  }

  bounce(x: number, y: number): void {
    this.debris.explode(10, x, y);
    this.sparks.explode(6, x, y);
  }

  /** Cluster split pop. */
  burst(x: number, y: number, color: number): void {
    const ring = this.scene.add.circle(x, y, 6).setStrokeStyle(2, color, 1);
    this.layer.add(ring);
    this.scene.tweens.add({ targets: ring, scale: 4, alpha: 0, duration: 260, onComplete: () => ring.destroy() });
    this.sparks.explode(10, x, y);
  }

  /** Marker flare where an air strike was called in. */
  flare(x: number, y: number, color: number): void {
    const beam = this.scene.add.rectangle(x, y / 2, 4, Math.max(20, y), color, 0.35).setBlendMode(Phaser.BlendModes.ADD);
    this.layer.add(beam);
    this.scene.tweens.add({ targets: beam, alpha: 0, scaleX: 6, duration: 900, onComplete: () => beam.destroy() });
    this.sparks.explode(16, x, y);
  }

  /** Throttled dust while a drill bores through the ground. */
  dust(x: number, y: number): void {
    const now = this.scene.time.now;
    if (now - this.lastDust < DUST_INTERVAL_MS) return;
    this.lastDust = now;
    this.debris.explode(2, x, y);
  }

  damageNumber(x: number, y: number, amount: number): void {
    const text = this.scene.add
      .text(x, y, `-${amount}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#2b0f17',
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    this.layer.add(text);
    this.scene.tweens.add({
      targets: text,
      y: y - 46,
      alpha: { from: 1, to: 0 },
      scale: { from: 1.25, to: 0.9 },
      duration: 1100,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  private flash(x: number, y: number, radius: number): void {
    const core = this.scene.add.circle(x, y, radius * 0.9, PALETTE.explosionCore, 0.95).setBlendMode(Phaser.BlendModes.ADD);
    this.layer.add(core);
    this.scene.tweens.add({
      targets: core,
      scale: { from: 0.3, to: 1.15 },
      alpha: { from: 0.95, to: 0 },
      duration: 320,
      ease: 'Quad.easeOut',
      onComplete: () => core.destroy(),
    });
  }

  private shockwave(x: number, y: number, radius: number): void {
    const ring = this.scene.add.circle(x, y, radius).setStrokeStyle(3, 0xffffff, 0.8);
    this.layer.add(ring);
    this.scene.tweens.add({
      targets: ring,
      scale: { from: 0.4, to: 1.5 },
      alpha: { from: 0.8, to: 0 },
      duration: 420,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }
}

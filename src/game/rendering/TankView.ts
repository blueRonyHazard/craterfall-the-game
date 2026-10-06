import * as Phaser from 'phaser';
import { TANK } from '../config/gameBalance';
import { PALETTE, type PlayerTheme } from '../config/theme';
import type { TankState } from '../../types/game';
import { degToRad } from '../../utils/math';

const BAR_WIDTH = 46;
const BAR_HEIGHT = 6;
const BAR_OFFSET_Y = -48;
const MARKER_OFFSET_Y = -66;
const BARREL_WIDTH = 6;
const RECOIL_DISTANCE = 6;
const TRACK_COLOR = 0x1a1d2e;
const WHEEL_COLOR = 0x3a3f5c;
const WRECK_COLOR = 0x2a2833;

/**
 * Vector-drawn tank. Player 1 gets an angular wedge hull, player 2 a rounded
 * dome hull, so the silhouettes differ even without colour.
 */
export class TankView {
  readonly container: Phaser.GameObjects.Container;
  private readonly barrel: Phaser.GameObjects.Container;
  private readonly hull: Phaser.GameObjects.Graphics;
  private readonly healthBar: Phaser.GameObjects.Graphics;
  private readonly marker: Phaser.GameObjects.Triangle;
  private readonly markerTween: Phaser.Tweens.Tween;
  private displayedHealth: number;
  private destroyed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    tank: TankState,
    private readonly theme: PlayerTheme,
  ) {
    this.displayedHealth = tank.health;

    this.barrel = scene.add.container(0, -TANK.turretHeight);
    const barrelShape = scene.add.graphics();
    barrelShape.fillStyle(theme.dark, 1);
    barrelShape.fillRoundedRect(0, -BARREL_WIDTH / 2, TANK.barrelLength, BARREL_WIDTH, 2);
    barrelShape.fillStyle(theme.light, 1);
    barrelShape.fillRect(TANK.barrelLength - 5, -BARREL_WIDTH / 2 - 1, 5, BARREL_WIDTH + 2);
    this.barrel.add(barrelShape);

    this.hull = scene.add.graphics();
    this.drawHull(tank.playerId === 0 ? 'wedge' : 'dome', theme.color);

    this.healthBar = scene.add.graphics();
    this.marker = scene.add
      .triangle(0, MARKER_OFFSET_Y, 0, 0, 14, 0, 7, 10, theme.color)
      .setStrokeStyle(2, 0x000000, 0.35);
    this.markerTween = scene.tweens.add({
      targets: this.marker,
      y: MARKER_OFFSET_Y - 6,
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.container = scene.add.container(tank.x, tank.y, [this.barrel, this.hull, this.healthBar, this.marker]);
    layer.add(this.container);
    this.setAngle(tank.angle);
    this.drawHealth(tank.health, tank.maxHealth);
    this.setActive(false);
  }

  setAngle(angleDegrees: number): void {
    // Game angles are counter-clockwise from +x; Phaser rotation is clockwise (y down).
    this.barrel.rotation = -degToRad(angleDegrees);
  }

  setActive(active: boolean): void {
    this.marker.setVisible(active && !this.destroyed);
    if (active) this.markerTween.resume();
    else this.markerTween.pause();
  }

  /** Animates the tank dropping to a new resting position. */
  moveTo(x: number, y: number, delayMs = 0): void {
    this.scene.tweens.add({ targets: this.container, x, y, delay: delayMs, duration: 260, ease: 'Quad.easeIn' });
  }

  recoil(angleDegrees: number): void {
    const radians = degToRad(angleDegrees);
    const baseY = -TANK.turretHeight;
    this.barrel.setPosition(-Math.cos(radians) * RECOIL_DISTANCE, baseY + Math.sin(radians) * RECOIL_DISTANCE);
    this.scene.tweens.add({ targets: this.barrel, x: 0, y: baseY, duration: 220, ease: 'Back.easeOut' });
  }

  /** Smoothly animates the health bar to the new value. */
  setHealth(health: number, maxHealth: number): void {
    const counter = { value: this.displayedHealth };
    this.scene.tweens.add({
      targets: counter,
      value: health,
      duration: 400,
      ease: 'Cubic.easeOut',
      onUpdate: () => this.drawHealth(counter.value, maxHealth),
    });
    this.displayedHealth = health;
  }

  markDestroyed(): void {
    this.destroyed = true;
    this.setActive(false);
    this.drawHull('wreck', WRECK_COLOR);
    this.scene.tweens.add({ targets: this.barrel, rotation: 0.5, duration: 600, ease: 'Bounce.easeOut' });
    this.healthBar.setVisible(false);
  }

  private drawHull(shape: 'wedge' | 'dome' | 'wreck', color: number): void {
    const g = this.hull;
    g.clear();
    // Tracks
    g.fillStyle(TRACK_COLOR, 1);
    g.fillRoundedRect(-25, -10, 50, 10, 5);
    g.fillStyle(WHEEL_COLOR, 1);
    for (let i = -18; i <= 18; i += 9) g.fillCircle(i, -5, 3);

    g.fillStyle(color, 1);
    if (shape === 'wedge') {
      g.fillPoints(
        [
          new Phaser.Math.Vector2(-23, -10),
          new Phaser.Math.Vector2(23, -10),
          new Phaser.Math.Vector2(17, -19),
          new Phaser.Math.Vector2(-19, -19),
        ],
        true,
      );
      g.fillStyle(this.theme.dark, 1);
      g.fillRect(-14, -16, 28, 2);
    } else if (shape === 'dome') {
      g.fillRoundedRect(-21, -19, 42, 10, 5);
      g.fillStyle(this.theme.dark, 1);
      g.fillCircle(-12, -14, 2);
      g.fillCircle(12, -14, 2);
    } else {
      g.fillRoundedRect(-20, -16, 40, 7, 3);
    }
    // Turret dome
    g.fillStyle(shape === 'wreck' ? color : this.theme.light, 1);
    g.slice(0, -TANK.turretHeight + 2, 9, Math.PI, 0, false);
    g.fillPath();
  }

  private drawHealth(health: number, maxHealth: number): void {
    const g = this.healthBar;
    const ratio = Math.max(0, Math.min(1, health / maxHealth));
    const color = ratio > 0.6 ? PALETTE.healthHigh : ratio > 0.3 ? PALETTE.healthMid : PALETTE.healthLow;
    g.clear();
    g.fillStyle(0x000000, 0.55);
    g.fillRoundedRect(-BAR_WIDTH / 2 - 1, BAR_OFFSET_Y - 1, BAR_WIDTH + 2, BAR_HEIGHT + 2, 3);
    if (ratio > 0) {
      g.fillStyle(color, 1);
      g.fillRoundedRect(-BAR_WIDTH / 2, BAR_OFFSET_Y, Math.max(2, BAR_WIDTH * ratio), BAR_HEIGHT, 2);
    }
  }
}

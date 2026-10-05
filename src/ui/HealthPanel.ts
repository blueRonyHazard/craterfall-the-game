import * as Phaser from 'phaser';
import { PALETTE, type PlayerTheme } from '../game/config/theme';
import { textStyle } from './text';

const BAR_WIDTH = 320;
const BAR_HEIGHT = 14;

/** Player name, health bar and numeric health for the top HUD bar. */
export class HealthPanel extends Phaser.GameObjects.Container {
  private readonly bar: Phaser.GameObjects.Graphics;
  private readonly valueText: Phaser.GameObjects.Text;
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly sign: 1 | -1;
  private shown = 0;
  private maxHealth = 1;
  private readonly baseName: string;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly align: 'left' | 'right',
    name: string,
    private readonly theme: PlayerTheme,
  ) {
    super(scene, x, y);
    this.sign = align === 'left' ? 1 : -1;
    this.baseName = name.toUpperCase();
    const originX = align === 'left' ? 0 : 1;
    this.nameText = scene.add.text(0, -12, this.baseName, textStyle(18, theme.css, 'bold')).setOrigin(originX, 0.5);
    this.valueText = scene.add
      .text(this.sign * BAR_WIDTH, -12, '', textStyle(16, PALETTE.textMuted))
      .setOrigin(1 - originX, 0.5);
    this.bar = scene.add.graphics();
    this.add([this.nameText, this.valueText, this.bar]);
    scene.add.existing(this);
  }

  setHealth(health: number, maxHealth: number, animate = true): void {
    this.maxHealth = maxHealth;
    if (!animate) {
      this.shown = health;
      this.redraw();
      return;
    }
    const counter = { value: this.shown };
    this.scene.tweens.add({
      targets: counter,
      value: health,
      duration: 450,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        this.shown = counter.value;
        this.redraw();
      },
    });
  }

  setHighlighted(active: boolean): this {
    this.nameText.setText(active ? `▶ ${this.baseName}` : this.baseName);
    this.nameText.setAlpha(active ? 1 : 0.65);
    return this;
  }

  private redraw(): void {
    const ratio = Phaser.Math.Clamp(this.shown / this.maxHealth, 0, 1);
    const color = ratio > 0.6 ? PALETTE.healthHigh : ratio > 0.3 ? PALETTE.healthMid : PALETTE.healthLow;
    const g = this.bar;
    const x0 = this.align === 'left' ? 0 : -BAR_WIDTH;
    g.clear();
    g.fillStyle(0x000000, 0.45);
    g.fillRoundedRect(x0, 4, BAR_WIDTH, BAR_HEIGHT, BAR_HEIGHT / 2);
    if (ratio > 0) {
      const w = Math.max(BAR_HEIGHT, BAR_WIDTH * ratio);
      g.fillStyle(color, 1);
      g.fillRoundedRect(this.align === 'left' ? 0 : -w, 4, w, BAR_HEIGHT, BAR_HEIGHT / 2);
    }
    g.lineStyle(2, this.theme.color, 0.6);
    g.strokeRoundedRect(x0, 4, BAR_WIDTH, BAR_HEIGHT, BAR_HEIGHT / 2);
    this.valueText.setText(`${Math.round(this.shown)} / ${this.maxHealth}`);
  }
}

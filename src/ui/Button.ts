import * as Phaser from 'phaser';
import { PALETTE } from '../game/config/theme';
import { textStyle } from './text';

export interface ButtonOptions {
  width: number;
  height: number;
  label: string;
  /** Optional small caption under the label (e.g. a key hint). */
  hint?: string;
  fontSize?: number;
  accent?: number;
  onClick: () => void;
}

const RADIUS = 10;

/**
 * Rounded, hover-aware button. A Zone provides the hit area so input works
 * regardless of how the button is drawn.
 */
export class Button extends Phaser.GameObjects.Container {
  private readonly background: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text | null;
  private readonly zone: Phaser.GameObjects.Zone;
  private readonly options: ButtonOptions;
  private hovered = false;
  private focused = false;
  private enabled = true;

  constructor(scene: Phaser.Scene, x: number, y: number, options: ButtonOptions) {
    super(scene, x, y);
    this.options = options;
    this.background = scene.add.graphics();
    const labelY = options.hint !== undefined ? -8 : 0;
    this.label = scene.add
      .text(0, labelY, options.label, textStyle(options.fontSize ?? 22, PALETTE.textPrimary, 'bold'))
      .setOrigin(0.5);
    this.hint =
      options.hint !== undefined
        ? scene.add.text(0, 16, options.hint, textStyle(12, PALETTE.textMuted)).setOrigin(0.5)
      : null;
    this.zone = scene.add.zone(0, 0, options.width, options.height).setInteractive({ useHandCursor: true });
    this.add([this.background, this.label, ...(this.hint ? [this.hint] : []), this.zone]);

    this.zone.on('pointerover', () => this.setHovered(true));
    this.zone.on('pointerout', () => this.setHovered(false));
    this.zone.on('pointerdown', () => this.press());
    this.redraw();
    scene.add.existing(this);
  }

  press(): void {
    if (!this.enabled) return;
    this.scene.tweens.add({ targets: this, scale: { from: 0.95, to: 1 }, duration: 120 });
    this.options.onClick();
  }

  setEnabled(enabled: boolean): this {
    if (enabled === this.enabled) return this;
    this.enabled = enabled;
    this.label.setAlpha(enabled ? 1 : 0.4);
    this.hint?.setAlpha(enabled ? 1 : 0.4);
    this.redraw();
    return this;
  }

  setFocused(focused: boolean): this {
    this.focused = focused;
    this.redraw();
    return this;
  }

  setLabel(label: string): this {
    this.label.setText(label);
    return this;
  }

  /** Updates the caption; only has an effect if the button was created with a `hint`. */
  setHint(hint: string): this {
    this.hint?.setText(hint);
    return this;
  }

  private setHovered(hovered: boolean): void {
    this.hovered = hovered;
    this.redraw();
  }

  private redraw(): void {
    const { width, height } = this.options;
    const accent = this.options.accent ?? PALETTE.accent;
    const active = this.enabled && (this.hovered || this.focused);
    const g = this.background;
    g.clear();
    g.fillStyle(active ? PALETTE.hudPanelHover : PALETTE.hudPanel, this.enabled ? 0.95 : 0.6);
    g.fillRoundedRect(-width / 2, -height / 2, width, height, RADIUS);
    g.lineStyle(2, active ? accent : PALETTE.hudBorder, 1);
    g.strokeRoundedRect(-width / 2, -height / 2, width, height, RADIUS);
    if (active) {
      g.fillStyle(accent, 1);
      g.fillRect(-width / 2 + RADIUS, height / 2 - 4, width - RADIUS * 2, 3);
    }
  }
}

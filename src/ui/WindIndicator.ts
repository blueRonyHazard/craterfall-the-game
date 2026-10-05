import * as Phaser from 'phaser';
import { WIND } from '../game/config/gameBalance';
import { PALETTE } from '../game/config/theme';
import type { Wind } from '../types/game';
import { textStyle } from './text';

const MAX_ARROW = 110;
const MIN_ARROW = 14;
const HEAD = 9;

/** Wind arrow whose length scales with strength, plus a numeric readout. */
export class WindIndicator extends Phaser.GameObjects.Container {
  private readonly arrow: Phaser.GameObjects.Graphics;
  private readonly valueText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    const label = scene.add.text(0, -16, 'WIND', textStyle(12, PALETTE.textMuted, 'bold')).setOrigin(0.5);
    label.setLetterSpacing(3);
    this.arrow = scene.add.graphics();
    this.valueText = scene.add.text(0, 14, '', textStyle(16, PALETTE.textPrimary, 'bold')).setOrigin(0.5);
    this.add([label, this.arrow, this.valueText]);
    scene.add.existing(this);
  }

  setWind(wind: Wind): void {
    const g = this.arrow;
    g.clear();
    const ratio = wind.strength / WIND.maxStrength;
    const calm = wind.strength < 0.05;
    this.valueText.setText(calm ? 'CALM' : `${wind.strength.toFixed(1)} ${wind.direction < 0 ? '◀' : '▶'}`);
    if (calm) return;

    const length = MIN_ARROW + (MAX_ARROW - MIN_ARROW) * ratio;
    const color = ratio > 0.66 ? PALETTE.danger : ratio > 0.33 ? PALETTE.accent : 0x9fe8ff;
    const d = wind.direction;
    const y = -1;
    const tail = (-d * length) / 2;
    const tip = (d * length) / 2;
    g.lineStyle(4, color, 1);
    g.lineBetween(tail, y, tip - d * HEAD * 0.6, y);
    g.fillStyle(color, 1);
    g.fillTriangle(tip, y, tip - d * HEAD * 1.4, y - HEAD * 0.8, tip - d * HEAD * 1.4, y + HEAD * 0.8);
  }
}

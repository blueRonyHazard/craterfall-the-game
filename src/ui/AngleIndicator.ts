import * as Phaser from 'phaser';
import { AIMING } from '../game/config/gameBalance';
import { PALETTE } from '../game/config/theme';
import { clamp, degToRad, radToDeg } from '../utils/math';
import { textStyle } from './text';

const TICK_STEP = 30;

/**
 * Semicircular protractor showing the aim angle (0° right, 90° up, 180° left).
 * Click or drag on it to set the angle with the mouse.
 */
export class AngleIndicator extends Phaser.GameObjects.Container {
  private readonly needle: Phaser.GameObjects.Graphics;
  private readonly valueText: Phaser.GameObjects.Text;
  private dragging = false;
  private accent: number = PALETTE.accent;
  private currentAngle = -1;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly radius: number,
    onSet: (angle: number) => void,
  ) {
    super(scene, x, y);
    const dial = scene.add.graphics();
    dial.fillStyle(PALETTE.hudPanel, 1);
    dial.slice(0, 0, radius, Math.PI, 0, false);
    dial.fillPath();
    dial.lineStyle(2, PALETTE.hudBorder, 1);
    dial.strokeCircle(0, 0, radius);
    for (let a = 0; a <= 180; a += TICK_STEP) {
      const r = degToRad(a);
      const inner = a % 90 === 0 ? radius - 12 : radius - 7;
      dial.lineBetween(Math.cos(r) * inner, -Math.sin(r) * inner, Math.cos(r) * radius, -Math.sin(r) * radius);
    }
    // Hide the lower half of the stroked circle under the panel colour.
    dial.fillStyle(PALETTE.hudBg, 1);
    dial.fillRect(-radius - 2, 1, radius * 2 + 4, radius + 2);

    this.needle = scene.add.graphics();
    this.valueText = scene.add.text(0, 14, '', textStyle(18, PALETTE.textPrimary, 'bold')).setOrigin(0.5, 0.5);
    const label = scene.add.text(0, -radius - 12, 'ANGLE', textStyle(12, PALETTE.textMuted, 'bold')).setOrigin(0.5);
    label.setLetterSpacing(3);
    const zone = scene.add.zone(0, -radius / 2, radius * 2 + 10, radius + 10).setInteractive({ useHandCursor: true });
    this.add([dial, this.needle, this.valueText, label, zone]);

    const setFrom = (pointer: Phaser.Input.Pointer): void => {
      const dx = pointer.x - this.x;
      const dy = this.y - pointer.y;
      onSet(clamp(Math.round(radToDeg(Math.atan2(Math.max(0, dy), dx))), AIMING.minAngle, AIMING.maxAngle));
    };
    zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.dragging = true;
      setFrom(pointer);
    });
    const onMove = (pointer: Phaser.Input.Pointer): void => {
      if (this.dragging) setFrom(pointer);
    };
    const onUp = (): void => {
      this.dragging = false;
    };
    scene.input.on('pointermove', onMove);
    scene.input.on('pointerup', onUp);
    this.once('destroy', () => {
      scene.input.off('pointermove', onMove);
      scene.input.off('pointerup', onUp);
    });
    scene.add.existing(this);
  }

  setValue(angle: number, accent: number): void {
    if (angle === this.currentAngle && accent === this.accent && this.valueText.text !== '') return;
    this.currentAngle = angle;
    this.accent = accent;
    const r = degToRad(angle);
    const g = this.needle;
    g.clear();
    g.lineStyle(4, accent, 1);
    g.lineBetween(0, 0, Math.cos(r) * (this.radius - 6), -Math.sin(r) * (this.radius - 6));
    g.fillStyle(accent, 1);
    g.fillCircle(0, 0, 5);
    this.valueText.setText(`${Math.round(angle)}°`);
  }
}

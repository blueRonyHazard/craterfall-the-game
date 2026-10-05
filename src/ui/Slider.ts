import * as Phaser from 'phaser';
import { PALETTE } from '../game/config/theme';
import { clamp } from '../utils/math';
import { textStyle } from './text';

const TRACK_HEIGHT = 8;
const KNOB_RADIUS = 12;
const LABEL_WIDTH = 260;
const STEP = 0.05;

/** Horizontal 0..1 slider with a label and a percentage readout. Drag or click to set. */
export class Slider extends Phaser.GameObjects.Container {
  private readonly track: Phaser.GameObjects.Graphics;
  private readonly valueText: Phaser.GameObjects.Text;
  private value: number;
  private dragging = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    initial: number,
    private readonly trackWidth: number,
    private readonly onChange: (value: number) => void,
  ) {
    super(scene, x, y);
    this.value = clamp(initial, 0, 1);
    const title = scene.add.text(0, 0, label, textStyle(22)).setOrigin(0, 0.5);
    this.track = scene.add.graphics();
    this.valueText = scene.add
      .text(LABEL_WIDTH + trackWidth + 30, 0, '', textStyle(20, PALETTE.textMuted))
      .setOrigin(0, 0.5);
    const zone = scene.add
      .zone(LABEL_WIDTH + trackWidth / 2, 0, trackWidth + KNOB_RADIUS * 2, KNOB_RADIUS * 3)
      .setInteractive({ useHandCursor: true, draggable: false });
    this.add([title, this.track, this.valueText, zone]);

    zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.dragging = true;
      this.setFromPointer(pointer);
    });
    // Track drags on the whole scene so the knob follows the pointer off the track.
    const onMove = (pointer: Phaser.Input.Pointer): void => {
      if (this.dragging) this.setFromPointer(pointer);
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
    this.redraw();
    scene.add.existing(this);
  }

  /** Keyboard nudging (left/right). */
  nudge(direction: -1 | 1): void {
    this.setValue(this.value + direction * STEP);
  }

  private setFromPointer(pointer: Phaser.Input.Pointer): void {
    const local = pointer.x - this.x - LABEL_WIDTH;
    this.setValue(local / this.trackWidth);
  }

  private setValue(value: number): void {
    const next = Math.round(clamp(value, 0, 1) * 100) / 100;
    if (next === this.value) return;
    this.value = next;
    this.redraw();
    this.onChange(next);
  }

  private redraw(): void {
    const g = this.track;
    const x0 = LABEL_WIDTH;
    g.clear();
    g.fillStyle(PALETTE.hudPanel, 1);
    g.fillRoundedRect(x0, -TRACK_HEIGHT / 2, this.trackWidth, TRACK_HEIGHT, TRACK_HEIGHT / 2);
    g.fillStyle(PALETTE.accent, 1);
    g.fillRoundedRect(x0, -TRACK_HEIGHT / 2, Math.max(TRACK_HEIGHT, this.trackWidth * this.value), TRACK_HEIGHT, TRACK_HEIGHT / 2);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(x0 + this.trackWidth * this.value, 0, KNOB_RADIUS);
    g.lineStyle(3, PALETTE.accent, 1);
    g.strokeCircle(x0 + this.trackWidth * this.value, 0, KNOB_RADIUS);
    this.valueText.setText(`${Math.round(this.value * 100)}%`);
  }
}

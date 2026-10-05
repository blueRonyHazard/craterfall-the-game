import * as Phaser from 'phaser';
import { AIMING } from '../game/config/gameBalance';
import { PALETTE } from '../game/config/theme';
import { clamp } from '../utils/math';
import { textStyle } from './text';

const BAR_HEIGHT = 22;
const SEGMENTS = 20;
const SEGMENT_GAP = 2;

/** Segmented power bar. Click or drag along it to set power with the mouse. */
export class PowerMeter extends Phaser.GameObjects.Container {
  private readonly bar: Phaser.GameObjects.Graphics;
  private readonly valueText: Phaser.GameObjects.Text;
  private dragging = false;
  private power = -1;
  private accent: number = PALETTE.accent;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly barWidth: number,
    onSet: (power: number) => void,
  ) {
    super(scene, x, y);
    const label = scene.add.text(0, -26, 'POWER', textStyle(12, PALETTE.textMuted, 'bold')).setOrigin(0, 0.5);
    label.setLetterSpacing(3);
    this.valueText = scene.add.text(barWidth, -26, '', textStyle(18, PALETTE.textPrimary, 'bold')).setOrigin(1, 0.5);
    this.bar = scene.add.graphics();
    const zone = scene.add
      .zone(barWidth / 2, 0, barWidth + 16, BAR_HEIGHT + 20)
      .setInteractive({ useHandCursor: true });
    this.add([label, this.valueText, this.bar, zone]);

    const setFrom = (pointer: Phaser.Input.Pointer): void => {
      const ratio = clamp((pointer.x - this.x) / barWidth, 0, 1);
      onSet(clamp(Math.round(ratio * AIMING.maxPower), AIMING.minPower, AIMING.maxPower));
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

  setValue(power: number, accent: number): void {
    if (power === this.power && accent === this.accent) return;
    this.power = power;
    this.accent = accent;
    const g = this.bar;
    g.clear();
    g.fillStyle(0x000000, 0.4);
    g.fillRoundedRect(-3, -BAR_HEIGHT / 2 - 3, this.barWidth + 6, BAR_HEIGHT + 6, 6);
    const segmentWidth = (this.barWidth - SEGMENT_GAP * (SEGMENTS - 1)) / SEGMENTS;
    const filled = (power / AIMING.maxPower) * SEGMENTS;
    for (let i = 0; i < SEGMENTS; i++) {
      const x = i * (segmentWidth + SEGMENT_GAP);
      const fraction = clamp(filled - i, 0, 1);
      g.fillStyle(PALETTE.hudPanel, 1);
      g.fillRect(x, -BAR_HEIGHT / 2, segmentWidth, BAR_HEIGHT);
      if (fraction > 0) {
        // Segments warm up from the player colour towards hot orange at full power.
        const t = i / (SEGMENTS - 1);
        const color = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.ValueToColor(accent),
          Phaser.Display.Color.ValueToColor(0xff6b3d),
          100,
          Math.round(t * 100),
        );
        g.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b), 1);
        g.fillRect(x, -BAR_HEIGHT / 2, segmentWidth * fraction, BAR_HEIGHT);
      }
    }
    this.valueText.setText(`${Math.round(power)}%`);
  }
}

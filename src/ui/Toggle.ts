import * as Phaser from 'phaser';
import { PALETTE } from '../game/config/theme';
import { textStyle } from './text';

const LABEL_WIDTH = 260;
const SWITCH_WIDTH = 64;
const SWITCH_HEIGHT = 30;

/** On/off switch with a label. */
export class Toggle extends Phaser.GameObjects.Container {
  private readonly switchGraphic: Phaser.GameObjects.Graphics;
  private readonly stateText: Phaser.GameObjects.Text;
  private value: boolean;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    initial: boolean,
    private readonly onChange: (value: boolean) => void,
  ) {
    super(scene, x, y);
    this.value = initial;
    const title = scene.add.text(0, 0, label, textStyle(22)).setOrigin(0, 0.5);
    this.switchGraphic = scene.add.graphics();
    this.stateText = scene.add.text(LABEL_WIDTH + SWITCH_WIDTH + 20, 0, '', textStyle(20, PALETTE.textMuted)).setOrigin(0, 0.5);
    const zone = scene.add
      .zone(LABEL_WIDTH + SWITCH_WIDTH / 2, 0, SWITCH_WIDTH + 16, SWITCH_HEIGHT + 12)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => this.toggle());
    this.add([title, this.switchGraphic, this.stateText, zone]);
    this.redraw();
    scene.add.existing(this);
  }

  toggle(): void {
    this.value = !this.value;
    this.redraw();
    this.onChange(this.value);
  }

  private redraw(): void {
    const g = this.switchGraphic;
    const x0 = LABEL_WIDTH;
    g.clear();
    g.fillStyle(this.value ? PALETTE.accent : PALETTE.hudPanel, 1);
    g.fillRoundedRect(x0, -SWITCH_HEIGHT / 2, SWITCH_WIDTH, SWITCH_HEIGHT, SWITCH_HEIGHT / 2);
    g.lineStyle(2, PALETTE.hudBorder, 1);
    g.strokeRoundedRect(x0, -SWITCH_HEIGHT / 2, SWITCH_WIDTH, SWITCH_HEIGHT, SWITCH_HEIGHT / 2);
    g.fillStyle(0xffffff, 1);
    const knobX = this.value ? x0 + SWITCH_WIDTH - SWITCH_HEIGHT / 2 : x0 + SWITCH_HEIGHT / 2;
    g.fillCircle(knobX, 0, SWITCH_HEIGHT / 2 - 4);
    this.stateText.setText(this.value ? 'On' : 'Off');
  }
}

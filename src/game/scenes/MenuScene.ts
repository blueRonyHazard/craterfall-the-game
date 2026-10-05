import * as Phaser from 'phaser';
import { VIEW } from '../config/layout';
import { PALETTE } from '../config/theme';
import type { BackgroundRenderer } from '../rendering/BackgroundRenderer';
import { getServices } from '../services';
import { Button } from '../../ui/Button';
import { MenuNavigation } from '../../ui/MenuNavigation';
import { textStyle } from '../../ui/text';
import { createMenuBackdrop } from './backdrop';
import { SCENES } from './keys';

const BUTTON_WIDTH = 360;
const BUTTON_HEIGHT = 64;
const BUTTON_SPACING = 82;

export class MenuScene extends Phaser.Scene {
  private backdrop: BackgroundRenderer | null = null;

  constructor() {
    super(SCENES.menu);
  }

  create(): void {
    const { audio } = getServices(this);
    audio.startMusic();
    this.backdrop = createMenuBackdrop(this, 0.35);

    const cx = VIEW.width / 2;
    const title = this.add
      .text(cx, 190, 'CRATERFALL', { ...textStyle(104, PALETTE.textPrimary, 'bold'), stroke: '#0b1026', strokeThickness: 12 })
      .setOrigin(0.5);
    title.setLetterSpacing(12);
    this.add
      .text(cx, 268, 'Artillery duels on shifting ground', textStyle(24, PALETTE.accentCss))
      .setOrigin(0.5);

    const go = (scene: string) => (): void => {
      audio.play('click');
      this.scene.start(scene);
    };
    const buttons = [
      new Button(this, cx, 400, { width: BUTTON_WIDTH, height: BUTTON_HEIGHT, label: 'PLAY LOCAL', onClick: go(SCENES.game) }),
      new Button(this, cx, 400 + BUTTON_SPACING, { width: BUTTON_WIDTH, height: BUTTON_HEIGHT, label: 'SETTINGS', onClick: go(SCENES.settings) }),
      new Button(this, cx, 400 + BUTTON_SPACING * 2, { width: BUTTON_WIDTH, height: BUTTON_HEIGHT, label: 'HOW TO PLAY', onClick: go(SCENES.howToPlay) }),
    ];
    new MenuNavigation(this, buttons);

    this.add
      .text(cx, VIEW.height - 34, 'Two players · one keyboard  —  ↑ ↓ to choose · Enter to select', textStyle(16, PALETTE.textMuted))
      .setOrigin(0.5);
    this.tweens.add({ targets: title, y: 182, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  override update(_time: number, delta: number): void {
    this.backdrop?.update(delta / 1000);
  }
}

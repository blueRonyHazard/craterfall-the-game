import * as Phaser from 'phaser';
import { VIEW } from '../config/layout';
import { PALETTE, PLAYER_THEMES } from '../config/theme';
import { getServices } from '../services';
import { Button } from '../../ui/Button';
import { MenuNavigation } from '../../ui/MenuNavigation';
import { textStyle } from '../../ui/text';
import type { GameOverData } from './GameScene';
import { SCENES } from './keys';

/** Winner overlay drawn on top of the paused battlefield. */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super(SCENES.gameOver);
  }

  create(data: GameOverData): void {
    const { audio } = getServices(this);
    const cx = VIEW.width / 2;
    const winner = data.winner;
    const isDraw = winner === 'draw';
    const headline = winner === 'draw' ? 'DRAW' : `${data.names[winner].toUpperCase()} WINS`;
    const color = winner === 'draw' ? PALETTE.accentCss : PLAYER_THEMES[winner].css;

    this.add.rectangle(0, 0, VIEW.width, VIEW.height, 0x070a18, 0.72).setOrigin(0, 0);
    const title = this.add
      .text(cx, 300, headline, { ...textStyle(88, color, 'bold'), stroke: '#0b1026', strokeThickness: 12 })
      .setOrigin(0.5)
      .setScale(0.6)
      .setAlpha(0);
    title.setLetterSpacing(8);
    this.tweens.add({ targets: title, scale: 1, alpha: 1, duration: 500, ease: 'Back.easeOut' });

    const subtitle = isDraw ? 'Both tanks were destroyed in the same blast.' : 'Last tank standing.';
    this.add.text(cx, 380, `${subtitle}  ·  ${data.turns} ${data.turns === 1 ? 'turn' : 'turns'}`, textStyle(22, PALETTE.textMuted)).setOrigin(0.5);

    const rematch = (): void => {
      audio.play('click');
      this.scene.stop(SCENES.game);
      this.scene.start(SCENES.game);
    };
    const menu = (): void => {
      audio.play('click');
      this.scene.stop(SCENES.game);
      this.scene.start(SCENES.menu);
    };
    const buttons = [
      new Button(this, cx, 490, { width: 320, height: 62, label: 'REMATCH', onClick: rematch }),
      new Button(this, cx, 570, { width: 320, height: 62, label: 'MAIN MENU', onClick: menu }),
    ];
    new MenuNavigation(this, buttons, menu);
  }
}

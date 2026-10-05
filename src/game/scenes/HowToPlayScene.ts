import * as Phaser from 'phaser';
import { CONTROLS, keyLabel } from '../config/controls';
import { VIEW } from '../config/layout';
import { PALETTE } from '../config/theme';
import { WEAPONS } from '../config/weapons';
import type { BackgroundRenderer } from '../rendering/BackgroundRenderer';
import { getServices } from '../services';
import { Button } from '../../ui/Button';
import { textStyle } from '../../ui/text';
import { createMenuBackdrop } from './backdrop';
import { SCENES } from './keys';

const COLUMN_WIDTH = 640;
const LEFT_X = 140;
const RIGHT_X = 840;
const TOP_Y = 130;
const SECTION_GAP = 22;

function keys(list: readonly string[]): string {
  return list.map(keyLabel).join(' / ');
}

/** Rules overview. The weapon list is generated from config/weapons.ts so it never goes stale. */
export class HowToPlayScene extends Phaser.Scene {
  private backdrop: BackgroundRenderer | null = null;

  constructor() {
    super(SCENES.howToPlay);
  }

  create(): void {
    const { audio } = getServices(this);
    this.backdrop = createMenuBackdrop(this, 0.78);
    this.add.text(VIEW.width / 2, 72, 'HOW TO PLAY', textStyle(40, PALETTE.textPrimary, 'bold')).setOrigin(0.5).setLetterSpacing(6);

    const [p1, p2] = CONTROLS.players;
    const left: Array<[string, string]> = [
      [
        'Aiming',
        `Rotate the barrel — Player 1: ${keys(p1.rotateLeft)} / ${keys(p1.rotateRight)}, Player 2: ${keys(p2.rotateLeft)} / ${keys(p2.rotateRight)}. ` +
          `0° points right, 90° straight up. Or drag in the battlefield / on the angle dial. Hold ${keys(CONTROLS.fineAdjust)} for fine control.`,
      ],
      [
        'Power',
        `Player 1: ${keys(p1.powerUp)} / ${keys(p1.powerDown)}, Player 2: ${keys(p2.powerUp)} / ${keys(p2.powerDown)}, or the mouse wheel. ` +
          'More power means a faster, longer shot. Drag further from your tank for more power.',
      ],
      [
        'Wind',
        'Wind changes every turn and pushes every shell sideways for its whole flight. The arrow in the top bar shows direction and strength; the clouds drift with it.',
      ],
      [
        'Turns',
        `Players alternate. Fire with ${keys(p1.fire)} (Player 1), ${keys(p2.fire)} (Player 2) or the FIRE button. ` +
          'Controls lock until every projectile has landed.',
      ],
      [
        'Destruction',
        'Every blast carves a crater. Damage falls off with distance from the centre. Dig out the ground under a tank and it drops — long falls hurt. Last tank standing wins.',
      ],
    ];
    this.column(LEFT_X, left);

    const weaponLines = WEAPONS.map((weapon, i) => {
      const slot = CONTROLS.weaponSlots[i];
      const ammo = Number.isFinite(weapon.ammo) ? `×${weapon.ammo}` : '∞';
      return `${slot ? keyLabel(slot) : '·'}  ${weapon.name} (${ammo}) — ${weapon.description}`;
    }).join('\n');
    this.column(RIGHT_X, [
      ['Weapons', `${weaponLines}\n\n${keys(CONTROLS.previousWeapon)} / ${keys(CONTROLS.nextWeapon)} cycle weapons.`],
    ]);

    const back = (): void => {
      audio.play('click');
      this.scene.start(SCENES.menu);
    };
    new Button(this, VIEW.width / 2, VIEW.height - 60, { width: 240, height: 56, label: 'BACK', hint: 'Esc', onClick: back });
    this.input.keyboard?.on('keydown-ESC', back);
    this.input.keyboard?.on('keydown-ENTER', back);
  }

  override update(_time: number, delta: number): void {
    this.backdrop?.update(delta / 1000);
  }

  private column(x: number, sections: Array<[string, string]>): void {
    let y = TOP_Y;
    for (const [heading, body] of sections) {
      const title = this.add.text(x, y, heading.toUpperCase(), textStyle(18, PALETTE.accentCss, 'bold'));
      title.setLetterSpacing(3);
      y += title.height + 6;
      const text = this.add.text(x, y, body, {
        ...textStyle(17, PALETTE.textPrimary),
        wordWrap: { width: COLUMN_WIDTH },
        lineSpacing: 6,
      });
      y += text.height + SECTION_GAP;
    }
  }
}

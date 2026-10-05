import * as Phaser from 'phaser';
import { keyLabel } from '../game/config/controls';
import { PALETTE } from '../game/config/theme';
import type { WeaponDefinition } from '../types/weapons';
import { textStyle } from './text';

export const CARD_WIDTH = 112;
export const CARD_HEIGHT = 68;
export const CARD_GAP = 8;
const RADIUS = 8;

interface Card {
  weapon: WeaponDefinition;
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Graphics;
  ammoText: Phaser.GameObjects.Text;
}

/** Row of weapon cards. Click a card or press its number key to select it. */
export class WeaponSelector extends Phaser.GameObjects.Container {
  private readonly cards: Card[] = [];

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    weapons: readonly WeaponDefinition[],
    slotKeys: readonly string[],
    onSelect: (weaponId: string) => void,
  ) {
    super(scene, x, y);
    weapons.forEach((weapon, index) => {
      const cx = index * (CARD_WIDTH + CARD_GAP) + CARD_WIDTH / 2;
      const background = scene.add.graphics();
      const key = slotKeys[index];
      const keyText = scene.add
        .text(-CARD_WIDTH / 2 + 8, -CARD_HEIGHT / 2 + 6, key ? keyLabel(key) : '', textStyle(12, PALETTE.textDim, 'bold'))
        .setOrigin(0, 0);
      const icon = scene.add.circle(0, -10, 7, weapon.color).setStrokeStyle(2, 0x000000, 0.4);
      const name = scene.add.text(0, 10, weapon.name, textStyle(13, PALETTE.textPrimary, 'bold')).setOrigin(0.5);
      const ammoText = scene.add
        .text(CARD_WIDTH / 2 - 8, -CARD_HEIGHT / 2 + 6, '', textStyle(12, PALETTE.textMuted, 'bold'))
        .setOrigin(1, 0);
      const zone = scene.add.zone(0, 0, CARD_WIDTH, CARD_HEIGHT).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => onSelect(weapon.id));
      const container = scene.add.container(cx, 0, [background, keyText, icon, name, ammoText, zone]);
      this.add(container);
      this.cards.push({ weapon, container, background, ammoText });
    });
    scene.add.existing(this);
  }

  get totalWidth(): number {
    return this.cards.length * (CARD_WIDTH + CARD_GAP) - CARD_GAP;
  }

  refresh(selectedId: string, ammo: Readonly<Record<string, number>>, accent: number, enabled: boolean): void {
    for (const card of this.cards) {
      const remaining = ammo[card.weapon.id] ?? 0;
      const selected = card.weapon.id === selectedId;
      const empty = remaining <= 0;
      card.ammoText.setText(Number.isFinite(remaining) ? `×${remaining}` : '∞');
      card.container.setAlpha(empty ? 0.35 : enabled ? 1 : 0.7);

      const g = card.background;
      g.clear();
      g.fillStyle(selected ? PALETTE.hudPanelHover : PALETTE.hudPanel, 1);
      g.fillRoundedRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, RADIUS);
      g.lineStyle(selected ? 3 : 1.5, selected ? accent : PALETTE.hudBorder, 1);
      g.strokeRoundedRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, RADIUS);
    }
  }
}

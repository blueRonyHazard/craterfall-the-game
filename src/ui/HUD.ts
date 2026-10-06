import * as Phaser from 'phaser';
import { CONTROLS, keyLabel } from '../game/config/controls';
import { HUD_LAYOUT, PLAYFIELD, VIEW } from '../game/config/layout';
import { PALETTE, PLAYER_THEMES } from '../game/config/theme';
import type { GameStateData, PlayerId, Wind } from '../types/game';
import type { WeaponDefinition } from '../types/weapons';
import { AngleIndicator } from './AngleIndicator';
import { Button } from './Button';
import { HealthPanel } from './HealthPanel';
import { PowerMeter } from './PowerMeter';
import { WeaponSelector } from './WeaponSelector';
import { WindIndicator } from './WindIndicator';
import { textStyle } from './text';

export interface HudCallbacks {
  selectWeapon(weaponId: string): void;
  setAngle(angle: number): void;
  setPower(power: number): void;
  fire(): void;
}

const MARGIN = 24;
const BOTTOM_TOP = VIEW.height - HUD_LAYOUT.bottomHeight;
const DIAL_RADIUS = 52;
const FIRE_WIDTH = 190;
/** Horizontal space between the weapon row, angle dial, power bar and FIRE button. */
const CONTROL_GAP = 32;
const MIN_POWER_WIDTH = 160;
const MAX_POWER_WIDTH = 340;
const FIRE_HEIGHT = 74;

/**
 * Heads-up display: a top bar (health, wind, turn) and a bottom bar (weapons,
 * angle, power, fire). Both bars sit outside the playfield so they never cover
 * the battlefield.
 */
export class HUD {
  private readonly health: [HealthPanel, HealthPanel];
  private readonly wind: WindIndicator;
  private readonly turnText: Phaser.GameObjects.Text;
  private readonly statusText: Phaser.GameObjects.Text;
  private readonly weaponsRow: WeaponSelector;
  private readonly angle: AngleIndicator;
  private readonly power: PowerMeter;
  private readonly fireButton: Button;
  private readonly banner: Phaser.GameObjects.Text;
  private readonly toastText: Phaser.GameObjects.Text;
  private readonly weaponsById: ReadonlyMap<string, WeaponDefinition>;
  private lastStatus = '';

  constructor(
    private readonly scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    weapons: readonly WeaponDefinition[],
    names: readonly [string, string],
    callbacks: HudCallbacks,
  ) {
    this.weaponsById = new Map(weapons.map((w) => [w.id, w]));
    layer.add(this.drawBars());

    this.health = [
      new HealthPanel(scene, MARGIN, 30, 'left', names[0], PLAYER_THEMES[0]),
      new HealthPanel(scene, VIEW.width - MARGIN, 30, 'right', names[1], PLAYER_THEMES[1]),
    ];
    this.wind = new WindIndicator(scene, VIEW.width / 2 - 90, 32);
    const turnLabel = scene.add.text(VIEW.width / 2 + 90, 16, 'TURN', textStyle(12, PALETTE.textMuted, 'bold')).setOrigin(0.5);
    turnLabel.setLetterSpacing(3);
    this.turnText = scene.add.text(VIEW.width / 2 + 90, 40, '1', textStyle(22, PALETTE.textPrimary, 'bold')).setOrigin(0.5);

    this.statusText = scene.add
      .text(MARGIN, BOTTOM_TOP + 14, '', { ...textStyle(15, PALETTE.textMuted), wordWrap: { width: 720 } })
      .setOrigin(0, 0);
    this.weaponsRow = new WeaponSelector(scene, MARGIN, BOTTOM_TOP + 74, weapons, CONTROLS.weaponSlots, (id) =>
      callbacks.selectWeapon(id),
    );
    const dialX = MARGIN + this.weaponsRow.totalWidth + CONTROL_GAP + DIAL_RADIUS;
    this.angle = new AngleIndicator(scene, dialX, VIEW.height - 26, DIAL_RADIUS, (a) => callbacks.setAngle(a));
    const powerX = dialX + DIAL_RADIUS + CONTROL_GAP;
    // The power bar takes whatever room is left before the FIRE button.
    const fireLeft = VIEW.width - MARGIN - FIRE_WIDTH;
    const powerWidth = Math.min(MAX_POWER_WIDTH, Math.max(MIN_POWER_WIDTH, fireLeft - CONTROL_GAP - powerX));
    this.power = new PowerMeter(scene, powerX, BOTTOM_TOP + 70, powerWidth, (p) => callbacks.setPower(p));
    this.fireButton = new Button(scene, VIEW.width - MARGIN - FIRE_WIDTH / 2, BOTTOM_TOP + HUD_LAYOUT.bottomHeight / 2, {
      width: FIRE_WIDTH,
      height: FIRE_HEIGHT,
      label: 'FIRE',
      hint: '',
      fontSize: 28,
      onClick: () => callbacks.fire(),
    });

    this.banner = scene.add
      .text(VIEW.width / 2, PLAYFIELD.y + 150, '', {
        ...textStyle(54, PALETTE.textPrimary, 'bold'),
        stroke: '#0b1026',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.toastText = scene.add
      .text(VIEW.width / 2, BOTTOM_TOP - 34, '', {
        ...textStyle(20, PALETTE.accentCss, 'bold'),
        stroke: '#0b1026',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    layer.add([
      ...this.health,
      this.wind,
      turnLabel,
      this.turnText,
      this.statusText,
      this.weaponsRow,
      this.angle,
      this.power,
      this.fireButton,
      this.banner,
      this.toastText,
    ]);
  }

  /** Called every frame; each widget skips work when nothing changed. */
  sync(state: GameStateData, canAct: boolean): void {
    const playerId = state.currentPlayer;
    const tank = state.tanks[playerId];
    const theme = PLAYER_THEMES[playerId];
    this.angle.setValue(tank.angle, theme.color);
    this.power.setValue(tank.power, theme.color);
    this.weaponsRow.refresh(tank.weaponId, state.players[playerId].ammo, theme.color, canAct);
    this.fireButton.setEnabled(canAct);

    const weapon = this.weaponsById.get(tank.weaponId);
    const status = `${state.players[playerId].name.toUpperCase()}  ·  ${weapon?.name ?? ''} — ${weapon?.description ?? ''}`;
    if (status !== this.lastStatus) {
      this.statusText.setText(status);
      this.statusText.setColor(theme.css);
      this.lastStatus = status;
    }
  }

  setHealth(playerId: PlayerId, health: number, maxHealth: number, animate = true): void {
    this.health[playerId].setHealth(health, maxHealth, animate);
  }

  startTurn(playerId: PlayerId, name: string, turnNumber: number, wind: Wind): void {
    this.health[0].setHighlighted(playerId === 0);
    this.health[1].setHighlighted(playerId === 1);
    this.turnText.setText(String(turnNumber));
    this.wind.setWind(wind);
    const fireKey = CONTROLS.players[playerId].fire[0];
    this.fireButton.setHint(fireKey ? `press ${keyLabel(fireKey)}` : '');

    this.banner.setText(name.toUpperCase()).setColor(PLAYER_THEMES[playerId].css).setScale(0.8).setAlpha(0);
    this.scene.tweens.killTweensOf(this.banner);
    this.scene.tweens.chain({
      targets: this.banner,
      tweens: [
        { alpha: 1, scale: 1, duration: 260, ease: 'Back.easeOut' },
        { alpha: 0, duration: 400, delay: 700 },
      ],
    });
  }

  toast(message: string): void {
    this.toastText.setText(message).setAlpha(1);
    this.scene.tweens.killTweensOf(this.toastText);
    this.scene.tweens.add({ targets: this.toastText, alpha: 0, delay: 1200, duration: 400 });
  }

  private drawBars(): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    g.fillStyle(PALETTE.hudBg, 0.96);
    g.fillRect(0, 0, VIEW.width, HUD_LAYOUT.topHeight);
    g.fillRect(0, BOTTOM_TOP, VIEW.width, HUD_LAYOUT.bottomHeight);
    g.lineStyle(2, PALETTE.hudBorder, 1);
    g.lineBetween(0, HUD_LAYOUT.topHeight - 1, VIEW.width, HUD_LAYOUT.topHeight - 1);
    g.lineBetween(0, BOTTOM_TOP + 1, VIEW.width, BOTTOM_TOP + 1);
    return g;
  }
}

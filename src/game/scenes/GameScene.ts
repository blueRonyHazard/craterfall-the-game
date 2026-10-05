import * as Phaser from 'phaser';
import { PHYSICS, TANK } from '../config/gameBalance';
import { CONTROLS, keyLabel } from '../config/controls';
import { PLAYFIELD, VIEW } from '../config/layout';
import { PALETTE } from '../config/theme';
import { playEventSound } from '../audio/GameAudio';
import { hasAmmo } from '../entities/Player';
import { aimFromPoint, InputManager } from '../input/InputManager';
import { WorldView } from '../rendering/WorldView';
import { getServices, type GameServices } from '../services';
import { MatchEngine } from '../systems/MatchEngine';
import { HUD } from '../../ui/HUD';
import { Button } from '../../ui/Button';
import { textStyle } from '../../ui/text';
import { GamePhase, type PlayerAction, type PlayerId, type SimEvent, type Winner } from '../../types/game';
import { roundTo } from '../../utils/math';
import { createRandomSeed } from '../../utils/random';
import { SCENES } from './keys';

/** Delay between the final explosion and the winner screen. */
const GAME_OVER_DELAY_MS = 1800;
/** Aim values are rounded before they go into a PlayerAction to keep replays compact. */
const ACTION_DECIMALS = 1;

export interface GameOverData {
  winner: Winner;
  names: [string, string];
  turns: number;
}

/**
 * Orchestrates a local match: owns the MatchEngine, feeds it player actions,
 * advances it in fixed timesteps, and forwards its events to the view, HUD
 * and audio. Gameplay rules live in the engine, not here.
 */
export class GameScene extends Phaser.Scene {
  private services!: GameServices;
  private engine!: MatchEngine;
  private world!: WorldView;
  private hud!: HUD;
  private controlsInput!: InputManager;
  private accumulator = 0;
  private paused = false;
  private pauseLayer: Phaser.GameObjects.Layer | null = null;
  private uiLayer!: Phaser.GameObjects.Layer;

  constructor() {
    super(SCENES.game);
  }

  create(): void {
    this.services = getServices(this);
    this.accumulator = 0;
    this.paused = false;
    this.pauseLayer = null;
    this.engine = new MatchEngine({ terrainSeed: createRandomSeed(), windSeed: createRandomSeed() });

    // Two cameras: the world camera renders only the playfield band (and shakes),
    // the UI camera renders the HUD across the whole screen and never shakes.
    const worldLayer = this.add.layer();
    this.uiLayer = this.add.layer();
    const worldCamera = this.cameras.main;
    worldCamera.setViewport(PLAYFIELD.x, PLAYFIELD.y, PLAYFIELD.width, PLAYFIELD.height);
    worldCamera.setBackgroundColor(PALETTE.skyTop);
    worldCamera.ignore(this.uiLayer);
    const uiCamera = this.cameras.add(0, 0, VIEW.width, VIEW.height);
    uiCamera.ignore(worldLayer);

    const { settings } = this.services;
    this.world = new WorldView(this, worldLayer, worldCamera, this.engine, {
      screenShake: () => settings.getSettings().screenShake,
      showAimGuide: () => settings.getPreferences().showAimGuide,
    });
    const names: [string, string] = [this.engine.state.players[0].name, this.engine.state.players[1].name];
    this.hud = new HUD(this, this.uiLayer, this.engine.weapons.definitions, names, {
      selectWeapon: (id) => this.selectWeapon(id),
      setAngle: (angle) => this.adjustAim(angle, null),
      setPower: (power) => this.adjustAim(null, power),
      fire: () => this.fire(),
    });
    for (const tank of this.engine.state.tanks) {
      this.hud.setHealth(tank.playerId, tank.health, tank.maxHealth, false);
    }
    this.controlsInput = new InputManager(this);
    this.services.audio.startMusic();
    this.dispatch(this.engine.drainEvents());
  }

  override update(_time: number, deltaMs: number): void {
    const delta = deltaMs / 1000;
    const intent = this.controlsInput.poll(this.engine.state.currentPlayer, delta);
    if (intent.pause) this.togglePause();
    if (this.paused) return;

    if (this.engine.phase === GamePhase.Aiming) {
      this.accumulator = 0;
      this.handleAiming(intent);
    } else {
      this.stepSimulation(delta);
    }
    this.dispatch(this.engine.drainEvents());
    this.world.update(delta);
    this.hud.sync(this.engine.state, this.engine.phase === GamePhase.Aiming);
  }

  /** Runs as many fixed simulation steps as real time requires (capped per frame). */
  private stepSimulation(delta: number): void {
    this.accumulator += delta;
    let steps = 0;
    while (this.accumulator >= this.engine.dt && steps < PHYSICS.maxStepsPerFrame) {
      this.engine.tick();
      this.accumulator -= this.engine.dt;
      steps++;
    }
    if (steps === PHYSICS.maxStepsPerFrame) this.accumulator = 0; // drop backlog after a stall
  }

  private handleAiming(intent: ReturnType<InputManager['poll']>): void {
    const playerId = this.engine.state.currentPlayer;
    const tank = this.engine.state.tanks[playerId];
    if (intent.angleDelta !== 0 || intent.powerDelta !== 0) {
      this.adjustAim(tank.angle + intent.angleDelta, tank.power + intent.powerDelta);
    }
    if (intent.aimPoint) {
      const aim = aimFromPoint({ x: tank.x, y: tank.y - TANK.turretHeight }, intent.aimPoint);
      this.adjustAim(aim.angle, aim.power);
    }
    if (intent.weaponSlot >= 0) {
      const weapon = this.engine.weapons.atIndex(intent.weaponSlot);
      if (weapon) this.selectWeapon(weapon.id);
    }
    if (intent.weaponCycle !== 0) this.cycleWeapon(playerId, intent.weaponCycle);
    if (intent.fire) this.fire();
  }

  private adjustAim(angle: number | null, power: number | null): void {
    const playerId = this.engine.state.currentPlayer;
    const tank = this.engine.state.tanks[playerId];
    this.engine.setAim(playerId, angle ?? tank.angle, power ?? tank.power);
  }

  private selectWeapon(weaponId: string): void {
    const playerId = this.engine.state.currentPlayer;
    if (!this.engine.canControl(playerId)) return;
    if (!hasAmmo(this.engine.state.players[playerId], weaponId)) {
      this.hud.toast('Out of ammo');
      return;
    }
    if (this.engine.selectWeapon(playerId, weaponId)) {
      this.services.settings.setLastWeapon(playerId, weaponId);
      this.services.audio.play('click');
    }
  }

  private cycleWeapon(playerId: PlayerId, direction: -1 | 1): void {
    const weapons = this.engine.weapons.all;
    const player = this.engine.state.players[playerId];
    const start = this.engine.weapons.indexOf(this.engine.state.tanks[playerId].weaponId);
    for (let step = 1; step <= weapons.length; step++) {
      const index = (start + direction * step + weapons.length * 2) % weapons.length;
      const weapon = weapons[index];
      if (weapon && hasAmmo(player, weapon.id)) {
        this.selectWeapon(weapon.id);
        return;
      }
    }
  }

  private fire(): void {
    const { state } = this.engine;
    const tank = state.tanks[state.currentPlayer];
    const action: PlayerAction = {
      playerId: state.currentPlayer,
      turnNumber: state.turnNumber,
      weaponId: tank.weaponId,
      angle: roundTo(tank.angle, ACTION_DECIMALS),
      power: roundTo(tank.power, ACTION_DECIMALS),
    };
    const result = this.engine.submitAction(action);
    if (!result.ok && this.engine.phase === GamePhase.Aiming) {
      this.hud.toast(result.reason);
    }
  }

  private dispatch(events: readonly SimEvent[]): void {
    for (const event of events) {
      this.world.handleEvent(event);
      playEventSound(this.services.audio, event);
      this.handleHudEvent(event);
    }
  }

  private handleHudEvent(event: SimEvent): void {
    const { state } = this.engine;
    switch (event.type) {
      case 'turnStarted': {
        this.restorePreferredWeapon(event.playerId);
        this.hud.startTurn(event.playerId, state.players[event.playerId].name, event.turnNumber, event.wind);
        return;
      }
      case 'tankDamaged':
        this.hud.setHealth(event.playerId, event.health, state.tanks[event.playerId].maxHealth);
        return;
      case 'gameOver':
        this.time.delayedCall(GAME_OVER_DELAY_MS, () => this.showGameOver(event.winner));
        return;
      default:
        return;
    }
  }

  /** Re-selects the weapon this player last chose (a stored preference), if they still have ammo for it. */
  private restorePreferredWeapon(playerId: PlayerId): void {
    const preferred = this.services.settings.getPreferences().lastWeapon[playerId];
    if (preferred && this.engine.weapons.has(preferred)) {
      this.engine.selectWeapon(playerId, preferred);
    }
  }

  private showGameOver(winner: Winner): void {
    const data: GameOverData = {
      winner,
      names: [this.engine.state.players[0].name, this.engine.state.players[1].name],
      turns: this.engine.state.turnNumber,
    };
    this.scene.pause();
    this.scene.launch(SCENES.gameOver, data);
  }

  private togglePause(): void {
    if (this.engine.phase === GamePhase.GameOver) return;
    this.paused = !this.paused;
    this.controlsInput.reset();
    if (this.paused) {
      this.tweens.pauseAll();
      this.time.paused = true;
      this.pauseLayer = this.buildPauseOverlay();
    } else {
      this.tweens.resumeAll();
      this.time.paused = false;
      this.pauseLayer?.destroy(true);
      this.pauseLayer = null;
    }
  }

  private buildPauseOverlay(): Phaser.GameObjects.Layer {
    const layer = this.add.layer();
    this.cameras.main.ignore(layer);
    const pauseKey = CONTROLS.pause[0] ?? 'ESC';
    layer.add([
      this.add.rectangle(0, 0, VIEW.width, VIEW.height, 0x070a18, 0.7).setOrigin(0, 0).setInteractive(),
      this.add.text(VIEW.width / 2, 330, 'PAUSED', textStyle(56, PALETTE.textPrimary, 'bold')).setOrigin(0.5),
      new Button(this, VIEW.width / 2, 440, { width: 300, height: 60, label: 'RESUME', hint: keyLabel(pauseKey), onClick: () => this.togglePause() }),
      new Button(this, VIEW.width / 2, 520, {
        width: 300,
        height: 60,
        label: 'QUIT TO MENU',
        onClick: () => {
          this.time.paused = false;
          this.tweens.resumeAll();
          this.scene.start(SCENES.menu);
        },
      }),
    ]);
    return layer;
  }
}

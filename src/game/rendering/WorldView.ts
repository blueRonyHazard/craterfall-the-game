import * as Phaser from 'phaser';
import { EFFECTS, TANK } from '../config/gameBalance';
import { PLAYER_THEMES } from '../config/theme';
import { barrelTip, tankCenter } from '../entities/Tank';
import type { MatchEngine } from '../systems/MatchEngine';
import { GamePhase, type SimEvent } from '../../types/game';
import { degToRad } from '../../utils/math';
import { BackgroundRenderer } from './BackgroundRenderer';
import { EffectsRenderer } from './EffectsRenderer';
import { HazardRenderer } from './HazardRenderer';
import { ProjectileRenderer } from './ProjectileRenderer';
import { TankView } from './TankView';
import { TerrainRenderer } from './TerrainRenderer';

const AIM_GUIDE_BASE = 18;
const AIM_GUIDE_PER_POWER = 1.1;
const AIM_GUIDE_DOT_SPACING = 9;
const AIM_GUIDE_DOT_RADIUS = 2;

/**
 * Everything drawn inside the playfield. Reads engine state each frame and
 * reacts to SimEvents; never mutates the simulation.
 */
export class WorldView {
  readonly background: BackgroundRenderer;
  private readonly terrainRenderer: TerrainRenderer;
  private readonly tanks: [TankView, TankView];
  private readonly projectiles: ProjectileRenderer;
  private readonly effects: EffectsRenderer;
  private readonly aimGuide: Phaser.GameObjects.Graphics;
  private readonly hazards: HazardRenderer;
  /** Scene time until which a falling pyramid is still in the air. */
  private buildLandsAt = 0;
  private lastEmber = 0;

  constructor(
    layer: Phaser.GameObjects.Layer,
    camera: Phaser.Cameras.Scene2D.Camera,
    private readonly scene: Phaser.Scene,
    private readonly engine: MatchEngine,
    private readonly options: { screenShake: () => boolean; showAimGuide: () => boolean },
  ) {
    const { terrain, state } = engine;
    this.background = new BackgroundRenderer(scene, layer, terrain.width, terrain.height, state.terrainSeed);
    this.terrainRenderer = new TerrainRenderer(scene, layer, terrain, state.terrainSeed);
    this.hazards = new HazardRenderer(scene, layer, terrain);
    this.aimGuide = scene.add.graphics();
    layer.add(this.aimGuide);
    this.tanks = [
      new TankView(scene, layer, state.tanks[0], PLAYER_THEMES[0]),
      new TankView(scene, layer, state.tanks[1], PLAYER_THEMES[1]),
    ];
    this.projectiles = new ProjectileRenderer(scene, layer);
    this.effects = new EffectsRenderer(scene, layer, camera, options.screenShake);
  }

  /** Per-frame visual sync with the engine. */
  update(deltaSeconds: number): void {
    const { state } = this.engine;
    this.background.update(deltaSeconds);
    this.tanks.forEach((view, i) => view.setAngle(state.tanks[i as 0 | 1].angle));
    this.projectiles.sync(this.engine.activeProjectiles, (p) => this.effects.dust(p.x, p.y));
    this.hazards.draw(state.hazards, this.scene.time.now / 1000);
    this.emitEmbers();
    this.drawAimGuide();
  }

  /** Milliseconds until a pyramid that is currently falling lands (0 if none). */
  private get buildDelay(): number {
    return Math.max(0, this.buildLandsAt - this.scene.time.now);
  }

  private emitEmbers(): void {
    const { hazards } = this.engine.state;
    const now = this.scene.time.now;
    if (hazards.length === 0 || now - this.lastEmber < EFFECTS.magmaEmberIntervalMs) return;
    this.lastEmber = now;
    for (const hazard of hazards) {
      // Cosmetic randomness only; the simulation never sees it.
      const x = hazard.x + (Math.random() * 2 - 1) * hazard.radius * 0.8;
      this.effects.ember(x, this.engine.terrain.heightAt(x) - 2);
    }
  }

  handleEvent(event: SimEvent): void {
    const { state } = this.engine;
    switch (event.type) {
      case 'turnStarted':
        this.tanks[0].setActive(event.playerId === 0);
        this.tanks[1].setActive(event.playerId === 1);
        this.background.setWind(event.wind.direction * event.wind.strength);
        return;
      case 'shotFired': {
        const tank = state.tanks[event.playerId];
        this.tanks[event.playerId].recoil(tank.angle);
        this.tanks[event.playerId].setActive(false);
        this.effects.muzzleFlash(event.x, event.y, PLAYER_THEMES[event.playerId].light);
        return;
      }
      case 'explosion':
        if (event.visual === 'dust') this.effects.dustBurst(event.x, event.y, event.radius);
        else if (event.visual === 'magma') this.effects.magmaSplash(event.x, event.y, event.radius);
        else this.effects.explosion(event.x, event.y, event.radius);
        return;
      case 'terrainBuilt':
        this.effects.pyramidDrop(event.x, event.apexY, event.height, event.halfWidth);
        this.buildLandsAt = this.scene.time.now + EFFECTS.pyramidDropMs;
        return;
      case 'terrainChanged': {
        // Built-up earth appears when the falling pyramid lands, not before.
        const { minX, maxX } = event;
        const delay = event.cause === 'build' ? this.buildDelay : 0;
        if (delay > 0) this.scene.time.delayedCall(delay, () => this.terrainRenderer.redraw(minX, maxX));
        else this.terrainRenderer.redraw(minX, maxX);
        return;
      }
      case 'hazardTriggered':
        this.effects.burn(event.x, event.y - TANK.centerHeight);
        return;
      case 'hazardCreated':
      case 'hazardExpired':
        return;
      case 'projectileBounced':
        this.effects.bounce(event.x, event.y);
        return;
      case 'projectileRemoved':
        if (event.cue === 'split') this.effects.burst(event.x, event.y, 0xffffff);
        if (event.cue === 'airstrikeCalled') this.effects.flare(event.x, event.y, 0xff5d8f);
        return;
      case 'tankDamaged': {
        const tank = state.tanks[event.playerId];
        const center = tankCenter(tank);
        this.tanks[event.playerId].setHealth(event.health, tank.maxHealth);
        this.effects.damageNumber(center.x, center.y - 40, event.amount);
        return;
      }
      case 'tankMoved':
        this.tanks[event.playerId].moveTo(event.x, event.y, this.buildDelay);
        return;
      case 'tankDestroyed': {
        const center = tankCenter(state.tanks[event.playerId]);
        this.tanks[event.playerId].markDestroyed();
        this.effects.tankDestroyed(center.x, center.y);
        return;
      }
      case 'projectileSpawned':
      case 'gameOver':
        return;
    }
  }

  /** Dotted line from the barrel showing direction and (by length) power. Not a trajectory preview. */
  private drawAimGuide(): void {
    const g = this.aimGuide;
    g.clear();
    const { state } = this.engine;
    if (state.phase !== GamePhase.Aiming || !this.options.showAimGuide()) return;
    const tank = state.tanks[state.currentPlayer];
    const tip = barrelTip(tank);
    const length = AIM_GUIDE_BASE + tank.power * AIM_GUIDE_PER_POWER;
    const r = degToRad(tank.angle);
    const dx = Math.cos(r);
    const dy = -Math.sin(r);
    const color = PLAYER_THEMES[state.currentPlayer].light;
    for (let d = AIM_GUIDE_DOT_SPACING; d <= length; d += AIM_GUIDE_DOT_SPACING) {
      g.fillStyle(color, 0.85 * (1 - d / (length + TANK.barrelLength)));
      g.fillCircle(tip.x + dx * d, tip.y + dy * d, AIM_GUIDE_DOT_RADIUS);
    }
  }
}

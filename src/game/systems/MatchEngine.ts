import { AIMING, PHYSICS, TIMING, WORLD } from '../config/gameBalance';
import { DEFAULT_WEAPON_ID, WEAPONS } from '../config/weapons';
import { consumeAmmo, hasAmmo } from '../entities/Player';
import type { Projectile } from '../entities/Projectile';
import { clampAngle, clampPower } from '../entities/Tank';
import type { Terrain } from '../entities/Terrain';
import { generateTerrain, type TerrainLayout } from '../entities/TerrainGenerator';
import { WeaponManager } from '../weapons/WeaponManager';
import {
  GamePhase,
  type ActionResult,
  type GameStateData,
  type MatchConfig,
  type PlayerAction,
  type PlayerId,
  type SimEvent,
} from '../../types/game';
import type { WeaponDefinition } from '../../types/weapons';
import { createGameState } from './GameState';
import { HazardSystem } from './HazardSystem';
import { ProjectileSystem } from './ProjectileSystem';
import { TurnManager } from './TurnManager';
import { WindSystem, windAcceleration } from './WindSystem';

export interface MatchEngineOptions {
  weapons?: readonly WeaponDefinition[];
  width?: number;
  height?: number;
  layout?: TerrainLayout;
  /** Fixed simulation step; defaults to PHYSICS.timestep. */
  dt?: number;
}

const NO_EVENTS: readonly SimEvent[] = Object.freeze([]);

/**
 * The authoritative, UI-independent simulation of one match.
 *
 * - Input arrives only as PlayerAction commands (submitAction).
 * - Time advances only in fixed steps (tick).
 * - Output is the mutable state plus a stream of SimEvents (drainEvents).
 *
 * Given the same MatchConfig and the same sequence of actions, two engines
 * produce identical states — which is what a future authoritative multiplayer
 * server needs. Phaser never touches this class's internals.
 */
export class MatchEngine {
  readonly state: GameStateData;
  readonly terrain: Terrain;
  readonly weapons: WeaponManager;
  readonly layout: TerrainLayout;
  readonly dt: number;

  private readonly turns: TurnManager;
  private readonly projectiles: ProjectileSystem;
  private readonly hazards: HazardSystem;
  private readonly actionLog: PlayerAction[] = [];
  private events: SimEvent[] = [];
  private phaseTimer = 0;

  constructor(config: MatchConfig, options: MatchEngineOptions = {}) {
    this.dt = options.dt ?? PHYSICS.timestep;
    this.weapons = new WeaponManager(options.weapons ?? WEAPONS);
    const defaultWeapon = this.weapons.has(DEFAULT_WEAPON_ID) ? DEFAULT_WEAPON_ID : this.weapons.all[0]?.id ?? '';

    const generated = generateTerrain({
      width: options.width ?? WORLD.width,
      height: options.height ?? WORLD.height,
      seed: config.terrainSeed,
      ...(options.layout ? { layout: options.layout } : {}),
      ...(config.tankPositions ? { tankPositions: config.tankPositions } : {}),
    });
    this.terrain = generated.terrain;
    this.layout = generated.layout;

    const windSystem = new WindSystem(config.windSeed);
    const [x1, x2] = generated.tankPositions;
    this.state = createGameState({
      terrainSeed: config.terrainSeed,
      windSeed: config.windSeed,
      wind: windSystem.next(),
      tankPositions: [
        { x: x1, y: this.terrain.heightAt(x1) },
        { x: x2, y: this.terrain.heightAt(x2) },
      ],
      weapons: this.weapons.definitions,
      defaultWeaponId: defaultWeapon,
      ...(config.playerNames ? { playerNames: config.playerNames } : {}),
    });

    this.turns = new TurnManager(this.state, windSystem);
    const emit = (event: SimEvent): void => {
      this.events.push(event);
    };
    this.hazards = new HazardSystem(this.state.hazards, emit);
    this.projectiles = new ProjectileSystem(
      { terrain: this.terrain, tanks: this.state.tanks, hazards: this.hazards, emit },
      this.dt,
    );
    this.announceTurn();
  }

  get phase(): GamePhase {
    return this.state.phase;
  }

  get activeProjectiles(): readonly Projectile[] {
    return this.projectiles.active;
  }

  get history(): readonly PlayerAction[] {
    return this.actionLog;
  }

  canControl(playerId: PlayerId): boolean {
    return this.turns.canControl(playerId);
  }

  /**
   * Updates the active tank's aim for display purposes. This is local UI state:
   * the values that matter are the ones carried by the PlayerAction.
   */
  setAim(playerId: PlayerId, angle: number, power: number): boolean {
    if (!this.canControl(playerId)) return false;
    const tank = this.state.tanks[playerId];
    tank.angle = clampAngle(angle);
    tank.power = clampPower(power);
    return true;
  }

  selectWeapon(playerId: PlayerId, weaponId: string): boolean {
    if (!this.canControl(playerId) || !this.weapons.has(weaponId)) return false;
    if (!hasAmmo(this.state.players[playerId], weaponId)) return false;
    this.state.tanks[playerId].weaponId = weaponId;
    return true;
  }

  validateAction(action: PlayerAction): ActionResult {
    if (this.state.phase !== GamePhase.Aiming) return fail(`Cannot fire during ${this.state.phase}`);
    if (action.playerId !== this.state.currentPlayer) return fail('Not this player\'s turn');
    if (action.turnNumber !== this.state.turnNumber) return fail('Stale turn number');
    if (!this.weapons.has(action.weaponId)) return fail(`Unknown weapon ${action.weaponId}`);
    if (!hasAmmo(this.state.players[action.playerId], action.weaponId)) return fail('Out of ammo');
    if (!Number.isFinite(action.angle) || action.angle < AIMING.minAngle || action.angle > AIMING.maxAngle) {
      return fail('Angle out of range');
    }
    if (!Number.isFinite(action.power) || action.power < AIMING.minPower || action.power > AIMING.maxPower) {
      return fail('Power out of range');
    }
    return { ok: true };
  }

  /** Applies a fire command. Invalid actions are rejected and change nothing. */
  submitAction(action: PlayerAction): ActionResult {
    const validation = this.validateAction(action);
    if (!validation.ok) return validation;

    const tank = this.state.tanks[action.playerId];
    tank.angle = action.angle;
    tank.power = action.power;
    tank.weaponId = action.weaponId;
    consumeAmmo(this.state.players[action.playerId], action.weaponId);
    this.actionLog.push({ ...action });

    const weapon = this.weapons.get(action.weaponId);
    const spawns = weapon.fire({ tank, angle: action.angle, power: action.power });
    const origin = spawns[0];
    this.events.push({
      type: 'shotFired',
      playerId: action.playerId,
      weaponId: action.weaponId,
      x: origin?.x ?? tank.x,
      y: origin?.y ?? tank.y,
    });
    for (const spawn of spawns) {
      this.projectiles.spawn(spawn);
    }
    this.turns.beginFlight();
    return { ok: true };
  }

  /** Advances the simulation by exactly one fixed timestep. */
  tick(): void {
    switch (this.state.phase) {
      case GamePhase.ProjectileFlying:
        this.projectiles.step();
        if (this.projectiles.isEmpty) {
          this.turns.beginResolution();
          this.phaseTimer = TIMING.explosionHold;
        }
        return;
      case GamePhase.Explosion:
        if (this.countdown()) {
          // Magma pools burn at the end of every turn, before checking for a winner.
          this.hazards.endOfTurn(this.state.tanks);
          const winner = this.turns.finishResolution();
          if (winner !== null) {
            this.events.push({ type: 'gameOver', winner });
          } else {
            this.phaseTimer = TIMING.turnEndHold;
          }
        }
        return;
      case GamePhase.TurnEnd:
        if (this.countdown()) {
          this.turns.startNextTurn();
          this.announceTurn();
        }
        return;
      case GamePhase.Menu:
      case GamePhase.Aiming:
      case GamePhase.GameOver:
        return;
    }
  }

  /** Runs ticks until the engine waits for input (or the match ends). Returns ticks used. */
  runUntilIdle(maxTicks = 100_000): number {
    let ticks = 0;
    while (this.state.phase !== GamePhase.Aiming && this.state.phase !== GamePhase.GameOver && ticks < maxTicks) {
      this.tick();
      ticks++;
    }
    return ticks;
  }

  /** Returns and clears the events produced since the last call. */
  drainEvents(): readonly SimEvent[] {
    if (this.events.length === 0) return NO_EVENTS;
    const drained = this.events;
    this.events = [];
    return drained;
  }

  /** Rebuilds a match from its config and recorded actions. */
  static replay(config: MatchConfig, actions: readonly PlayerAction[], options: MatchEngineOptions = {}): MatchEngine {
    const engine = new MatchEngine(config, options);
    for (const action of actions) {
      const result = engine.submitAction(action);
      if (!result.ok) {
        throw new Error(`Replay diverged at turn ${action.turnNumber}: ${result.reason}`);
      }
      engine.runUntilIdle();
    }
    return engine;
  }

  /** If the active tank's weapon ran dry, switch to the next weapon that still has ammo. */
  private ensureLoadedWeapon(playerId: PlayerId): void {
    const tank = this.state.tanks[playerId];
    const player = this.state.players[playerId];
    if (hasAmmo(player, tank.weaponId)) return;
    const fallback = this.weapons.firstAvailable(player, tank.weaponId);
    if (fallback) tank.weaponId = fallback.id;
  }

  private countdown(): boolean {
    this.phaseTimer -= this.dt;
    return this.phaseTimer <= 0;
  }

  private announceTurn(): void {
    this.ensureLoadedWeapon(this.state.currentPlayer);
    this.projectiles.setWindAcceleration(windAcceleration(this.state.wind));
    this.events.push({
      type: 'turnStarted',
      playerId: this.state.currentPlayer,
      turnNumber: this.state.turnNumber,
      wind: { ...this.state.wind },
    });
  }
}

function fail(reason: string): ActionResult {
  return { ok: false, reason };
}

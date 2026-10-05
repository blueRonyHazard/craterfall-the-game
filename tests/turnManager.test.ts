import { describe, expect, it } from 'vitest';
import { TurnManager } from '../src/game/systems/TurnManager';
import { createGameState } from '../src/game/systems/GameState';
import { WindSystem } from '../src/game/systems/WindSystem';
import { MatchEngine } from '../src/game/systems/MatchEngine';
import { WEAPONS } from '../src/game/config/weapons';
import { GamePhase, type PlayerAction } from '../src/types/game';

function freshState() {
  const wind = new WindSystem(1);
  const state = createGameState({
    terrainSeed: 1,
    windSeed: 1,
    wind: wind.next(),
    tankPositions: [
      { x: 100, y: 200 },
      { x: 900, y: 200 },
    ],
    weapons: WEAPONS,
    defaultWeaponId: 'standard-shell',
  });
  return { state, turns: new TurnManager(state, wind) };
}

function playOneTurn(turns: TurnManager): void {
  turns.beginFlight();
  turns.beginResolution();
  expect(turns.finishResolution()).toBeNull();
  turns.startNextTurn();
}

describe('TurnManager', () => {
  it('starts on player 1, turn 1, aiming', () => {
    const { state, turns } = freshState();
    expect(state.currentPlayer).toBe(0);
    expect(state.turnNumber).toBe(1);
    expect(turns.phase).toBe(GamePhase.Aiming);
  });

  it('alternates players and increments the turn number', () => {
    const { state, turns } = freshState();
    playOneTurn(turns);
    expect(state.currentPlayer).toBe(1);
    expect(state.turnNumber).toBe(2);
    playOneTurn(turns);
    expect(state.currentPlayer).toBe(0);
    expect(state.turnNumber).toBe(3);
  });

  it('only lets the active player control while aiming', () => {
    const { turns } = freshState();
    expect(turns.canControl(0)).toBe(true);
    expect(turns.canControl(1)).toBe(false);
    turns.beginFlight();
    expect(turns.canControl(0)).toBe(false);
    expect(turns.inputLocked).toBe(true);
  });

  it('rejects illegal phase transitions', () => {
    const { turns } = freshState();
    expect(() => turns.beginResolution()).toThrow();
    expect(() => turns.startNextTurn()).toThrow();
  });

  it('rolls new wind each turn from the seeded sequence', () => {
    const { state, turns } = freshState();
    const reference = new WindSystem(1);
    reference.next(); // turn 1
    playOneTurn(turns);
    expect(state.wind).toEqual(reference.next());
  });
});

describe('MatchEngine turn flow', () => {
  const config = { terrainSeed: 2024, windSeed: 7 };

  function shot(engine: MatchEngine, overrides: Partial<PlayerAction> = {}): PlayerAction {
    return {
      playerId: engine.state.currentPlayer,
      turnNumber: engine.state.turnNumber,
      weaponId: 'standard-shell',
      angle: 60,
      power: 55,
      ...overrides,
    };
  }

  it('switches player after a shot resolves', () => {
    const engine = new MatchEngine(config);
    expect(engine.submitAction(shot(engine))).toEqual({ ok: true });
    expect(engine.phase).toBe(GamePhase.ProjectileFlying);
    engine.runUntilIdle();
    expect(engine.phase).toBe(GamePhase.Aiming);
    expect(engine.state.currentPlayer).toBe(1);
    expect(engine.state.turnNumber).toBe(2);
  });

  it('rejects actions from the inactive player', () => {
    const engine = new MatchEngine(config);
    const result = engine.submitAction(shot(engine, { playerId: 1 }));
    expect(result.ok).toBe(false);
    expect(engine.phase).toBe(GamePhase.Aiming);
  });

  it('rejects input while a projectile is in flight', () => {
    const engine = new MatchEngine(config);
    engine.submitAction(shot(engine));
    expect(engine.submitAction(shot(engine)).ok).toBe(false);
    expect(engine.setAim(0, 10, 10)).toBe(false);
    expect(engine.selectWeapon(0, 'heavy-shell')).toBe(false);
  });

  it('rejects stale turn numbers and out-of-range values', () => {
    const engine = new MatchEngine(config);
    expect(engine.submitAction(shot(engine, { turnNumber: 5 })).ok).toBe(false);
    expect(engine.submitAction(shot(engine, { angle: 200 })).ok).toBe(false);
    expect(engine.submitAction(shot(engine, { power: Number.NaN })).ok).toBe(false);
    expect(engine.submitAction(shot(engine, { weaponId: 'nope' })).ok).toBe(false);
  });

  it('emits a turnStarted event for each turn', () => {
    const engine = new MatchEngine(config);
    const initial = engine.drainEvents();
    expect(initial[0]).toMatchObject({ type: 'turnStarted', playerId: 0, turnNumber: 1 });
    engine.submitAction(shot(engine));
    engine.runUntilIdle();
    const events = engine.drainEvents();
    expect(events.some((e) => e.type === 'turnStarted' && e.playerId === 1)).toBe(true);
  });
});

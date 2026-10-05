import { describe, expect, it } from 'vitest';
import { detectWinner } from '../src/game/systems/GameState';
import { createTank } from '../src/game/entities/Tank';
import { MatchEngine } from '../src/game/systems/MatchEngine';
import { GamePhase, type PlayerAction } from '../src/types/game';

describe('detectWinner', () => {
  it('returns null while both tanks live', () => {
    expect(detectWinner([createTank(0, 0, 0, 'x'), createTank(1, 0, 0, 'x')])).toBeNull();
  });

  it('returns the survivor', () => {
    const a = createTank(0, 0, 0, 'x');
    const b = createTank(1, 0, 0, 'x');
    b.health = 0;
    expect(detectWinner([a, b])).toBe(0);
    a.health = 0;
    b.health = 10;
    expect(detectWinner([a, b])).toBe(1);
  });

  it('returns a draw when both are destroyed', () => {
    const a = createTank(0, 0, 0, 'x');
    const b = createTank(1, 0, 0, 'x');
    a.health = 0;
    b.health = 0;
    expect(detectWinner([a, b])).toBe('draw');
  });
});

describe('MatchEngine game over', () => {
  const config = { terrainSeed: 99, windSeed: 5 };

  /**
   * Finds a player-1 shot that lands a near-direct hit on player 2 by brute-force
   * search. Because the engine is deterministic, the found shot always hits.
   */
  function findDirectHit(): PlayerAction {
    let best: { action: PlayerAction; damage: number } | null = null;
    for (let angle = 20; angle <= 80; angle += 2) {
      for (let power = 30; power <= 100; power += 2) {
        const action: PlayerAction = { playerId: 0, turnNumber: 1, weaponId: 'standard-shell', angle, power };
        const engine = new MatchEngine(config);
        engine.submitAction(action);
        engine.runUntilIdle();
        const damage = engine.state.tanks[1].maxHealth - engine.state.tanks[1].health;
        if (!best || damage > best.damage) best = { action, damage };
      }
    }
    if (!best || best.damage === 0) throw new Error('No hitting shot found');
    return best.action;
  }

  const pointBlank = findDirectHit();

  it('ends the match when a tank is destroyed', () => {
    const engine = new MatchEngine(config);
    engine.state.tanks[1].health = 1;
    expect(engine.submitAction(pointBlank).ok).toBe(true);
    engine.runUntilIdle();
    expect(engine.phase).toBe(GamePhase.GameOver);
    expect(engine.state.winner).toBe(0);
    const events = engine.drainEvents();
    expect(events.some((e) => e.type === 'tankDestroyed' && e.playerId === 1)).toBe(true);
    expect(events.some((e) => e.type === 'gameOver' && e.winner === 0)).toBe(true);
  });

  it('declares a draw when one blast destroys both tanks', () => {
    // Put both tanks side by side so a single explosion catches both hulls.
    const engine = new MatchEngine({ ...config, tankPositions: [800, 850] });
    engine.state.tanks[0].health = 1;
    engine.state.tanks[1].health = 1;
    // Straight up: the shell falls back between the two tanks.
    engine.submitAction({ playerId: 0, turnNumber: 1, weaponId: 'heavy-shell', angle: 90, power: 30 });
    engine.runUntilIdle();
    expect(engine.state.winner).toBe('draw');
  });

  it('accepts no further actions after game over', () => {
    const engine = new MatchEngine(config);
    engine.state.tanks[1].health = 1;
    engine.submitAction(pointBlank);
    engine.runUntilIdle();
    const result = engine.submitAction({ ...pointBlank, playerId: 1, turnNumber: 2 });
    expect(result.ok).toBe(false);
  });

  it('keeps playing while both tanks survive', () => {
    const engine = new MatchEngine(config);
    engine.submitAction(pointBlank);
    engine.runUntilIdle();
    expect(engine.phase).toBe(GamePhase.Aiming);
    expect(engine.state.winner).toBeNull();
    expect(engine.state.tanks[1].health).toBeLessThan(engine.state.tanks[1].maxHealth);
  });
});

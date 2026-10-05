import { describe, expect, it } from 'vitest';
import { MatchEngine } from '../src/game/systems/MatchEngine';
import { cloneGameState } from '../src/game/systems/GameState';
import { WEAPONS } from '../src/game/config/weapons';
import { GamePhase, type PlayerAction } from '../src/types/game';
import { SeededRandom } from '../src/utils/random';

/** Plays a scripted match where every action is derived from a seeded RNG. */
function playScripted(seed: number, turns: number): { engine: MatchEngine; actions: PlayerAction[] } {
  const engine = new MatchEngine({ terrainSeed: seed, windSeed: seed + 1 });
  const rng = new SeededRandom(seed + 2);
  const actions: PlayerAction[] = [];
  for (let i = 0; i < turns && engine.phase === GamePhase.Aiming; i++) {
    const player = engine.state.players[engine.state.currentPlayer];
    const usable = WEAPONS.filter((w) => (player.ammo[w.id] ?? 0) > 0);
    const action: PlayerAction = {
      playerId: engine.state.currentPlayer,
      turnNumber: engine.state.turnNumber,
      weaponId: rng.pick(usable).id,
      angle: Math.round(rng.range(20, 160)),
      power: Math.round(rng.range(35, 95)),
    };
    expect(engine.submitAction(action).ok).toBe(true);
    actions.push(action);
    engine.runUntilIdle();
  }
  return { engine, actions };
}

function fingerprint(engine: MatchEngine): string {
  return JSON.stringify({
    state: cloneGameState(engine.state),
    terrain: Array.from(engine.terrain.snapshot()),
  });
}

describe('determinism', () => {
  it('reproduces a match exactly from seeds and actions', () => {
    const { engine, actions } = playScripted(31337, 16);
    const replayed = MatchEngine.replay({ terrainSeed: 31337, windSeed: 31338 }, actions);
    expect(fingerprint(replayed)).toBe(fingerprint(engine));
  });

  it('produces the same event stream on replay', () => {
    const { actions } = playScripted(4242, 8);
    const config = { terrainSeed: 4242, windSeed: 4243 };
    const a = new MatchEngine(config);
    const b = new MatchEngine(config);
    for (const action of actions) {
      for (const engine of [a, b]) {
        engine.submitAction(action);
        engine.runUntilIdle();
      }
      expect(JSON.stringify(b.drainEvents())).toBe(JSON.stringify(a.drainEvents()));
    }
  });

  it('diverges when an action changes', () => {
    const { actions } = playScripted(777, 4);
    const original = MatchEngine.replay({ terrainSeed: 777, windSeed: 778 }, actions);
    const tweaked = actions.map((a, i) => (i === 0 ? { ...a, power: a.power === 95 ? 94 : a.power + 1 } : a));
    const changed = MatchEngine.replay({ terrainSeed: 777, windSeed: 778 }, tweaked);
    expect(fingerprint(changed)).not.toBe(fingerprint(original));
  });

  it('serialises state including unlimited ammo', () => {
    const engine = new MatchEngine({ terrainSeed: 1, windSeed: 1 });
    const copy = cloneGameState(engine.state);
    expect(copy.players[0].ammo['standard-shell']).toBe(Number.POSITIVE_INFINITY);
    expect(copy).toEqual(engine.state);
  });
});

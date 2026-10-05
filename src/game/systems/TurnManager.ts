import { WIND } from '../config/gameBalance';
import { GamePhase, type GameStateData, type PlayerId, type Winner } from '../../types/game';
import { detectWinner, otherPlayer } from './GameState';
import type { WindSystem } from './WindSystem';

/**
 * Owns the phase machine and turn order:
 *
 *   AIMING → PROJECTILE_FLYING → EXPLOSION → TURN_END → AIMING (next player)
 *                                         ↘ GAME_OVER
 *
 * All phase changes go through here, so there are no scattered booleans.
 * Illegal transitions throw, which surfaces engine bugs immediately.
 */
export class TurnManager {
  private readonly state: GameStateData;
  private readonly wind: WindSystem;
  private readonly windChangesEachTurn: boolean;

  constructor(state: GameStateData, wind: WindSystem, windChangesEachTurn: boolean = WIND.changesEachTurn) {
    this.state = state;
    this.wind = wind;
    this.windChangesEachTurn = windChangesEachTurn;
  }

  get phase(): GamePhase {
    return this.state.phase;
  }

  get currentPlayer(): PlayerId {
    return this.state.currentPlayer;
  }

  get turnNumber(): number {
    return this.state.turnNumber;
  }

  /** Only the active player, and only while aiming, may control their tank. */
  canControl(playerId: PlayerId): boolean {
    return this.state.phase === GamePhase.Aiming && this.state.currentPlayer === playerId;
  }

  /** True while input must be ignored (shot in flight, explosions resolving, game over...). */
  get inputLocked(): boolean {
    return this.state.phase !== GamePhase.Aiming;
  }

  beginFlight(): void {
    this.transition(GamePhase.Aiming, GamePhase.ProjectileFlying);
  }

  beginResolution(): void {
    this.transition(GamePhase.ProjectileFlying, GamePhase.Explosion);
  }

  /**
   * Ends the resolution phase. Returns the winner if the match is over (and
   * moves to GAME_OVER), otherwise moves to TURN_END and returns null.
   */
  finishResolution(): Winner | null {
    this.assertPhase(GamePhase.Explosion);
    const winner = detectWinner(this.state.tanks);
    if (winner !== null) {
      this.state.winner = winner;
      this.state.phase = GamePhase.GameOver;
      return winner;
    }
    this.state.phase = GamePhase.TurnEnd;
    return null;
  }

  /** Hands control to the other player and rolls new wind if configured. */
  startNextTurn(): void {
    this.transition(GamePhase.TurnEnd, GamePhase.Aiming);
    this.state.currentPlayer = otherPlayer(this.state.currentPlayer);
    this.state.turnNumber += 1;
    if (this.windChangesEachTurn) {
      this.state.wind = this.wind.next();
    }
  }

  private transition(from: GamePhase, to: GamePhase): void {
    this.assertPhase(from);
    this.state.phase = to;
  }

  private assertPhase(expected: GamePhase): void {
    if (this.state.phase !== expected) {
      throw new Error(`Invalid phase transition: expected ${expected}, current ${this.state.phase}`);
    }
  }
}

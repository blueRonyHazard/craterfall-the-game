import * as Phaser from 'phaser';
import { EFFECTS } from '../config/gameBalance';
import { PALETTE } from '../config/theme';
import type { Terrain } from '../entities/Terrain';
import type { HazardState } from '../../types/game';

const STEP = 3;
const EDGE_MIN = 0.3;
const WAVE_FREQUENCY = 0.09;
const WAVE_AMPLITUDE = 1.4;
const GLOW_WIDTH = 7;
/** Pools with this many turns or fewer left start to dim as they cool. */
const COOLING_TURNS = 1;
const COOLING_ALPHA = 0.6;

type Point = { x: number; y: number };

/**
 * Draws magma pools as a glowing, shimmering band that follows the current
 * terrain surface, so a pool sinks with the ground if a crater opens under it.
 * Redrawn every frame from GameStateData.hazards; it never changes game state.
 */
export class HazardRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly points: Point[] = [];

  constructor(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    private readonly terrain: Terrain,
  ) {
    this.graphics = scene.add.graphics();
    layer.add(this.graphics);
  }

  draw(hazards: readonly HazardState[], timeSeconds: number): void {
    const g = this.graphics;
    g.clear();
    for (const hazard of hazards) {
      this.drawPool(hazard, timeSeconds);
    }
  }

  private drawPool(hazard: HazardState, time: number): void {
    const g = this.graphics;
    const x0 = Math.max(0, hazard.x - hazard.radius);
    const x1 = Math.min(this.terrain.width - 1, hazard.x + hazard.radius);
    if (x1 <= x0) return;
    const alpha = hazard.turnsLeft <= COOLING_TURNS ? COOLING_ALPHA : 1;
    const phase = time * EFFECTS.magmaShimmerSpeed;

    // Upper edge, left → right.
    const top = this.points;
    top.length = 0;
    for (let x = x0; x <= x1; x += STEP) {
      const thickness = this.thicknessAt(hazard, x);
      const wave = Math.sin(x * WAVE_FREQUENCY + phase) * WAVE_AMPLITUDE;
      top.push({ x, y: this.terrain.heightAt(x) - thickness * 0.55 + wave });
    }
    const count = top.length;

    // Glow underneath the pool.
    g.lineStyle(GLOW_WIDTH, PALETTE.magmaInner, 0.22 * alpha);
    g.strokePoints(top, false);

    // Body: upper edge forwards, then the lower edge backwards.
    for (let i = count - 1; i >= 0; i--) {
      const p = top[i] as Point;
      top.push({ x: p.x, y: this.terrain.heightAt(p.x) + this.thicknessAt(hazard, p.x) * 0.6 });
    }
    g.fillStyle(PALETTE.magmaOuter, 0.95 * alpha);
    g.fillPoints(top, true);

    // Bright crust line along the surface.
    top.length = count;
    g.lineStyle(2, PALETTE.magmaHot, 0.9 * alpha);
    g.strokePoints(top, false);
  }

  /** Thickest in the middle of the pool, tapering towards its edges. */
  private thicknessAt(hazard: HazardState, x: number): number {
    const t = 1 - ((x - hazard.x) / hazard.radius) ** 2;
    return EFFECTS.magmaThickness * (EDGE_MIN + (1 - EDGE_MIN) * Math.sqrt(Math.max(0, t)));
  }
}

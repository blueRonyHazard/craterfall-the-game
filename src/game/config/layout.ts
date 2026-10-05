import { WORLD } from './gameBalance';

/**
 * Logical screen layout (16:9). Phaser scales this to fit the browser window,
 * so every coordinate below is in logical pixels regardless of real resolution.
 */
export const VIEW = {
  width: 1600,
  height: 900,
} as const;

export const HUD_LAYOUT = {
  topHeight: 64,
  bottomHeight: 120,
} as const;

/** Rectangle of the screen where the battlefield is drawn (between the HUD bars). */
export const PLAYFIELD = {
  x: 0,
  y: HUD_LAYOUT.topHeight,
  width: WORLD.width,
  height: WORLD.height,
} as const;

// Compile-time sanity: the playfield plus both HUD bars must fill the view exactly.
const filled: number = HUD_LAYOUT.topHeight + WORLD.height + HUD_LAYOUT.bottomHeight;
if (filled !== VIEW.height || WORLD.width !== VIEW.width) {
  throw new Error('Layout mismatch: HUD bars + world height must equal the view height.');
}

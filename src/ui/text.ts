import type * as Phaser from 'phaser';
import { FONT_FAMILY, PALETTE } from '../game/config/theme';

/** Text rendered at 2× so it stays crisp when the canvas is scaled up to 1080p+. */
const TEXT_RESOLUTION = 2;

export function textStyle(
  size: number,
  color: string = PALETTE.textPrimary,
  weight: 'normal' | 'bold' = 'normal',
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT_FAMILY,
    fontSize: `${size}px`,
    color,
    fontStyle: weight,
    resolution: TEXT_RESOLUTION,
  };
}

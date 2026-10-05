import * as Phaser from 'phaser';
import { VIEW } from './config/layout';
import { BootScene } from './scenes/BootScene';
import { GameOverScene } from './scenes/GameOverScene';
import { GameScene } from './scenes/GameScene';
import { HowToPlayScene } from './scenes/HowToPlayScene';
import { MenuScene } from './scenes/MenuScene';
import { SettingsScene } from './scenes/SettingsScene';

/**
 * Phaser configuration. The game renders at a fixed 1600×900 logical size and
 * the Scale Manager letterboxes it to fit any window, so layout code never deals
 * with real pixels. Phaser's physics engines are intentionally not enabled:
 * artillery physics is our own deterministic simulation.
 */
export function createGameConfig(parent: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#070a18',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: VIEW.width,
      height: VIEW.height,
    },
    render: {
      antialias: true,
      roundPixels: false,
    },
    input: {
      keyboard: true,
      mouse: { preventDefaultWheel: true },
    },
    scene: [BootScene, MenuScene, SettingsScene, HowToPlayScene, GameScene, GameOverScene],
  };
}

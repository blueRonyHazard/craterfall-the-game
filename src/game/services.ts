import type * as Phaser from 'phaser';
import { AudioManager } from './audio/AudioManager';
import { SettingsStore } from './persistence/SettingsStore';

/**
 * Long-lived collaborators shared by all scenes. Created once in Game.ts and
 * handed to scenes through the game registry — explicit dependencies instead
 * of module-level singletons.
 */
export interface GameServices {
  settings: SettingsStore;
  audio: AudioManager;
}

const REGISTRY_KEY = 'services';

export function registerServices(game: Phaser.Game, services: GameServices): void {
  game.registry.set(REGISTRY_KEY, services);
}

export function getServices(scene: Phaser.Scene): GameServices {
  const services: unknown = scene.registry.get(REGISTRY_KEY);
  if (!isServices(services)) {
    throw new Error('Game services were not registered before scenes started.');
  }
  return services;
}

function isServices(value: unknown): value is GameServices {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Partial<GameServices>).settings instanceof SettingsStore &&
    (value as Partial<GameServices>).audio instanceof AudioManager
  );
}

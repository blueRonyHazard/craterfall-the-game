import * as Phaser from 'phaser';
import { AudioManager, SilentBackend } from './audio/AudioManager';
import { SynthBackend } from './audio/SynthBackend';
import { createGameConfig } from './GameConfig';
import { SettingsStore } from './persistence/SettingsStore';
import { registerServices, type GameServices } from './services';

/** Creates the Phaser game and wires up shared services. */
export function createGame(parent: string): Phaser.Game {
  const settings = SettingsStore.fromBrowser();
  const backend = typeof window !== 'undefined' && 'AudioContext' in window ? new SynthBackend() : new SilentBackend();
  const services: GameServices = { settings, audio: new AudioManager(settings, backend) };

  const game = new Phaser.Game(createGameConfig(parent));
  registerServices(game, services);

  // Browsers only allow audio after a user gesture.
  const unlock = (): void => services.audio.unlock();
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  return game;
}

import type { Settings, SettingsStore } from '../persistence/SettingsStore';

/** Every sound the game can request. Add an id here and handle it in your backend. */
export type SoundId =
  | 'fire'
  | 'explosion'
  | 'bounce'
  | 'split'
  | 'airstrike'
  | 'hit'
  | 'destroyed'
  | 'turn'
  | 'click'
  | 'drill'
  | 'victory';

/**
 * Pluggable sound producer. The default SynthBackend generates sounds with the
 * Web Audio API; a sample-based backend (e.g. wrapping Phaser's sound manager
 * with recorded assets) can implement the same interface without touching any
 * gameplay or scene code.
 */
export interface SoundBackend {
  /** Called after a user gesture; browsers block audio until then. */
  unlock(): void;
  /** @param intensity 0..1+ scale hint (e.g. explosion size). */
  play(id: SoundId, intensity: number): void;
  setVolumes(effects: number, music: number): void;
  startMusic(): void;
  stopMusic(): void;
}

/** Backend that does nothing — used when Web Audio is unavailable (and in tests). */
export class SilentBackend implements SoundBackend {
  unlock(): void {}
  play(): void {}
  setVolumes(): void {}
  startMusic(): void {}
  stopMusic(): void {}
}

/**
 * Facade used by scenes. Applies the user's volume settings and forwards
 * requests to the backend.
 */
export class AudioManager {
  private readonly backend: SoundBackend;

  constructor(settings: SettingsStore, backend: SoundBackend) {
    this.backend = backend;
    this.applySettings(settings.getSettings());
    settings.onChange((next) => this.applySettings(next));
  }

  unlock(): void {
    this.backend.unlock();
  }

  play(id: SoundId, intensity = 1): void {
    this.backend.play(id, intensity);
  }

  startMusic(): void {
    this.backend.startMusic();
  }

  stopMusic(): void {
    this.backend.stopMusic();
  }

  private applySettings(settings: Readonly<Settings>): void {
    this.backend.setVolumes(settings.masterVolume * settings.effectsVolume, settings.masterVolume * settings.musicVolume);
  }
}

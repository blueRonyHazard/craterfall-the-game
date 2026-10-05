import { clamp } from '../../utils/math';

/** Subset of the Web Storage API we depend on — lets tests inject an in-memory store. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface Settings {
  masterVolume: number;
  effectsVolume: number;
  musicVolume: number;
  screenShake: boolean;
}

export interface Preferences {
  showAimGuide: boolean;
  /** Last weapon each player selected; restored at the start of their turns. */
  lastWeapon: [string | null, string | null];
}

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  masterVolume: 0.8,
  effectsVolume: 0.9,
  musicVolume: 0.5,
  screenShake: true,
});

export const DEFAULT_PREFERENCES: Readonly<Preferences> = Object.freeze({
  showAimGuide: true,
  lastWeapon: [null, null] as [string | null, string | null],
});

export const STORAGE_KEYS = {
  settings: 'craterfall.settings.v1',
  preferences: 'craterfall.preferences.v1',
} as const;

type Listener = (settings: Readonly<Settings>) => void;

/**
 * Loads, validates and persists user settings and preferences. Corrupt or
 * missing data falls back to defaults field by field; storage failures (private
 * mode, quota) are swallowed so the game always runs. No match state is ever
 * stored here.
 */
export class SettingsStore {
  private settings: Settings;
  private preferences: Preferences;
  private readonly listeners = new Set<Listener>();

  constructor(private readonly storage: StorageLike | null) {
    this.settings = parseSettings(this.read(STORAGE_KEYS.settings));
    this.preferences = parsePreferences(this.read(STORAGE_KEYS.preferences));
  }

  /** Uses window.localStorage when available. */
  static fromBrowser(): SettingsStore {
    let storage: StorageLike | null = null;
    try {
      storage = typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
      storage = null;
    }
    return new SettingsStore(storage);
  }

  getSettings(): Readonly<Settings> {
    return this.settings;
  }

  getPreferences(): Readonly<Preferences> {
    return this.preferences;
  }

  updateSettings(patch: Partial<Settings>): void {
    this.settings = parseSettings({ ...this.settings, ...patch });
    this.write(STORAGE_KEYS.settings, this.settings);
    for (const listener of this.listeners) listener(this.settings);
  }

  updatePreferences(patch: Partial<Preferences>): void {
    this.preferences = parsePreferences({ ...this.preferences, ...patch });
    this.write(STORAGE_KEYS.preferences, this.preferences);
  }

  setLastWeapon(playerId: 0 | 1, weaponId: string): void {
    const lastWeapon: [string | null, string | null] = [...this.preferences.lastWeapon];
    lastWeapon[playerId] = weaponId;
    this.updatePreferences({ lastWeapon });
  }

  /** Subscribes to settings changes; returns an unsubscribe function. */
  onChange(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private read(key: string): unknown {
    try {
      const raw = this.storage?.getItem(key);
      return raw ? (JSON.parse(raw) as unknown) : null;
    } catch {
      return null;
    }
  }

  private write(key: string, value: unknown): void {
    try {
      this.storage?.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or disabled: settings still apply for this session.
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function volume(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? clamp(value, 0, 1) : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function weaponId(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function parseSettings(raw: unknown): Settings {
  const source = isRecord(raw) ? raw : {};
  return {
    masterVolume: volume(source['masterVolume'], DEFAULT_SETTINGS.masterVolume),
    effectsVolume: volume(source['effectsVolume'], DEFAULT_SETTINGS.effectsVolume),
    musicVolume: volume(source['musicVolume'], DEFAULT_SETTINGS.musicVolume),
    screenShake: bool(source['screenShake'], DEFAULT_SETTINGS.screenShake),
  };
}

export function parsePreferences(raw: unknown): Preferences {
  const source = isRecord(raw) ? raw : {};
  const last = Array.isArray(source['lastWeapon']) ? (source['lastWeapon'] as unknown[]) : [];
  return {
    showAimGuide: bool(source['showAimGuide'], DEFAULT_PREFERENCES.showAimGuide),
    lastWeapon: [weaponId(last[0]), weaponId(last[1])],
  };
}

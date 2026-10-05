import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  SettingsStore,
  STORAGE_KEYS,
  parseSettings,
  type StorageLike,
} from '../src/game/persistence/SettingsStore';

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

describe('SettingsStore', () => {
  it('uses defaults when storage is empty or unavailable', () => {
    expect(new SettingsStore(memoryStorage()).getSettings()).toEqual(DEFAULT_SETTINGS);
    expect(new SettingsStore(null).getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('persists and reloads settings', () => {
    const storage = memoryStorage();
    new SettingsStore(storage).updateSettings({ musicVolume: 0.25, screenShake: false });
    const reloaded = new SettingsStore(storage).getSettings();
    expect(reloaded.musicVolume).toBe(0.25);
    expect(reloaded.screenShake).toBe(false);
  });

  it('recovers from corrupt JSON and invalid values', () => {
    const storage = memoryStorage({ [STORAGE_KEYS.settings]: '{not json' });
    expect(new SettingsStore(storage).getSettings()).toEqual(DEFAULT_SETTINGS);
    const parsed = parseSettings({ masterVolume: 7, effectsVolume: 'loud', screenShake: 1 });
    expect(parsed.masterVolume).toBe(1);
    expect(parsed.effectsVolume).toBe(DEFAULT_SETTINGS.effectsVolume);
    expect(parsed.screenShake).toBe(DEFAULT_SETTINGS.screenShake);
  });

  it('remembers the last weapon per player', () => {
    const storage = memoryStorage();
    new SettingsStore(storage).setLastWeapon(1, 'drill');
    expect(new SettingsStore(storage).getPreferences().lastWeapon).toEqual([null, 'drill']);
  });

  it('notifies listeners on change', () => {
    const store = new SettingsStore(memoryStorage());
    let seen = -1;
    const unsubscribe = store.onChange((s) => {
      seen = s.masterVolume;
    });
    store.updateSettings({ masterVolume: 0.3 });
    expect(seen).toBe(0.3);
    unsubscribe();
    store.updateSettings({ masterVolume: 0.6 });
    expect(seen).toBe(0.3);
  });
});

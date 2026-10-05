/**
 * Every key binding in one place. Values are Phaser key names
 * (Phaser.Input.Keyboard.KeyCodes), e.g. 'A', 'SPACE', 'LEFT', 'ONE'.
 *
 * Players share one keyboard (hot-seat). Each player has their own aiming keys;
 * only the active player's keys do anything.
 */
export interface PlayerBindings {
  /** Rotate the barrel towards the left (angle increases towards 180°). */
  rotateLeft: readonly string[];
  /** Rotate the barrel towards the right (angle decreases towards 0°). */
  rotateRight: readonly string[];
  powerUp: readonly string[];
  powerDown: readonly string[];
  fire: readonly string[];
}

export interface ControlScheme {
  players: readonly [PlayerBindings, PlayerBindings];
  /** Key per weapon slot; index 0 selects the first weapon in config/weapons.ts. */
  weaponSlots: readonly string[];
  previousWeapon: readonly string[];
  nextWeapon: readonly string[];
  /** Hold to adjust angle/power slowly for precise shots. */
  fineAdjust: readonly string[];
  pause: readonly string[];
}

export const CONTROLS: ControlScheme = {
  players: [
    { rotateLeft: ['A'], rotateRight: ['D'], powerUp: ['W'], powerDown: ['S'], fire: ['SPACE'] },
    { rotateLeft: ['LEFT'], rotateRight: ['RIGHT'], powerUp: ['UP'], powerDown: ['DOWN'], fire: ['ENTER'] },
  ],
  weaponSlots: ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'],
  previousWeapon: ['Q'],
  nextWeapon: ['E'],
  fineAdjust: ['SHIFT'],
  pause: ['ESC'],
};

/** Mouse tuning. */
export const MOUSE = {
  /** World units of drag distance per power percent when aiming by dragging. */
  dragUnitsPerPower: 2.4,
  /** Power percent per wheel notch (deltaY of 100). */
  wheelPowerStep: 2,
} as const;

/** Human-readable label for a key name, used in the HUD and How To Play screen. */
export function keyLabel(key: string): string {
  const labels: Record<string, string> = {
    SPACE: 'Space',
    ENTER: 'Enter',
    LEFT: '←',
    RIGHT: '→',
    UP: '↑',
    DOWN: '↓',
    SHIFT: 'Shift',
    ESC: 'Esc',
    ONE: '1',
    TWO: '2',
    THREE: '3',
    FOUR: '4',
    FIVE: '5',
    SIX: '6',
    SEVEN: '7',
    EIGHT: '8',
    NINE: '9',
  };
  return labels[key] ?? key;
}

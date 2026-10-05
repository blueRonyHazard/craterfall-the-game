import * as Phaser from 'phaser';
import type { Button } from './Button';

/**
 * Keyboard navigation for a vertical list of buttons: Up/Down or W/S to move,
 * Enter or Space to activate, Esc for the optional back action.
 */
export class MenuNavigation {
  private index = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly buttons: readonly Button[],
    onBack?: () => void,
  ) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) return;
    const move = (delta: number) => (): void => this.focus(this.index + delta);
    keyboard.on('keydown-UP', move(-1));
    keyboard.on('keydown-W', move(-1));
    keyboard.on('keydown-DOWN', move(1));
    keyboard.on('keydown-S', move(1));
    const activate = (): void => this.buttons[this.index]?.press();
    keyboard.on('keydown-ENTER', activate);
    keyboard.on('keydown-SPACE', activate);
    if (onBack) keyboard.on('keydown-ESC', onBack);
    this.focus(0);
  }

  private focus(index: number): void {
    const count = this.buttons.length;
    if (count === 0) return;
    this.index = ((index % count) + count) % count;
    this.buttons.forEach((button, i) => button.setFocused(i === this.index));
  }
}

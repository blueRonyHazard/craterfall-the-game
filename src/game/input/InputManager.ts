import * as Phaser from 'phaser';
import { AIMING } from '../config/gameBalance';
import { CONTROLS, MOUSE, type ControlScheme } from '../config/controls';
import { PLAYFIELD } from '../config/layout';
import type { PlayerId, Vec2 } from '../../types/game';

/** What the player asked for this frame. Reused between frames to avoid allocation. */
export interface InputIntent {
  angleDelta: number;
  powerDelta: number;
  fire: boolean;
  /** 0-based weapon slot chosen via number key, or -1. */
  weaponSlot: number;
  /** -1 previous weapon, +1 next weapon, 0 none. */
  weaponCycle: -1 | 0 | 1;
  pause: boolean;
  /** World-space point the mouse is dragging the aim towards, or null. */
  aimPoint: Vec2 | null;
}

/**
 * Translates raw keyboard/mouse input into intents for the active player,
 * using the bindings from config/controls.ts. It knows nothing about the
 * engine; GameScene decides what an intent does.
 */
export class InputManager {
  private readonly keys = new Map<string, Phaser.Input.Keyboard.Key>();
  private readonly intent: InputIntent = {
    angleDelta: 0,
    powerDelta: 0,
    fire: false,
    weaponSlot: -1,
    weaponCycle: 0,
    pause: false,
    aimPoint: null,
  };
  private readonly aimPoint: Vec2 = { x: 0, y: 0 };
  private dragging = false;
  private dragMoved = false;
  private wheel = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly controls: ControlScheme = CONTROLS,
  ) {
    const keyboard = scene.input.keyboard;
    if (keyboard) {
      for (const name of allKeyNames(controls)) {
        // enableCapture stops the browser from scrolling on Space / arrow keys.
        this.keys.set(name, keyboard.addKey(name, true));
      }
    }

    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!insidePlayfield(pointer)) return;
      this.dragging = true;
      this.updateAimPoint(pointer);
    });
    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.dragging && pointer.isDown) this.updateAimPoint(pointer);
    });
    scene.input.on('pointerup', () => {
      this.dragging = false;
    });
    scene.input.on('wheel', (_pointer: Phaser.Input.Pointer, _over: unknown, _dx: number, dy: number) => {
      this.wheel += dy;
    });
  }

  poll(activePlayer: PlayerId, deltaSeconds: number): InputIntent {
    const bindings = this.controls.players[activePlayer];
    const fine = this.anyDown(this.controls.fineAdjust) ? AIMING.fineAdjustFactor : 1;
    const intent = this.intent;

    intent.angleDelta =
      (this.axis(bindings.rotateLeft, bindings.rotateRight) * AIMING.angleRate * fine * deltaSeconds) || 0;
    intent.powerDelta = (this.axis(bindings.powerUp, bindings.powerDown) * AIMING.powerRate * fine * deltaSeconds) || 0;
    if (this.wheel !== 0) {
      intent.powerDelta += (-this.wheel / 100) * MOUSE.wheelPowerStep;
      this.wheel = 0;
    }
    intent.fire = this.anyJustDown(bindings.fire);
    intent.pause = this.anyJustDown(this.controls.pause);
    intent.weaponCycle = this.anyJustDown(this.controls.nextWeapon) ? 1 : this.anyJustDown(this.controls.previousWeapon) ? -1 : 0;
    intent.weaponSlot = this.controls.weaponSlots.findIndex((key) => this.justDown(key));
    intent.aimPoint = this.dragMoved ? this.aimPoint : null;
    this.dragMoved = false;
    return intent;
  }

  /** Clears held state, e.g. when the game is paused. */
  reset(): void {
    this.dragging = false;
    this.dragMoved = false;
    this.wheel = 0;
    for (const key of this.keys.values()) key.reset();
  }

  private updateAimPoint(pointer: Phaser.Input.Pointer): void {
    this.aimPoint.x = pointer.x - PLAYFIELD.x;
    this.aimPoint.y = pointer.y - PLAYFIELD.y;
    this.dragMoved = true;
  }

  private axis(positive: readonly string[], negative: readonly string[]): number {
    return (this.anyDown(positive) ? 1 : 0) - (this.anyDown(negative) ? 1 : 0);
  }

  private anyDown(names: readonly string[]): boolean {
    return names.some((name) => this.keys.get(name)?.isDown === true);
  }

  private anyJustDown(names: readonly string[]): boolean {
    // Evaluate every key so each one's JustDown flag is consumed this frame.
    let pressed = false;
    for (const name of names) {
      if (this.justDown(name)) pressed = true;
    }
    return pressed;
  }

  private justDown(name: string): boolean {
    const key = this.keys.get(name);
    return key ? Phaser.Input.Keyboard.JustDown(key) : false;
  }
}

/** Converts a drag point into an aim angle and power relative to a pivot. */
export function aimFromPoint(pivot: Vec2, point: Vec2): { angle: number; power: number } {
  const dx = point.x - pivot.x;
  const dy = pivot.y - point.y;
  const angle = Phaser.Math.Clamp(Phaser.Math.RadToDeg(Math.atan2(Math.max(0, dy), dx)), AIMING.minAngle, AIMING.maxAngle);
  const power = Phaser.Math.Clamp(Math.hypot(dx, dy) / MOUSE.dragUnitsPerPower, AIMING.minPower, AIMING.maxPower);
  return { angle: Math.round(angle), power: Math.round(power) };
}

function insidePlayfield(pointer: Phaser.Input.Pointer): boolean {
  return (
    pointer.x >= PLAYFIELD.x &&
    pointer.x <= PLAYFIELD.x + PLAYFIELD.width &&
    pointer.y >= PLAYFIELD.y &&
    pointer.y <= PLAYFIELD.y + PLAYFIELD.height
  );
}

function allKeyNames(controls: ControlScheme): Set<string> {
  const names = new Set<string>();
  const add = (list: readonly string[]): void => list.forEach((name) => names.add(name));
  for (const player of controls.players) {
    add(player.rotateLeft);
    add(player.rotateRight);
    add(player.powerUp);
    add(player.powerDown);
    add(player.fire);
  }
  add(controls.weaponSlots);
  add(controls.previousWeapon);
  add(controls.nextWeapon);
  add(controls.fineAdjust);
  add(controls.pause);
  return names;
}

import { AIMING, TANK } from '../config/gameBalance';
import type { PlayerId, TankState, Vec2 } from '../../types/game';
import { clamp, degToRad } from '../../utils/math';

export function createTank(playerId: PlayerId, x: number, y: number, weaponId: string): TankState {
  return {
    playerId,
    x,
    y,
    health: TANK.maxHealth,
    maxHealth: TANK.maxHealth,
    angle: playerId === 0 ? AIMING.defaultAngleP1 : AIMING.defaultAngleP2,
    power: AIMING.defaultPower,
    weaponId,
  };
}

export function isTankAlive(tank: TankState): boolean {
  return tank.health > 0;
}

/** Centre point used for hit tests and damage distance. */
export function tankCenter(tank: TankState): Vec2 {
  return { x: tank.x, y: tank.y - TANK.centerHeight };
}

/**
 * World position of the barrel tip — where projectiles are spawned.
 * The angle uses the game convention (0° right, 90° up); because +y is down
 * the vertical component is negated.
 */
export function barrelTip(tank: TankState, angleDegrees: number = tank.angle): Vec2 {
  const radians = degToRad(angleDegrees);
  return {
    x: tank.x + Math.cos(radians) * TANK.barrelLength,
    y: tank.y - TANK.turretHeight - Math.sin(radians) * TANK.barrelLength,
  };
}

export function clampAngle(angle: number): number {
  return clamp(angle, AIMING.minAngle, AIMING.maxAngle);
}

export function clampPower(power: number): number {
  return clamp(power, AIMING.minPower, AIMING.maxPower);
}

import { PHYSICS } from '../config/gameBalance';
import { createExplosion } from '../entities/Explosion';
import { Projectile, type ProjectileSpawn } from '../entities/Projectile';
import type { Terrain } from '../entities/Terrain';
import { detectCollision } from '../physics/CollisionSystem';
import { stepBody, type PhysicsParams } from '../physics/ProjectilePhysics';
import { EXPLODE, type BehaviorContext, type BehaviorOutcome } from '../weapons/Weapon';
import { behaviorFor } from '../weapons/weapons';
import type { RemovalCue, TankState } from '../../types/game';
import { resolveExplosion, type EventSink, type ExplosionWorld } from './ExplosionSystem';

/**
 * Owns all projectiles in flight and advances them one fixed step at a time.
 * Order of operations per projectile and step:
 *   1. integrate (gravity + wind)
 *   2. behaviour afterStep hook (e.g. cluster split)
 *   3. lifetime check
 *   4. collision detection → behaviour contact hook → explode / remove / continue
 * Spawned children are appended after the whole list has been stepped, so the
 * iteration order (and therefore the outcome) is deterministic.
 */
export class ProjectileSystem {
  private readonly projectiles: Projectile[] = [];
  private readonly pendingSpawns: ProjectileSpawn[] = [];
  private nextId = 1;
  private readonly physics: PhysicsParams;
  private readonly context: BehaviorContext;

  private readonly terrain: Terrain;
  private readonly tanks: readonly TankState[];
  private readonly emit: EventSink;

  constructor(
    private readonly world: ExplosionWorld,
    dt: number = PHYSICS.timestep,
  ) {
    this.terrain = world.terrain;
    this.tanks = world.tanks;
    this.emit = world.emit;
    this.physics = { gravity: PHYSICS.gravity, windAcceleration: 0, dt };
    this.context = { terrain: world.terrain, dt };
  }

  get active(): readonly Projectile[] {
    return this.projectiles;
  }

  get isEmpty(): boolean {
    return this.projectiles.length === 0;
  }

  setWindAcceleration(acceleration: number): void {
    this.physics.windAcceleration = acceleration;
  }

  spawn(spawn: ProjectileSpawn): Projectile {
    const projectile = new Projectile(this.nextId++, spawn);
    this.projectiles.push(projectile);
    this.emit({ type: 'projectileSpawned', projectileId: projectile.id, x: projectile.x, y: projectile.y });
    return projectile;
  }

  step(): void {
    for (const projectile of this.projectiles) {
      this.stepOne(projectile);
    }
    this.compact();
    if (this.pendingSpawns.length > 0) {
      for (const spawn of this.pendingSpawns) {
        this.spawn(spawn);
      }
      this.pendingSpawns.length = 0;
    }
  }

  private stepOne(projectile: Projectile): void {
    stepBody(projectile, this.physics);
    if (projectile.terrainGrace > 0) {
      projectile.terrainGrace = Math.max(0, projectile.terrainGrace - this.physics.dt);
    }

    const behavior = behaviorFor(projectile.behavior);
    if (behavior.afterStep) {
      this.apply(projectile, behavior.afterStep(projectile, projectile.behavior, this.context));
      if (!projectile.alive) return;
    }

    if (projectile.age > PHYSICS.maxFlightTime) {
      this.remove(projectile, 'expired');
      return;
    }

    const collision = detectCollision(projectile, this.terrain, this.tanks);
    switch (collision.kind) {
      case 'none':
        return;
      case 'outOfBounds':
        this.remove(projectile, 'outOfBounds');
        return;
      case 'tank': {
        const outcome = behavior.onTankContact?.(projectile, projectile.behavior, this.context) ?? EXPLODE;
        this.apply(projectile, outcome);
        return;
      }
      case 'terrain':
        this.apply(projectile, behavior.onTerrainContact(projectile, projectile.behavior, this.context));
        return;
    }
  }

  private apply(projectile: Projectile, outcome: BehaviorOutcome): void {
    if (outcome.spawns) {
      this.pendingSpawns.push(...outcome.spawns);
    }
    switch (outcome.action) {
      case 'continue':
        if (outcome.bounced) {
          this.emit({ type: 'projectileBounced', projectileId: projectile.id, x: projectile.x, y: projectile.y });
        }
        return;
      case 'explode':
        this.explode(projectile);
        return;
      case 'remove':
        this.remove(projectile, outcome.cue ?? 'expired');
        return;
    }
  }

  private explode(projectile: Projectile): void {
    const explosion = createExplosion(projectile.x, projectile.y, projectile.warhead, projectile.ownerId);
    this.remove(projectile, 'exploded');
    resolveExplosion(explosion, this.world);
  }

  private remove(projectile: Projectile, cue: RemovalCue): void {
    projectile.alive = false;
    this.emit({ type: 'projectileRemoved', projectileId: projectile.id, x: projectile.x, y: projectile.y, cue });
  }

  /** Removes dead projectiles in place (no new array per step). */
  private compact(): void {
    let write = 0;
    for (let read = 0; read < this.projectiles.length; read++) {
      const projectile = this.projectiles[read] as Projectile;
      if (projectile.alive) {
        this.projectiles[write++] = projectile;
      }
    }
    this.projectiles.length = write;
  }
}

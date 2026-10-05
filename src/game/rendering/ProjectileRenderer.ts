import * as Phaser from 'phaser';
import { EFFECTS } from '../config/gameBalance';
import type { Projectile } from '../entities/Projectile';
import { TEXTURES } from './textures';

const GLOW_SCALE_PER_RADIUS = 0.11;
const TRAIL_WIDTH = 2;
const CORE_OUTLINE = 0x1b1530;

interface ProjectileSprite {
  id: number;
  core: Phaser.GameObjects.Arc;
  glow: Phaser.GameObjects.Image;
  trail: Float32Array;
  trailLength: number;
  color: number;
  seen: boolean;
}

/**
 * Mirrors the engine's projectile list. Sprites are pooled and reused so no
 * game objects are created or destroyed per frame during a volley.
 */
export class ProjectileRenderer {
  private readonly active = new Map<number, ProjectileSprite>();
  private readonly pool: ProjectileSprite[] = [];
  private readonly trails: Phaser.GameObjects.Graphics;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
  ) {
    this.trails = scene.add.graphics();
    layer.add(this.trails);
  }

  /** @param onUnderground called for projectiles currently inside terrain (drill dust). */
  sync(projectiles: readonly Projectile[], onUnderground: (p: Projectile) => void): void {
    for (const sprite of this.active.values()) sprite.seen = false;

    for (const projectile of projectiles) {
      let sprite = this.active.get(projectile.id);
      if (!sprite) {
        sprite = this.acquire(projectile);
        this.active.set(projectile.id, sprite);
      }
      sprite.seen = true;
      sprite.core.setPosition(projectile.x, projectile.y);
      sprite.glow.setPosition(projectile.x, projectile.y);
      pushTrail(sprite, projectile.x, projectile.y);
      if (projectile.inTerrain) onUnderground(projectile);
    }

    for (const [id, sprite] of this.active) {
      if (!sprite.seen) {
        this.release(sprite);
        this.active.delete(id);
      }
    }
    this.drawTrails();
  }

  private acquire(projectile: Projectile): ProjectileSprite {
    const sprite = this.pool.pop() ?? this.createSprite();
    sprite.id = projectile.id;
    sprite.color = projectile.color;
    sprite.trailLength = 0;
    sprite.core
      .setRadius(projectile.radius)
      .setFillStyle(projectile.color, 1)
      .setPosition(projectile.x, projectile.y)
      .setVisible(true);
    sprite.glow
      .setTint(projectile.color)
      .setScale(projectile.radius * GLOW_SCALE_PER_RADIUS + 0.3)
      .setPosition(projectile.x, projectile.y)
      .setVisible(true);
    return sprite;
  }

  private createSprite(): ProjectileSprite {
    const glow = this.scene.add.image(0, 0, TEXTURES.glow).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.8);
    const core = this.scene.add.circle(0, 0, 4, 0xffffff).setStrokeStyle(1.5, CORE_OUTLINE, 0.8);
    this.layer.add([glow, core]);
    return {
      id: 0,
      core,
      glow,
      trail: new Float32Array(EFFECTS.trailLength * 2),
      trailLength: 0,
      color: 0xffffff,
      seen: false,
    };
  }

  private release(sprite: ProjectileSprite): void {
    sprite.core.setVisible(false);
    sprite.glow.setVisible(false);
    this.pool.push(sprite);
  }

  private drawTrails(): void {
    const g = this.trails;
    g.clear();
    for (const sprite of this.active.values()) {
      const n = sprite.trailLength;
      for (let i = 1; i < n; i++) {
        const alpha = (i / n) * 0.7;
        g.lineStyle(TRAIL_WIDTH * (i / n) + 0.5, sprite.color, alpha);
        g.lineBetween(
          sprite.trail[(i - 1) * 2] as number,
          sprite.trail[(i - 1) * 2 + 1] as number,
          sprite.trail[i * 2] as number,
          sprite.trail[i * 2 + 1] as number,
        );
      }
    }
  }
}

/** Appends a point to the fixed-size trail buffer, shifting out the oldest. */
function pushTrail(sprite: ProjectileSprite, x: number, y: number): void {
  const capacity = sprite.trail.length / 2;
  if (sprite.trailLength < capacity) {
    sprite.trail[sprite.trailLength * 2] = x;
    sprite.trail[sprite.trailLength * 2 + 1] = y;
    sprite.trailLength++;
    return;
  }
  sprite.trail.copyWithin(0, 2);
  sprite.trail[(capacity - 1) * 2] = x;
  sprite.trail[(capacity - 1) * 2 + 1] = y;
}

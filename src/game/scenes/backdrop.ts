import * as Phaser from 'phaser';
import { VIEW } from '../config/layout';
import { PLAYER_THEMES } from '../config/theme';
import { DEFAULT_WEAPON_ID } from '../config/weapons';
import { createTank } from '../entities/Tank';
import { generateTerrain } from '../entities/TerrainGenerator';
import { BackgroundRenderer } from '../rendering/BackgroundRenderer';
import { TankView } from '../rendering/TankView';
import { TerrainRenderer } from '../rendering/TerrainRenderer';

/** Fixed seed so the menu landscape is the same on every visit. */
const MENU_SEED = 20_260_604;

/**
 * Decorative battlefield behind the menu screens, built from the same
 * generators and renderers as the real game.
 */
export function createMenuBackdrop(scene: Phaser.Scene, dimAlpha: number): BackgroundRenderer {
  const layer = scene.add.layer();
  const background = new BackgroundRenderer(scene, layer, VIEW.width, VIEW.height, MENU_SEED);
  const { terrain, tankPositions } = generateTerrain({
    width: VIEW.width,
    height: VIEW.height,
    seed: MENU_SEED,
    layout: 'valley',
  });
  new TerrainRenderer(scene, layer, terrain, MENU_SEED, 'menu-terrain');
  tankPositions.forEach((x, i) => {
    const id = i === 0 ? 0 : 1;
    const tank = createTank(id, x, terrain.heightAt(x), DEFAULT_WEAPON_ID);
    new TankView(scene, layer, tank, PLAYER_THEMES[id]);
  });
  layer.add(scene.add.rectangle(0, 0, VIEW.width, VIEW.height, 0x070a18, dimAlpha).setOrigin(0, 0));
  background.setWind(2);
  return background;
}

import * as Phaser from 'phaser';
import { generateTextures } from '../rendering/textures';
import { SCENES } from './keys';

/** Generates procedural textures, then hands over to the menu. No asset files are loaded. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  create(): void {
    generateTextures(this);
    this.scene.start(SCENES.menu);
  }
}

import * as Phaser from 'phaser';
import { VIEW } from '../config/layout';
import { PALETTE } from '../config/theme';
import type { BackgroundRenderer } from '../rendering/BackgroundRenderer';
import { getServices } from '../services';
import { Button } from '../../ui/Button';
import { Slider } from '../../ui/Slider';
import { Toggle } from '../../ui/Toggle';
import { textStyle } from '../../ui/text';
import { createMenuBackdrop } from './backdrop';
import { SCENES } from './keys';

const PANEL_WIDTH = 820;
const PANEL_HEIGHT = 600;
const ROW_X = VIEW.width / 2 - 340;
const ROW_START = 260;
const ROW_SPACING = 74;
const SLIDER_WIDTH = 300;

/** Volume sliders and toggles. Every change is saved to localStorage immediately. */
export class SettingsScene extends Phaser.Scene {
  private backdrop: BackgroundRenderer | null = null;

  constructor() {
    super(SCENES.settings);
  }

  create(): void {
    const { settings, audio } = getServices(this);
    this.backdrop = createMenuBackdrop(this, 0.6);
    const current = settings.getSettings();
    const prefs = settings.getPreferences();

    const panel = this.add.graphics();
    panel.fillStyle(PALETTE.hudBg, 0.92);
    panel.fillRoundedRect((VIEW.width - PANEL_WIDTH) / 2, 130, PANEL_WIDTH, PANEL_HEIGHT, 18);
    panel.lineStyle(2, PALETTE.hudBorder, 1);
    panel.strokeRoundedRect((VIEW.width - PANEL_WIDTH) / 2, 130, PANEL_WIDTH, PANEL_HEIGHT, 18);
    this.add.text(VIEW.width / 2, 185, 'SETTINGS', textStyle(40, PALETTE.textPrimary, 'bold')).setOrigin(0.5).setLetterSpacing(6);

    const row = (i: number): number => ROW_START + i * ROW_SPACING;
    new Slider(this, ROW_X, row(0), 'Master volume', current.masterVolume, SLIDER_WIDTH, (v) =>
      settings.updateSettings({ masterVolume: v }),
    );
    new Slider(this, ROW_X, row(1), 'Effects volume', current.effectsVolume, SLIDER_WIDTH, (v) => {
      settings.updateSettings({ effectsVolume: v });
      audio.play('click');
    });
    new Slider(this, ROW_X, row(2), 'Music volume', current.musicVolume, SLIDER_WIDTH, (v) =>
      settings.updateSettings({ musicVolume: v }),
    );
    new Toggle(this, ROW_X, row(3), 'Screen shake', current.screenShake, (v) => settings.updateSettings({ screenShake: v }));
    new Toggle(this, ROW_X, row(4), 'Aim guide', prefs.showAimGuide, (v) => settings.updatePreferences({ showAimGuide: v }));

    this.add
      .text(VIEW.width / 2, row(5) - 22, 'Settings are saved in this browser.', textStyle(15, PALETTE.textMuted))
      .setOrigin(0.5);

    const back = (): void => {
      audio.play('click');
      this.scene.start(SCENES.menu);
    };
    new Button(this, VIEW.width / 2, 674, { width: 240, height: 56, label: 'BACK', hint: 'Esc', onClick: back });
    this.input.keyboard?.on('keydown-ESC', back);
  }

  override update(_time: number, delta: number): void {
    this.backdrop?.update(delta / 1000);
  }
}

/**
 * Visual palette ("dusk over the badlands"). All colours are original.
 * Numbers are 0xRRGGBB for Phaser; CSS strings are used for Text objects.
 */
export const PALETTE = {
  skyTop: '#0b1026',
  skyMid: '#2a2156',
  skyHorizon: '#c4587a',
  skyGlow: '#ffb27a',
  sun: '#ffd9a0',
  mountainsFar: '#3b2f63',
  mountainsMid: '#2b2550',
  mountainsNear: '#1d1a3a',

  soilTop: '#5b4a3a',
  soilMid: '#3e3141',
  soilDeep: '#231d33',
  bedrock: '#15121f',
  grass: '#7bd389',
  grassShade: '#4f9e6a',
  scorched: '#2a1f22',
  scorchedEdge: '#6b3b2e',

  hudBg: 0x0c1022,
  hudBorder: 0x2c3566,
  hudPanel: 0x151b38,
  hudPanelHover: 0x1e2750,
  textPrimary: '#eef1ff',
  textMuted: '#97a0c8',
  textDim: '#5d6690',
  accent: 0xffc857,
  accentCss: '#ffc857',
  danger: 0xff5d5d,
  healthHigh: 0x59e08c,
  healthMid: 0xffd166,
  healthLow: 0xff5d5d,

  explosionCore: 0xfff3c4,
  explosionFire: [0xffe08a, 0xffa94d, 0xff6b3d, 0xd9480f] as const,
  smoke: 0x3d3a4f,
  debris: [0x5b4a3a, 0x3e3141, 0x7bd389] as const,
} as const;

export interface PlayerTheme {
  color: number;
  css: string;
  dark: number;
  light: number;
}

export const PLAYER_THEMES: readonly [PlayerTheme, PlayerTheme] = [
  { color: 0x3dd6c6, css: '#3dd6c6', dark: 0x1d7f78, light: 0xa6f4ea },
  { color: 0xff7a59, css: '#ff7a59', dark: 0xa63e27, light: 0xffc2ae },
];

export const FONT_FAMILY = '"Segoe UI", "Helvetica Neue", Roboto, Arial, sans-serif';
export const MONO_FAMILY = 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';

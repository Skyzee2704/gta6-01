// SOLMAR 3D — shared constants. Single source of truth for world size,
// clock, budgets, palette and camera defaults. No imports.
export const WORLD_W = 640;
export const WORLD_H = 480;
export const START_HOUR = 18.6;
export const CLOCK_RATE = 0.6;
export const DEFAULT_SEED = 1;
export const SAVE_KEY = 'solmar-3d-save-v4';
export const STATS_KEY = 'solmar-3d-stats-v4';
export const MAX_WANTED = 5;
export const BUDGET = {
  maxDrawCalls: 100,
  maxTriangles: 200000,
  simMs: 8,
  minFps: 30,
};
export const DISTRICTS = [
  'Solmar Marina',
  'Neon Mile',
  'Downtown',
  'Old Town',
  'Beachfront',
  'Hillside',
];
export const PALETTE = {
  gold: 0xd9a441,
  orange: 0xe07b39,
  accent: '#d9a441',
  hudBg: 'rgba(10, 12, 24, 0.72)',
  hudBorder: 'rgba(217, 164, 65, 0.55)',
  text: '#f5ead2',
  muted: '#b8ab8a',
  danger: '#e5484d',
  ok: '#46c26a',
  policeBlue: '#3a86ff',
  policeRed: '#ff3b30',
};
export const CAMERA = {
  boomMin: 13,
  boomMax: 16,
  fovMin: 60,
  fovMax: 72,
  swingMax: 0.35,
  height: 5.2,
};
export const SHOT_HOURS = { cover: 18.6, race: 18.8, onfoot: 20.5, map: 12.0 };
export const LUMA_FLOOR = { cover: 0.35, race: 0.35, onfoot: 0.25, map: 0.35 };
export const SHOT_MAX_BYTES = 262144;
export const SHOT_TARGET_MIN_BYTES = 180000;
export const SHOT_TARGET_MAX_BYTES = 256000;
export const GAME_VERSION = '4.0.0';
export const GAME_TITLE = 'SOLMAR 3D — Streets of Gold';

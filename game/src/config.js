// SOLMAR 3D — every tuning number in one place. City is 640 x 480 units,
// flat ground at y = 0, golden-hour start 18:12. All sim units are metres-ish.
export const STEP = 1 / 60;
export const SEED = 1;
export const START_HOUR = 18.2;
export const CITY = { w: 640, h: 480, roadW: 16, walkW: 4 };
export const PLAYER = { walk: 6, run: 9, jumpV: 7, gravity: 20, health: 100, armorMax: 100 };
export const CAMERA = { boom: 9, height: 4, fovMin: 58, fovMax: 74, driveBoom: 13, driveHeight: 5 };
export const TRAFFIC_MAX = 24;
export const PED_MAX = 36;
export const COP_MAX = 6;
export const PERF_BUDGET_MS = 8;
export const SAVE_KEY = 'solmar3d.save.v1';
export const SETTINGS_KEY = 'solmar3d.settings.v1';
export const PALETTE = {
  skyDay: 0x8fc7e8, skyDusk: 0xff8c4a, skyNight: 0x0b1026,
  sun: 0xffd9a0, asphalt: 0x3a3a40, sidewalk: 0x9a938a, sand: 0xe8d29a,
  sea: 0x1f8fa8, grass: 0x5d8a4a, terracotta: 0xc96f3f, glass: 0x7fb8d8,
  neonPink: 0xff4fa3, neonTeal: 0x2ee6c8, neonGold: 0xffc94d, cream: 0xf5ead2,
};
export const DISTRICT_COLORS = {
  marina: 0x2ee6c8, old: 0xe07840, neon: 0xff4fa3, harbor: 0xffc94d, palm: 0x7fd069, downtown: 0x6fb7ff,
};
export const WEATHER = { clear: 'clear', cloudy: 'cloudy', rain: 'rain' };
export const WANTED = { searchBase: 240, searchPerLevel: 85, escapeBase: 5, escapePerLevel: 1.5 };
export const ECONOMY = {
  hospitalFee: 300, hospitalPct: 0.10, hospitalMin: 100, hospitalMax: 2000,
  bailFee: 500, resprayBase: 150, resprayPerLevel: 100, mealPrice: 25, penthousePrice: 20000,
  penthouseIncome: 500, tapeMoney: 500, tapeRespect: 60, tapeBonus: 5000, taxiRespect: 20,
};
export const RACE_REWARD = { marina: 300, neon: 500, downtown: 800, beatBestBonus: 200 };

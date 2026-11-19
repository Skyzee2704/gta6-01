// SOLMAR 3D — world constants. Single source of truth for every module:
// the sim, the renderer, the shots and the gates all read these numbers,
// so a tuned value can never drift between systems.
export const WORLD = {
  width: 640,
  depth: 480,
  // The island is a circle: Sky wants the map ROUND, not square.
  // Land is the disc of this radius around the world centre; sea is outside.
  islandRadius: 232,
  ringRoadRadius: 204,
  seaLevel: -0.4,
};

export const TIME = {
  // Golden hour, locked by Sky (design review 2026-11-19 14:26 WITA).
  startHour: 18.6,
  // In-game minutes passing per real second while playing.
  minutesPerSecond: 0.6,
  // Sun elevation curve: rises 06:00, sets ~19:30.
  sunriseHour: 6.0,
  sunsetHour: 19.5,
  nightHour: 21.0,
};

export const ROADS = {
  // No building footprint may come closer than this to a road centreline.
  setback: 12,
  width: 14,
  laneWidth: 3.4,
  sidewalkWidth: 3.0,
};

export const CITY = {
  buildingTarget: 200,
  palmTarget: 150,
  districts: 6,
};

export const PLAYER = {
  // Head:body proportion Sky demanded: 1 : 7.5, human-readable, never alien.
  heightUnits: 1.8,
  headRatio: 1 / 7.5,
  walkSpeed: 5.2,
  runSpeed: 8.4,
  maxHealth: 100,
  maxArmor: 100,
};

export const CAMERA = {
  chaseBoomMin: 13,
  chaseBoomMax: 16,
  fovSlow: 60,
  fovFast: 72,
  swingMax: 0.35,
};

export const POLICE = {
  maxStars: 5,
  // Foot officers stop and shoot in bursts at wanted >= 2; wanted 1 is arrest only.
  shootWantedMin: 2,
  // Police never shoot during a story mission.
  neverShootDuringMission: true,
  responseUnitsMax: 5,
  searchRadius: 90,
};

export const PERF = {
  maxDrawCalls: 100,
  maxTriangles: 200000,
  maxSimMs: 8,
  lightPoolMin: 8,
  lightPoolMax: 12,
};

export const SHOTS = {
  width: 1280,
  height: 720,
  maxBytes: 262144,
  // Luma floors the shot script enforces, fail-loud.
  lumaFloor: { cover: 0.35, race: 0.35, onfoot: 0.25, map: 0.35 },
  // Target file size band: dense scenes land here; thin scenes do not.
  sizeTargetMin: 180 * 1024,
};

// Staging save the shots load: a real mid-game save, never a fresh save.
export const STAGING = {
  // Measured by missionCheck 2026-11-19 (rebuild #4): $24,950 earned
  // through missions 1–5, minus the $12,000 penthouse bought for real.
  cash: 12950,
  respect: 1770,
  respectTitle: 'Big Shot',
  job: 6,
  day: 3,
  postcards: 8,
  postcardsTotal: 20,
  mission: 6,
  missionStage: 'escape',
  missionTimer: 127,
  weaponsOwned: ['pistol', 'smg', 'vk47', 'shotgun', 'sniper'],
  ammo: { pistol: [12, 120], smg: [32, 160], vk47: [30, 90], shotgun: [6, 36], sniper: [5, 25] },
  penthouseOwned: true,
};

export const HUD = {
  weaponSlots: ['pistol', 'smg', 'vk47', 'shotgun', 'sniper'],
  radioStations: 4,
};

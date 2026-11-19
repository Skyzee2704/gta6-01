// Every tuning number and colour in one place. SOLMAR is a round island city,
// 640 by 480 units, ringed by sea: the playable land is a disc, never a square.
// One unit is one metre. The clock starts at golden hour, 18.6, and runs
// 0.6 game-minutes per real second, so dusk and night still happen in play.
export const WORLD = { width: 640, height: 480, centreX: 320, centreY: 240, landRadius: 298, beachWidth: 18, seaLevel: -0.4 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display rate. */
export const STEP = 1 / 60;

/** Golden hour. Locked by Sky's decision: cover, race and the default start all use it. */
export const START_HOUR = 18.6;
/** Game-minutes that pass per real second. */
export const CLOCK_RATE = 0.6;
/** Sun sets around here; the sky shader reads the hour every frame. */
export const SUNSET_HOUR = 19.5;

export const PLAYER = {
  // Milo: 1.80 m tall, head to body 1 to 7.5, every part a box, nothing round.
  height: 1.8, head: 0.24, shoulderWidth: 0.46, hipWidth: 0.38,
  walkSpeed: 4.2, runSpeed: 7.0, accel: 26, turnSpeed: 9.5,
  maxHealth: 100, maxArmor: 100, punchDamage: 12, punchRange: 1.6,
  invulnerable: 0.6,
};

export const LIVES = 3;

export const WANTED = {
  max: 5,
  // Wanted 1: officers walk up to arrest. Wanted 2 and up: they get out and shoot.
  shootAt: 2,
  decaySeconds: 26,
  // Heat gained per crime, in stars.
  killPed: 1, killCop: 2, stealCar: 1, shootNearCop: 1, speedNearCop: 0,
};

export const COMBAT = {
  // A car that hits a person on foot hurts for real: damage plus a shove, never a pass-through.
  carHitDamage: 34, carHitKnockback: 9.5, carHitCooldown: 0.8,
  pedKillWanted: 1, bulletSpread: 0.02,
};

export const VEHICLE = {
  // Steering: D turns right, A turns left. Positive steer is always to the right,
  // on the road, on a boat and in a helicopter, so nothing ever feels mirrored.
  steerSpeed: 2.6, maxSteer: 0.62,
};

export const CITY = {
  buildingCount: 198, palmCount: 148, treeCount: 42,
  // No building footprint may come this close to a road centreline.
  roadSetback: 12,
  lampSpacing: 26, hydrantSpacing: 60,
};

export const ECONOMY = {
  startCash: 250, taxiFareBase: 18, taxiFarePerMetre: 0.35,
  resprayPrice: 120, penthousePrice: 45000, penthouseIncomePerDay: 850,
  garagePrice: 8000,
};

export const RACE = {
  laps: 3, checkpoints: 8, rivals: ['Neri Flint', 'Zella Coil', 'Ivo Switch'],
};

/** Where saves and the best stats live between visits (this browser only). */
export const SAVE_KEY = 'solmar.save.v1';
export const STATS_KEY = 'solmar.stats.v1';

export const PALETTE = {
  backdrop: '#14100c',
  // Golden hour sky: warm horizon, deep blue-violet up high.
  skyTop: '#2c3a6e', skyHorizon: '#ff9a3c', sun: '#ffd27a',
  sea: '#1d4e6b', seaDeep: '#0f3350', sand: '#d9b380',
  // Asphalt is dark, never blue. Sidewalk and zebra paint are matte, never glaring.
  asphalt: '#26262a', asphaltLine: '#c9a227', sidewalk: '#8a8578', zebra: '#cfcabb',
  grass: '#4d7a3a', neonPink: '#ff4fd8', neonCyan: '#37e6ff', neonGold: '#ffb02e',
  hudGold: '#ffb02e', hudPanel: 'rgba(12,10,8,0.72)', hudText: '#f5efe4', hudMuted: '#b8ab96',
  wantedStar: '#ffd23e', policeBlue: '#3a7bff', policeRed: '#ff3b30',
  text: '#f5efe4', muted: '#b8ab96',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Districts, in the order the map legend lists them. */
export const DISTRICTS = [
  { id: 'marina', name: 'Solmar Marina', tagline: 'Where the gold hour lives', x: 320, y: 392 },
  { id: 'downtown', name: 'Downtown', tagline: 'Glass, neon and big money', x: 320, y: 240 },
  { id: 'neon', name: 'Neon Mile', tagline: 'The street never sleeps', x: 448, y: 240 },
  { id: 'beach', name: 'Palma Beach', tagline: 'Surf, sun and slow days', x: 192, y: 392 },
  { id: 'oldtown', name: 'Old Town', tagline: 'Brick, bells and old debts', x: 192, y: 120 },
  { id: 'harbor', name: 'Harbor Point', tagline: 'Boats, cranes and quiet deals', x: 448, y: 120 },
];

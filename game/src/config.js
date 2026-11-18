// config.js — single source of truth for SOLMAR 3D constants.
// Every number the sim and the renderer share lives here so a tweak in one
// place moves the whole game. All times are game hours (24h clock).

// Fixed simulation step: the sim advances in 1/60 second slices.
export const STEP = 1 / 60;

// Golden hour: the game opens as the sun drops toward the sea.
export const START_HOUR = 18.2;

// How fast game time flows: 0.6 game-minutes per real second, so a full
// day takes about 40 real minutes and the golden hour lingers.
export const MINUTES_PER_SECOND = 0.6;

// Save slot. This key must never change: saves from earlier builds of
// this game stay compatible.
export const SAVE_KEY = 'solmar3d.save.v1';

// World bounds. The island is land; beyond it is open sea. The south
// coast (z = 240) is the marina shoreline where boats sit.
export const WORLD = {
  minX: -320,
  maxX: 320,
  minZ: -240,
  maxZ: 240,
  seaZ: 240,
};

// Player spawn: the safehouse door in Old Solmar, facing the street.
export const SPAWN = { x: -260, z: 190, heading: Math.PI };

// Road grid. Vertical roads run north-south, horizontal roads run
// east-west. Intersections are the nodes of the driving graph.
export const ROAD_XS = [-280, -200, -120, -40, 40, 120, 200, 280];
export const ROAD_ZS = [-200, -120, -40, 40, 120, 200];
export const ROAD_HALF_WIDTH = 7;

// On-foot movement.
export const WALK_SPEED = 6;
export const RUN_SPEED = 10;

// Driving. Arcade physics: snappy acceleration, a top speed that feels
// fast on the island's long straights, and a handbrake that breaks grip.
export const CAR = {
  accel: 22,
  brake: 34,
  reverseAccel: 14,
  topSpeed: 46,
  reverseTop: 14,
  turnRate: 1.9,
  grip: 8,
  handbrakeGrip: 1.3,
};

// Wanted. Heat 0-5 maps to a star level; the level is what the HUD shows.
export const WANTED = {
  maxHeat: 5,
  decayPerSecond: 0.08,
  stealHeat: 1.2,
  killHeat: 1.0,
  witnessRadius: 26,
  escapeSeconds: 12,
};

// Police.
export const POLICE = {
  maxCops: 8,
  spawnDistance: 70,
  chaseSpeed: 34,
  shootRange: 42,
  shootMinLevel: 2,
  burstMin: 3,
  burstMax: 6,
  bulletDamage: 7,
  arrestRadius: 3,
};

// Combat.
export const COMBAT = {
  enemyHealth: 60,
  pedHealth: 30,
  playerHealth: 100,
};

// Economy.
export const ECONOMY = {
  startMoney: 250,
  bailCost: 500,
  hospitalCost: 300,
  penthousePrice: 20000,
  penthouseIncome: 500,
};

// Missions.
export const MISSION_COUNT = 6;
export const MISSION_TIME_LIMIT = 240;

// Races.
export const RACE_ROUTES = ['marina', 'neon', 'harbor'];

// Postcards (collectibles) hidden around the city.
export const TAPE_COUNT = 20;

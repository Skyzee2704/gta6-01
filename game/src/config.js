// SOLMAR — Streets of Gold. Central tuning: every number the game balances
// on lives here, so a tweak never means hunting through a dozen files.
export const WORLD_W = 2560;
export const WORLD_H = 1920;
export const VIEW_W = 1280;
export const VIEW_H = 720;

// Road grid: eight north-south avenues and six east-west streets, spaced
// 320 units apart, each 64 wide with a 16-unit sidewalk on both sides.
export const ROAD_X = [96, 416, 736, 1056, 1376, 1696, 2016, 2336];
export const ROAD_Y = [96, 416, 736, 1056, 1376, 1696];
export const ROAD_HALF = 32;
export const WALK_HALF = 48;

// Sun-soaked golden-hour palette for the whole city.
export const PALETTE = {
  grass: '#7fae5a',
  grassDark: '#74a24f',
  sand: '#e8cf9a',
  water: '#3fa8b8',
  waterDeep: '#2f8ba0',
  asphalt: '#4a4238',
  asphaltDark: '#413a31',
  lane: '#e8dcc0',
  sidewalk: '#b8ab8d',
  curb: '#8f8468',
  roofA: '#c96f4a',
  roofB: '#d9a05b',
  roofC: '#8fa3b8',
  roofD: '#b8574f',
  roofE: '#7d8a6a',
  wall: '#5d4f42',
  park: '#6da34e',
  tree: '#3f7a3a',
  treeLight: '#5b9a48',
  hudBg: 'rgba(12, 10, 8, 0.72)',
  hudText: '#f5ead2',
  gold: '#f2c14e',
  red: '#e5484d',
  blue: '#3e7bfa',
  white: '#f8f4ec',
};

// Six districts, each a rectangle of the map with its own flavour.
export const DISTRICTS = [
  { name: 'Palm Heights', x0: 1700, y0: 0, x1: 2560, y1: 640 },
  { name: 'Downtown', x0: 760, y0: 0, x1: 1700, y1: 640 },
  { name: 'Old Solmar', x0: 0, y0: 0, x1: 760, y1: 1000 },
  { name: 'Neon Mile', x0: 760, y0: 640, x1: 1760, y1: 1120 },
  { name: 'Harbor Docks', x0: 1760, y0: 640, x1: 2560, y1: 1500 },
  { name: 'Solmar Marina', x0: 0, y0: 1000, x1: 2560, y1: 1920 },
];

// Landmarks the story and the missions point at.
export const LANDMARKS = {
  garage: { x: 380, y: 300, label: "Rosa's Garage" },
  diner: { x: 560, y: 300, label: "Rosa's Diner" },
  dock: { x: 480, y: 1620, label: 'Marina Dock' },
  safehouse: { x: 2300, y: 280, label: 'Safehouse' },
  buyerLot: { x: 2050, y: 900, label: 'Buyer Lot' },
  vaultTruckYard: { x: 2100, y: 1250, label: 'Vault Yard' },
  neonPlaza: { x: 1250, y: 880, label: 'Neon Plaza' },
  palmCourt: { x: 2000, y: 480, label: 'Palm Court' },
};

// The simulation's fixed step, in seconds: 60 updates a second whatever
// the display's rate.
export const STEP = 1 / 60;

// How the player moves on foot.
export const WALK_SPEED = 220;
export const RUN_SPEED = 330;
export const PLAYER_RADIUS = 14;

// Vehicle catalogue: every drivable body style with its own feel.
export const VEHICLE_TYPES = {
  sedan:   { label: 'Sedan',   accel: 480, top: 380, reverse: 160, grip: 2.6, len: 52, wid: 26, hp: 100 },
  coupe:   { label: 'Coupe',   accel: 540, top: 440, reverse: 170, grip: 2.9, len: 50, wid: 25, hp: 90 },
  sports:  { label: 'Sports',  accel: 640, top: 520, reverse: 180, grip: 3.4, len: 52, wid: 26, hp: 80 },
  taxi:    { label: 'Taxi',    accel: 470, top: 360, reverse: 150, grip: 2.6, len: 52, wid: 26, hp: 100 },
  van:     { label: 'Van',     accel: 380, top: 320, reverse: 140, grip: 2.2, len: 62, wid: 28, hp: 130 },
  truck:   { label: 'Truck',   accel: 340, top: 300, reverse: 130, grip: 2.0, len: 72, wid: 30, hp: 160 },
  cruiser: { label: 'Cruiser', accel: 560, top: 460, reverse: 170, grip: 3.0, len: 54, wid: 27, hp: 120 },
};
export const VEHICLE_COLORS = {
  sedan: ['#c94f42', '#4a6fa5', '#c9b458', '#7a7d84', '#3f6b4f'],
  coupe: ['#d97b2f', '#8a4a9e', '#2f6f6b', '#b83a4b'],
  sports: ['#e8b93c', '#d42a2a', '#2a9ed4', '#22262e'],
  taxi: ['#f2c14e'],
  van: ['#8a8f96', '#6b7f9e', '#a5683f'],
  truck: ['#5a6b7a', '#7a5a3a', '#4a5d3f'],
  cruiser: ['#f2f2f2'],
};

// Crowd and traffic budgets.
export const MAX_TRAFFIC = 24;
export const MAX_PEDESTRIANS = 36;
export const MAX_POLICE = 6;
export const MAX_ENEMIES = 8;

// Police and wanted rules.
export const WANTED_MAX = 5;
export const WANTED_DECAY_HIDE_SECONDS = 20;
export const WANTED_DECAY_STEP_SECONDS = 12;
export const POLICE_CHASE_SPEED = 330;
export const POLICE_CATCH_RADIUS = 42;
export const POLICE_SPAWN_DISTANCE = 520;

// Combat numbers.
export const PLAYER_MAX_HP = 100;
export const PLAYER_MAX_ARMOR = 100;
export const PISTOL_MAG = 12;
export const PISTOL_RESERVE = 60;
export const PISTOL_DAMAGE = 34;
export const PISTOL_RANGE = 520;
export const FIST_DAMAGE = 15;
export const FIST_RANGE = 46;
export const ENEMY_HP = 100;

// Mission tuning.
export const COLLECTOR_TIME_LIMIT = 150;
export const MISSION_REWARDS = [200, 400, 600, 800, 1200, 1500];

// Save slot.
export const SAVE_KEY = 'solmar.save.v1';

// Clock: the city runs on a 24-hour clock starting late afternoon.
export const CLOCK_START_HOURS = 17;
export const CLOCK_MINUTES_PER_SECOND = 0.5;

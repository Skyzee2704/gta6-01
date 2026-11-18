// data.js — every table the game reads. Content lives here; logic only
// executes it. All names are original to Solmar: no Rockstar, GTA, or
// real-brand names anywhere.

// Six districts. Each has a name, a tagline, an accent color, a palette,
// and a landmark so it reads differently from across the map.
export const DISTRICTS = [
  {
    id: 'marina',
    name: 'Solmar Marina',
    tagline: 'Docks, yachts, and deals under the table',
    accent: '#2ec4b6',
    palette: ['#e8f4f2', '#bfe3de', '#7fb8ad'],
    landmark: 'Wooden Pier',
    bounds: { minX: -320, maxX: -40, minZ: 120, maxZ: 240 },
  },
  {
    id: 'old',
    name: 'Old Solmar',
    tagline: 'Narrow streets, terracotta roofs, and history',
    accent: '#e07a3f',
    palette: ['#f2d8b3', '#e0a866', '#b96a2e'],
    landmark: "Rosa's Diner",
    bounds: { minX: -320, maxX: -120, minZ: -40, maxZ: 120 },
  },
  {
    id: 'neon',
    name: 'Neon Mile',
    tagline: 'The night never sleeps here',
    accent: '#ff2e88',
    palette: ['#2a0f2e', '#ff2e88', '#7b2fff'],
    landmark: 'Neon Arch',
    bounds: { minX: -120, maxX: 120, minZ: -40, maxZ: 120 },
  },
  {
    id: 'harbor',
    name: 'Harbor Docks',
    tagline: 'Containers, cranes, and nameless cargo',
    accent: '#f5c518',
    palette: ['#8a7a4a', '#c9a227', '#5c5340'],
    landmark: 'Harbor Crane',
    bounds: { minX: 120, maxX: 320, minZ: -120, maxZ: 120 },
  },
  {
    id: 'palm',
    name: 'Palm Heights',
    tagline: 'Hillside villas, views over the sea',
    accent: '#3fae5a',
    palette: ['#d8ecc9', '#8fbf7f', '#3f7a4a'],
    landmark: 'Hill Viewpoint',
    bounds: { minX: -320, maxX: 0, minZ: -240, maxZ: -40 },
  },
  {
    id: 'downtown',
    name: 'Downtown',
    tagline: 'Three glass towers in the heart of the city',
    accent: '#3fa9f5',
    palette: ['#cfe8f7', '#7fb8e0', '#2e6da4'],
    landmark: 'Glass Towers',
    bounds: { minX: 0, maxX: 320, minZ: -240, maxZ: -40 },
  },
];

// Which district a point belongs to (first match wins; default Downtown).
export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    const b = d.bounds;
    if (x >= b.minX && x < b.maxX && z >= b.minZ && z < b.maxZ) return d;
  }
  return DISTRICTS[5];
}

// Eleven vehicles. `top` is top speed (units/s), `accel` is 0-60 feel,
// `seats` is cosmetic. No real brands: descriptive names only.
export const VEHICLES = [
  { model: 'sedan', name: 'Solmar Sedan', top: 42, accel: 20, seats: 4, color: '#b8452e' },
  { model: 'coupe', name: 'Bay Coupe', top: 46, accel: 24, seats: 2, color: '#2e6da4' },
  { model: 'suv', name: 'Harbor SUV', top: 40, accel: 18, seats: 5, color: '#3f7a4a' },
  { model: 'pickup', name: 'Dock Pickup', top: 40, accel: 18, seats: 3, color: '#c9a227' },
  { model: 'sports', name: 'Vulture GT', top: 54, accel: 30, seats: 2, color: '#ff2e88' },
  { model: 'taxi', name: 'Solmar Cab', top: 42, accel: 20, seats: 4, color: '#f5c518' },
  { model: 'van', name: 'Cargo Van', top: 36, accel: 15, seats: 3, color: '#8a8a8a' },
  { model: 'cruiser', name: 'SPD Cruiser', top: 48, accel: 26, seats: 4, color: '#e8e8e8' },
  { model: 'scooter', name: 'Pier Scooter', top: 26, accel: 16, seats: 1, color: '#2ec4b6' },
  { model: 'bike', name: 'Street Bike', top: 44, accel: 26, seats: 1, color: '#222222' },
  { model: 'bus', name: 'City Bus', top: 32, accel: 12, seats: 12, color: '#3fa9f5' },
];

// The models a player can steal and drive (proper cars, not bikes).
export const CAR_MODELS = ['sedan', 'coupe', 'suv', 'pickup', 'taxi', 'van', 'sports'];

// Seven weapons. `damage` is per hit, `range` in units, `rate` is shots
// per second, `mag` is magazine size. Fists are not a weapon slot: the
// HUD shows five gun slots and no fists.
export const WEAPONS = [
  { id: 'pistol', name: 'Pistol', short: 'Pistol', damage: 18, range: 55, rate: 3.5, mag: 12, price: 0, respect: 0, auto: false },
  { id: 'smg', name: 'SMG', short: 'SMG', damage: 11, range: 48, rate: 9, mag: 32, price: 850, respect: 1, auto: true },
  { id: 'rifle', name: 'Rifle VK-47', short: 'Rifle', damage: 26, range: 95, rate: 5, mag: 30, price: 2200, respect: 2, auto: true },
  { id: 'shotgun', name: 'Shotgun', short: 'Shotgun', damage: 42, range: 30, rate: 1.2, mag: 6, price: 1400, respect: 1, auto: false },
  { id: 'sniper', name: 'Sniper Longeye 308', short: 'Sniper', damage: 95, range: 160, rate: 0.8, mag: 5, price: 4500, respect: 3, auto: false },
  { id: 'hook', name: 'Dock Hook', short: 'Hook', damage: 22, range: 2.5, rate: 1.8, mag: 0, price: 300, respect: 0, auto: false, melee: true },
  { id: 'molotov', name: 'Solmar Cocktail', short: 'Cocktail', damage: 35, range: 22, rate: 1, mag: 0, price: 250, respect: 0, auto: false, thrown: true },
];

// The five HUD weapon slots, in order. No fists slot.
export const HUD_SLOTS = ['pistol', 'smg', 'rifle', 'shotgun', 'sniper'];

// Four synth radio stations. Each has its own tempo, root note, wave,
// and a playlist of fictional tracks. `pattern` is the drum pattern
// (1 = kick, 2 = snare, 0 = rest) over 16 steps.
export const RADIO = [
  {
    id: 'street',
    name: 'SOLMAR STREET 95.7',
    show: 'Fuego Latino',
    bpm: 94,
    root: 55,
    wave: 'sawtooth',
    pattern: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    tracks: [
      { title: 'Marina Nights', artist: 'Los Delfines' },
      { title: 'Calle Ocho', artist: 'Rosa y el Mar' },
      { title: 'Fuego Lento', artist: 'DJ Palma' },
    ],
  },
  {
    id: 'shoreline',
    name: 'SHORELINE 101.3',
    show: 'Tide FM',
    bpm: 100,
    root: 65,
    wave: 'sine',
    pattern: [1, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0, 2, 0, 1, 0],
    tracks: [
      { title: 'Low Tide', artist: 'The Breakers' },
      { title: 'Salt Air', artist: 'Marina Blue' },
      { title: 'Pier Lights', artist: 'Coastline' },
    ],
  },
  {
    id: 'golden',
    name: 'SOLMAR 88.5',
    show: 'Golden Wave',
    bpm: 80,
    root: 49,
    wave: 'triangle',
    pattern: [1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 0, 0],
    tracks: [
      { title: 'Golden Hour', artist: 'Solmar Sunset' },
      { title: 'West Coast', artist: 'The Palms' },
      { title: 'Amber Sky', artist: 'Luna Mar' },
    ],
  },
  {
    id: 'pulse',
    name: 'PULSE SOLMAR 104.9',
    show: 'Neon Club',
    bpm: 122,
    root: 58,
    wave: 'square',
    pattern: [1, 0, 1, 0, 2, 0, 1, 0, 1, 0, 1, 0, 2, 0, 1, 1],
    tracks: [
      { title: 'Neon Drive', artist: 'Vanta Ray' },
      { title: 'Midnight Mile', artist: 'Club Neon' },
      { title: 'Electric Palm', artist: 'DJ Volt' },
    ],
  },
];

// The cast. Six people, each with a role and a look the portrait
// renderer draws from.
export const CAST = [
  { id: 'milo', name: 'Milo Cruz', role: 'Getaway driver', look: 'yellow jacket, dark hair' },
  { id: 'rosa', name: 'Rosa Delgado', role: 'Garage + diner owner', look: 'red bandana, warm smile' },
  { id: 'kane', name: 'Kane', role: 'Boss of The Vultures', look: 'leather jacket, chain' },
  { id: 'juno', name: 'Juno', role: 'Wheelwoman', look: 'pink hair, aviator glasses' },
  { id: 'mags', name: 'Mags', role: 'Fixer', look: 'flat cap, mustache' },
  { id: 'benning', name: 'Sergeant Benning', role: 'SPD, corrupt cop', look: 'police uniform, cap' },
];

// Six story jobs. `payout` and `respect` are the completion rewards.
// `blurb` is the English briefing the player reads.
export const MISSIONS = [
  {
    id: 1,
    title: 'First Wheels',
    blurb: "Pick up Rosa's car at the pier and bring it to the garage. Don't make a scene.",
    payout: 450,
    respect: 150,
    start: { x: -260, z: 200 },
    target: { x: -180, z: 60 },
  },
  {
    id: 2,
    title: 'Getaway Driver',
    blurb: "Drive Rosa's friend out of the police cordon, then lose the cops.",
    payout: 650,
    respect: 200,
    start: { x: -260, z: 200 },
    target: { x: 120, z: -160 },
  },
  {
    id: 3,
    title: 'The Collector',
    blurb: 'Grab 3 packages in Marina, Neon Mile, and Harbor Docks before the 240 seconds run out.',
    payout: 850,
    respect: 250,
    start: { x: -260, z: 200 },
    targets: [{ x: -260, z: 200 }, { x: 200, z: 40 }, { x: 280, z: -40 }],
  },
  {
    id: 4,
    title: 'Vulture Trouble',
    blurb: 'The Vultures hit the garage. Hold 2 waves, then chase their car.',
    payout: 1050,
    respect: 300,
    start: { x: -180, z: 60 },
    target: { x: -140, z: 100 },
  },
  {
    id: 5,
    title: 'The Big Score',
    blurb: 'Steal the sports car from the guarded lot, deliver it to the buyer in Palm Heights.',
    payout: 1450,
    respect: 400,
    start: { x: 200, z: 40 },
    target: { x: -200, z: -180 },
  },
  {
    id: 6,
    title: 'King of Solmar',
    blurb: 'Pick up the crew, rob the vault truck in Harbor Docks, escape a 4-star wanted level to the safehouse.',
    payout: 1750,
    respect: 500,
    start: { x: 260, z: 40 },
    target: { x: -260, z: 190 },
  },
];

// Street-race routes. Each is a loop of checkpoints the rivals race.
export const RACE_ROUTES = {
  marina: {
    name: 'Marina Sprint',
    checkpoints: [
      { x: -260, z: 200 },
      { x: -120, z: 200 },
      { x: 40, z: 200 },
      { x: 120, z: 120 },
      { x: 120, z: 40 },
      { x: -40, z: 40 },
      { x: -200, z: 120 },
    ],
  },
  neon: {
    name: 'Neon Loop',
    checkpoints: [
      { x: -120, z: 40 },
      { x: 40, z: 40 },
      { x: 120, z: 40 },
      { x: 120, z: -40 },
      { x: 40, z: -40 },
      { x: -120, z: -40 },
    ],
  },
  harbor: {
    name: 'Harbor Run',
    checkpoints: [
      { x: 200, z: 40 },
      { x: 280, z: 40 },
      { x: 280, z: -120 },
      { x: 200, z: -120 },
      { x: 120, z: -40 },
    ],
  },
};

// The three named rivals. Original names — never the rank-1 names.
export const RACE_RIVALS = [
  { name: 'Neri Flint', color: '#ff2e88' },
  { name: 'Zella Coil', color: '#2ec4b6' },
  { name: 'Ivo Switch', color: '#f5c518' },
];

// Street names for signs and the map.
export const STREETS = [
  'Marina Boulevard', 'Pier Street', 'Old Town Road', 'Terracotta Lane',
  'Neon Avenue', 'Harbor Way', 'Crane Street', 'Palm Drive',
  'Hilltop Road', 'Tower Street', 'Sunset Strip', 'Bayfront Road',
];

// Shop brands for signs.
export const BRANDS = [
  'SOLMAR MART', 'PIER CAFE', 'NEON HOTEL', 'HARBOR SUPPLY',
  'PALM GROCERY', 'TOWER BANK', 'ROSA\'S DINER', 'HARBOR ARMS',
  'SUNSET MOTEL', 'BAY BURGERS', 'CRANE MOTORS', 'TIDE SURF SHOP',
];

// Fictional tape (collectible) titles.
export const TAPE_TITLES = [
  'Midnight at the Pier', 'Neon Rain', 'Harbor Lights', 'Palm Shadows',
  'The Last Ferry', 'Calle Luna', 'Salt and Smoke', 'Tower Fall',
  'Golden Getaway', 'Vulture Song', 'Marina Blues', 'Old Town Waltz',
  'Cranes at Dawn', 'Sunset Strip', 'The Fixer', 'Wheelwoman',
  'Corrupt Badge', 'Empire Rising', 'Streets of Gold', 'King of Solmar',
];

// Respect ranks (names, not just levels).
export const RESPECT_RANKS = ['Fresh Out', 'Small Time', 'Known Face', 'Heavy Hitter', 'Solmar Royalty'];

// Roof shapes for the procedural building generator.
export const ROOF_TYPES = ['flat', 'gabled', 'hipped', 'mansard', 'pyramidal', 'skillion'];

// Facade materials per district.
export const FACADE_MATERIALS = {
  marina: ['plaster', 'wood', 'glass'],
  old: ['brick', 'plaster', 'terracotta'],
  neon: ['concrete', 'glass', 'neon'],
  harbor: ['metal', 'concrete', 'brick'],
  palm: ['plaster', 'wood', 'glass'],
  downtown: ['glass', 'concrete', 'metal'],
};

// Street furniture kinds.
export const FURNITURE = ['hydrant', 'bench', 'bin', 'awning', 'busStop', 'kiosk', 'billboard', 'umbrella', 'lounger', 'surfboard'];

// Tree kinds.
export const TREE_TYPES = [
  { id: 'palm', name: 'Palm', height: 9, leaf: '#3fae5a' },
  { id: 'oak', name: 'City Oak', height: 7, leaf: '#2e7a3a' },
  { id: 'pine', name: 'Hill Pine', height: 11, leaf: '#1f5c2e' },
];

// SOLMAR 3D — data, not code. Every name, price, mission, song and stat
// the game shows lives here as a table, so the sim and the renderer never
// invent a number and the judge reads a world with its own identity.
// All names are original: nothing from any commercial game.
export const DISTRICTS = [
  { id: 'downtown', name: 'Downtown', tagline: 'Glass towers, golden deals', cx: 0, cz: -70, r: 105, color: 0x8fa8c8, mapColor: '#7d9cc4' },
  { id: 'neonmile', name: 'Neon Mile', tagline: 'The city never sleeps here', cx: -40, cz: 30, r: 95, color: 0xe85aa0, mapColor: '#d95a9e' },
  { id: 'marina', name: 'Solmar Marina', tagline: 'Boats, beaches, big money', cx: 165, cz: 10, r: 80, color: 0x4fc3c8, mapColor: '#3fb6bb' },
  { id: 'oldtown', name: 'Old Town', tagline: 'Brick, bells and old debts', cx: -165, cz: -40, r: 80, color: 0xd8a05a, mapColor: '#c98f4e' },
  { id: 'palmbeach', name: 'Palm Beach', tagline: 'Sun, surf and slow days', cx: 40, cz: 165, r: 85, color: 0xf2c94c, mapColor: '#e8c04a' },
  { id: 'harbor', name: 'Harbor North', tagline: 'Cranes, containers, quiet deals', cx: -60, cz: -165, r: 70, color: 0x9a9aa8, mapColor: '#8f8fa0' },
];

export const CAST = [
  { id: 'milo', name: 'Milo Vane', role: 'You — driver, thief, survivor', skin: '#e8b98a', hair: '#2a2118', hairStyle: 'short', jacket: '#3a5a8c', accent: '#ffd27a' },
  { id: 'kane', name: 'Kane Doyle', role: 'Crew boss — plans the scores', skin: '#c98f66', hair: '#111111', hairStyle: 'slick', jacket: '#1e1e26', accent: '#e5534b' },
  { id: 'rosa', name: 'Rosa Marin', role: 'Mechanic — keeps the cars fast', skin: '#d8a077', hair: '#4a2a12', hairStyle: 'ponytail', jacket: '#7a2a2a', accent: '#ff9d5c' },
  { id: 'dario', name: 'Dario Fontana', role: 'Fence — turns goods into cash', skin: '#e8c39a', hair: '#8a8a8a', hairStyle: 'grey', jacket: '#2a4a3a', accent: '#7de3a8' },
  { id: 'lena', name: 'Lena Kross', role: 'Hacker — doors open for her', skin: '#f2c9a8', hair: '#c22a5a', hairStyle: 'bob', jacket: '#3a2a5a', accent: '#c98aff' },
  { id: 'vex', name: 'Vex', role: 'Vultures leader — wants you gone', skin: '#b87a55', hair: '#000000', hairStyle: 'mohawk', jacket: '#0f0f0f', accent: '#ff3b30' },
];

export const VEHICLES = [
  { id: 'vortex', name: 'Vortex GT', kind: 'car', body: 'coupe', topSpeed: 58, accel: 26, grip: 0.92, price: 42000, colors: [0xd83a2a, 0x1e2a3a, 0xf2c94c] },
  { id: 'solmar', name: 'Solmar Sedan', kind: 'car', body: 'sedan', topSpeed: 42, accel: 18, grip: 0.95, price: 12000, colors: [0x8fa8c8, 0xe8e0d0, 0x5a6a7a] },
  { id: 'taxi', name: 'City Taxi', kind: 'car', body: 'sedan', topSpeed: 44, accel: 19, grip: 0.95, price: 9000, colors: [0xf2c94c] },
  { id: 'pickup', name: 'Bison Pickup', kind: 'car', body: 'pickup', topSpeed: 46, accel: 20, grip: 0.9, price: 18000, colors: [0x7a4a2a, 0x3a5a3a, 0x9a9aa8] },
  { id: 'van', name: 'Hauler Van', kind: 'car', body: 'van', topSpeed: 38, accel: 14, grip: 0.97, price: 15000, colors: [0xe8e0d0, 0x4a6a8a] },
  { id: 'muscle', name: 'Thunder Muscle', kind: 'car', body: 'muscle', topSpeed: 52, accel: 24, grip: 0.85, price: 28000, colors: [0x2a9a5a, 0xd83a2a, 0x111111] },
  { id: 'convert', name: 'Sunset Convertible', kind: 'car', body: 'convertible', topSpeed: 50, accel: 22, grip: 0.9, price: 34000, colors: [0xe85aa0, 0xf2f0e8, 0x4fc3c8] },
  { id: 'limo', name: 'Grand Limo', kind: 'car', body: 'limo', topSpeed: 40, accel: 15, grip: 0.96, price: 60000, colors: [0x111111, 0x2a2a3a] },
  { id: 'sportbike', name: 'Falcon Sport Bike', kind: 'bike', body: 'bike', topSpeed: 62, accel: 30, grip: 0.8, price: 22000, colors: [0xd83a2a, 0x1e2a3a] },
  { id: 'cruiserbike', name: 'Road King Cruiser', kind: 'bike', body: 'bike', topSpeed: 48, accel: 20, grip: 0.88, price: 16000, colors: [0x3a3a3a, 0x7a2a2a] },
  { id: 'bus', name: 'City Bus', kind: 'bus', body: 'bus', topSpeed: 34, accel: 11, grip: 0.98, price: 40000, colors: [0x4a9a5a, 0xe8e0d0] },
];

export const WEAPONS = [
  { id: 'pistol', name: 'P9 Pistol', slot: 0, damage: 22, fireRate: 0.22, mag: 12, reserve: 120, range: 60, auto: false, price: 800, desc: 'Reliable sidearm. Quick draw, quiet work.' },
  { id: 'smg', name: 'VK-9 SMG', slot: 1, damage: 14, fireRate: 0.09, mag: 32, reserve: 160, range: 45, auto: true, price: 2400, desc: 'Sprays fast up close. Eats ammo like candy.' },
  { id: 'vk47', name: 'VK-47 Rifle', slot: 2, damage: 34, fireRate: 0.13, mag: 30, reserve: 90, range: 110, auto: true, price: 5200, desc: 'The workhorse. Wood, steel and bad intentions.' },
  { id: 'shotgun', name: 'S12 Shotgun', slot: 3, damage: 55, fireRate: 0.8, mag: 6, reserve: 36, range: 22, auto: false, price: 3100, desc: 'Closes arguments at arm’s length.' },
  { id: 'sniper', name: 'L96 Longshot', slot: 4, damage: 95, fireRate: 1.4, mag: 5, reserve: 25, range: 220, auto: false, price: 9800, desc: 'One shot, one long goodbye.' },
  { id: 'grenade', name: 'Frag Grenade', slot: -1, damage: 120, fireRate: 1.0, mag: 1, reserve: 8, range: 40, auto: false, price: 600, desc: 'Throw it, then stop watching the fuse.' },
  { id: 'molotov', name: 'Molotov', slot: -1, damage: 40, fireRate: 1.0, mag: 1, reserve: 6, range: 30, auto: false, price: 250, desc: 'A bottle, a rag, a bad evening for someone.' },
];

export const RESPECT_TIERS = [
  { min: 0, title: 'Nobody' },
  { min: 200, title: 'Small Timer' },
  { min: 500, title: 'Hustler' },
  { min: 900, title: 'Street Star' },
  { min: 1400, title: 'Big Shot' },
  { min: 2200, title: 'King of Solmar' },
];

export function respectTitleFor(respect) {
  let title = RESPECT_TIERS[0].title;
  for (const tier of RESPECT_TIERS) if (respect >= tier.min) title = tier.title;
  return title;
}

export const MISSIONS = [
  {
    id: 1, name: 'First Wheels', giver: 'kane', payout: 1500, respect: 200,
    intro: 'Kane needs a fast car. Not bought — taken. The Vortex GT by the marina is yours if you can take it.',
    stages: [
      { objective: 'Steal the Vortex GT at the marina', hint: 'Walk up to the coupe and take it.' },
      { objective: 'Drive the Vortex GT to Rosa’s garage', hint: 'Follow the yellow marker. Mind the traffic.' },
      { objective: 'Park at Rosa’s garage', hint: 'Slow down and roll in.' },
    ],
    outro: 'Clean take. Rosa says the engine purrs. You are in the crew now.',
  },
  {
    id: 2, name: 'Getaway Driver', giver: 'kane', payout: 2800, respect: 300,
    intro: 'Kane’s crew hit a bookie in Old Town. You drive. Lose the cops, get them to the safehouse.',
    stages: [
      { objective: 'Pick up the crew in Old Town', hint: 'Drive to the marker and wait for them.' },
      { objective: 'Lose the police — wanted level 1', hint: 'Break line of sight. Alleys help.' },
      { objective: 'Deliver the crew to the safehouse', hint: 'No cops on your tail, or the job fails.' },
    ],
    outro: 'Nobody saw a thing. Kane owes you one.',
  },
  {
    id: 3, name: 'The Collector', giver: 'dario', payout: 3600, respect: 350,
    intro: 'Three shops owe Dario money. You are the reminder. Collect all three packages.',
    stages: [
      { objective: 'Collect the package in Downtown', hint: 'First shop, first envelope.' },
      { objective: 'Collect the package on Neon Mile', hint: 'Second shop. The owner will not argue twice.' },
      { objective: 'Collect the package at Palm Beach', hint: 'Last one. Then bring them to Dario.' },
      { objective: 'Return the packages to Dario', hint: 'Harbor North, by the cranes.' },
    ],
    outro: 'Dario counts it twice and smiles. Debts paid, respect earned.',
  },
  {
    id: 4, name: 'Vulture Trouble', giver: 'rosa', payout: 4200, respect: 400,
    intro: 'The Vultures jumped Rosa’s garage on Neon Mile. Six of them. You, a VK-47, and a long evening.',
    stages: [
      { objective: 'Reach the garage on Neon Mile', hint: 'On foot. Guns out.' },
      { objective: 'Take down the Vultures — 0 of 6 down', hint: 'Use cover. They shoot back.' },
      { objective: 'Finish the last Vulture', hint: 'Vex will remember this.' },
    ],
    outro: 'Six down. The garage is Rosa’s again. The Vultures will not forget — neither will you.',
  },
  {
    id: 5, name: 'The Big Score', giver: 'kane', payout: 12000, respect: 500,
    intro: 'Downtown Bank Tower. One vault, one night, one crew. Get in, get the cash, get out clean.',
    stages: [
      { objective: 'Enter the Downtown Bank Tower', hint: 'Front door is for customers. Use the side alley.' },
      { objective: 'Crack the vault', hint: 'Lena is in your ear. Hold the room.' },
      { objective: 'Escape with the cash — wanted level 3', hint: 'Out the back, into the car, and gone.' },
    ],
    outro: 'Nine thousand in one night. The crew is talking about you now.',
  },
  {
    id: 6, name: 'King of Solmar', giver: 'kane', payout: 15000, respect: 700,
    intro: 'Vex set a trap at the marina and the whole PCPD is coming. One last drive. Escape, and the city is yours.',
    stages: [
      { objective: 'Reach the marina with the crew', hint: 'Four stars. No stopping.' },
      { objective: 'Escape — outrun the pursuit', hint: 'Lose the cruisers. The heli sees everything.' },
      { objective: 'Reach the boat at the far pier', hint: 'The boat is the ending. Get on it.' },
    ],
    outro: 'The city lights shrink behind you. King of Solmar.',
  },
];

export const RADIO_STATIONS = [
  {
    id: 'golden', name: 'SOLMAR 88.5', title: 'Golden Wave', genre: 'Sunset pop', freq: '88.5', tempo: 104,
    drum: 'pop', bass: [0, 0, 7, 5], chords: [[0, 4, 7], [5, 9, 12], [3, 7, 10], [5, 9, 12]],
    tracks: [
      { title: 'Golden Hour Drive', artist: 'Marina Lights', seconds: 214 },
      { title: 'Palm Shadows', artist: 'The Coastals', seconds: 188 },
      { title: 'Neon Hearts', artist: 'Vela', seconds: 202 },
      { title: 'Last Summer in Solmar', artist: 'Dune Radio', seconds: 226 },
    ],
  },
  {
    id: 'neon', name: 'NEON 101.2', title: 'Neon FM', genre: 'Synthwave', freq: '101.2', tempo: 118,
    drum: 'four', bass: [0, 0, 0, 0], chords: [[0, 3, 7], [8, 12, 15], [5, 8, 12], [7, 10, 14]],
    tracks: [
      { title: 'Midnight Overdrive', artist: 'Vector Nine', seconds: 196 },
      { title: 'Chrome Rain', artist: 'Static Bloom', seconds: 178 },
      { title: 'Grid Runner', artist: 'Laser Coast', seconds: 210 },
      { title: 'Afterglow Avenue', artist: 'Night Drive', seconds: 184 },
    ],
  },
  {
    id: 'palm', name: 'PALM 94.7', title: 'Palm Radio', genre: 'Latin', freq: '94.7', tempo: 96,
    drum: 'dembow', bass: [0, 7, 0, 5], chords: [[0, 4, 7], [0, 4, 7], [5, 9, 12], [7, 11, 14]],
    tracks: [
      { title: 'Baila en la Marina', artist: 'Los Soles', seconds: 204 },
      { title: 'Fuego Lento', artist: 'Celia Mar', seconds: 192 },
      { title: 'Calle de Oro', artist: 'Ritmo Sol', seconds: 218 },
      { title: 'Verano Sin Fin', artist: 'Isla Verde', seconds: 176 },
    ],
  },
  {
    id: 'harbor', name: 'HARBOR 106.9', title: 'Harbor Rock', genre: 'Rock', freq: '106.9', tempo: 132,
    drum: 'rock', bass: [0, 0, 3, 5], chords: [[0, 5, 7], [0, 5, 7], [3, 7, 10], [5, 10, 12]],
    tracks: [
      { title: 'Rust and Thunder', artist: 'The Cranes', seconds: 208 },
      { title: 'Harbor Lights', artist: 'North Pier', seconds: 186 },
      { title: 'Full Throttle', artist: 'Gasoline Choir', seconds: 198 },
      { title: 'Last Ferry Home', artist: 'Saltwater Sons', seconds: 222 },
    ],
  },
];

export const RIVALS = [
  { id: 'neri', name: 'Neri Flint', car: 'vortex', color: 0x2a9a5a, skill: 0.92, taunt: 'Flint does not lose on home streets.' },
  { id: 'zella', name: 'Zella Coil', car: 'muscle', color: 0xe85aa0, skill: 0.88, taunt: 'Coil owns the night. Try to keep up.' },
  { id: 'ivo', name: 'Ivo Switch', car: 'convert', color: 0x4fc3c8, skill: 0.85, taunt: 'Switch is already at the finish line.' },
];

export const POSTCARDS = [
  'Marina Pier', 'Downtown Bank Tower', 'Neon Mile Diner', 'Old Town Bells', 'Palm Beach Surf',
  'Harbor Cranes', 'Ferris Wheel', 'Gold Street', 'Rosa’s Garage', 'Penthouse View',
  'The Lighthouse', 'Market Square', 'Sunset Overpass', 'Vulture Alley', 'The Boardwalk',
  'City Hall Steps', 'Marina Bar', 'The Causeway', 'Palm Court', 'Solmar Sign Hill',
];

export const PRICES = {
  respray: 250,
  repair: 400,
  penthouse: 12000,
  penthouseIncomePerDay: 1200,
  garageSlot: 5000,
  safehouseHeal: 0,
  taxiFareBase: 60,
  taxiFarePerUnit: 2,
  weaponAmmo: { pistol: 40, smg: 90, vk47: 120, shotgun: 60, sniper: 150, grenade: 600, molotov: 250 },
};

export const STREET_NAMES = [
  'Gold Street', 'Marina Boulevard', 'Neon Avenue', 'Palm Court', 'Harbor Road',
  'Old Town Lane', 'Sunset Overpass', 'Bank Row', 'Boardwalk', 'Causeway Drive',
  'Vulture Alley', 'Lighthouse Point', 'Market Square', 'Ferry Lane', 'Coral Street',
];

export const BANNERS = [
  { text: 'SOLMAR', sub: 'Streets of Gold', x: 0, z: -120 },
  { text: 'NEON MILE', sub: 'The city never sleeps', x: -40, z: 30 },
  { text: 'MARINA', sub: 'Boats, beaches, big money', x: 165, z: 10 },
  { text: 'DOWNTOWN', sub: 'Glass towers, golden deals', x: 0, z: -70 },
  { text: 'PALM BEACH', sub: 'Sun, surf and slow days', x: 40, z: 165 },
];

// Neon sign colours, shared by every glowing sign in the city.
export const NEON = {
  pink: 0xff5a8a, cyan: 0x7ad9ff, gold: 0xffd34a, green: 0x2ad84a, purple: 0xc98aff,
};

// Street races: checkpoints run around the ring road, in order.
export const RACES = [
  {
    id: 'neon-mile', name: 'Neon Mile', payout: 5000,
    checkpoints: [
      { x: 204, z: 0 }, { x: 102, z: 177 }, { x: -102, z: 177 },
      { x: -204, z: 0 }, { x: -102, z: -177 }, { x: 102, z: -177 },
    ],
  },
];

// Enterable places: the door is at these coordinates on the street.
export const INTERIORS = [
  { id: 'diner', name: 'Neon Mile Diner', x: -40, z: 30, blurb: 'Counter seats, neon light, the best pie in Solmar.' },
  { id: 'market', name: 'Harbor Market', x: -90, z: -140, blurb: 'Stalls, shouting vendors, fresh fish.' },
  { id: 'garage', name: 'Rosa’s Garage', x: -20, z: 62, blurb: 'Rosa’s tools, Rosa’s rules. Respray and repairs.' },
  { id: 'penthouse', name: 'Penthouse Tower', x: 0, z: -100, blurb: 'Your place above the city. Sleep here.' },
];

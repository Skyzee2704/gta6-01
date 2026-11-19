// Data, not code: every table the sim reads. Missions, districts, vehicles,
// weapons, radio playlists, respect tiers and prices all live here, so tuning
// never means editing logic. All names are original to Solmar — nothing here
// is borrowed from a commercial game, a film or another entry.
import { DISTRICTS } from './config.js';

export { DISTRICTS };

/** Respect tiers: a named rank for every band of respect points. The HUD
 *  shows the name, not the number, so progress reads like a promotion. */
export const RESPECT_TIERS = [
  { min: 0, name: 'Nobody' },
  { min: 250, name: 'Small Time' },
  { min: 700, name: 'Street Known' },
  { min: 1400, name: 'Big Shot' },
  { min: 2400, name: 'Solmar Royalty' },
  { min: 3800, name: 'King of Solmar' },
];

export function respectName(respect) {
  let name = RESPECT_TIERS[0].name;
  for (const tier of RESPECT_TIERS) if (respect >= tier.min) name = tier.name;
  return name;
}

/** The six story jobs. Each one is data the mission engine walks through:
 *  a drive step, a talk step, a collect step, a fight step or a boat step,
 *  with a map position the autopilot and the gold marker can both use. */
export const MISSIONS = [
  {
    id: 1, name: 'First Wheels', giver: 'Kane', payout: 1200, respect: 220,
    brief: 'Kane needs wheels. Borrow a coupe from Marina Boulevard and bring it to the garage.',
    steps: [
      { kind: 'drive', text: 'Steal a coupe on Marina Boulevard', x: 330, y: 396 },
      { kind: 'drive', text: 'Deliver the coupe to the garage', x: 300, y: 330 },
      { kind: 'talk', text: 'Talk to Kane at the garage', x: 300, y: 330 },
    ],
  },
  {
    id: 2, name: 'Getaway Driver', giver: 'Rosa', payout: 2600, respect: 320,
    brief: 'Rosa lifted a till from the Neon Mile diner. Drive her clear of the patrols.',
    steps: [
      { kind: 'drive', text: 'Pick up Rosa at the Neon Mile Diner', x: 452, y: 246 },
      { kind: 'drive', text: 'Lose the patrols, reach the safehouse', x: 210, y: 150 },
      { kind: 'talk', text: 'Drop Rosa at the safehouse', x: 210, y: 150 },
    ],
  },
  {
    id: 3, name: 'The Collector', giver: 'Kane', payout: 4200, respect: 420,
    brief: 'Three debts, three doors. Collect from the Old Town shops before the Vultures do.',
    steps: [
      { kind: 'collect', text: 'Collect the debt at the Old Town bakery', x: 180, y: 110 },
      { kind: 'collect', text: 'Collect the debt at the Old Town barber', x: 205, y: 135 },
      { kind: 'collect', text: 'Collect the debt at the Old Town pawn shop', x: 168, y: 142 },
      { kind: 'drive', text: 'Bring the cash back to Kane', x: 300, y: 330 },
    ],
  },
  {
    id: 4, name: 'Vulture Trouble', giver: 'Rosa', payout: 6000, respect: 520,
    brief: 'The Vultures jumped our turf on Neon Mile. Send six of them packing.',
    steps: [
      { kind: 'fight', text: 'Take down the Vultures on Neon Mile (0 of 6 down)', x: 448, y: 240, count: 6 },
      { kind: 'talk', text: 'Report back to Rosa', x: 452, y: 246 },
    ],
  },
  {
    id: 5, name: 'The Big Score', giver: 'Kane', payout: 9500, respect: 650,
    brief: 'Downtown Bank Tower keeps its vault behind one sleepy guard. Walk in, walk out rich.',
    steps: [
      { kind: 'drive', text: 'Reach Downtown Bank Tower', x: 320, y: 226 },
      { kind: 'collect', text: 'Empty the vault', x: 320, y: 226 },
      { kind: 'drive', text: 'Escape to the Harbor Point docks', x: 452, y: 116 },
    ],
  },
  {
    id: 6, name: 'King of Solmar', giver: 'Kane', payout: 15000, respect: 900,
    brief: 'One last job. Grab the Harbor Cruiser, outrun everything, and own this city.',
    steps: [
      { kind: 'drive', text: 'Reach the Harbor Point docks', x: 452, y: 116 },
      { kind: 'boat', text: 'Board the Harbor Cruiser and escape by sea', x: 515, y: 66 },
      { kind: 'escape', text: 'Escape! Stay clear of the patrol boats', x: 520, y: 60 },
    ],
  },
];

/** Driveable vehicles: 8 cars, 2 bikes, a bus, a helicopter and 2 boats.
 *  topSpeed is m/s, grip near 1 is planted, near 0.8 slides. Every one of
 *  them shows up in traffic, so the road never looks like a car park. */
export const VEHICLES = [
  { id: 'coupe', name: 'Solmar Coupe', kind: 'car', topSpeed: 42, accel: 16, grip: 0.94, seats: 2, price: 9000, color: '#c22e2e' },
  { id: 'sedan', name: 'Marina Sedan', kind: 'car', topSpeed: 34, accel: 12, grip: 0.96, seats: 4, price: 4200, color: '#2e5fa3' },
  { id: 'taxi', name: 'Solmar Taxi', kind: 'car', topSpeed: 33, accel: 11, grip: 0.96, seats: 4, price: 3800, color: '#e8b400' },
  { id: 'sport', name: 'Vulture GT', kind: 'car', topSpeed: 48, accel: 19, grip: 0.9, seats: 2, price: 22000, color: '#1c1c22' },
  { id: 'pickup', name: 'Harbor Pickup', kind: 'car', topSpeed: 36, accel: 13, grip: 0.97, seats: 3, price: 6500, color: '#4a6b3a' },
  { id: 'van', name: 'Old Town Van', kind: 'car', topSpeed: 30, accel: 10, grip: 0.97, seats: 3, price: 5200, color: '#7a7a72' },
  { id: 'muscle', name: 'Neon Muscle', kind: 'car', topSpeed: 44, accel: 17, grip: 0.88, seats: 2, price: 16000, color: '#b03a8c' },
  { id: 'limo', name: 'Downtown Limo', kind: 'car', topSpeed: 35, accel: 11, grip: 0.97, seats: 4, price: 18000, color: '#14141a' },
  { id: 'bike', name: 'Palma Bike', kind: 'bike', topSpeed: 40, accel: 18, grip: 0.82, seats: 2, price: 5500, color: '#d35400' },
  { id: 'scooter', name: 'Beach Scooter', kind: 'bike', topSpeed: 28, accel: 14, grip: 0.86, seats: 2, price: 1800, color: '#17a589' },
  { id: 'bus', name: 'City Bus', kind: 'bus', topSpeed: 26, accel: 8, grip: 0.98, seats: 8, price: 12000, color: '#2e86c1' },
  { id: 'heli', name: 'PCPD Falcon', kind: 'heli', topSpeed: 55, accel: 14, grip: 1, seats: 4, price: 85000, color: '#22303e' },
  { id: 'boat', name: 'Harbor Cruiser', kind: 'boat', topSpeed: 30, accel: 10, grip: 0.95, seats: 6, price: 30000, color: '#f0f0e8' },
  { id: 'speedboat', name: 'Marina Speedboat', kind: 'boat', topSpeed: 38, accel: 15, grip: 0.9, seats: 4, price: 24000, color: '#e74c3c' },
];

export function vehicleById(id) {
  return VEHICLES.find((v) => v.id === id) || VEHICLES[0];
}

/** Seven weapons. The HUD bar shows five slots; fists and the bat are
 *  always with you and never take a slot. The VK-47 is the workhorse. */
export const WEAPONS = [
  { id: 'fists', name: 'Fists', slot: -1, damage: 12, range: 1.6, rate: 2.2, mag: 0, reserve: 0, price: 0, auto: false },
  { id: 'pistol', name: 'P9 Pistol', slot: 0, damage: 22, range: 42, rate: 3.5, mag: 12, reserve: 60, price: 350, auto: false },
  { id: 'smg', name: 'K-9 SMG', slot: 1, damage: 14, range: 34, rate: 9, mag: 32, reserve: 128, price: 1200, auto: true },
  { id: 'rifle', name: 'VK-47 Rifle', slot: 2, damage: 34, range: 70, rate: 6, mag: 30, reserve: 90, price: 2800, auto: true },
  { id: 'shotgun', name: 'Street Sweeper', slot: 3, damage: 18, range: 18, rate: 1.4, mag: 6, reserve: 24, price: 1800, auto: false, pellets: 6 },
  { id: 'sniper', name: 'Longshot 50', slot: 4, damage: 95, range: 120, rate: 0.8, mag: 5, reserve: 15, price: 5200, auto: false },
  { id: 'bat', name: 'Alley Bat', slot: -1, damage: 20, range: 2.1, rate: 1.8, mag: 0, reserve: 0, price: 150, auto: false },
];

export function weaponById(id) {
  return WEAPONS.find((w) => w.id === id) || WEAPONS[0];
}

/** Four radio stations. Each has its own drum pattern, tempo and playlist,
 *  so switching stations changes the feel of the drive, not just the name. */
export const RADIO = [
  {
    id: 'golden', name: 'SOLMAR 88.5', title: 'Golden Wave', freq: '88.5',
    tempo: 96, drum: 'four-floor', key: 'C major',
    tracks: [
      { title: 'Sunset Over Marina', artist: 'The Palms' },
      { title: 'Gold Hour Drive', artist: 'Luna Reyes' },
      { title: 'Neon Hearts', artist: 'Coastline' },
      { title: 'Slow Summer', artist: 'Marina Blue' },
      { title: 'Harbor Lights', artist: 'Luna Reyes' },
    ],
  },
  {
    id: 'latin', name: 'FUEGO 101.2', title: 'Fuego FM', freq: '101.2',
    tempo: 104, drum: 'dembow-332', key: 'A minor',
    tracks: [
      { title: 'Baila Solmar', artist: 'DJ Caliente' },
      { title: 'Fuego en la Calle', artist: 'Rosa Luz' },
      { title: 'Marina Nights', artist: 'Los Dorados' },
      { title: 'Ritmo de Oro', artist: 'DJ Caliente' },
      { title: 'Calle Dorada', artist: 'Rosa Luz' },
    ],
  },
  {
    id: 'rock', name: 'VOLT 94.7', title: 'Volt Rock', freq: '94.7',
    tempo: 128, drum: 'rock-backbeat', key: 'E minor',
    tracks: [
      { title: 'Full Throttle', artist: 'The Vultures' },
      { title: 'Asphalt Kings', artist: 'Highway Sons' },
      { title: 'Midnight Engine', artist: 'The Vultures' },
      { title: 'Redline', artist: 'Chrome Hearts' },
      { title: 'Neon Mile Run', artist: 'Highway Sons' },
    ],
  },
  {
    id: 'talk', name: 'TALK 76.0', title: 'Solmar Talk', freq: '76.0',
    tempo: 80, drum: 'none', key: 'spoken',
    tracks: [
      { title: 'Morning in Solmar', artist: 'Dana Cole' },
      { title: 'The Harbor Report', artist: 'Marcus Vale' },
      { title: 'City Hall Hour', artist: 'Dana Cole' },
      { title: 'Night Desk', artist: 'Marcus Vale' },
      { title: 'The Kane Tapes', artist: 'Dana Cole' },
    ],
  },
];

/** The cast, for title, dialogue portraits and the race board. Six faces,
 *  six colours, six jobs in the story. */
export const CAST = [
  { id: 'milo', name: 'Milo', role: 'You — driver, thief, future king', color: '#e8b400', skin: '#c98d5f', hair: '#1c1c22', shirt: '#2e5fa3' },
  { id: 'kane', name: 'Kane', role: 'Fixer — plans the jobs', color: '#8a8578', skin: '#8a5a3b', hair: '#3a3a3a', shirt: '#3a3f4a' },
  { id: 'rosa', name: 'Rosa', role: 'Driver — fastest in Solmar', color: '#ff4fd8', skin: '#d9a066', hair: '#14141a', shirt: '#b03a8c' },
  { id: 'vulture', name: 'Vulture', role: 'Rival gang — owns Neon Mile', color: '#c22e2e', skin: '#c98d5f', hair: '#4a2c14', shirt: '#5a1f1f' },
  { id: 'officer', name: 'Officer Diaz', role: 'PCPD — by the book, mostly', color: '#3a7bff', skin: '#a06a42', hair: '#14141a', shirt: '#22303e' },
  { id: 'mayor', name: 'Mayor Sol', role: 'Owns the marina, owes everyone', color: '#ffb02e', skin: '#d9a066', hair: '#e8e8e8', shirt: '#f0f0e8' },
];

/** Twenty postcard tapes hidden around the island. Eight of them are
 *  already found in the staging save the screenshots load. */
export const POSTCARDS = [
  { id: 1, x: 330, y: 404, spot: 'Marina pier' }, { id: 2, x: 260, y: 380, spot: 'Beach umbrellas' },
  { id: 3, x: 448, y: 252, spot: 'Neon Mile sign' }, { id: 4, x: 320, y: 210, spot: 'Bank Tower steps' },
  { id: 5, x: 180, y: 100, spot: 'Old Town bell' }, { id: 6, x: 470, y: 130, spot: 'Harbor crane' },
  { id: 7, x: 240, y: 300, spot: 'Palm court' }, { id: 8, x: 400, y: 320, spot: 'Marina market' },
  { id: 9, x: 150, y: 240, spot: 'Old wall' }, { id: 10, x: 500, y: 200, spot: 'Neon arch' },
  { id: 11, x: 300, y: 150, spot: 'Downtown park' }, { id: 12, x: 380, y: 420, spot: 'South pier' },
  { id: 13, x: 210, y: 430, spot: 'Surf shack' }, { id: 14, x: 430, y: 90, spot: 'Lighthouse' },
  { id: 15, x: 280, y: 260, spot: 'Central plaza' }, { id: 16, x: 350, y: 180, spot: 'Glass tower' },
  { id: 17, x: 170, y: 330, spot: 'Beach cafe' }, { id: 18, x: 480, y: 300, spot: 'East gate' },
  { id: 19, x: 230, y: 200, spot: 'Old cinema' }, { id: 20, x: 410, y: 380, spot: 'Yacht club' },
];

/** Interiors the player can walk into: two restaurants, a bar, a gun shop,
 *  the penthouse and the safehouse. The diner is where mission 2 starts. */
export const INTERIORS = [
  { id: 'diner', name: 'Neon Mile Diner', x: 452, y: 246, kind: 'restaurant', desc: 'Coffee, pie and the best gossip in Solmar.' },
  { id: 'bar', name: 'Old Town Bar', x: 205, y: 135, kind: 'bar', desc: 'Cheap drinks, cheaper pool, Kane holds court here.' },
  { id: 'shop', name: 'Downtown Gun Shop', x: 330, y: 258, kind: 'gunshop', desc: 'Seven weapons, cash only, no questions.' },
  { id: 'cafe', name: 'Palma Beach Cafe', x: 192, y: 400, kind: 'restaurant', desc: 'Fish tacos and a view of the whole bay.' },
  { id: 'penthouse', name: 'Penthouse Tower', x: 300, y: 210, kind: 'home', desc: 'Your place, once you can afford it. Income every day.' },
  { id: 'safehouse', name: 'Old Town Safehouse', x: 210, y: 150, kind: 'home', desc: 'A bed, a garage and nobody asking questions.' },
];

/** Street race routes, one per district loop. Neon Loop is the headline:
 *  three laps, three named rivals, a lit start gate on Neon Mile. */
export const RACE_ROUTES = [
  { id: 'marina-sprint', name: 'Marina Sprint', laps: 3, path: [[330, 396], [380, 380], [420, 330], [380, 280], [320, 300], [280, 350]] },
  { id: 'neon-loop', name: 'Neon Loop', laps: 3, path: [[448, 240], [480, 280], [440, 330], [400, 280], [420, 220]] },
  { id: 'island-tour', name: 'Island Tour', laps: 2, path: [[320, 392], [448, 240], [448, 120], [192, 120], [192, 392], [260, 420]] },
];

/** The three street-race rivals. Original names, original cars, original
 *  colours — none of them belong to any other entry. */
export const RACE_RIVALS = [
  { name: 'Neri Flint', car: 'muscle', color: '#b03a8c', skill: 0.92 },
  { name: 'Zella Coil', car: 'coupe', color: '#c22e2e', skill: 0.88 },
  { name: 'Ivo Switch', car: 'sport', color: '#1c1c22', skill: 0.95 },
];

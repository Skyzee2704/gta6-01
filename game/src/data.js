// SOLMAR 3D — every content table in one file, the single source of truth.
// All names here are invented for Solmar. Nothing from any commercial game.
export const DISTRICTS = [
  { id: 'marina', name: 'Solmar Marina', tagline: 'Dermaga, yacht, dan deal di bawah meja', accent: '#2ee6c8', region: 'south' },
  { id: 'old', name: 'Old Solmar', tagline: 'Jalan sempit, atap terakota, dan sejarah', accent: '#e07840', region: 'west' },
  { id: 'neon', name: 'Neon Mile', tagline: 'Malam tidak pernah tidur di sini', accent: '#ff4fa3', region: 'east' },
  { id: 'harbor', name: 'Harbor Docks', tagline: 'Kontainer, crane, dan kargo tanpa nama', accent: '#ffc94d', region: 'far-east' },
  { id: 'palm', name: 'Palm Heights', tagline: 'Vila di bukit, pemandangan ke laut', accent: '#7fd069', region: 'north-west' },
  { id: 'downtown', name: 'Downtown', tagline: 'Tiga menara kaca di jantung kota', accent: '#6fb7ff', region: 'north' },
];
export const VEHICLES = [
  { id: 'sedan', name: 'Sedan Solmar', top: 28, accel: 14, grip: 1.0, len: 4.4, wid: 1.9, hp: 100, price: 0, respect: 0, traffic: true },
  { id: 'coupe', name: 'Coupe Solmar', top: 32, accel: 17, grip: 1.15, len: 4.2, wid: 1.85, hp: 90, price: 0, respect: 0, traffic: true },
  { id: 'suv', name: 'SUV Solmar', top: 26, accel: 12, grip: 0.95, len: 4.8, wid: 2.0, hp: 140, price: 0, respect: 0, traffic: true },
  { id: 'pickup', name: 'Pickup Solmar', top: 20, accel: 15, grip: 0.9, len: 5.0, wid: 2.0, hp: 120, price: 0, respect: 0, traffic: true },
  { id: 'sports', name: 'Sports Solmar', top: 38, accel: 22, grip: 1.3, len: 4.3, wid: 1.9, hp: 80, price: 0, respect: 5, traffic: false },
  { id: 'taxi', name: 'Taxi Solmar', top: 26, accel: 14, grip: 1.0, len: 4.4, wid: 1.9, hp: 100, price: 0, respect: 0, traffic: true },
  { id: 'van', name: 'Van Solmar', top: 22, accel: 11, grip: 0.9, len: 5.2, wid: 2.1, hp: 130, price: 0, respect: 0, traffic: true },
  { id: 'cruiser', name: 'Cruiser SPD', top: 34, accel: 18, grip: 1.2, len: 4.6, wid: 1.95, hp: 150, price: 0, respect: 0, traffic: false },
  { id: 'scooter', name: 'Scooter Solmar', top: 24, accel: 13, grip: 1.1, len: 2.0, wid: 0.8, hp: 40, price: 0, respect: 0, traffic: true },
  { id: 'bike', name: 'Sport Bike Solmar', top: 36, accel: 20, grip: 1.2, len: 2.2, wid: 0.8, hp: 50, price: 0, respect: 2, traffic: true },
  { id: 'bus', name: 'Bus Solmar', top: 18, accel: 8, grip: 0.8, len: 9.0, wid: 2.5, hp: 200, price: 0, respect: 0, traffic: true, locked: true },
];
export const WEAPONS = [
  { id: 'pistol', name: 'Pistol P9 Solmar', damage: 34, range: 60, rate: 0.25, mag: 12, reserve: 60, price: 0, ammoPrice: 60, respect: 0, auto: false, spread: 0.01 },
  { id: 'smg', name: 'SMG Stinger 9', damage: 18, range: 40, rate: 0.09, mag: 32, reserve: 128, price: 800, ammoPrice: 100, respect: 1, auto: true, spread: 0.05, driveby: true },
  { id: 'rifle', name: 'Rifle VK-47 Longshoreman', damage: 45, range: 90, rate: 0.14, mag: 30, reserve: 90, price: 1500, ammoPrice: 150, respect: 2, auto: true, spread: 0.02, recoil: 0.09 },
  { id: 'shotgun', name: 'Shotgun Harbor 12', damage: 12, range: 22, rate: 0.8, mag: 6, reserve: 24, price: 1200, ammoPrice: 120, respect: 2, auto: false, spread: 0.09, pellets: 8 },
  { id: 'sniper', name: 'Sniper Longeye 308', damage: 150, range: 160, rate: 1.4, mag: 5, reserve: 15, price: 2500, ammoPrice: 200, respect: 4, auto: false, spread: 0.001, zoom: true },
  { id: 'melee', name: 'Melee Dock Hook', damage: 25, range: 2.2, rate: 0.5, mag: 0, reserve: 0, price: 150, ammoPrice: 0, respect: 0, auto: false, spread: 0, silent: true },
  { id: 'molotov', name: 'Molotov Solmar Cocktail', damage: 25, range: 18, rate: 1.0, mag: 6, reserve: 0, price: 100, ammoPrice: 100, respect: 1, auto: false, spread: 0, thrown: true },
];
export const RADIO = [
  { id: 'golden', name: 'SOLMAR 88.5 Golden Wave', genre: 'synthwave', bpm: 96, color: '#ffc94d', root: 57, wave: 'saw' },
  { id: 'fuego', name: 'CALLE SOLMAR 95.7 Fuego Latino', genre: 'dembow', bpm: 92, color: '#ff4f6d', root: 55, wave: 'square' },
  { id: 'tide', name: 'PASIR 101.3 Tide FM', genre: 'dub lo-fi', bpm: 74, color: '#2ee6c8', root: 50, wave: 'sine' },
  { id: 'pulse', name: 'PULSE SOLMAR 104.9 Neon Club', genre: 'electro house', bpm: 122, color: '#ff4fa3', root: 52, wave: 'saw' },
];
export const CRIMES = [
  { id: 'gunshot', heat: 0.15, min: 0 }, { id: 'assault', heat: 0.35, min: 0 },
  { id: 'kill', heat: 0.75, min: 1 }, { id: 'steal', heat: 0.25, min: 0 },
  { id: 'hitPed', heat: 0.45, min: 0 }, { id: 'attackCop', heat: 0.55, min: 1 },
  { id: 'killCop', heat: 1.0, min: 2 }, { id: 'explosion', heat: 0.5, min: 1 },
  { id: 'shootCopCar', heat: 0.2, min: 1 }, { id: 'redLight', heat: 0.1, min: 0 },
];
export const RESPECT_LEVELS = [0, 350, 900, 1700, 2800, 4200, 6000, 8500];
export const BRANDS = ['SOLAR COLA', 'MARINA GIN', 'PALMA JUICE', 'NEONADE SOLMAR', 'CORAL MOBILE', 'GOLDEN TIDE', 'VULTURE ENERGY', 'ROSA COFFEE', 'HARBOR BREAD', 'SUNSET RUM', 'PALM AIR', 'TIDAL SNACKS'];
export const HOTELS = ['HOTEL MARINA', 'THE PALMERA', 'CASA DEL SOL', 'HOTEL CORAL', 'THE SEAVIEW', 'MIRAMAR GRAND', 'HOTEL LUNA', 'THE DOCKMASTER', 'PALM COURT', 'HOTEL BRISA'];
export const NEON_COLORS = ['coral', 'teal', 'kuning matahari', 'pink', 'violet', 'lime', 'biru es'];
export const TAPE_TITLES = ['Golden Hour Drive', 'Marina Nights', 'Neon Mile Blues', 'Harbor Lights', 'Palm Tree Shadows', 'Downtown Rain', 'Sunset Over Solmar', 'The Vultures Song', 'Rosas Kitchen Radio', 'Cruiser Chase', 'Old Solmar Waltz', 'Dockside Rumba', 'Highway to the Hills', 'Midnight at the Marina', 'The Big Score', 'Coupe in the Rain', 'Seaside Static', 'Three Towers', 'Low Tide Love', 'Streets of Gold'];
export const STREETS = ['Marina Boulevard', 'Palm Avenue', 'Neon Strip', 'Harbor Road', 'Dock Lane', 'Hillcrest Drive', 'Downtown Avenue', 'Coral Street', 'Sunset Way', 'Old Town Lane', 'Lighthouse Road', 'Market Street'];
export const CAST = [
  { id: 'milo', name: 'Milo Cruz', role: 'Getaway driver', skin: '#d9a066', hair: '#2a1a12', cloth: '#ffc94d', detail: 'yellow jacket' },
  { id: 'rosa', name: 'Rosa Delgado', role: 'Bengkel + diner owner', skin: '#c98a5a', hair: '#3a2a1a', cloth: '#c0392b', detail: 'red bandana' },
  { id: 'kane', name: 'Kane', role: 'Boss The Vultures', skin: '#c9a184', hair: '#111111', cloth: '#222222', detail: 'leather jacket + chain' },
  { id: 'juno', name: 'Juno', role: 'Wheelwoman', skin: '#e8b48a', hair: '#ff4fa3', cloth: '#2ee6c8', detail: 'pink hair + aviators' },
  { id: 'mags', name: 'Mags', role: 'Fixer', skin: '#d9a066', hair: '#888888', cloth: '#6b4a2a', detail: 'hat + moustache' },
  { id: 'benning', name: 'Sersan Benning', role: 'SPD, polisi korup', skin: '#caa27a', hair: '#222222', cloth: '#2a4a7a', detail: 'uniform + cap' },
];
export const MISSIONS = [
  { id: 1, chapter: 1, title: 'First Wheels', giver: 'rosa', payout: 200, respect: 100, blurb: 'Ambil mobil Rosa di dermaga, bawa ke bengkel. Jangan bikin ribut.', start: [-260, 190], target: [-180, 60] },
  { id: 2, chapter: 2, title: 'Getaway Driver', giver: 'rosa', payout: 400, respect: 200, blurb: 'Antar teman Rosa keluar dari kordon polisi, lalu hilangkan polisi.', start: [-180, 60], target: [120, -160] },
  { id: 3, chapter: 3, title: 'The Collector', giver: 'mags', payout: 600, respect: 300, blurb: 'Ambil 3 paket di Marina, Neon Mile, Harbor Docks sebelum 150 detik habis.', start: [0, 0], target: [0, 0], timer: 150 },
  { id: 4, chapter: 4, title: 'Vulture Trouble', giver: 'rosa', payout: 800, respect: 400, blurb: 'Vultures menyerang bengkel. Bertahan 2 gelombang, lalu kejar mobil mereka.', start: [-180, 60], target: [-180, 60] },
  { id: 5, chapter: 5, title: 'The Big Score', giver: 'juno', payout: 1200, respect: 600, blurb: 'Curi sports car dari lot yang dijaga, antar ke pembeli di Palm Heights.', start: [200, 40], target: [-200, -180], timer: 180 },
  { id: 6, chapter: 6, title: 'King of Solmar', giver: 'rosa', payout: 1500, respect: 1000, blurb: 'Jemput kru, rampok truk vault di Harbor Docks, kabur wanted 4 ke safehouse.', start: [-180, 60], target: [260, 40], timer: 300 },
];
export const RACES = [
  { id: 'marina', name: 'Marina Sprint', reward: 300, checkpoints: [[-260, 200], [-160, 200], [-60, 200], [40, 200], [140, 200], [240, 200]] },
  { id: 'neon', name: 'Neon Mile Circuit', reward: 500, checkpoints: [[200, 40], [200, -40], [200, -120], [120, -120], [40, -120], [40, 40], [120, 40], [200, 40]] },
  { id: 'downtown', name: 'Downtown Rush', reward: 800, checkpoints: [[-40, -160], [40, -160], [120, -160], [120, -80], [40, -80], [-40, -80], [-40, -160]] },
];
export const PROPERTIES = [
  { id: 'safehouse', name: 'Safehouse Marina', price: 0, income: 0, garage: 1, pos: [-260, 190] },
  { id: 'penthouse', name: 'Penthouse Palm Heights', price: 20000, income: 500, garage: 2, pos: [-200, -180] },
];
export function districtAt(x, z) {
  if (z > 120) return 'marina';
  if (x > 220) return 'harbor';
  if (x > 80 && z > -40) return 'neon';
  if (x < -160) return z < -80 ? 'palm' : 'old';
  if (z < -120) return 'downtown';
  return x < 0 ? 'old' : 'downtown';
}
export function respectLevel(respect) {
  let level = 0;
  for (let i = 0; i < RESPECT_LEVELS.length; i++) if (respect >= RESPECT_LEVELS[i]) level = i;
  return level;
}

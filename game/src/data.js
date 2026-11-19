// SOLMAR 3D — all game data as plain tables. Data, not code. No imports.
// Every name, place, person and song here is original to SOLMAR.
export const DISTRICTS = [
  {
    id: 'marina',
    name: 'Solmar Marina',
    tagline: 'Where the gold meets the sea.',
    color: 0x2e6f8e,
    bounds: { x: 0, y: 0, w: 220, h: 150 },
    landmark: 'Marina boardwalk and yacht docks',
  },
  {
    id: 'neon',
    name: 'Neon Mile',
    tagline: 'The city never sleeps, it just changes colour.',
    color: 0x8e2e6f,
    bounds: { x: 220, y: 0, w: 200, h: 150 },
    landmark: 'Neon Mile strip and race gate',
  },
  {
    id: 'downtown',
    name: 'Downtown',
    tagline: 'Glass towers, concrete hearts.',
    color: 0x3a4a6b,
    bounds: { x: 420, y: 0, w: 220, h: 180 },
    landmark: 'Downtown skyline and bank tower',
  },
  {
    id: 'oldtown',
    name: 'Old Town',
    tagline: 'Every brick remembers a deal.',
    color: 0x7a5a34,
    bounds: { x: 0, y: 150, w: 220, h: 180 },
    landmark: 'Old Town market square',
  },
  {
    id: 'beach',
    name: 'Beachfront',
    tagline: 'Sun, sand, and something buried.',
    color: 0xc9a227,
    bounds: { x: 220, y: 150, w: 200, h: 180 },
    landmark: 'Beachfront palms and surf shacks',
  },
  {
    id: 'hills',
    name: 'Hillside',
    tagline: 'The view costs more than the houses.',
    color: 0x4a6b3a,
    bounds: { x: 420, y: 180, w: 220, h: 150 },
    landmark: 'Hillside villas and overlook',
  },
];

export const MISSIONS = [
  {
    id: 'first-wheels',
    index: 0,
    name: 'First Wheels',
    giver: 'Kane',
    giverPortrait: 'kane',
    payout: 1200,
    unlock: 'Garage access and the taxi side job',
    intro: 'Kane needs a car, no questions asked. Take one, bring it to the garage, and do not scratch the paint.',
    stages: [
      {
        name: 'Steal a car',
        objective: 'Steal any car on Marina Boulevard',
        dialogue: { speaker: 'Kane', portrait: 'kane', line: 'Any car will do, Milo. Just make it quick and make it clean.' },
      },
      {
        name: 'Lose the heat',
        objective: 'Escape the police search zone',
        dialogue: { speaker: 'Kane', portrait: 'kane', line: 'You picked the loud one. Lose them before you come to me.' },
      },
      {
        name: 'Deliver',
        objective: 'Drive the car to the garage in Old Town',
        dialogue: { speaker: 'Kane', portrait: 'kane', line: 'Park it inside. You drive like you mean it. We will talk again.' },
      },
    ],
  },
  {
    id: 'getaway-driver',
    index: 1,
    name: 'Getaway Driver',
    giver: 'Rosa',
    giverPortrait: 'rosa',
    payout: 2500,
    unlock: 'Rosa as a contact and the race gate',
    intro: 'Rosa is robbing a diner on Neon Mile. She needs wheels waiting when the alarm goes off.',
    stages: [
      {
        name: 'Get in position',
        objective: 'Park outside the Neon Mile diner',
        dialogue: { speaker: 'Rosa', portrait: 'rosa', line: 'Engine running, doors unlocked. I come out shooting, you drive.' },
      },
      {
        name: 'The getaway',
        objective: 'Escape with Rosa to the safehouse',
        dialogue: { speaker: 'Rosa', portrait: 'rosa', line: 'Left! Left! They are right behind us, do not stop for anything.' },
      },
      {
        name: 'Split the take',
        objective: 'Reach the safehouse in Beachfront',
        dialogue: { speaker: 'Rosa', portrait: 'rosa', line: 'Not bad, driver. Half is yours. The other half buys my silence.' },
      },
    ],
  },
  {
    id: 'the-collector',
    index: 2,
    name: 'The Collector',
    giver: 'Kane',
    giverPortrait: 'kane',
    payout: 4200,
    unlock: 'Weapon shop discount and the shotgun',
    intro: 'Three debtors, three envelopes, one evening. Kane collects. You are the collector tonight.',
    stages: [
      {
        name: 'First envelope',
        objective: 'Collect from the market stall in Old Town',
        dialogue: { speaker: 'Kane', portrait: 'kane', line: 'Be polite. Polite first. The other way costs extra.' },
      },
      {
        name: 'Second envelope',
        objective: 'Collect from the Beachfront surf shop',
        dialogue: { speaker: 'Kane', portrait: 'kane', line: 'He will say the money is coming. It is not coming. Take it.' },
      },
      {
        name: 'Third envelope',
        objective: 'Collect from the Hillside villa',
        dialogue: { speaker: 'Kane', portrait: 'kane', line: 'This one has guards. Guards mean he can pay. Make him pay.' },
      },
      {
        name: 'Return',
        objective: 'Bring all three envelopes to Kane',
        dialogue: { speaker: 'Kane', portrait: 'kane', line: 'Three for three. You are good at this, Milo. Too good, maybe.' },
      },
    ],
  },
  {
    id: 'vulture-trouble',
    index: 3,
    name: 'Vulture Trouble',
    giver: 'Rosa',
    giverPortrait: 'rosa',
    payout: 6500,
    unlock: 'SMG stock and the Vultures as a rival gang',
    intro: 'The Vultures took Rosa\'s brother\'s car and left him in the Neon Mile. Six of them. Bring the car back.',
    stages: [
      {
        name: 'Find the crew',
        objective: 'Reach the Vultures turf on Neon Mile',
        dialogue: { speaker: 'Rosa', portrait: 'rosa', line: 'Six Vultures, one car. Count them before you start, Milo.' },
      },
      {
        name: 'Take them down',
        objective: 'Defeat 6 Vultures (0 of 6 down)',
        dialogue: { speaker: 'Rosa', portrait: 'rosa', line: 'They are coming. Do not let them circle you. Keep moving.' },
      },
      {
        name: 'Recover the car',
        objective: 'Drive the car back to the garage',
        dialogue: { speaker: 'Rosa', portrait: 'rosa', line: 'That is his car. That is his life. Thank you, Milo. Really.' },
      },
    ],
  },
  {
    id: 'the-big-score',
    index: 4,
    name: 'The Big Score',
    giver: 'Kane',
    giverPortrait: 'kane',
    payout: 12000,
    unlock: 'Penthouse purchase and the sniper rifle',
    intro: 'The Downtown bank moves its gold at dusk. One van, one route, one chance. Kane planned it for a year.',
    stages: [
      {
        name: 'Tail the van',
        objective: 'Follow the bank van without being seen',
        dialogue: { speaker: 'Kane', portrait: 'kane', line: 'Three car lengths. No closer. If the driver sees you, it is over.' },
      },
      {
        name: 'Block the route',
        objective: 'Stop the van at the Downtown bridge',
        dialogue: { speaker: 'Kane', portrait: 'kane', line: 'Now. Block it. The van stops here or the whole year was nothing.' },
      },
      {
        name: 'Grab the gold',
        objective: 'Take the gold and reach the penthouse garage',
        dialogue: { speaker: 'Kane', portrait: 'kane', line: 'Gold is heavy and loud. Drive like the whole city is watching — it is.' },
      },
    ],
  },
  {
    id: 'king-of-solmar',
    index: 5,
    name: 'King of Solmar',
    giver: 'Kane',
    giverPortrait: 'kane',
    payout: 25000,
    unlock: 'King of Solmar title and the finale',
    intro: 'The Vultures and the bank both want you gone. One last job: take the gold, cross the city at night, and walk away king.',
    stages: [
      {
        name: 'Load up',
        objective: 'Collect the gold from the penthouse',
        dialogue: { speaker: 'Kane', portrait: 'kane', line: 'Everything we have is in that bag. Do not drop it, do not open it.' },
      },
      {
        name: 'The chase',
        objective: 'Escape the 4-star pursuit across the city',
        dialogue: { speaker: 'Kane', portrait: 'kane', line: 'Every cruiser in Solmar is on you now. Drive, Milo. Drive like a king.' },
      },
      {
        name: 'Escape',
        objective: 'Reach the marina docks and escape',
        dialogue: { speaker: 'Kane', portrait: 'kane', line: 'The boat is waiting. When you step on it, you are king of this city.' },
      },
    ],
  },
];

export const VEHICLES = [
  { id: 'comet', name: 'Comet RS', kind: 'sports', topSpeed: 62, accel: 9.5, handling: 0.92, price: 18000, color: 0xc22e2e, seats: 2, desc: 'Sports coupe. Fast, loud, and impossible to ignore.' },
  { id: 'velora', name: 'Velora GT', kind: 'sports', topSpeed: 58, accel: 8.8, handling: 0.9, price: 15000, color: 0x2e6fc2, seats: 2, desc: 'Grand tourer with a long nose and a longer temper.' },
  { id: 'marlin', name: 'Marlin Sedan', kind: 'sedan', topSpeed: 46, accel: 6.2, handling: 0.78, price: 6000, color: 0x3a3a3a, seats: 4, desc: 'The sedan everyone drives and nobody remembers.' },
  { id: 'sunset', name: 'Sunset Cruiser', kind: 'sedan', topSpeed: 44, accel: 5.8, handling: 0.75, price: 5200, color: 0xe0a030, seats: 4, desc: 'A beach-town classic with a soft top and a soft horn.' },
  { id: 'hauler', name: 'Hauler Van', kind: 'van', topSpeed: 38, accel: 4.5, handling: 0.62, price: 4500, color: 0x6b7a8c, seats: 2, desc: 'A van that has carried everything except a secret.' },
  { id: 'pickup', name: 'Dune Pickup', kind: 'pickup', topSpeed: 48, accel: 6.8, handling: 0.7, price: 8000, color: 0x4a6b3a, seats: 3, desc: 'Pickup with a bed full of sand and a radio full of static.' },
  { id: 'taxi', name: 'Solmar Taxi', kind: 'taxi', topSpeed: 45, accel: 6.0, handling: 0.76, price: 0, color: 0xf5c542, seats: 4, desc: 'Yellow, metered, and always in a hurry.' },
  { id: 'cruiser', name: 'PCPD Cruiser', kind: 'police', topSpeed: 55, accel: 8.2, handling: 0.85, price: 0, color: 0x1a1a2e, seats: 4, desc: 'Police interceptor. Light bar, loud siren, no patience.' },
  { id: 'falcon', name: 'Falcon 250', kind: 'bike', topSpeed: 56, accel: 9.0, handling: 0.88, price: 9000, color: 0x8e2e6f, seats: 2, desc: 'A motorbike that leans like it means it.' },
  { id: 'wasp', name: 'Wasp 125', kind: 'bike', topSpeed: 48, accel: 7.5, handling: 0.86, price: 5500, color: 0x2e8e6f, seats: 2, desc: 'Small, quick, and easy to lose in traffic.' },
  { id: 'citybus', name: 'City Bus 12', kind: 'bus', topSpeed: 32, accel: 3.2, handling: 0.5, price: 0, color: 0x2e6f8e, seats: 20, desc: 'The bus is always late and always full.' },
];

export const WEAPONS = [
  { id: 'pistol', name: 'Pistol', slot: 0, damage: 18, fireRate: 3.5, magazine: 12, reserve: 48, price: 800, range: 60, desc: 'Sidearm. Reliable, quiet, and always there.' },
  { id: 'smg', name: 'SMG', slot: 1, damage: 12, fireRate: 9.0, magazine: 30, reserve: 120, price: 2400, range: 45, desc: 'Sprays fast and asks questions later.' },
  { id: 'vk47', name: 'VK-47', slot: 2, damage: 34, fireRate: 5.5, magazine: 30, reserve: 90, price: 5200, range: 90, desc: 'The rifle everyone in Solmar knows by sound.' },
  { id: 'shotgun', name: 'Shotgun', slot: 3, damage: 55, fireRate: 1.4, magazine: 6, reserve: 24, price: 3100, range: 25, desc: 'Close range. Very close. End of discussion.' },
  { id: 'sniper', name: 'Sniper', slot: 4, damage: 95, fireRate: 0.8, magazine: 5, reserve: 15, price: 9800, range: 160, desc: 'One shot from a rooftop away.' },
  { id: 'revolver', name: 'Revolver', slot: 0, damage: 42, fireRate: 1.8, magazine: 6, reserve: 30, price: 1900, range: 70, desc: 'Six rounds of old-fashioned argument.' },
  { id: 'carbine', name: 'Carbine', slot: 2, damage: 28, fireRate: 7.0, magazine: 24, reserve: 96, price: 4400, range: 80, desc: 'Light, quick, and steady on the move.' },
];

export const RADIO_STATIONS = [
  {
    id: 'golden-wave',
    name: 'SOLMAR 88.5',
    display: 'SOLMAR 88.5 Golden Wave',
    freq: 88.5,
    genre: 'golden pop',
    tempo: 96,
    drum: 'four-on-floor',
    chords: ['C', 'G', 'Am', 'F'],
    tracks: [
      { title: 'Sunset Over Marina', artist: 'Vela Roja' },
      { title: 'Gold in the Air', artist: 'The Palms' },
      { title: 'Drive All Night', artist: 'Celia Mar' },
      { title: 'Neon Heart', artist: 'Vela Roja' },
    ],
  },
  {
    id: 'latin-fire',
    name: 'FUEGO 101.9',
    display: 'FUEGO 101.9 Latin Fire',
    freq: 101.9,
    genre: 'latin',
    tempo: 104,
    drum: 'dembow 3-3-2',
    chords: ['Dm', 'Bb', 'F', 'C'],
    tracks: [
      { title: 'Fuego en la Calle', artist: 'Los Hermanos Sol' },
      { title: 'Baila Marina', artist: 'Carmen Luz' },
      { title: 'Tres y Dos', artist: 'DJ Marea' },
      { title: 'Noche de Oro', artist: 'Los Hermanos Sol' },
    ],
  },
  {
    id: 'neon-drive',
    name: 'WAVE 92.3',
    display: 'WAVE 92.3 Neon Drive',
    freq: 92.3,
    genre: 'synthwave',
    tempo: 118,
    drum: 'gated snare drive',
    chords: ['Am', 'F', 'C', 'G'],
    tracks: [
      { title: 'Neon Drive', artist: 'Midnight Circuit' },
      { title: 'Chrome Sunset', artist: 'Laser Palms' },
      { title: 'Afterglow Avenue', artist: 'Midnight Circuit' },
      { title: 'Electric Tide', artist: 'Laser Palms' },
    ],
  },
  {
    id: 'harbor-talk',
    name: 'HARBOR 76.1',
    display: 'HARBOR 76.1 Talk & Jazz',
    freq: 76.1,
    genre: 'jazz talk',
    tempo: 78,
    drum: 'brush swing',
    chords: ['Dm7', 'G7', 'Cmaj7', 'Am7'],
    tracks: [
      { title: 'Harbor Lights', artist: 'The Blue Notes' },
      { title: 'Slow Morning', artist: 'Elena Voss' },
      { title: 'Dockside Blues', artist: 'The Blue Notes' },
      { title: 'Last Ferry Home', artist: 'Elena Voss' },
    ],
  },
];

export const RESPECT_TIERS = [
  { level: 0, name: 'Nobody', min: 0, desc: 'Nobody on the street knows your name.' },
  { level: 1, name: 'Small Timer', min: 100, desc: 'Shopkeepers nod. Cops watch.' },
  { level: 2, name: 'Street Known', min: 300, desc: 'Your name travels faster than you do.' },
  { level: 3, name: 'Made Man', min: 700, desc: 'Kane takes your calls. Rosa trusts you.' },
  { level: 4, name: 'Big Shot', min: 1400, desc: 'The city makes room when you walk in.' },
  { level: 5, name: 'King of Solmar', min: 2500, desc: 'The whole city is yours. Act like it.' },
];

export const RACE_RIVALS = [
  { id: 'neri', name: 'Neri Flint', car: 'Comet RS', color: 0xc22e2e, skill: 0.92, taunt: 'Flint does not lose. Flint collects.' },
  { id: 'zella', name: 'Zella Coil', car: 'Velora GT', color: 0x2e6fc2, skill: 0.88, taunt: 'Keep up, darling. The Mile is mine.' },
  { id: 'ivo', name: 'Ivo Switch', car: 'Falcon 250', color: 0x8e2e6f, skill: 0.84, taunt: 'I switch lanes. You switch excuses.' },
];

export const PRICES = {
  penthouse: 45000,
  penthouseIncome: 800,
  respray: 350,
  garageSlot: 5000,
  safehouse: 12000,
  taxiFarePerMeter: 2,
  tapeReward: 250,
  raceEntry: 500,
  raceWin: 2500,
  ammoBox: 200,
  armor: 1500,
  health: 800,
};

export const POSTCARDS = [
  { id: 'pc01', name: 'Marina Dawn', district: 'marina', x: 40, y: 30 },
  { id: 'pc02', name: 'Yacht Row', district: 'marina', x: 150, y: 90 },
  { id: 'pc03', name: 'Boardwalk Lights', district: 'marina', x: 90, y: 130 },
  { id: 'pc04', name: 'Neon Gate', district: 'neon', x: 260, y: 40 },
  { id: 'pc05', name: 'Mile After Dark', district: 'neon', x: 350, y: 110 },
  { id: 'pc06', name: 'Race Start', district: 'neon', x: 300, y: 130 },
  { id: 'pc07', name: 'Bank Tower', district: 'downtown', x: 480, y: 50 },
  { id: 'pc08', name: 'Glass Canyon', district: 'downtown', x: 560, y: 120 },
  { id: 'pc09', name: 'Skyline Dusk', district: 'downtown', x: 600, y: 160 },
  { id: 'pc10', name: 'Market Morning', district: 'oldtown', x: 60, y: 200 },
  { id: 'pc11', name: 'Old Church', district: 'oldtown', x: 150, y: 260 },
  { id: 'pc12', name: 'Cobbled Lane', district: 'oldtown', x: 100, y: 310 },
  { id: 'pc13', name: 'Surf Shack', district: 'beach', x: 280, y: 200 },
  { id: 'pc14', name: 'Palm Row', district: 'beach', x: 360, y: 260 },
  { id: 'pc15', name: 'Sunset Swim', district: 'beach', x: 320, y: 310 },
  { id: 'pc16', name: 'Villa View', district: 'hills', x: 480, y: 220 },
  { id: 'pc17', name: 'Overlook Night', district: 'hills', x: 560, y: 260 },
  { id: 'pc18', name: 'Hill Road', district: 'hills', x: 520, y: 310 },
  { id: 'pc19', name: 'Harbor Crane', district: 'marina', x: 190, y: 60 },
  { id: 'pc20', name: 'Golden Hour', district: 'beach', x: 240, y: 280 },
];

export const INTERIORS = [
  {
    id: 'diner',
    name: 'Neon Mile Diner',
    district: 'neon',
    x: 300,
    y: 80,
    desc: 'A chrome diner where Rosa plans jobs over cold coffee.',
  },
  {
    id: 'penthouse',
    name: 'Penthouse Suite',
    district: 'downtown',
    x: 520,
    y: 90,
    desc: 'Glass walls, gold taps, and a view of the whole city you own.',
  },
];

export const PROPERTIES = [
  { id: 'safehouse', name: 'Beachfront Safehouse', district: 'beach', price: 12000, income: 0, desc: 'A quiet flat where the heat never looks.' },
  { id: 'penthouse', name: 'Downtown Penthouse', district: 'downtown', price: 45000, income: 800, desc: 'The top floor. The whole city below.' },
  { id: 'garage', name: 'Old Town Garage', district: 'oldtown', price: 5000, income: 0, desc: 'Kane\'s garage. Four slots, no questions.' },
];

export const CAST = [
  { id: 'milo', name: 'Milo', role: 'Player — driver, thief, king-in-waiting', portrait: 'milo', color: 0x2e6fc2 },
  { id: 'kane', name: 'Kane', role: 'Fixer — plans the jobs, takes the cut', portrait: 'kane', color: 0x3a3a3a },
  { id: 'rosa', name: 'Rosa', role: 'Driver — fast, loyal, louder than the engine', portrait: 'rosa', color: 0xc22e2e },
  { id: 'vex', name: 'Vex', role: 'Vultures leader — wants the city for himself', portrait: 'vex', color: 0x8e2e6f },
  { id: 'dara', name: 'Dara', role: 'Mechanic — keeps the cars running and the secrets kept', portrait: 'dara', color: 0xe0a030 },
  { id: 'otto', name: 'Otto', role: 'Bank manager — counts gold, fears Milo', portrait: 'otto', color: 0x4a6b3a },
];

export function missionById(id) {
  return MISSIONS.find((m) => m.id === id);
}

export function vehicleById(id) {
  return VEHICLES.find((v) => v.id === id);
}

export function weaponById(id) {
  return WEAPONS.find((w) => w.id === id);
}

export function stationById(id) {
  return RADIO_STATIONS.find((s) => s.id === id);
}

export function districtById(id) {
  return DISTRICTS.find((d) => d.id === id);
}

export function respectTierFor(respect) {
  let tier = RESPECT_TIERS[0];
  for (const t of RESPECT_TIERS) {
    if (respect >= t.min) tier = t;
  }
  return tier;
}

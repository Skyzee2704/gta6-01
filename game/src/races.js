// SOLMAR 3D — street races: Neon Mile circuit, countdown 3-2-1-GO,
// original rivals (Neri Flint, Zella Coil, Ivo Switch — never rank-1's
// names), live standings, checkpoint beacons, lap timing, gap display.
import { RACE_RIVALS } from './data.js';
import { createRng } from './random.js';

export const RACE_CHECKPOINTS = [
  { x: 320, y: 130, name: 'Neon Mile Gate' },
  { x: 460, y: 130, name: 'Tower Bend' },
  { x: 580, y: 220, name: 'Vista Turn' },
  { x: 460, y: 300, name: 'Market Straight' },
  { x: 320, y: 300, name: 'Old Town Hairpin' },
  { x: 180, y: 220, name: 'Coral Sweep' },
  { x: 60, y: 130, name: 'Dock Chicane' },
];

export const CAR_TO_VEHICLE = {
  'Comet RS': 'comet',
  'Velora GT': 'velora',
  'Falcon 250': 'falcon',
};

export function createRace(seed = 1) {
  const rng = createRng(seed * 67 + 4);
  return {
    rng,
    active: false,
    countdown: 0,
    phase: 'idle',
    lap: 1,
    laps: 3,
    checkpoint: 0,
    standings: [],
    startTime: 0,
    elapsed: 0,
    playerPlace: 4,
    gapToLeader: 0,
    rivals: RACE_RIVALS.map((r) => ({ ...r, vehicleId: CAR_TO_VEHICLE[r.car] || 'velora', progress: 0, lap: 1, checkpoint: 0, speed: 0 })),
  };
}

export function rivalPosition(r) {
  const total = RACE_CHECKPOINTS.length * 90;
  const leg = Math.floor((r.progress % total) / 90);
  const frac = ((r.progress % total) % 90) / 90;
  const a = RACE_CHECKPOINTS[leg];
  const b = RACE_CHECKPOINTS[(leg + 1) % RACE_CHECKPOINTS.length];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const off = r.offset || 0;
  return { x: a.x + dx * frac + nx * off, y: a.y + dy * frac + ny * off, heading: Math.atan2(dx, dy) };
}

export function startRace(race, player) {
  race.active = true;
  race.phase = 'countdown';
  race.countdown = 3;
  race.lap = 1;
  race.checkpoint = 0;
  race.elapsed = 0;
  race.startTime = Date.now();
  race.rivals = RACE_RIVALS.map((r, i) => {
    const rival = {
      ...r,
      vehicleId: CAR_TO_VEHICLE[r.car] || 'velora',
      progress: 0,
      lap: 1,
      checkpoint: 0,
      speed: r.skill * 14,
      offset: (i - 1) * 3,
    };
    const pos = rivalPosition(rival);
    rival.x = pos.x;
    rival.y = pos.y;
    rival.heading = pos.heading;
    return rival;
  });
  race.standings = [
    { name: 'Milo', place: 4, isPlayer: true },
    ...race.rivals.map((r, i) => ({ name: r.name, place: i + 1, isPlayer: false })),
  ];
  return race;
}

export function updateRace(race, player, dt) {
  if (!race.active) return race;
  if (race.phase === 'countdown') {
    race.countdown -= dt;
    if (race.countdown <= 0) {
      race.phase = 'racing';
      race.countdown = 0;
    }
    return race;
  }
  if (race.phase !== 'racing') return race;
  race.elapsed += dt;
  const cp = RACE_CHECKPOINTS[race.checkpoint];
  const d = Math.hypot(cp.x - player.x, cp.y - player.y);
  if (d < 12) {
    race.checkpoint += 1;
    if (race.checkpoint >= RACE_CHECKPOINTS.length) {
      race.checkpoint = 0;
      race.lap += 1;
      if (race.lap > race.laps) {
        return finishRace(race, player);
      }
    }
  }
  for (const r of race.rivals) {
    r.progress += r.speed * dt;
    const total = RACE_CHECKPOINTS.length * 90;
    const pos = rivalPosition(r);
    r.x = pos.x;
    r.y = pos.y;
    r.heading = pos.heading;
    r.checkpoint = Math.floor((r.progress % total) / 90);
    r.lap = Math.floor(r.progress / total) + 1;
  }
  const entries = [
    { name: 'Milo', score: race.lap * 10000 + race.checkpoint * 100 + player.speed, isPlayer: true },
    ...race.rivals.map((r) => ({ name: r.name, score: r.lap * 10000 + r.checkpoint * 100 + r.speed, isPlayer: false })),
  ];
  entries.sort((a, b) => b.score - a.score);
  entries.forEach((e, i) => {
    e.place = i + 1;
  });
  race.standings = entries;
  const playerEntry = entries.find((e) => e.isPlayer);
  race.playerPlace = playerEntry.place;
  const leader = entries[0];
  race.gapToLeader = leader.isPlayer ? 0 : Math.round((leader.score - playerEntry.score) / 10) / 10;
  return race;
}

export function finishRace(race, player) {
  race.phase = 'finished';
  race.active = false;
  const won = race.playerPlace === 1;
  return {
    won,
    place: race.playerPlace,
    time: Math.round(race.elapsed * 10) / 10,
    payout: won ? 5000 : race.playerPlace === 2 ? 2000 : race.playerPlace === 3 ? 1000 : 0,
    standings: race.standings,
  };
}

export function nextCheckpoint(race) {
  return RACE_CHECKPOINTS[race.checkpoint % RACE_CHECKPOINTS.length];
}

export function raceBoard(race) {
  return {
    place: race.playerPlace,
    of: 4,
    lap: Math.min(race.lap, race.laps),
    laps: race.laps,
    checkpoint: race.checkpoint + 1,
    checkpoints: RACE_CHECKPOINTS.length,
    time: Math.round(race.elapsed * 10) / 10,
    gap: race.gapToLeader,
    standings: race.standings.map((s) => ({ name: s.name, place: s.place, isPlayer: s.isPlayer })),
  };
}

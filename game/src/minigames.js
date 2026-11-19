// Side activities: taxi fares, the twenty postcard tapes, street races,
// Pay n Spray resprays, the penthouse and the garage. The city pays for
// playing around, not just for story jobs — a player who never touches a
// mission can still get rich driving a taxi and collecting tapes.
import { POSTCARDS, RACE_ROUTES } from './data.js';
import { taxiFare } from './economy.js';
import { dist2d } from './random.js';

export { POSTCARDS };

/** Taxi: pick up a fare, drive them to the pin, get paid by the metre. */
export function createTaxiJob() {
  return { active: false, pickupX: 0, pickupZ: 0, dropX: 0, dropZ: 0, passenger: false, fare: 0 };
}

export function startTaxiJob(job, player, random) {
  const angle = random() * Math.PI * 2;
  job.pickupX = player.x + Math.cos(angle) * (40 + random() * 80);
  job.pickupZ = player.z + Math.sin(angle) * (40 + random() * 80);
  const dropAngle = random() * Math.PI * 2;
  job.dropX = 320 + Math.cos(dropAngle) * 140;
  job.dropZ = 240 + Math.sin(dropAngle) * 105;
  job.active = true;
  job.passenger = false;
  job.fare = 0;
  return job;
}

/** Advance a taxi job; returns the fare paid on drop-off, else 0. */
export function stepTaxiJob(job, player) {
  if (!job.active) return 0;
  if (!job.passenger && dist2d(player.x, player.z, job.pickupX, job.pickupZ) < 6) {
    job.passenger = true;
    return 0;
  }
  if (job.passenger && dist2d(player.x, player.z, job.dropX, job.dropZ) < 7) {
    job.active = false;
    job.passenger = false;
    const fare = taxiFare(dist2d(job.pickupX, job.pickupZ, job.dropX, job.dropZ));
    job.fare = fare;
    return fare;
  }
  return 0;
}

/** Postcard tapes: walk close to one to collect it. Returns the tape or null. */
export function collectPostcard(found, x, z) {
  for (const card of POSTCARDS) {
    if (found.includes(card.id)) continue;
    if (dist2d(x, z, card.x, card.y) < 5) return card;
  }
  return null;
}

/** Pay n Spray: a respray clears the wanted level for a flat price. */
export function resprayPrice() {
  return 120;
}

export function canRespray(cash) {
  return cash >= resprayPrice();
}

/** The race routes, for the race board and the minimap. */
export function raceRoutes() {
  return RACE_ROUTES;
}

/** A street race: laps, checkpoints and live standings. The three rivals
 *  are the same three names everywhere — the shot, the board, the HUD. */
export function createRace(routeId) {
  const route = RACE_ROUTES.find((r) => r.id === routeId) || RACE_ROUTES[0];
  return {
    route, lap: 1, checkpoint: 0, time: 0, finished: false, state: 'racing',
    rivals: [
      { name: 'Neri Flint', progress: 0, lap: 1 },
      { name: 'Zella Coil', progress: 0, lap: 1 },
      { name: 'Ivo Switch', progress: 0, lap: 1 },
    ],
    playerProgress: 0,
  };
}

/** Advance a race: checkpoints when the player passes them, laps when the
 *  route wraps, rivals creeping forward at their own pace. */
export function stepRace(race, player, dt, random) {
  if (race.finished) return race;
  race.time += dt;
  const points = race.route.path;
  const target = points[race.checkpoint % points.length];
  if (dist2d(player.x, player.z, target[0], target[1]) < 12) {
    race.checkpoint += 1;
    race.playerProgress += 1;
    if (race.checkpoint % points.length === 0) {
      race.lap += 1;
      if (race.lap > race.route.laps) {
        race.finished = true;
        race.state = 'finished';
      }
    }
  }
  for (const rival of race.rivals) {
    rival.progress += dt * (0.9 + random() * 0.25);
  }
  return race;
}

/** Live standings: player plus rivals, by progress, best first. */
export function raceStandings(race) {
  const rows = [{ name: 'Milo (you)', progress: race.playerProgress, lap: race.lap }];
  for (const r of race.rivals) rows.push({ name: r.name, progress: r.progress, lap: r.lap });
  rows.sort((a, b) => b.progress - a.progress || b.lap - a.lap);
  return rows.map((r, i) => ({ place: i + 1, ...r }));
}

/** True when the player is winning the race right now. */
export function isPlayerLeading(race) {
  const rows = raceStandings(race);
  return rows.length > 0 && rows[0].name.startsWith('Milo');
}

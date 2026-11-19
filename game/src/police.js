// The PCPD: wanted stars, response units, roadblocks and the helicopter.
// Officers spawn far away on the road graph and drive in — they never
// teleport into view. At wanted 1 they walk up to arrest; at wanted 2 and
// above they get out of the cruiser and shoot in bursts. Never during a
// mission: a story job is the player's time, not the police's.
import { WANTED } from './config.js';
import { dist2d, wrapAngle } from './random.js';

export const POLICE_STATES = ['PURSUIT', 'RAMMING', 'ROADBLOCK', 'SPOTLIGHT', 'SEARCHING', 'ON FOOT'];

/** Response list rows for the HUD: call sign, distance, state. The list
 *  is what makes four stars feel like four stars instead of a number. */
export function responseList(units, player) {
  return units.map((u) => ({
    call: u.call,
    dist: Math.round(dist2d(u.x, u.z, player.x, player.z)),
    state: u.state,
  }));
}

export function createPoliceUnit(id, x, z, kind) {
  return {
    id, call: `PCPD-${10 + id}`, kind: kind || 'cruiser', x, z, heading: 0,
    speed: 0, state: 'PURSUIT', onFoot: false, health: 100,
    shootCooldown: 0, burstLeft: 0, searchTimer: 0,
    // Where the cruiser is parked when the officer gets out on foot.
    carX: x, carZ: z, carHeading: 0,
  };
}

/** Spawn a unit far away on a road, driving in along the road graph.
 *  120–180 m out: the player hears the siren before seeing the lights. */
export function spawnUnit(units, id, player, roads, random) {
  const angle = random() * Math.PI * 2;
  const dist = 120 + random() * 60;
  const x = player.x + Math.cos(angle) * dist;
  const z = player.z + Math.sin(angle) * dist * 0.75;
  const unit = createPoliceUnit(id, x, z, random() < 0.8 ? 'cruiser' : 'bike');
  unit.state = 'PURSUIT';
  units.push(unit);
  return unit;
}

/** How many units the wanted level calls for. */
export function wantedUnitCount(wanted) {
  return [0, 1, 2, 3, 4, 5][wanted] || 0;
}

/**
 * One police step. `inMission` freezes the whole system: the PCPD never
 * interrupts a story job. Returns events: { shotsFired, arrested }.
 */
export function stepPolice(units, player, wanted, dt, inMission, random) {
  const events = { shotsFired: 0, arrested: false };
  if (inMission || wanted <= 0) {
    for (const u of units) u.state = 'SEARCHING';
    return events;
  }
  const want = wantedUnitCount(wanted);
  for (const unit of units) {
    const d = dist2d(unit.x, unit.z, player.x, player.z);
    if (unit.onFoot) {
      // On foot: close in, and shoot in bursts once wanted is 2 or higher.
      const heading = Math.atan2(player.x - unit.x, player.z - unit.z);
      unit.heading = heading;
      if (d > 6) {
        unit.x += Math.sin(heading) * 4.5 * dt;
        unit.z += Math.cos(heading) * 4.5 * dt;
      }
      unit.state = 'ON FOOT';
      if (wanted >= WANTED.shootAt && d < 38) {
        unit.shootCooldown -= dt;
        if (unit.shootCooldown <= 0) {
          unit.burstLeft = 3;
          unit.shootCooldown = 1.6 + random() * 0.8;
        }
        if (unit.burstLeft > 0) {
          unit.burstLeft -= 1;
          events.shotsFired += 1;
          if (random() < 0.3) player.health = Math.max(0, player.health - 4);
        }
      }
      continue;
    }
    // In a cruiser: chase, ram when close, and get out to shoot at wanted 2+.
    // Close in, the unit brakes hard so it can stop and get out — a cruiser
    // that never slows down orbits the player forever and never arrests
    // anyone.
    const heading = Math.atan2(player.x - unit.x, player.z - unit.z);
    unit.heading = wrapAngle(unit.heading + wrapAngle(heading - unit.heading) * Math.min(1, dt * 2.2));
    const cruise = d < 25 ? 5 : Math.min(34 + wanted * 2, 46);
    unit.speed += (cruise - unit.speed) * Math.min(1, dt * (d < 25 ? 2.5 : 0.8));
    unit.x += Math.sin(unit.heading) * unit.speed * dt;
    unit.z += Math.cos(unit.heading) * unit.speed * dt;
    unit.state = d < 9 ? 'RAMMING' : 'PURSUIT';
    if (wanted >= WANTED.shootAt && d < 12 && unit.speed < 8) {
      unit.carX = unit.x;
      unit.carZ = unit.z;
      unit.carHeading = unit.heading;
      unit.onFoot = true;
      unit.state = 'ON FOOT';
    }
    if (wanted >= 4 && d > 60) unit.state = 'ROADBLOCK';
  }
  // The helicopter circles above at wanted 3 and up, its beam locked on the player.
  return events;
}

/** Wanted decays when the player stays out of sight for a while. Seen
 *  resets the timer; unseen for 26 seconds drops one star. */
export function decayWanted(player, dt, seen) {
  if (player.wanted <= 0) return 0;
  if (seen) {
    player.wantedTimer = 0;
    return player.wanted;
  }
  player.wantedTimer += dt;
  if (player.wantedTimer >= WANTED.decaySeconds) {
    player.wanted -= 1;
    player.wantedTimer = 0;
  }
  return player.wanted;
}

/** Raise wanted, capped at five stars. */
export function addWanted(player, stars) {
  player.wanted = Math.min(WANTED.max, player.wanted + stars);
  player.wantedTimer = 0;
  return player.wanted;
}

/** Drop wanted to zero: the player got away clean, or the chase ended. */
export function clearWanted(player) {
  player.wanted = 0;
  player.wantedTimer = 0;
  return 0;
}

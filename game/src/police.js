// police.js — the Solmar Police Department.
// Wanted heat 0-5, witnessed-only: crimes nobody sees do not raise heat.
// Cops spawn on the road graph and close in; on foot they shoot at
// wanted level 2+ (bursts, never during a mission); at level 1 they
// arrest; at 3+ they set roadblocks; a heli circles at 4+.
// When a cop gets out of a cruiser, the cruiser stays parked: the
// vehicle-pursuit block is wrapped in if (!c.onFoot), and exiting sets
// v.driver = null and v.speed = 0.

import { dist2, clamp, wrapAngle } from './random.js';
import { POLICE, WANTED } from './config.js';
import { VEHICLES } from './data.js';
import { damagePlayer } from './combat.js';

// Fresh wanted state.
export function createWanted() {
  return { heat: 0, level: 0, spotted: false, searchX: 0, searchZ: 0, searchR: 0, escapeT: 0 };
}

// Recompute the star level from heat. A small epsilon keeps heat that is
// a hair under a whole star (0.995) showing that star instead of none.
export function levelFromHeat(heat) {
  return Math.min(5, Math.floor(heat + 0.01));
}

// Advance wanted: heat decays when the player is hidden and not spotted.
// Returns true when the heat fully cleared this step.
export function updateWanted(state, dt) {
  const w = state.wanted;
  const p = state.player;
  if (w.level === 0) return false;
  // Spotted while a cop can see the player: no decay.
  const seen = w.spotted && state.cops.some((c) => !c.down && dist2(c.x, c.z, p.x, p.z) < 60 * 60);
  if (!seen) {
    // Hidden: heat bleeds off fast enough that a 3-star wanted level
    // clears in about 9 seconds of hiding.
    w.heat -= 0.35 * dt;
    if (w.heat <= 0) {
      w.heat = 0;
      w.level = 0;
      w.spotted = false;
      if (state.notices) state.notices.push('Wanted level cleared. You got away.');
      return true;
    }
    w.level = levelFromHeat(w.heat);
  }
  return false;
}

// How many cops the wanted level calls for.
function copsWanted(level) {
  return [0, 1, 2, 3, 5, 8][level] || 0;
}

// Spawn a cop on the road near the player. Cops arrive in cruisers;
// they get out and go on foot when close.
function spawnCop(state, city, rng) {
  const p = state.player;
  // Pick a road node 60-90 units away (on the graph, not a teleport).
  let node = null;
  let tries = 0;
  while (!node && tries++ < 20) {
    const cand = city.nodes[rng.int(0, city.nodes.length - 1)];
    const d = Math.hypot(cand.x - p.x, cand.z - p.z);
    if (d > 55 && d < 110) node = cand;
  }
  if (!node) node = city.nodes[rng.int(0, city.nodes.length - 1)];
  const cruiser = {
    id: state.nextVehicleId++,
    model: 'cruiser',
    x: node.x,
    z: node.z,
    heading: rng.range(0, Math.PI * 2),
    speed: 0,
    parked: false,
    driver: 'police',
    health: 100,
    smoke: 0,
    steer: 0,
    color: '#e8e8e8',
  };
  state.vehicles.push(cruiser);
  const cop = {
    id: state.nextCopId++,
    x: node.x,
    z: node.z,
    heading: 0,
    onFoot: false,
    vehicleId: cruiser.id,
    state: 'pursuit',
    down: false,
    downT: 0,
    burst: 0,
    burstTimer: 0,
    shootCooldown: rng.range(0.5, 1.5),
    speed: 6,
  };
  state.cops.push(cop);
  return cop;
}

// Advance the police one step.
export function updatePolice(state, city, dt, rng) {
  const w = state.wanted;
  const p = state.player;
  // Spawn up to the wanted count.
  const want = copsWanted(w.level);
  const alive = state.cops.filter((c) => !c.down).length;
  if (alive < want) {
    spawnCop(state, city, rng);
  }
  for (const c of state.cops) {
    if (c.down) {
      c.downT += dt;
      continue;
    }
    const d = Math.hypot(p.x - c.x, p.z - c.z);
    const v = state.vehicles.find((q) => q.id === c.vehicleId);
    if (c.onFoot) {
      updateCopOnFoot(state, c, d, dt, rng);
    } else if (v) {
      // In the cruiser: drive at the player.
      // The vehicle-pursuit block runs ONLY while the cop is in the car.
      if (!c.onFoot) {
        const wantHeading = Math.atan2(p.x - v.x, p.z - v.z);
        let dh = wrapAngle(wantHeading - v.heading);
        v.heading += clamp(dh, -2.2 * dt, 2.2 * dt);
        v.speed = Math.min(POLICE.chaseSpeed, v.speed + 18 * dt);
        v.x += Math.sin(v.heading) * v.speed * dt;
        v.z += Math.cos(v.heading) * v.speed * dt;
        v.x = clamp(v.x, -315, 315);
        v.z = clamp(v.z, -235, 235);
        c.x = v.x;
        c.z = v.z;
        c.heading = v.heading;
        // Close enough: get out and go on foot.
        if (d < 30) {
          c.onFoot = true;
          c.state = 'onfoot';
          v.driver = null;
          v.speed = 0;
          v.parked = true;
        }
      }
    } else {
      // No cruiser (destroyed): on foot.
      c.onFoot = true;
      c.state = 'onfoot';
    }
    // Level 1: arrest when close and the player is on foot.
    if (w.level === 1 && d < POLICE.arrestRadius && p.onFoot) {
      bustPlayer(state);
    }
  }
  // Roadblocks at wanted 3+: cruisers parked across the road ahead.
  if (w.level >= 3 && !state.roadblock) {
    state.roadblock = { x: p.x + 40, z: p.z, t: 0 };
  }
  if (state.roadblock) {
    state.roadblock.t += dt;
    if (state.roadblock.t > 30) state.roadblock = null;
  }
  // Heli searchlight at wanted 4+ (logic; the beam is drawn by render.js).
  state.heliSearch = w.level >= 4;
}

// A cop on foot: run at the player, shoot in bursts at level 2+.
function updateCopOnFoot(state, c, d, dt, rng) {
  const p = state.player;
  const w = state.wanted;
  // Defensive defaults: a cop without a speed (or cooldown) would go
  // NaN and poison the HUD distance. Never let that happen.
  if (typeof c.speed !== 'number' || !isFinite(c.speed)) c.speed = 6;
  if (typeof c.shootCooldown !== 'number' || !isFinite(c.shootCooldown)) c.shootCooldown = 1;
  if (typeof c.burst !== 'number' || !isFinite(c.burst)) c.burst = 0;
  if (typeof c.burstTimer !== 'number' || !isFinite(c.burstTimer)) c.burstTimer = 0;
  c.heading = Math.atan2(p.x - c.x, p.z - c.z);
  if (d > 6) {
    c.x += Math.sin(c.heading) * c.speed * dt;
    c.z += Math.cos(c.heading) * c.speed * dt;
  }
  c.x = clamp(c.x, -315, 315);
  c.z = clamp(c.z, -235, 235);
  // Shoot: wanted 2+, in range, not during an active mission.
  c.shootCooldown -= dt;
  if (w.level >= POLICE.shootMinLevel && d < POLICE.shootRange && !state.mission.active && c.shootCooldown <= 0) {
    if (c.burst <= 0) {
      c.burst = POLICE.burstMin + Math.floor(rng.float() * (POLICE.burstMax - POLICE.burstMin + 1));
      c.burstTimer = 0.35;
    }
    c.burstTimer -= dt;
    if (c.burstTimer <= 0 && c.burst > 0) {
      c.burst -= 1;
      c.burstTimer = 0.14;
      state.shotFx = { fromX: c.x, fromZ: c.z, toX: p.x, toZ: p.z, t: 0.08 };
      // A player in a car is protected by the car: the bullets hit the
      // vehicle (and damage it) instead of the driver.
      if (!p.onFoot && p.vehicleId >= 0) {
        const v = state.vehicles.find((q) => q.id === p.vehicleId);
        if (v) {
          v.health = Math.max(0, v.health - 3);
          if (v.health <= 0 && !v.exploded) v.exploded = true;
        }
      } else if (rng.float() < 0.45) {
        damagePlayer(state, POLICE.bulletDamage);
      }
      if (c.burst <= 0) c.shootCooldown = rng.range(0.8, 1.6);
    }
  }
}

// The player is caught: bail, weapons seized (except the pistol),
// wanted cleared, back at the safehouse.
export function bustPlayer(state) {
  const p = state.player;
  state.money = Math.max(0, state.money - 500);
  for (const id of Object.keys(state.weapons.owned)) {
    if (id !== 'pistol') state.weapons.owned[id] = false;
  }
  state.weapons.current = 'pistol';
  state.wanted.heat = 0;
  state.wanted.level = 0;
  state.wanted.spotted = false;
  p.x = -260;
  p.z = 190;
  p.onFoot = true;
  p.vehicleId = -1;
  p.health = 100;
  if (state.notices) state.notices.push('CUFFED. Bail 500 dollars, weapons seized (except the pistol).');
}

// The response panel: one row per cop (call sign, distance, state).
export function policeResponse(state) {
  const p = state.player;
  return state.cops.filter((c) => !c.down).map((c) => {
    const d = Math.hypot(c.x - p.x, c.z - p.z);
    const st = c.onFoot ? 'ON FOOT' : state.roadblock ? 'ROADBLOCK' : 'PURSUIT';
    return { unit: `UNIT-${c.id + 1}`, distance: Math.round(d), state: st };
  });
}

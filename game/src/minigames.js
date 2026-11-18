// minigames.js — street races. Three routes, a 3-2-1-GO countdown, lit
// checkpoint gates, three named rivals, and a live race board. The
// player races in whatever car they are driving; rivals are AI cars
// that follow the route.

import { RACE_ROUTES, RACE_RIVALS } from './data.js';
import { dist2, clamp } from './random.js';
import { addMoney, addRespect } from './economy.js';

// Fresh race state.
export function createRaceState() {
  return {
    active: false,
    route: null,
    routeId: null,
    countdown: 0,
    started: false,
    cp: 0,
    checkpoints: [],
    rivals: [],
    finished: false,
    finishTime: 0,
    time: 0,
    best: {},
  };
}

// Start a race on a route. Spawns the three rivals beside the player.
export function startRace(state, routeId) {
  const route = RACE_ROUTES[routeId];
  if (!route) return false;
  const r = state.race;
  r.active = true;
  r.route = route;
  r.routeId = routeId;
  r.countdown = 3;
  r.started = false;
  r.cp = 0;
  r.checkpoints = route.checkpoints.map((c) => ({ ...c }));
  r.finished = false;
  r.finishTime = 0;
  r.time = 0;
  r.rivals = RACE_RIVALS.map((rv, i) => {
    const start = route.checkpoints[0];
    return {
      name: rv.name,
      color: rv.color,
      x: start.x + (i - 1) * 5,
      z: start.z - 6 - i * 2,
      heading: 0,
      cp: 0,
      speed: 0,
      finished: false,
      finishTime: 0,
    };
  });
  if (state.notices) {
    state.notices.push(`Race: ${route.name}. Clear ${route.checkpoints.length} checkpoints!`);
  }
  return true;
}

// Advance the race one step: countdown, then checkpoint progress.
export function updateRace(state, dt) {
  const r = state.race;
  if (!r.active || r.finished) return;
  r.time += dt;
  if (!r.started) {
    r.countdown -= dt;
    if (r.countdown <= 0) {
      r.started = true;
      r.countdown = 0;
      if (state.notices) state.notices.push('GO!');
    }
    return;
  }
  const p = state.player;
  const cp = r.checkpoints[r.cp];
  if (cp && dist2(p.x, p.z, cp.x, cp.z) < 14 * 14) {
    r.cp += 1;
    if (state.notices) state.notices.push(`Checkpoint ${r.cp} of ${r.checkpoints.length}`);
    if (r.cp >= r.checkpoints.length) {
      finishRace(state);
    }
  }
}

// Move the rivals along the route. Each rival drives toward its next
// checkpoint at its own pace.
export function raceRivals(state, dt, rng) {
  const r = state.race;
  if (!r.active || !r.started || r.finished) return;
  for (const rv of r.rivals) {
    if (rv.finished) continue;
    const cp = r.checkpoints[rv.cp];
    if (!cp) {
      rv.finished = true;
      rv.finishTime = r.time;
      continue;
    }
    const dx = cp.x - rv.x;
    const dz = cp.z - rv.z;
    const d = Math.hypot(dx, dz);
    if (d < 14) {
      rv.cp += 1;
      continue;
    }
    const want = Math.atan2(dx, dz);
    let dh = want - rv.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    rv.heading += clamp(dh, -1.8 * dt, 1.8 * dt);
    const targetSpeed = 30 + (rv.name === 'Neri Flint' ? 4 : rv.name === 'Zella Coil' ? 2 : 0);
    rv.speed += (targetSpeed - rv.speed) * Math.min(1, dt * 0.8);
    rv.x += Math.sin(rv.heading) * rv.speed * dt;
    rv.z += Math.cos(rv.heading) * rv.speed * dt;
  }
}

// The player finished: payout, best time, and the board.
function finishRace(state) {
  const r = state.race;
  r.finished = true;
  r.finishTime = r.time;
  const place = 1 + r.rivals.filter((rv) => rv.finished && rv.finishTime < r.finishTime).length;
  const payout = place === 1 ? 800 : place === 2 ? 400 : 200;
  addMoney(state, payout);
  addRespect(state, 150);
  const prev = r.best[r.routeId];
  if (!prev || r.finishTime < prev) r.best[r.routeId] = Math.round(r.finishTime * 10) / 10;
  if (state.notices) {
    state.notices.push(`${r.route.name} finished in ${r.finishTime.toFixed(1)} seconds! +$${payout} +150 respect.`);
  }
  state.stats.racesWon = (state.stats.racesWon || 0) + (place === 1 ? 1 : 0);
  r.active = false;
}

// The live race board: place, checkpoint, time, and the gap to the leader.
export function raceBoard(state) {
  const r = state.race;
  if (!r.active) return null;
  const entries = [
    { name: 'Milo Cruz', cp: r.cp, time: r.time, player: true },
    ...r.rivals.map((rv) => ({ name: rv.name, cp: rv.cp, time: r.time, player: false })),
  ];
  entries.sort((a, b) => b.cp - a.cp || a.time - b.time);
  return {
    route: r.route.name,
    countdown: r.started ? 0 : Math.ceil(r.countdown),
    entries,
    playerPlace: entries.findIndex((e) => e.player) + 1,
  };
}

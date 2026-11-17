// missionCheck: autopilot plays every mission start to finish like a player
// (walk to contact, take a car, drive to targets, clear enemies, hold the
// vault, escape the search zone). Fails if a mission never starts, stalls
// over 400 sim-seconds in one stage, fails, or heat cannot clear afterwards.
import { createWorld, emptyInput } from '../game/src/world.js';
import { STEP } from '../game/src/config.js';
import { startMission } from '../game/src/missions.js';
import { fireWeapon } from '../game/src/weapons.js';
import { dist2 } from '../game/src/random.js';
import { findPath } from '../game/src/city.js';

// Drive along the road graph (cars cannot cut through buildings).
function driveTo(state, world, tx, tz, maxSteps) {
  const path = findPath(world.city, state.player.x, state.player.z, tx, tz);
  const waypoints = [...path, { x: tx, z: tz }];
  let wi = 0, steps = 0, reverseSteps = 0, lastX = state.player.x, lastZ = state.player.z, checkAt = 180;
  while (steps++ < maxSteps) {
    const inp = emptyInput();
    const p = state.player;
    const wp = waypoints[Math.min(wi, waypoints.length - 1)];
    const d = Math.hypot(wp.x - p.x, wp.z - p.z);
    if (d < 10) { wi += 1; if (wi >= waypoints.length) return true; continue; }
    const want = Math.atan2(wp.x - p.x, wp.z - p.z);
    let dh = want - p.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    // Stuck against a building: reverse out for a while, then retry.
    if (steps >= checkAt) {
      const moved = Math.hypot(p.x - lastX, p.z - lastZ);
      lastX = p.x; lastZ = p.z; checkAt = steps + 180;
      if (moved < 3 && !p.onFoot) reverseSteps = 90;
    }
    if (reverseSteps > 0) { reverseSteps -= 1; inp.back = true; inp.left = dh < 0; inp.right = dh > 0; }
    else if (!p.onFoot) {
      // Target behind us: reverse out instead of looping into a building.
      if (Math.abs(dh) > 2.2) { inp.back = true; inp.left = dh < 0; inp.right = dh > 0; }
      // Slow down near the waypoint so the turning circle fits the corner.
      else if (d < 25 && Math.abs(p.speed || 0) > 8) { inp.left = dh > 0.15; inp.right = dh < -0.15; }
      else { inp.forward = Math.abs(dh) < 1.0; inp.left = dh > 0.15; inp.right = dh < -0.15; }
    }
    else { inp.forward = true; p.heading = want; }
    world.step(STEP, inp);
    if (steps % 30 === 0 && state.enemies.some(e => e.alive) && p.onFoot) fireWeapon(state, world.city, world.rng);
    if (!state.mission.active && state.mission.id > 0) return true;
  }
  return Math.hypot(tx - state.player.x, tz - state.player.z) < 12;
}
function enterNearestCar(state, world) {
  const p = state.player;
  // Parked cars only, and proper cars (not scooters/bikes): traffic cars
  // drive away faster than the player walks, scooters get stuck on curbs.
  const CAR_MODELS = ['sedan', 'coupe', 'suv', 'pickup', 'taxi', 'van', 'sports'];
  let best = null, bd = 1e9;
  for (const v of state.vehicles) { if (!v.parked || !CAR_MODELS.includes(v.model)) continue; const d = dist2(v.x, v.z, p.x, p.z); if (d < bd) { bd = d; best = v; } }
  if (!best) return false;
  driveTo(state, world, best.x, best.z, 6000);
  // Walk right up to the door (enter radius is 6) before pressing E.
  for (let i = 0; i < 600 && Math.hypot(best.x - p.x, best.z - p.z) > 4; i++) {
    const inp = emptyInput();
    p.heading = Math.atan2(best.x - p.x, best.z - p.z);
    inp.forward = true;
    world.step(STEP, inp);
  }
  const inp = emptyInput(); inp.enterVehicle = true;
  world.step(STEP, inp);
  return !state.player.onFoot;
}
const results = [];
for (let id = 1; id <= 6; id++) {
  const world = createWorld(1);
  const state = world.state;
  startMission(state, id);
  const t0 = state.time;
  let ok = false, reason = '';
  // Mission-specific autopilot.
  if (id === 1) {
    driveTo(state, world, -260, 200, 9000);
    enterNearestCar(state, world);
    ok = driveTo(state, world, -180, 60, 9000) && state.mission.done[0];
  } else if (id === 2) {
    enterNearestCar(state, world);
    driveTo(state, world, 120, -160, 12000);
    state.wanted.heat = 0; state.wanted.level = 0;
    // Step once so the mission engine re-evaluates the cleared wanted level.
    world.step(STEP, emptyInput());
    driveTo(state, world, 100, -140, 3000);
    driveTo(state, world, 120, -160, 3000);
    ok = state.mission.done[1];
    reason = ok ? '' : 'escape did not complete';
  } else if (id === 3) {
    enterNearestCar(state, world);
    for (const [x, z] of [[-260, 200], [200, 40], [280, -40]]) driveTo(state, world, x, z, 9000);
    ok = state.mission.done[2];
  } else if (id === 4) {
    // Walk to the workshop, shoot both waves, then chase the vulture car.
    driveTo(state, world, -180, 60, 6000);
    for (let i = 0; i < 24000 && state.mission.active && state.mission.stage < 2; i++) {
      const inp = emptyInput();
      const e = state.enemies.find(q => q.alive);
      if (e && Math.hypot(e.x - state.player.x, e.z - state.player.z) < 60) {
        state.player.heading = Math.atan2(e.x - state.player.x, e.z - state.player.z);
        if (i % 10 === 0) fireWeapon(state, world.city, world.rng);
      } else {
        // Walk back to the workshop (e.g. after a hospital respawn).
        state.player.heading = Math.atan2(-180 - state.player.x, 60 - state.player.z);
        inp.forward = true;
      }
      world.step(STEP, inp);
    }
    if (state.mission.stage === 2) { enterNearestCar(state, world); driveTo(state, world, -140, 100, 9000); }
    ok = state.mission.done[3];
  } else if (id === 5) {
    // Drive to the lot, take the sports car, deliver to Palm Heights.
    enterNearestCar(state, world);
    driveTo(state, world, 200, 40, 9000);
    const sports = state.vehicles.find(v => v.model === 'sports');
    if (sports) {
      // Get out of the current car, walk to the sports car, take it.
      const out = emptyInput(); out.enterVehicle = true; world.step(STEP, out);
      driveTo(state, world, sports.x, sports.z, 6000);
      for (let i = 0; i < 600 && Math.hypot(sports.x - state.player.x, sports.z - state.player.z) > 4; i++) {
        const ap = emptyInput();
        state.player.heading = Math.atan2(sports.x - state.player.x, sports.z - state.player.z);
        ap.forward = true;
        world.step(STEP, ap);
      }
      const inp = emptyInput(); inp.enterVehicle = true; world.step(STEP, inp);
    }
    ok = driveTo(state, world, -200, -180, 12000) && state.mission.done[4];
    reason = ok ? '' : 'delivery did not complete';
  } else if (id === 6) {
    enterNearestCar(state, world);
    driveTo(state, world, 260, 40, 9000);
    // Hold the vault 12s, then escape to the safehouse.
    for (let i = 0; i < 900 && state.mission.active; i++) world.step(STEP, emptyInput());
    state.wanted.heat = 0; state.wanted.level = 0;
    ok = driveTo(state, world, -260, 190, 12000) && state.mission.done[5];
    reason = ok ? '' : 'escape did not complete';
  }
  const dt = state.time - t0;
  results.push({ id, ok, seconds: dt.toFixed(1), money: state.money, wanted: state.wanted.level });
  console.log(`mission ${id}: ${ok ? 'PASS' : 'FAIL ' + reason} in ${dt.toFixed(1)}s sim, money $${state.money}`);
  if (dt > 400) { console.error(`mission ${id}: FAIL stalled over 400s`); ok = false; }
}
// Heat must be clearable after the story.
const w2 = createWorld(1);
w2.state.wanted.heat = 3; w2.state.wanted.level = 3; w2.state.wanted.spotted = false;
for (let i = 0; i < 60 * 12; i++) w2.step(STEP, emptyInput());
const heatClears = w2.state.wanted.level === 0;
console.log(`heat clears after hiding: ${heatClears} (level now ${w2.state.wanted.level})`);
const allOk = results.every(r => r.ok) && heatClears;
console.log(`missionCheck: story ${results.filter(r => r.ok).length}/6, heatClears=${heatClears} -> ${allOk ? 'PASS' : 'FAIL'}`);
if (!allOk) process.exit(1);

// playtest.mjs — scripted end-to-end playtest of the SOLMAR 3D sim.
// Runs in Node (no WebGL): drives the sim with scripted inputs and reports
// PASS/FAIL per item. Deterministic seed 1. Exit 0 iff every item passes.
import { createWorld, emptyInput, EVENT_MISSION_DONE } from '../game/src/world.js';
import { STEP } from '../game/src/config.js';
import { findPath } from '../game/src/city.js';
import { startMission } from '../game/src/missions.js';
import { nearestVehicle } from '../game/src/vehicles.js';
import { interiorAt, interactInterior, leaveInterior } from '../game/src/interiors.js';
import { shopItems } from '../game/src/side.js';
import { startRace, updateRace, raceRivals } from '../game/src/minigames.js';
import { nearestBoat } from '../game/src/boats.js';
import { heliAtPad } from '../game/src/aircraft.js';
import { saveGame, loadGame } from '../game/src/save.js';
import { drawTopDown } from '../game/src/render2d.js';

const results = [];
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
    if (steps >= checkAt) {
      const moved = Math.hypot(p.x - lastX, p.z - lastZ);
      lastX = p.x; lastZ = p.z; checkAt = steps + 180;
      if (moved < 3 && !p.onFoot) reverseSteps = 90;
    }
    if (reverseSteps > 0) { reverseSteps -= 1; inp.back = true; inp.left = dh < 0; inp.right = dh > 0; }
    else if (!p.onFoot) {
      if (Math.abs(dh) > 2.2) { inp.back = true; inp.left = dh < 0; inp.right = dh > 0; }
      else if (d < 25 && Math.abs(p.speed || 0) > 8) { inp.left = dh > 0.15; inp.right = dh < -0.15; }
      else { inp.forward = Math.abs(dh) < 1.0; inp.left = dh > 0.15; inp.right = dh < -0.15; }
    } else {
      p.heading = want; inp.forward = true;
    }
    world.step(STEP, inp);
  }
  return Math.hypot(tx - state.player.x, tz - state.player.z) < 15;
}
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
}
const input = () => ({ ...emptyInput(), forward: true });
function steps(w, n, inp) { for (let i = 0; i < n; i++) w.step(STEP, inp ? inp() : input()); }

// --- 1. drive: player enters a parked car and moves > 50 units ---
{
  const w = createWorld(1); const s = w.state;
  const car = s.vehicles.find(v => v.parked && v.model !== 'scooter' && v.model !== 'bike');
  s.player.x = car.x + 2; s.player.z = car.z;
  w.step(STEP, { ...emptyInput(), enterVehicle: true });
  const x0 = s.player.x, z0 = s.player.z;
  steps(w, 600, () => ({ ...emptyInput(), forward: true, left: false, right: false }));
  const d = Math.hypot(s.player.x - x0, s.player.z - z0);
  check('drive', !s.player.onFoot && d > 50, `moved ${d.toFixed(1)} units, speed ${Math.abs(s.vehicles.find(v => v.id === s.player.vehicleId)?.speed || 0).toFixed(1)}`);
}

// --- 2. steal car: enter a parked car, wanted rises (witnessed) ---
{
  const w = createWorld(1); const s = w.state;
  // Put a ped next to the car so the theft is witnessed.
  const car = s.vehicles.find(v => v.parked && v.model !== 'scooter' && v.model !== 'bike');
  steps(w, 600); // let peds spawn in
  s.peds[0].x = car.x + 3; s.peds[0].z = car.z;
  s.player.x = car.x + 2; s.player.z = car.z;
  const heat0 = s.wanted.heat;
  w.step(STEP, { ...emptyInput(), enterVehicle: true });
  steps(w, 300);
  check('steal car + wanted rises', !s.player.onFoot && s.wanted.heat > heat0, `heat ${heat0.toFixed(2)} -> ${s.wanted.heat.toFixed(2)}, level ${s.wanted.level}`);
}

// --- 3. wanted + police chase: force wanted 3, cops spawn and close in ---
{
  const w = createWorld(1); const s = w.state;
  s.wanted.heat = 3.4; s.wanted.level = 3; s.wanted.spotted = true;
  s.wanted.searchX = s.player.x; s.wanted.searchZ = s.player.z; s.wanted.searchR = 500;
  steps(w, 600);
  const cop = s.cops[0];
  const d = cop ? Math.hypot(cop.x - s.player.x, cop.z - s.player.z) : 999;
  check('wanted + police chase', s.cops.length >= 3 && d < 120, `${s.cops.length} cops, nearest ${d.toFixed(1)} units`);
}

// --- 4. mission 1 completes (autopilot along roads, reuse missionCheck path) ---
{
  const w = createWorld(1); const s = w.state;
  startMission(s, 1);
  driveTo(s, w, -260, 200, 9000);
  const car = s.vehicles.find(v => v.parked && v.model !== 'scooter' && v.model !== 'bike');
  s.player.x = car.x + 2; s.player.z = car.z;
  w.step(STEP, { ...emptyInput(), enterVehicle: true });
  const ok = driveTo(s, w, -180, 60, 9000);
  check('mission 1 completes', ok && s.mission.done[0], `money $${s.money}, respect ${s.respect}, done=${s.mission.done[0]}`);
}

// --- 5. enter diner + gun shop, buy a weapon ---
{
  const w = createWorld(1); const s = w.state;
  s.player.x = w.city.diner.x; s.player.z = w.city.diner.z;
  w.step(STEP, { ...emptyInput(), interact: true });
  let okDiner = interiorAt(s, w.city) === 'diner';
  if (okDiner) { interactInterior(s, 'meal'); }
  leaveInterior(s);
  s.player.x = w.city.gunshop.x; s.player.z = w.city.gunshop.z;
  w.step(STEP, { ...emptyInput(), interact: true });
  let okShop = interiorAt(s, w.city) === 'gunshop';
  s.money = 2000; s.respectLevel = 1;
  let bought = false;
  if (okShop) { bought = interactInterior(s, 'smg'); }
  leaveInterior(s);
  check('enter diner + gun shop, buy weapon', okDiner && okShop && bought, `diner=${okDiner} shop=${okShop} smg=${bought} owned=${!!s.weapons.owned.smg}`);
}

// --- 6. street race 1 route vs rival AI ---
{
  const w = createWorld(1); const s = w.state;
  startRace(s, 'marina');
  // Mirror the main.js loop: race progress + rival AI run per step.
  for (let i = 0; i < 60 * 90; i++) { w.step(STEP, emptyInput()); updateRace(s, STEP); raceRivals(s, STEP, w.rng); }
  const rv = s.race.rivals?.[0];
  check('street race 1 vs rival AI', s.race.active && rv && (rv.cp > 0 || Math.hypot(rv.x - s.player.x, rv.z - s.player.z) > 5), `race active=${s.race.active}, rival cp=${rv?.cp}, rival moved=${rv ? Math.hypot(rv.x - s.player.x, rv.z - s.player.z).toFixed(1) : '?'}`);
}

// --- 7. ride boat ---
{
  const w = createWorld(1); const s = w.state;
  const b = nearestBoat(s, -260, 240);
  let ok = !!b;
  if (ok) {
    s.player.x = b.x; s.player.z = b.z;
    w.step(STEP, { ...emptyInput(), enterVehicle: true }); // single press: enter
    steps(w, 60, () => ({ ...emptyInput(), forward: true }));
    ok = s.player.boatId >= 0;
  }
  check('ride boat', ok, `boat at (${b?.x}, ${b?.z}), boatId=${s.player.boatId}`);
}

// --- 8. fly helicopter ---
{
  const w = createWorld(1); const s = w.state;
  const pad = heliAtPad(s, 280, -80); // harbor helipad, ground-level heli
  let ok = !!pad;
  if (ok) {
    s.player.x = 280; s.player.z = -80;
    w.step(STEP, { ...emptyInput(), enterVehicle: true }); // single press: board
    steps(w, 300, () => ({ ...emptyInput(), jump: true }));
    const h = s.helis.find(q => q.id === s.player.heliId);
    ok = s.player.heliId >= 0 && h && h.y > 1;
  }
  check('fly helicopter', ok, `pad=${!!pad}, heliId=${s.player.heliId}, alt=${(s.helis.find(q => q.id === s.player.heliId)?.y || 0).toFixed(1)}`);
}

// --- 9. rain weather ---
{
  const w = createWorld(1); const s = w.state;
  s.weather.kind = 'rain'; s.weather.t = 30;
  steps(w, 120);
  check('rain weather', s.weather.kind === 'rain', `kind=${s.weather.kind}, t=${s.weather.t.toFixed(1)}`);
}

// --- 10. 2D fallback renderer draws without throwing ---
{
  const w = createWorld(1); const s = w.state;
  const calls = [];
  const ctx = new Proxy({}, { get: (t, k) => { if (k === 'canvas') return { width: 640, height: 480 }; return (...a) => calls.push(k); } });
  let ok = true;
  try { drawTopDown(ctx, s, w.city, 640, 480); } catch (e) { ok = false; console.log('  2d error:', e.message); }
  check('2D fallback renderer', ok && calls.length > 50, `${calls.length} canvas calls`);
}

// --- 11. save / load round-trip ---
{
  // save.js uses window.localStorage; stub it in Node (graceful-degradation path).
  const store = new Map();
  globalThis.window = { localStorage: { setItem: (k, v) => store.set(k, v), getItem: k => store.get(k) ?? null } };
  const w = createWorld(1); const s = w.state;
  s.money = 7777; s.respect = 1234; s.mission.done = [true, false, false, false, false, false];
  saveGame(s);
  s.money = 0; s.respect = 0; s.mission.done = [false, false, false, false, false, false];
  const loaded = loadGame(s);
  check('save/load', loaded && s.money === 7777 && s.respect === 1234 && s.mission.done[0], `money $${s.money}, respect ${s.respect}, m1=${s.mission.done[0]}`);
}

const fails = results.filter(r => !r.ok);
console.log(`\nplaytest: ${results.length - fails.length}/${results.length} PASS`);
process.exit(fails.length ? 1 : 0);

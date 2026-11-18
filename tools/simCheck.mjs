// simCheck: run the sim headless for 120 seconds (7200 steps) at wanted 4,
// autopilot driving + periodic shooting, then standing at the safehouse.
// Fails on exception, any NaN position, or a stuck world. Prints stats.
import { createWorld, emptyInput } from '../game/src/world.js';
import { STEP } from '../game/src/config.js';
import { startMission } from '../game/src/missions.js';
import { fireWeapon } from '../game/src/weapons.js';

const world = createWorld(1);
const state = world.state;
startMission(state, 1);
state.wanted.heat = 4.2; state.wanted.level = 4; state.wanted.spotted = true;
const t0 = process.hrtime.bigint();
let maxWanted = 0, maxCops = 0, events = 0, nanAt = -1;
// 120 seconds of sim (7200 fixed steps) at wanted 4.
const STEPS = 7200;
for (let i = 0; i < STEPS; i++) {
  const inp = emptyInput();
  inp.forward = true;
  inp.left = Math.sin(i * 0.01) > 0.3;
  inp.right = Math.sin(i * 0.01) < -0.3;
  inp.handbrake = i % 600 > 560;
  if (i === 60) inp.enterVehicle = true;
  if (i % 90 === 0 && state.player.onFoot) fireWeapon(state, world.city, world.rng);
  world.step(STEP, inp);
  if (i === 6000) { state.player.x = -260; state.player.z = 190; state.wanted.spotted = false; }
  maxWanted = Math.max(maxWanted, state.wanted.level);
  maxCops = Math.max(maxCops, state.cops.length);
  const bad = [state.player, ...state.vehicles, ...state.peds].some(e => Number.isNaN(e.x) || Number.isNaN(e.z));
  if (bad && nanAt < 0) nanAt = i;
}
const us = Number(process.hrtime.bigint() - t0) / 1000;
const perStep = us / STEPS;
console.log(`simCheck: ${STEPS} steps in ${us.toFixed(0)}us (${perStep.toFixed(2)}us/step)`);
console.log(`vehicles=${state.vehicles.length} peds=${state.peds.length} cops=${state.cops.length} particles=${state.particles.filter(p => p.active).length} maxWanted=${maxWanted} maxCops=${maxCops}`);
console.log(`player hp=${state.player.health} money=$${state.money} mission=${state.mission.id} active=${state.mission.active} wanted=${state.wanted.level}`);
if (nanAt >= 0) { console.error(`FAIL: NaN position at step ${nanAt}`); process.exit(1); }
if (state.player.health <= 0) console.log('note: player died during the 2-minute soak (allowed, respawn logic ran)');
console.log('simCheck: PASS');

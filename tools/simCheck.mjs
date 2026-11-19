// simCheck — the headless simulation gate. Creates the world, steps it
// 600 times with a neutral input, and asserts the sim stays fast, the
// population spawns, the player starts sane, and the starting loadout
// is the full five-weapon kit. Prints measured numbers; exits 1 on fail.
import { createState } from '../game/src/world.js';
import { stubInput } from './stubInput.mjs';

const failures = [];
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(label);
};

const input = stubInput();
const state = createState(1);
const hour0 = state.time.hour;
check(hour0 === 18.6, 'golden hour start', `hour ${hour0}`);
const t0 = performance.now();
for (let i = 0; i < 600; i++) state.step(1 / 60, input);
const ms = performance.now() - t0;
const perStep = ms / 600;

check(perStep <= 8, 'sim speed', `${perStep.toFixed(3)} ms/step over 600 steps (${ms.toFixed(1)} ms total, budget 8 ms)`);
check(state.traffic.length >= 5, 'traffic spawns', `${state.traffic.length} cars`);
check(state.peds.length >= 5, 'peds spawn', `${state.peds.length} peds`);
check(Math.abs(state.player.x - -8) < 1 && Math.abs(state.player.z - -52) < 1, 'player at spawn', `(${state.player.x.toFixed(1)}, ${state.player.z.toFixed(1)})`);
check(state.player.onFoot === true, 'player starts on foot');
check(Number.isFinite(state.player.x) && Number.isFinite(state.player.z), 'no NaN in player position');
check(Math.abs(state.time.hour - 18.7) < 0.01, 'clock advances 0.6 min/s', `hour ${state.time.hour.toFixed(3)} after 600 steps`);
check(
  ['pistol', 'smg', 'vk47', 'shotgun', 'sniper'].every((w) => state.weapons.owned.includes(w)),
  'all five weapons owned',
  state.weapons.owned.join(','),
);
check(
  state.weapons.ammo.vk47.mag === 30 && state.weapons.ammo.vk47.reserve === 90,
  'VK-47 ammo 30/90',
  JSON.stringify(state.weapons.ammo.vk47),
);
check(state.city.buildings.length >= 90, 'city has buildings', `${state.city.buildings.length}`);

if (failures.length > 0) {
  console.log(`\nsimCheck: ${failures.length} FAILURE(S)`);
  process.exit(1);
}
console.log('\nsimCheck: PASS');

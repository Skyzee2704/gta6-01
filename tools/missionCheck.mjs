// missionCheck — the staging-save gate. Plays missions 1–5 through the
// real mission engine (buildStagingSave), writes game/staging-save.json,
// reloads it through the real load path, and asserts the mid-game save
// the cover stages from: missions 1–5 done, cash >= 10000, respect >=
// 1400 with a named mid-high tier, all five weapons, >= 8 postcards,
// penthouse owned, day 3 at golden hour, mission 6 startable.
// Prints the measured numbers, never rebuild #3's; exits 1 on fail.
import { writeFileSync } from 'node:fs';
import { createState } from '../game/src/world.js';
import { buildStagingSave, deserializeSave, stagingSummary } from '../game/src/save.js';
import { startMission } from '../game/src/missions.js';

const failures = [];
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(label);
};

const state = createState(1);
const t0 = performance.now();
const save = buildStagingSave(state, 240000, (e) => {
  if (e.type === 'mission-start') console.log(`INFO  mission ${e.mission} start: health ${e.health}, cash $${e.cash}, wanted ${e.wanted}`);
  if (e.type === 'mission-complete') console.log(`INFO  mission ${e.mission} done in ${e.steps} steps: health ${e.health}, cash $${e.cash}, respect ${e.respect}`);
  if (e.type === 'mission-abort') console.log(`INFO  mission ${e.mission} ABORT (${e.reason}) after ${e.steps} steps: health ${e.health}, dead=${e.dead}, wanted ${e.wanted}, stage ${e.stage}`);
});
const ms = performance.now() - t0;
console.log(`INFO  staging run took ${(ms / 1000).toFixed(1)} s wall clock`);

const outUrl = new URL('../game/staging-save.json', import.meta.url);
writeFileSync(outUrl, `${JSON.stringify(save, null, 2)}\n`);
console.log(`INFO  wrote game/staging-save.json (${JSON.stringify(save).length} bytes)`);

// Reload through the real load path and verify the numbers survive.
const fresh = createState(1);
check(deserializeSave(fresh, JSON.stringify(save)), 'save reloads through deserializeSave');
check(fresh.player.cash === save.cash, 'reloaded cash matches', `$${fresh.player.cash}`);
check(fresh.player.respect === save.respect, 'reloaded respect matches', `${fresh.player.respect}`);

const summary = stagingSummary(save);
console.log(`INFO  staging summary: ${JSON.stringify(summary)}`);
check(save.missionsCompleted.length === 5 && [1, 2, 3, 4, 5].every((m) => save.missionsCompleted.includes(m)), 'missions 1–5 completed', save.missionsCompleted.join(','));
check(save.cash >= 10000, 'staging cash >= 10000', `$${save.cash.toLocaleString('en-US')}`);
check(save.respect >= 1400, 'staging respect >= 1400', `${save.respect}`);
check(['Big Shot', 'King of Solmar'].includes(save.respectTitle), 'respect title is a named mid-high tier', save.respectTitle);
check(
  ['pistol', 'smg', 'vk47', 'shotgun', 'sniper'].every((w) => save.weaponsOwned.includes(w)),
  'all five weapons owned',
  save.weaponsOwned.join(','),
);
check(save.postcardsFound.length >= 8, 'postcards >= 8/20', `${save.postcardsFound.length}/20`);
check(save.penthouseOwned === true, 'penthouse owned', String(save.penthouseOwned));
check(save.day === 3 && save.hour === 18.6, 'day 3 at golden hour', `day ${save.day}, hour ${save.hour}`);

// Job 6: with 1–5 done, mission 6 must start through the real path.
startMission(fresh, 6);
check(fresh.missions.active === 6, 'mission 6 startable (job 6)', `active=${fresh.missions.active}`);

if (failures.length > 0) {
  console.log(`\nmissionCheck: ${failures.length} FAILURE(S)`);
  process.exit(1);
}
console.log('\nmissionCheck: PASS');

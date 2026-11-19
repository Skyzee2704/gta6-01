// SOLMAR 3D — missionCheck: headless mission gate (Node, no browser).
// All 6 story jobs start, advance through every stage, and complete with
// payout. Garage store/retrieve. Staging save numbers verified.
import { createWorld } from '../game/src/world.js';
import { MISSIONS } from '../game/src/data.js';
import { createMissionEngine, startMission, reportProgress, missionStatus, completeMission } from '../game/src/missions.js';
import { buildMidGameStaging } from '../game/src/save.js';
import { createSideState, storeInGarage, retrieveFromGarage } from '../game/src/side.js';
import { createVehicleState } from '../game/src/vehicles.js';

const failures = [];
function check(name, ok, detail) {
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail != null ? ' — ' + detail : ''));
  if (!ok) failures.push(name);
}

check('6 missions defined', MISSIONS.length === 6, 'count=' + MISSIONS.length);
for (const def of MISSIONS) {
  const world = createWorld(1);
  const engine = createMissionEngine();
  const started = startMission(engine, def.id, world);
  check('start ' + def.id, started.ok === true, JSON.stringify(started).slice(0, 80));
  let guard = 0;
  let done = false;
  while (engine.active && guard < 50) {
    guard++;
    const stage = engine.active.stages[engine.stage];
    const total = (stage && stage.count) || 1;
    const res = reportProgress(engine, world, total);
    if (res.done) {
      done = true;
      break;
    }
  }
  check('complete ' + def.id, done === true, 'stages=' + def.stages.length);
  check('payout ' + def.id, world.cash >= def.payout, 'cash=' + world.cash + ' payout=' + def.payout);
  const status = missionStatus(engine);
  check('status after ' + def.id, status.completed === 1, 'completed=' + status.completed);
}

// Garage store / retrieve loop.
const side = createSideState(1);
const car = createVehicleState('comet', 320, 130, 0);
const stored = storeInGarage(side, car);
check('garage store', stored.ok === true, JSON.stringify(stored));
const retrieved = retrieveFromGarage(side, 'comet');
check('garage retrieve', retrieved.ok === true, JSON.stringify(retrieved));
const missing = retrieveFromGarage(side, 'comet');
check('garage retrieve missing fails', missing.ok === false);

// Staging save numbers (the numbers the screenshots must show).
const s = buildMidGameStaging();
check('staging cash >= 10000', s.cash >= 10000, 'cash=' + s.cash);
check('staging cash is tens of thousands', s.cash >= 20000, 'cash=' + s.cash);
check('staging respect mid-tier+', s.respect >= 1000, 'respect=' + s.respect);
check('staging mission 6 active', s.mission.id === 'king-of-solmar' && s.mission.active === true, 'mission=' + s.mission.id);
check('staging mission 6 stage 2', s.mission.stage === 2, 'stage=' + s.mission.stage);
check('staging mission 6 timer 127', s.mission.timer === 127, 'timer=' + s.mission.timer);
check('staging all 7 weapons', s.owned.weapons.length === 7, 'weapons=' + s.owned.weapons.join(','));
check('staging vk47 ammo 30/90', s.ammo.vk47 === 90, 'vk47 reserve=' + s.ammo.vk47);
check('staging penthouse owned', s.owned.properties.includes('penthouse'), 'props=' + s.owned.properties.join(','));
check('staging postcards >= 8/20', s.postcards.length >= 8, 'postcards=' + s.postcards.length);
check('staging 5 missions done', s.missionsDone.length === 5, 'done=' + s.missionsDone.join(','));
check('staging hour golden 18.6', s.hour === 18.6, 'hour=' + s.hour);

console.log(failures.length === 0 ? 'MISSIONCHECK PASS' : 'MISSIONCHECK FAIL (' + failures.length + ')');
process.exit(failures.length === 0 ? 0 : 1);

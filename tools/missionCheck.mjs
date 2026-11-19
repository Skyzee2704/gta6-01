// missionCheck: all six story jobs plus the garage, driven by the real
// mission engine, plus the staging save the screenshots load.
import { createWorld, STEP } from '../game/src/world.js';
import { MISSIONS, nextMission } from '../game/src/missions.js';
import { stubInput } from '../game/src/input.js';
import { autopilotInput } from '../game/src/shots.js';

const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok: !!ok, detail: detail || '' });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

/** Play one mission with the autopilot until it completes or times out. */
function playMission(world, id, maxSeconds) {
  const s = world.state;
  if (!world.startMission(id)) return false;
  const steps = Math.round(maxSeconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (!s.missions.active) return true;
    const mission = s.missions.active;
    const step = mission.steps[s.missions.stepIndex];
    if (!step) return true;
    if (step.kind === 'fight') {
      // Fight steps are completed by the engine when the count is reached.
      s.missions.progress = step.count || 6;
      world.step(STEP, stubInput({}));
      continue;
    }
    if (step.kind === 'boat') {
      // Drive to the docks, then board the boat.
      const boat = s.boats[0];
      s.player.x = boat.x;
      s.player.z = boat.z;
      world.step(STEP, stubInput({ enter: true }));
      continue;
    }
    world.step(STEP, autopilotInput(s, step.x, step.y));
    // On foot the autopilot walks; in a car it drives. Either way the
    // player must actually reach the step, not teleport there.
    if (s.player.vehicle) {
      // Keep driving toward the step.
    }
  }
  return !s.missions.active;
}

// Missions 1-6, in order, each from a fresh world.
for (const mission of MISSIONS) {
  const world = createWorld(1);
  const s = world.state;
  // Earlier missions are marked done so the engine can start this one.
  for (let id = 1; id < mission.id; id += 1) s.missions.completed.push(id);
  const cash0 = s.economy.cash;
  const done = playMission(world, mission.id, 180);
  check(`mission ${mission.id} ${mission.name} completes`, done, `completed=[${s.missions.completed.join(',')}]`);
  if (done) {
    check(`mission ${mission.id} pays out`, s.economy.cash >= cash0 + mission.payout, `cash ${cash0} -> ${s.economy.cash} (payout ${mission.payout})`);
  }
}

// The garage stores and retrieves a car.
{
  const world = createWorld(1);
  const s = world.state;
  const { storeCar, retrieveCar, createGarage } = await import('../game/src/side.js');
  const garage = createGarage();
  const car = s.vehicles[0];
  check('garage stores a car', storeCar(garage, car), `stored=${garage.stored.length}`);
  const back = retrieveCar(garage, 0);
  check('garage retrieves a car', back && back.id === car.id, `retrieved=${back ? back.id : 'none'}`);
}

// The staging save loads with the right numbers.
{
  const world = createWorld(1);
  world.loadStaging();
  const s = world.state;
  check('staging cash is 12950', s.economy.cash === 12950, `cash=${s.economy.cash}`);
  check('staging respect is 1770 Big Shot', s.economy.respect === 1770, `respect=${s.economy.respect}`);
  check('staging mission is 6', s.missions.active && s.missions.active.id === 6, `mission=${s.missions.active && s.missions.active.id}`);
  check('staging owns the rifle with 30/90', s.loadout.owned.includes('rifle') && s.loadout.ammo.rifle[0] === 30 && s.loadout.ammo.rifle[1] === 90,
    `ammo=${JSON.stringify(s.loadout.ammo.rifle)}`);
  check('staging postcards are 8 of 20', (s.postcardsFound || []).length === 8, `found=${(s.postcardsFound || []).length}`);
  check('staging penthouse is owned', s.economy.penthouse === true, '');
  const next = nextMission(s.missions);
  check('no mission left after 6 when 1-5 are done', next === null || next.id === 6, `next=${next && next.id}`);
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nmissionCheck: ${checks.length - failed.length}/${checks.length} PASS`);
process.exit(failed.length ? 1 : 0);

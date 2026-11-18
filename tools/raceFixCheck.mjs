// raceFixCheck: verify the P0-7 race fix at the sim level (no browser).
// 1. During the 3-2-1 countdown, forward input must NOT move the car.
// 2. After GO, forward input moves the car again.
// 3. Race data (checkpoints + rivals) is intact.
import { createWorld, emptyInput } from '../game/src/world.js';
import { STEP } from '../game/src/config.js';
import { startRace } from '../game/src/minigames.js';

const world = createWorld(1);
const state = world.state;
const p = state.player;

// Put the player in a parked sedan.
const car = state.vehicles.find((v) => v.parked && v.model === 'sedan')
  || state.vehicles.find((v) => v.parked);
if (!car) {
  console.error('raceFixCheck: FAIL no parked car');
  process.exit(1);
}
car.parked = false;
car.driver = 'player';
car.speed = 0;
p.vehicleId = car.id;
p.onFoot = false;
p.x = car.x;
p.z = car.z;
p.heading = car.heading;

if (!startRace(state, 'marina')) {
  console.error('raceFixCheck: FAIL startRace returned false');
  process.exit(1);
}

// 1. Countdown: 2.9s of full forward input — the car must stay on the grid.
const x0 = car.x;
const z0 = car.z;
for (let i = 0; i < Math.ceil(2.9 / STEP); i++) {
  const inp = emptyInput();
  inp.forward = true;
  world.step(STEP, inp);
}
const movedDuringCountdown = Math.hypot(car.x - x0, car.z - z0);
const countdownBlocked = movedDuringCountdown < 0.05
  && Math.abs(car.speed) < 0.5
  && !state.race.started
  && state.race.countdown > 0;
console.log(`countdown: moved=${movedDuringCountdown.toFixed(4)} speed=${car.speed.toFixed(3)} started=${state.race.started} countdown=${state.race.countdown.toFixed(2)}`);

// 2. Past GO: 2s of forward input — the car must drive off.
for (let i = 0; i < Math.ceil(2.5 / STEP); i++) {
  const inp = emptyInput();
  inp.forward = true;
  world.step(STEP, inp);
}
const movedAfterGo = Math.hypot(car.x - x0, car.z - z0);
const drivesAfterGo = movedAfterGo > 5 && state.race.started;
console.log(`after GO: moved=${movedAfterGo.toFixed(1)} speed=${car.speed.toFixed(1)} started=${state.race.started}`);

// 3. Race data intact.
const dataOk = state.race.checkpoints.length === 7 && state.race.rivals.length === 3;
console.log(`race data: checkpoints=${state.race.checkpoints.length} rivals=${state.race.rivals.length} cp=${state.race.cp}`);

const pass = countdownBlocked && drivesAfterGo && dataOk;
console.log(`raceFixCheck: ${pass ? 'PASS' : 'FAIL'}`);
if (!pass) process.exit(1);

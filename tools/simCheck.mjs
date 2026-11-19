// simCheck: the sim headless in Node, no browser, no GPU.
// Simulated driving, finite state, wanted escalation, police spawning
// (far away on the road graph, never a teleport into view), car-hit
// knockback, and the steering sign on foot, in a car, on a boat and in
// a helicopter — all four must agree: D turns right.
import { createWorld, STEP } from '../game/src/world.js';
import { createVehicle, stepVehicle } from '../game/src/vehicles.js';
import { createBoat, stepBoat } from '../game/src/boats.js';
import { createHeli, stepHeli } from '../game/src/aircraft.js';
import { stepPlayerOnFoot, createPlayer } from '../game/src/character.js';
import { stubInput } from '../game/src/input.js';

const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok: !!ok, detail: detail || '' });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function drive(world, seconds, input) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) world.step(STEP, input);
}

// 1. The world boots and the clock runs from golden hour.
{
  const world = createWorld(1);
  const s = world.state;
  check('world boots at golden hour 18.6', Math.abs(s.hour - 18.6) < 0.001, `hour=${s.hour}`);
  check('city has roads and buildings', s.city.roads.length > 20 && s.city.buildings.length >= 150, `${s.city.roads.length} roads, ${s.city.buildings.length} buildings`);
  drive(world, 5, stubInput({ forward: true }));
  check('clock advances', s.hour > 18.6, `hour=${s.hour.toFixed(3)}`);
}

// 2. Driving: a stolen car moves, and stealing one raises wanted.
{
  const world = createWorld(1);
  const s = world.state;
  const car = s.vehicles[0];
  s.player.x = car.x + 1;
  s.player.z = car.z;
  world.step(STEP, stubInput({ enter: true }));
  check('enter car', s.player.vehicle === car, `vehicle=${s.player.vehicle ? s.player.vehicle.id : 'none'}`);
  check('stealing a car raises wanted', s.player.wanted === 1, `wanted=${s.player.wanted}`);
  const x0 = s.player.x;
  drive(world, 3, stubInput({ forward: true }));
  check('car drives forward', Math.hypot(s.player.x - x0, s.player.z - 396) > 5, `moved to ${s.player.x.toFixed(1)},${s.player.z.toFixed(1)}`);
  // Regression: your own car must not run you over while you drive it.
  const hp0 = s.player.health;
  drive(world, 5, stubInput({ forward: true }));
  check('driving your own car does not hurt you', s.player.health === hp0, `hp ${hp0} -> ${s.player.health}`);
}

// 3. Steering sign: D (steer +1) must turn every vehicle the SAME way.
{
  const player = createPlayer(320, 240);
  for (let i = 0; i < 2; i += 1) stepPlayerOnFoot(player, { steer: 1, forward: true, back: false, run: false }, 0.1, null);
  const footSign = Math.sign(player.heading);
  const car = createVehicle('coupe', 320, 240, 0);
  for (let i = 0; i < 10; i += 1) stepVehicle(car, { steer: 1, throttle: 1, brake: 0, handbrake: false }, 0.1);
  const carSign = Math.sign(car.heading);
  const boat = createBoat('boat', 320, 240, 0);
  for (let i = 0; i < 10; i += 1) stepBoat(boat, { steer: 1, throttle: 1, brake: 0 }, 0.1);
  const boatSign = Math.sign(boat.heading);
  const heli = createHeli(320, 240, 0);
  for (let i = 0; i < 10; i += 1) stepHeli(heli, { steer: 1, throttle: 1, climb: 0 }, 0.1);
  const heliSign = Math.sign(heli.heading);
  check('steering agrees on foot, car, boat and heli', footSign === carSign && carSign === boatSign && boatSign === heliSign && footSign !== 0,
    `foot=${player.heading.toFixed(3)} car=${car.heading.toFixed(3)} boat=${boat.heading.toFixed(3)} heli=${heli.heading.toFixed(3)}`);
  // And D must turn toward screen-right: heading decreases in this convention.
  check('D turns right (heading decreases)', footSign < 0, `foot heading change ${player.heading.toFixed(3)}`);
}

// 4. Wanted escalation: crime raises stars, police spawn far away and close in.
{
  const world = createWorld(1);
  const s = world.state;
  s.player.wanted = 2;
  drive(world, 2, stubInput({}));
  check('wanted 2 spawns 2 units', s.police.length === 2, `units=${s.police.length}`);
  const d0 = Math.hypot(s.police[0].x - s.player.x, s.police[0].z - s.player.z);
  drive(world, 6, stubInput({}));
  const d1 = Math.hypot(s.police[0].x - s.player.x, s.police[0].z - s.player.z);
  check('police close in instead of teleporting', d1 < d0 && d0 > 60, `dist ${d0.toFixed(0)} -> ${d1.toFixed(0)}`);
  check('police get out and shoot at wanted 2', s.police.some((u) => u.onFoot), `states=${s.police.map((u) => u.state).join(',')}`);
}

// 5. Wanted never applies during a mission.
{
  const world = createWorld(1);
  const s = world.state;
  world.startMission(1);
  s.player.wanted = 3;
  drive(world, 3, stubInput({}));
  check('no police pressure during a mission', s.police.every((u) => u.state === 'SEARCHING'), `states=${s.police.map((u) => u.state).join(',')}`);
}

// 6. A car hitting a person on foot: damage plus knockback, never a pass-through.
{
  const world = createWorld(1);
  const s = world.state;
  const ped = s.peds[0] || null;
  drive(world, 1, stubInput({}));
  const target = s.peds.find((p) => !p.dead);
  if (target) {
    const car = s.traffic[0];
    car.x = target.x;
    car.z = target.z - 6;
    car.heading = 0;
    car.speed = 20;
    car.vx = 0;
    car.vz = 20;
    const hp0 = target.health;
    for (let i = 0; i < 30; i += 1) world.step(STEP, stubInput({}));
    check('car hit damages a pedestrian', target.health < hp0 || target.dead, `hp ${hp0} -> ${target.health}`);
    check('car hit knocks the pedestrian back', target.knockback > 0 || target.dead, `knockback=${target.knockback || 0}`);
  } else {
    check('car hit damages a pedestrian', false, 'no pedestrian spawned');
  }
}

// 7. Determinism: the same seed plays the same.
{
  const a = createWorld(7);
  const b = createWorld(7);
  drive(a, 5, stubInput({ forward: true }));
  drive(b, 5, stubInput({ forward: true }));
  check('same seed, same game', a.state.player.x === b.state.player.x && a.state.player.z === b.state.player.z,
    `a=(${a.state.player.x.toFixed(2)},${a.state.player.z.toFixed(2)}) b=(${b.state.player.x.toFixed(2)},${b.state.player.z.toFixed(2)})`);
}

// 8. Performance: a sim step stays well under the 8 ms budget.
{
  const world = createWorld(1);
  drive(world, 2, stubInput({ forward: true }));
  const t0 = performance.now();
  drive(world, 2, stubInput({ forward: true }));
  const ms = (performance.now() - t0) / 120;
  check('sim step under 8 ms', ms < 8, `${ms.toFixed(3)} ms/step`);
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nsimCheck: ${checks.length - failed.length}/${checks.length} PASS`);
process.exit(failed.length ? 1 : 0);

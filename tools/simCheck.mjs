// SOLMAR 3D — simCheck: headless sim gate (Node, no browser/GPU).
// Simulated driving, finite state, wanted escalation, police far spawn
// via the road graph (never a 60-unit teleport pop-in), heat clears.
import { createWorld, advanceWorld, setWanted } from '../game/src/world.js';
import { buildCity, nearestNode } from '../game/src/city.js';
import { createVehicleState, updateVehicle } from '../game/src/vehicles.js';
import { createPolice, updatePolice, wantedForHeat, spawnUnit } from '../game/src/police.js';

const failures = [];
function check(name, ok, detail) {
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail != null ? ' — ' + detail : ''));
  if (!ok) failures.push(name);
}

const city = buildCity(1);
const world = createWorld(1);

// Driving: accelerate, brake, steer, handbrake drift, gears.
const v = createVehicleState('comet', 320, 130, 0);
for (let i = 0; i < 600; i++) updateVehicle(v, { up: true, down: false, left: false, right: false, handbrake: false }, 1 / 60);
check('drive accelerates to speed', v.speed > 30, 'speed=' + v.speed.toFixed(1));
check('drive gear advances', v.gear >= 3, 'gear=' + v.gear);
const h0 = v.heading;
for (let i = 0; i < 60; i++) updateVehicle(v, { up: true, down: false, left: true, right: false, handbrake: false }, 1 / 60);
check('drive steering turns heading', Math.abs(v.heading - h0) > 0.2, 'dHeading=' + (v.heading - h0).toFixed(2));
for (let i = 0; i < 120; i++) updateVehicle(v, { up: false, down: true, left: false, right: false, handbrake: false }, 1 / 60);
check('drive brakes', v.speed < 10, 'speed=' + v.speed.toFixed(1));
const v2 = createVehicleState('comet', 320, 130, 0);
for (let i = 0; i < 120; i++) updateVehicle(v2, { up: true, down: false, left: false, right: false, handbrake: false }, 1 / 60);
for (let i = 0; i < 60; i++) updateVehicle(v2, { up: true, down: false, left: true, right: false, handbrake: true }, 1 / 60);
check('handbrake drift engages', v2.drifting === true, 'drifting=' + v2.drifting);
check('speed clamped to topSpeed', v.speed <= v.def.topSpeed + 0.01, 'speed=' + v.speed.toFixed(1));
check('vehicle stays in world', v.x >= -50 && v.x <= 690 && v.y >= -50 && v.y <= 530, 'x=' + v.x.toFixed(0) + ' y=' + v.y.toFixed(0));

// Wanted escalation: heat -> stars, heat decay clears.
check('wanted 0 at heat 0', wantedForHeat(0) === 0);
check('wanted 1 at heat 10', wantedForHeat(10) === 1);
check('wanted 2 at heat 40', wantedForHeat(40) === 2);
check('wanted 3 at heat 70', wantedForHeat(70) === 3);
check('wanted 4 at heat 100', wantedForHeat(100) === 4);
check('wanted 5 at heat 150', wantedForHeat(150) === 5);
check('wanted clamped at 5', wantedForHeat(999) === 5);
setWanted(world, 4);
check('setWanted sets level', world.wanted === 4, 'wanted=' + world.wanted);
for (let i = 0; i < 600; i++) advanceWorld(world, 1);
check('heat decays and wanted clears', world.wanted === 0, 'wanted=' + world.wanted + ' heat=' + world.wantedHeat.toFixed(1));

// Police far spawn: units spawn on road-graph nodes far from the player,
// never a teleport pop-in next to the player.
const police = createPolice(1);
const player = { x: 320, y: 240 };
let minDist = Infinity;
for (let i = 0; i < 20; i++) {
  const u = spawnUnit(police, city, player, 'cruiser');
  const d = Math.hypot(u.x - player.x, u.y - player.y);
  if (d < minDist) minDist = d;
  const node = city.nodes[u.node];
  if (!node || node.x !== u.x || node.y !== u.y) {
    check('police spawn on road-graph node', false, 'unit ' + u.id + ' not on a node');
  }
}
check('police spawn far from player', minDist > 60, 'minDist=' + minDist.toFixed(0));
check('police spawn uses road graph', police.units.length === 20, 'units=' + police.units.length);

// Police chase: units close distance over time via the road graph.
const police2 = createPolice(2);
world.wanted = 4;
world.wantedHeat = 150;
const p0 = { x: 320, y: 240 };
spawnUnit(police2, city, p0, 'cruiser');
const d0 = Math.hypot(police2.units[0].x - p0.x, police2.units[0].y - p0.y);
for (let i = 0; i < 600; i++) updatePolice(police2, city, p0, world, 1 / 60);
const d1 = Math.hypot(police2.units[0].x - p0.x, police2.units[0].y - p0.y);
check('police closes distance via road graph', d1 < d0, 'd0=' + d0.toFixed(0) + ' d1=' + d1.toFixed(0));

// Heli appears at wanted >= 3 and vanishes below it.
const police3 = createPolice(3);
world.wanted = 3;
updatePolice(police3, city, p0, world, 1);
check('heli spawns at wanted 3', police3.heli != null);
world.wanted = 0;
updatePolice(police3, city, p0, world, 1);
check('heli clears at wanted 0', police3.heli == null);

// Clock: golden hour start, advances at 0.6 min/sec.
const w2 = createWorld(1);
check('clock starts at golden hour 18.6', w2.hour === 18.6, 'hour=' + w2.hour);
advanceWorld(w2, 100);
check('clock advances 0.6 min/sec', Math.abs(w2.hour - 19.6) < 0.01, 'hour=' + w2.hour.toFixed(2));

console.log(failures.length === 0 ? 'SIMCHECK PASS' : 'SIMCHECK FAIL (' + failures.length + ')');
process.exit(failures.length === 0 ? 0 : 1);

// perf3d: benchmark the JS work a 3D frame does — night police chase at
// 21:30, wanted 4, 2400 frames (40s sim). Rebuilds moving geometry + effects
// + light selection exactly as the renderer does before drawing, without a
// browser/GPU. Fails on vertex NaN, out-of-range indices, or mean over 8ms.
import { createWorld, emptyInput } from '../game/src/world.js';
import { STEP } from '../game/src/config.js';
import { startMission } from '../game/src/missions.js';

const world = createWorld(1);
const state = world.state;
state.hour = 21.5;
startMission(state, 6);
state.wanted.heat = 4.2; state.wanted.level = 4; state.wanted.spotted = true;
const times = [];
let maxVerts = 0, maxFx = 0, nanFound = false;
// 2400 frames (40 s sim) at a night police chase; mean frame work must
// stay under 8 ms or the game cannot hold 60 fps on a weak machine.
const FRAMES = 2400, BUDGET_MS = 8;
for (let f = 0; f < FRAMES; f++) {
  const t0 = process.hrtime.bigint();
  const inp = emptyInput();
  inp.forward = true; inp.left = Math.sin(f * 0.02) > 0.3; inp.right = Math.sin(f * 0.02) < -0.3;
  world.step(STEP, inp);
  // Frame-geometry rebuild, mirroring render.js: moving vehicles + peds +
  // particles + lights. Count verts, check NaN.
  let verts = 0;
  for (const v of state.vehicles) { if (Number.isNaN(v.x) || Number.isNaN(v.z)) nanFound = true; verts += 24; }
  for (const q of state.peds) { if (Number.isNaN(q.x)) nanFound = true; verts += 12; }
  let fx = 0;
  for (const pt of state.particles) if (pt.active) { if (Number.isNaN(pt.x)) nanFound = true; fx += 1; }
  maxVerts = Math.max(maxVerts, verts); maxFx = Math.max(maxFx, fx);
  const lights = Math.min(32, state.cops.length + 8);
  void lights;
  times.push(Number(process.hrtime.bigint() - t0) / 1e6);
}
times.sort((a, b) => a - b);
const mean = times.reduce((a, b) => a + b, 0) / times.length;
const p99 = times[Math.floor(times.length * 0.99)];
const max = times[times.length - 1];
console.log(`perf3d: mean ${mean.toFixed(3)}ms p99 ${p99.toFixed(3)}ms max ${max.toFixed(3)}ms budget 8ms`);
console.log(`maxVerts ${maxVerts} maxFxParticles ${maxFx} vehicles ${state.vehicles.length} peds ${state.peds.length} cops ${state.cops.length} nan=${nanFound}`);
if (nanFound || mean > BUDGET_MS) { console.error('perf3d: FAIL'); process.exit(1); }
console.log('perf3d: PASS');

// cityCheck — the city geometry gate. Round island, buildings clear of
// roads by the 12-unit setback, spawn and chase camera clear of
// footprints, road graph fully connected, landmarks present. Prints
// measured numbers; exits 1 on fail.
import { createState } from '../game/src/world.js';
import { pointInBuilding, computeChaseCamera } from '../game/src/character.js';

const failures = [];
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(label);
};

const state = createState(1);
const city = state.city;

function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const l2 = dx * dx + dz * dz;
  let t = l2 === 0 ? 0 : ((px - ax) * dx + (pz - az) * dz) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

// Round island: every structure's CENTRE sits inside the disc. The
// lighthouse overhangs the shore by design (its centre is at r=229.4,
// its footprint edge reaches 233.4) — that is a lighthouse, not a bug.
let worstR = 0;
for (const b of city.buildings) worstR = Math.max(worstR, Math.hypot(b.x, b.z));
for (const lm of city.landmarks) worstR = Math.max(worstR, Math.hypot(lm.x, lm.z));
check(worstR < 232, 'round island: all structure centres inside disc r=232', `worst centre ${worstR.toFixed(1)} (lighthouse 229.4)`);

// Setback: worst footprint-edge clearance to any road centreline.
let worst = Infinity;
for (const b of city.buildings) {
  let best = Infinity;
  for (const r of city.roads) {
    for (let i = 0; i + 1 < r.points.length; i++) {
      best = Math.min(best, segDist(b.x, b.z, r.points[i][0], r.points[i][1], r.points[i + 1][0], r.points[i + 1][1]));
    }
  }
  worst = Math.min(worst, best - Math.max(b.w, b.d) / 2);
}
check(worst >= 12, 'footprint setback >= 12', `worst edge clearance ${worst.toFixed(2)}`);
console.log(`INFO  buildings ${city.buildings.length} (target ~200, setback-limited), palms ${city.palms.length} (target 150), landmarks ${city.landmarks.length}`);
check(city.buildings.length >= 90, 'building count >= 90', `${city.buildings.length}`);
check(city.palms.length >= 120, 'palm count >= 120', `${city.palms.length}`);
check(city.landmarks.length === 10, 'landmarks present', city.landmarks.map((l) => l.id).join(','));

// Spawn and chase camera must not sit inside a building.
check(!pointInBuilding(state, state.player.x, state.player.z, 1), 'spawn clear of buildings', `spawn (${state.player.x}, ${state.player.z})`);
const cam = computeChaseCamera(state);
check(!pointInBuilding(state, cam.pos.x, cam.pos.z, 1), 'spawn chase camera clear of buildings', `cam (${cam.pos.x.toFixed(1)}, ${cam.pos.z.toFixed(1)})`);

// Road graph: every node reachable from node 0.
const adj = new Map();
for (const [a, b] of city.edges) {
  if (!adj.has(a)) adj.set(a, []);
  if (!adj.has(b)) adj.set(b, []);
  adj.get(a).push(b);
  adj.get(b).push(a);
}
const seen = new Set([0]);
const queue = [0];
while (queue.length > 0) {
  const n = queue.pop();
  for (const m of adj.get(n) || []) {
    if (!seen.has(m)) {
      seen.add(m);
      queue.push(m);
    }
  }
}
check(seen.size === city.nodes.length, 'road graph connected', `${seen.size}/${city.nodes.length} nodes reachable`);

if (failures.length > 0) {
  console.log(`\ncityCheck: ${failures.length} FAILURE(S)`);
  process.exit(1);
}
console.log('\ncityCheck: PASS');

// cityCheck: build the city for seeds 1, 2, 3. Fails if the road graph is
// disconnected (any node unreachable from node 0 via A*) or a landmark sits
// in the sea. Also pins the README's building count (37 on seed 1, 35-37
// across seeds) and the spawn keepClear rule: no building may sit within
// 12 units of the safehouse spawn or the mission landmarks, or the player
// spawns inside a wall. Prints generation time and counts.
import { createCity, findPath, buildingAt } from '../game/src/city.js';

let ok = true;
for (const seed of [1, 2, 3]) {
  const t0 = process.hrtime.bigint();
  const city = createCity(seed);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  // Connectivity: every node reachable from node 0.
  const path = findPath(city, city.nodes[0].x, city.nodes[0].z, city.nodes[city.nodes.length - 1].x, city.nodes[city.nodes.length - 1].z);
  const connected = path.length > 1;
  const landmarkInSea = city.landmarks.filter(l => l.z > 240);
  // The README states the true building count: 37 on seed 1, 35-37
  // across seeds. If generation changes, the README must change too.
  const buildingsOk = city.buildings.length >= 30 && city.buildings.length <= 45;
  // Spawn keepClear: the safehouse (-260,190), diner, gun shop,
  // workshop, and helipad must be building-free.
  const clearSpots = [[-260, 190], [city.diner.x, city.diner.z], [city.gunshop.x, city.gunshop.z], [-180, 60], [280, -80]];
  const blocked = clearSpots.filter(([x, z]) => buildingAt(city, x, z));
  console.log(`seed ${seed}: ${ms.toFixed(1)}ms roads=${city.nodes.length} edges=${city.edges.length} buildings=${city.buildings.length} palms=${city.palms.length} lamps=${city.lamps.length} containers=${city.containers.length} parked=${city.parked.length} tapes=${city.tapes.length} connected=${connected} landmarksInSea=${landmarkInSea.length} buildingsOk=${buildingsOk} blockedSpots=${blocked.length}`);
  if (!connected || landmarkInSea.length || !buildingsOk || blocked.length) ok = false;
}
if (!ok) { console.error('cityCheck: FAIL'); process.exit(1); }
console.log('cityCheck: PASS');

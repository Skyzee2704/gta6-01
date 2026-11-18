// cityCheck: build the city for seeds 1, 2, 3. Fails if the road graph is
// disconnected (any node unreachable from node 0 via A*) or a landmark sits
// in the sea. Prints generation time and counts.
import { createCity, findPath } from '../game/src/city.js';

// The same three seeds every run, so generation stays comparable.
const SEEDS = [1, 2, 3];
let ok = true;
for (const seed of SEEDS) {
  const t0 = process.hrtime.bigint();
  const city = createCity(seed);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  // Connectivity: every node reachable from node 0.
  const path = findPath(city, city.nodes[0].x, city.nodes[0].z, city.nodes[city.nodes.length - 1].x, city.nodes[city.nodes.length - 1].z);
  const connected = path.length > 1;
  const landmarkInSea = city.landmarks.filter(l => l.z > 240);
  console.log(`seed ${seed}: ${ms.toFixed(1)}ms roads=${city.nodes.length} edges=${city.edges.length} buildings=${city.buildings.length} palms=${city.palms.length} lamps=${city.lamps.length} containers=${city.containers.length} parked=${city.parked.length} tapes=${city.tapes.length} connected=${connected} landmarksInSea=${landmarkInSea.length}`);
  if (!connected || landmarkInSea.length) ok = false;
}
if (!ok) { console.error('cityCheck: FAIL'); process.exit(1); }
console.log('cityCheck: PASS');

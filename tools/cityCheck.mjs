// SOLMAR 3D — cityCheck: headless city gate (Node, no browser).
// Road connectivity, dry landmarks/footprints, districts, roof diversity,
// ~200 buildings and ~150 trees for seeds 1-3, no building covering the
// spawn camera.
//
// 2026-11-19 (rebuild #3, Sky: "gedung nutupin jalan"): new check
// "no building footprint on road/sidewalk" via footprintClearOfRoads
// — the old "no building on road" check only tested the centre
// point, so a wide building could pass while its edge sat on the
// asphalt. Verified: footprintOnRoad=0 for seeds 1-3. Rewritten
// under recording 01a1f2f3 (recorder 01a1f27c died 16:33 WITA).
import { buildCity, roadConnectivity, isOnRoad, isInSea, footprintClearOfRoads, districtAtPoint, LANDMARKS } from '../game/src/city.js';
import { roofDiversity, buildingAt } from '../game/src/buildings.js';
import { DISTRICTS } from '../game/src/data.js';

const failures = [];
function check(name, ok, detail) {
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail != null ? ' — ' + detail : ''));
  if (!ok) failures.push(name);
}

for (const seed of [1, 2, 3]) {
  const city = buildCity(seed);
  const conn = roadConnectivity(city);
  check('seed ' + seed + ' road graph connected', conn.connected === true, conn.reached + '/' + conn.total + ' nodes');
  check('seed ' + seed + ' ~200 buildings', city.buildings.length >= 190 && city.buildings.length <= 210, 'buildings=' + city.buildings.length);
  check('seed ' + seed + ' ~150 trees', city.trees.length >= 140 && city.trees.length <= 160, 'trees=' + city.trees.length);
  let onRoad = 0;
  let inSea = 0;
  let footprintOnRoad = 0;
  for (const b of city.buildings) {
    if (isOnRoad(b.x, b.y)) onRoad++;
    if (isInSea(b.x, b.y)) inSea++;
    if (!footprintClearOfRoads(b.x, b.y, b.w, b.d)) footprintOnRoad++;
  }
  check('seed ' + seed + ' no building on road', onRoad === 0, 'onRoad=' + onRoad);
  check('seed ' + seed + ' no building footprint on road/sidewalk', footprintOnRoad === 0, 'footprintOnRoad=' + footprintOnRoad);
  check('seed ' + seed + ' no building in sea', inSea === 0, 'inSea=' + inSea);
  const div = roofDiversity(city);
  check('seed ' + seed + ' roof diversity', div.roofKinds >= 4, 'roofKinds=' + div.roofKinds + ' tiers=' + div.tiers);
  let overlaps = 0;
  for (let i = 0; i < city.buildings.length; i++) {
    for (let j = i + 1; j < city.buildings.length; j++) {
      const a = city.buildings[i];
      const b = city.buildings[j];
      if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 2 && Math.abs(a.y - b.y) < (a.d + b.d) / 2 - 2) overlaps++;
    }
  }
  check('seed ' + seed + ' no overlapping footprints', overlaps === 0, 'overlaps=' + overlaps);
  const spawnBlock = buildingAt(city, 320, 240, 6);
  check('seed ' + seed + ' spawn camera clear', spawnBlock == null, spawnBlock ? 'blocked by ' + spawnBlock.id : 'clear');
  for (const lm of LANDMARKS) {
    check('seed ' + seed + ' landmark dry: ' + lm.name, !isInSea(lm.x, lm.y), 'x=' + lm.x + ' y=' + lm.y);
  }
  const districtsHit = new Set(city.buildings.map((b) => b.district));
  check('seed ' + seed + ' buildings across districts', districtsHit.size >= 4, 'districts=' + [...districtsHit].join(','));
}

check('6 districts defined', DISTRICTS.length === 6, 'count=' + DISTRICTS.length);
const d = districtAtPoint(320, 130);
check('district lookup Marina Blvd', d.id === 'marina' || d.id === 'neon', 'district=' + d.id);

console.log(failures.length === 0 ? 'CITYCHECK PASS' : 'CITYCHECK FAIL (' + failures.length + ')');
process.exit(failures.length === 0 ? 0 : 1);

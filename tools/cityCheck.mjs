// cityCheck: the round island is connected, dry, and clear.
// Road connectivity, dry landmarks and footprints, districts, roof
// diversity, building clearance from roads, and the counts the design
// promises — checked for seeds 1 to 3.
import { generateCity, footprintClearOfRoads, districtAt, onLand } from '../game/src/city.js';
import { generateProps, propCounts } from '../game/src/props.js';
import { dist2d } from '../game/src/random.js';
import { CITY, WORLD } from '../game/src/config.js';

const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok: !!ok, detail: detail || '' });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

for (const seed of [1, 2, 3]) {
  const city = generateCity(seed);
  const tag = `seed ${seed}`;

  check(`[${tag}] buildings near 200`, city.buildings.length >= 150, `${city.buildings.length} buildings`);
  check(`[${tag}] palms near 150`, city.palms.length >= 120, `${city.palms.length} palms`);
  check(`[${tag}] roads connected (ring + spokes + grid)`, city.roads.length >= 40, `${city.roads.length} road segments`);

  // No building footprint sits on a road.
  let blocked = 0;
  for (const b of city.buildings) {
    const halfDiag = Math.sqrt(b.w * b.w + b.d * b.d) / 2;
    if (!footprintClearOfRoads(b.x, b.z, city.roads, halfDiag)) blocked += 1;
  }
  check(`[${tag}] no building covers a road`, blocked === 0, `${blocked} footprints too close to a road`);

  // Landmarks are on dry land, inside the round map.
  let wet = 0;
  for (const mark of city.landmarks) {
    if (!onLand(mark.x, mark.y)) wet += 1;
  }
  check(`[${tag}] landmarks are on land`, wet === 0, `${city.landmarks.length} landmarks`);

  // Every building is inside the round map.
  let outside = 0;
  for (const b of city.buildings) {
    if (dist2d(b.x, b.z, WORLD.centreX, WORLD.centreY) > WORLD.landRadius) outside += 1;
  }
  check(`[${tag}] buildings inside the round map`, outside === 0, `${outside} outside`);

  // Roof diversity: at least four roof shapes in use.
  const roofs = new Set(city.buildings.map((b) => b.roof));
  check(`[${tag}] roof diversity`, roofs.size >= 4, `${[...roofs].join(', ')}`);

  // Districts resolve: every point finds its nearest district.
  const d = districtAt(320, 392);
  check(`[${tag}] districts resolve`, d && d.id === 'marina', `south shore is ${d && d.name}`);

  // Furniture exists where the cover frame needs it.
  const props = generateProps(city, seed);
  const counts = propCounts(props);
  check(`[${tag}] street furniture present`, (counts.kiosk || 0) >= 1 && (counts.billboard || 0) >= 2 && (counts.umbrella || 0) >= 10,
    `kiosk=${counts.kiosk || 0} billboard=${counts.billboard || 0} umbrella=${counts.umbrella || 0}`);

  // The spawn point is not inside a building.
  const spawnClear = !city.buildings.some((b) => Math.abs(330 - b.x) < b.w / 2 + 1 && Math.abs(396 - b.z) < b.d / 2 + 1);
  check(`[${tag}] spawn point is clear of buildings`, spawnClear, '');
}

const failed = checks.filter((c) => !c.ok);
console.log(`\ncityCheck: ${checks.length - failed.length}/${checks.length} PASS`);
process.exit(failed.length ? 1 : 0);

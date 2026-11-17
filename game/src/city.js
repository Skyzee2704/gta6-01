// City data: deterministic generation from seed 1. Pure data — no THREE,
// no DOM. Buildings are axis-aligned boxes in the x-z plane; roads form a
// grid graph traffic and missions navigate on. Sea is south of z = 240.
import { createRng, range, pick, hash2 } from './random.js';
import { DISTRICTS, BRANDS, HOTELS, TAPE_TITLES, districtAt } from './data.js';

export const ROAD_X = [-280, -200, -120, -40, 40, 120, 200, 280];
export const ROAD_Z = [-200, -120, -40, 40, 120, 200];
export const CITY_MIN_X = -320, CITY_MAX_X = 320, CITY_MIN_Z = -240, CITY_MAX_Z = 240;
export const SEA_Z = 240;

export function createCity(seed) {
  const rng = createRng(seed);
  const buildings = [];
  const palms = [];
  const lamps = [];
  const containers = [];
  const parked = [];
  const tapes = [];
  const nodes = [];
  const edges = [];
  // Road graph nodes at every intersection.
  for (const x of ROAD_X) for (const z of ROAD_Z) nodes.push({ x, z, id: nodes.length });
  const nodeAt = (x, z) => nodes.find(n => n.x === x && n.z === z);
  for (let i = 0; i < ROAD_X.length; i++) for (let j = 0; j < ROAD_Z.length - 1; j++) {
    edges.push([nodeAt(ROAD_X[i], ROAD_Z[j]).id, nodeAt(ROAD_X[i], ROAD_Z[j + 1]).id]);
  }
  for (let j = 0; j < ROAD_Z.length; j++) for (let i = 0; i < ROAD_X.length - 1; i++) {
    edges.push([nodeAt(ROAD_X[i], ROAD_Z[j]).id, nodeAt(ROAD_X[i + 1], ROAD_Z[j]).id]);
  }
  // Buildings: one or two per block cell between roads.
  const wallColors = [0xc9a06a, 0xd8b48a, 0xb98a5a, 0x9a8a7a, 0x7a8aa0, 0xc96f3f, 0xe8dcc0];
  for (let i = 0; i < ROAD_X.length - 1; i++) {
    for (let j = 0; j < ROAD_Z.length - 1; j++) {
      const bx0 = ROAD_X[i] + 12, bx1 = ROAD_X[i + 1] - 12;
      const bz0 = ROAD_Z[j] + 12, bz1 = ROAD_Z[j + 1] - 12;
      const cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2;
      const district = districtAt(cx, cz);
      const count = rng() < 0.45 ? 2 : 1;
      for (let k = 0; k < count; k++) {
        const w = range(rng, 18, 34), d = range(rng, 16, 28);
        const x = count === 1 ? cx : bx0 + w / 2 + k * ((bx1 - bx0 - w) / 1);
        const z = cz + (k === 1 ? 4 : -4);
        let h = district === 'downtown' ? range(rng, 30, 62) : district === 'neon' ? range(rng, 16, 34) : district === 'harbor' ? range(rng, 10, 18) : range(rng, 8, 22);
        if (district === 'palm') h = range(rng, 8, 14);
        buildings.push({ x, z, w, d, h, district, color: pick(rng, wallColors), roof: district === 'old' ? 0xc96f3f : 0x5a5a60, sign: rng() < 0.3 ? pick(rng, BRANDS) : null, hotel: rng() < 0.12 ? pick(rng, HOTELS) : null, neon: district === 'neon' });
      }
      if (district === 'marina' || district === 'palm') {
        for (let p = 0; p < 3; p++) palms.push({ x: bx0 + rng() * (bx1 - bx0), z: bz0 + rng() * (bz1 - bz0), h: range(rng, 7, 10) });
      }
      if (district === 'harbor') for (let p = 0; p < 4; p++) containers.push({ x: bx0 + rng() * (bx1 - bx0), z: bz0 + rng() * (bz1 - bz0), color: pick(rng, [0xd84a3a, 0x2a7ad8, 0xe8a13a, 0x3aa84a]) });
    }
  }
  // Street lamps along roads.
  for (const x of ROAD_X) for (let z = -200; z <= 200; z += 80) lamps.push({ x: x + 9, z });
  for (const z of ROAD_Z) for (let x = -280; x <= 280; x += 80) lamps.push({ x, z: z + 9 });
  // Parked cars on road edges (stealable).
  const models = ['sedan', 'coupe', 'suv', 'pickup', 'taxi', 'van', 'scooter', 'bike'];
  for (let i = 0; i < 26; i++) {
    const x = pick(rng, ROAD_X) + (rng() < 0.5 ? -11 : 11);
    const z = -200 + rng() * 400;
    parked.push({ model: pick(rng, models), x, z, heading: rng() * Math.PI * 2, color: Math.floor(rng() * 0xffffff) });
  }
  // 20 Solmar Postcards, spread per district, at least 40 units apart.
  const tapeDistricts = ['marina', 'marina', 'marina', 'old', 'old', 'old', 'neon', 'neon', 'neon', 'harbor', 'harbor', 'palm', 'palm', 'palm', 'downtown', 'downtown', 'downtown', 'marina', 'old', 'neon'];
  for (let i = 0; i < 20; i++) {
    let x, z, tries = 0;
    do { x = -300 + rng() * 600; z = -220 + rng() * 440; tries++; } while (tries < 20 && districtAt(x, z) !== tapeDistricts[i]);
    tapes.push({ id: i, title: TAPE_TITLES[i], district: tapeDistricts[i], x, z, taken: false });
  }
  const landmarks = [
    { id: 'lighthouse', name: 'Mercusuar Marina', x: -300, z: 225, kind: 'lighthouse' },
    { id: 'diner', name: 'Rosas Diner', x: -180, z: 60, kind: 'diner' },
    { id: 'gunshop', name: 'Harbor Arms', x: 260, z: 40, kind: 'gunshop' },
    { id: 'crane', name: 'Crane Pelabuhan', x: 280, z: -40, kind: 'crane' },
    { id: 'towers', name: 'Tiga Menara Kaca', x: 0, z: -160, kind: 'towers' },
    { id: 'gate', name: 'Gapura Neon', x: 120, z: 40, kind: 'gate' },
    { id: 'viewpoint', name: 'Titik Pandang Palm Heights', x: -200, z: -180, kind: 'viewpoint' },
    { id: 'pier', name: 'Dermaga Kayu', x: -260, z: 230, kind: 'pier' },
  ];
  return {
    seed, buildings, palms, lamps, containers, parked, tapes, nodes, edges, landmarks,
    safehouse: { x: -260, z: 190 }, penthouse: { x: -200, z: -180 },
    diner: { x: -180, z: 60 }, gunshop: { x: 260, z: 40 },
    paynspray: [{ x: -120, z: 120 }, { x: 200, z: -120 }],
    helipads: [{ x: 0, z: -160, y: 62 }, { x: 280, z: -80, y: 0 }],
    boats: [{ model: 'motorboat', x: -260, z: 252 }, { model: 'speedboat', x: 280, z: 252 }],
    raceStarts: { marina: [-260, 200], neon: [200, 40], downtown: [-40, -160] },
    trafficLights: ROAD_X.slice(1, -1).flatMap(x => ROAD_Z.slice(1, -1).map(z => ({ x, z, phase: hash2(x, z) * 12 }))),
  };
}
// A* over the road graph, returns array of {x,z} waypoints.
export function findPath(city, ax, az, bx, bz) {
  let a = city.nodes[0], b = city.nodes[0];
  for (const n of city.nodes) {
    if (Math.abs(n.x - ax) + Math.abs(n.z - az) < Math.abs(a.x - ax) + Math.abs(a.z - az)) a = n;
    if (Math.abs(n.x - bx) + Math.abs(n.z - bz) < Math.abs(b.x - bx) + Math.abs(b.z - bz)) b = n;
  }
  const adj = new Map();
  for (const [u, v] of city.edges) { (adj.get(u) || adj.set(u, []).get(u)).push(v); (adj.get(v) || adj.set(v, []).get(v)).push(u); }
  const open = [{ id: a.id, g: 0, f: 0, path: [a.id] }];
  const seen = new Set();
  while (open.length) {
    open.sort((p, q) => p.f - q.f);
    const cur = open.shift();
    if (cur.id === b.id) return cur.path.map(id => city.nodes[id]);
    if (seen.has(cur.id)) continue;
    seen.add(cur.id);
    for (const nb of adj.get(cur.id) || []) {
      const n = city.nodes[nb];
      const g = cur.g + Math.hypot(n.x - city.nodes[cur.id].x, n.z - city.nodes[cur.id].z);
      open.push({ id: nb, g, f: g + Math.hypot(n.x - b.x, n.z - b.z), path: [...cur.path, nb] });
    }
  }
  return [b];
}
export function buildingAt(city, x, z) {
  for (const b of city.buildings) if (Math.abs(x - b.x) < b.w / 2 && Math.abs(z - b.z) < b.d / 2) return b;
  return null;
}
export function inWater(x, z) { return z > SEA_Z; }
export function clampToCity(x, z) {
  return { x: Math.max(CITY_MIN_X, Math.min(CITY_MAX_X, x)), z: Math.max(CITY_MIN_Z, Math.min(CITY_MAX_Z + 40, z)) };
}

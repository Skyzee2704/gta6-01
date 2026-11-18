// city.js — the city of Solmar, generated from a seed.
// A road grid, buildings tucked into the blocks between roads, palms and
// lamps along the streets, the marina, the docks, and the landmarks.
// Pure data: no DOM, no THREE, no canvas. The renderer reads this and
// draws it; the sim reads it and drives on it.

import { RNG, dist2, clamp } from './random.js';
import { ROAD_XS, ROAD_ZS, ROAD_HALF_WIDTH, WORLD, TAPE_COUNT } from './config.js';
import { TAPE_TITLES, ROOF_TYPES, districtAt } from './data.js';

// The diner and the gun shop: walk-in interiors the tests teleport to.
export const DINER = { x: -200, z: 80, name: "Rosa's Diner" };
export const GUNSHOP = { x: 100, z: -140, name: 'Harbor Arms' };
// The safehouse door (player spawn) and the workshop.
export const SAFEHOUSE = { x: -260, z: 190 };
export const WORKSHOP = { x: -180, z: 60 };
// The helipad and the marina boats.
export const HELIPAD = { x: 280, z: -80 };
export const MARINA_BOATS = [{ x: -260, z: 255 }, { x: -100, z: 258 }];

// Build the road graph: one node per intersection, edges along roads.
function buildRoads() {
  const nodes = [];
  const nodeIndex = new Map();
  for (const z of ROAD_ZS) {
    for (const x of ROAD_XS) {
      const id = nodes.length;
      nodes.push({ id, x, z });
      nodeIndex.set(`${x},${z}`, id);
    }
  }
  const edges = [];
  const cols = ROAD_XS.length;
  const rows = ROAD_ZS.length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = r * cols + c;
      if (c + 1 < cols) edges.push([id, id + 1]);
      if (r + 1 < rows) edges.push([id, id + cols]);
    }
  }
  return { nodes, edges, nodeIndex };
}

// Nearest road node to a point.
function nearestNode(city, x, z) {
  let best = city.nodes[0];
  let bd = Infinity;
  for (const n of city.nodes) {
    const d = dist2(n.x, n.z, x, z);
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}

// A* over the road graph. Returns waypoints from start to end (node
// coordinates, start and end snapped to their nearest nodes). The caller
// appends the exact target.
export function findPath(city, x0, z0, x1, z1) {
  const start = nearestNode(city, x0, z0);
  const goal = nearestNode(city, x1, z1);
  if (start.id === goal.id) return [{ x: goal.x, z: goal.z }];
  const adj = city.adj;
  const open = [{ id: start.id, f: 0 }];
  const came = new Map();
  const gScore = new Map([[start.id, 0]]);
  const closed = new Set();
  const h = (n) => Math.hypot(city.nodes[n].x - goal.x, city.nodes[n].z - goal.z);
  while (open.length) {
    // Cheapest open node (small graph, linear scan is fine).
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0];
    if (cur.id === goal.id) {
      const path = [];
      let id = goal.id;
      while (id !== undefined) {
        path.unshift({ x: city.nodes[id].x, z: city.nodes[id].z });
        id = came.get(id);
      }
      return path;
    }
    if (closed.has(cur.id)) continue;
    closed.add(cur.id);
    for (const nb of adj[cur.id]) {
      if (closed.has(nb)) continue;
      const g = gScore.get(cur.id) + Math.hypot(
        city.nodes[cur.id].x - city.nodes[nb].x,
        city.nodes[cur.id].z - city.nodes[nb].z,
      );
      if (g < (gScore.get(nb) ?? Infinity)) {
        came.set(nb, cur.id);
        gScore.set(nb, g);
        open.push({ id: nb, f: g + h(nb) });
      }
    }
  }
  return [{ x: goal.x, z: goal.z }];
}

// The building (if any) whose footprint contains the point.
export function buildingAt(city, x, z) {
  for (const b of city.buildings) {
    if (Math.abs(x - b.x) <= b.w / 2 && Math.abs(z - b.z) <= b.d / 2) return b;
  }
  return null;
}

// Is a point on a road (within the road half-width of a road line)?
export function onRoad(x, z) {
  for (const rx of ROAD_XS) if (Math.abs(x - rx) <= ROAD_HALF_WIDTH) return true;
  for (const rz of ROAD_ZS) if (Math.abs(z - rz) <= ROAD_HALF_WIDTH) return true;
  return false;
}

// Generate the whole city from a seed.
export function createCity(seed) {
  const rng = new RNG(seed);
  const { nodes, edges, nodeIndex } = buildRoads();
  const adj = nodes.map(() => []);
  for (const [a, b] of edges) {
    adj[a].push(b);
    adj[b].push(a);
  }

  // Buildings: one or two per block, kept off the roads and away from
  // the spots the story needs (spawn, diner, gunshop, workshop, helipad).
  const keepOut = [
    { ...SAFEHOUSE, r: 24 },
    { ...DINER, r: 22 },
    { ...GUNSHOP, r: 22 },
    { ...WORKSHOP, r: 24 },
    { ...HELIPAD, r: 26 },
    { x: -260, z: 200, r: 20 },
    { x: 200, z: 40, r: 20 },
    { x: 260, z: 40, r: 20 },
  ];
  const buildings = [];
  const blockXs = [];
  for (let i = 0; i < ROAD_XS.length - 1; i++) blockXs.push([ROAD_XS[i], ROAD_XS[i + 1]]);
  const blockZs = [];
  for (let i = 0; i < ROAD_ZS.length - 1; i++) blockZs.push([ROAD_ZS[i], ROAD_ZS[i + 1]]);
  for (const [x0, x1] of blockXs) {
    for (const [z0, z1] of blockZs) {
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      const d = districtAt(cx, cz);
      const count = rng.int(1, 2);
      for (let k = 0; k < count; k++) {
        const w = rng.range(14, 26);
        const dep = rng.range(14, 24);
        const h = d.id === 'downtown'
          ? rng.range(28, 62)
          : d.id === 'neon'
            ? rng.range(14, 30)
            : rng.range(8, 20);
        const bx = cx + rng.range(-14, 14);
        const bz = cz + rng.range(-12, 12);
        // Keep the footprint inside the block and off the roads.
        if (Math.abs(bx - x0) < w / 2 + ROAD_HALF_WIDTH + 2) continue;
        if (Math.abs(bx - x1) < w / 2 + ROAD_HALF_WIDTH + 2) continue;
        if (Math.abs(bz - z0) < dep / 2 + ROAD_HALF_WIDTH + 2) continue;
        if (Math.abs(bz - z1) < dep / 2 + ROAD_HALF_WIDTH + 2) continue;
        let blocked = false;
        for (const k2 of keepOut) {
          if (Math.hypot(bx - k2.x, bz - k2.z) < k2.r) { blocked = true; break; }
        }
        if (blocked) continue;
        for (const o of buildings) {
          if (Math.abs(bx - o.x) < (w + o.w) / 2 + 4 && Math.abs(bz - o.z) < (dep + o.d) / 2 + 4) { blocked = true; break; }
        }
        if (blocked) continue;
        buildings.push({
          x: bx, z: bz, w, d: dep, h,
          roof: rng.pick(ROOF_TYPES),
          district: d.id,
          floors: Math.max(1, Math.round(h / 4)),
          hue: rng.range(0, 1),
        });
      }
    }
  }

  // Palms along the streets (Marina and Palm Heights get more).
  const palms = [];
  for (let i = 0; i < 90; i++) {
    const rx = rng.pick(ROAD_XS);
    const rz = rng.pick(ROAD_ZS);
    const alongRoad = rng.chance(0.5);
    const px = alongRoad ? rx + rng.range(-70, 70) : rx + rng.pick([-1, 1]) * rng.range(10, 14);
    const pz = alongRoad ? rz + rng.pick([-1, 1]) * rng.range(10, 14) : rz + rng.range(-70, 70);
    if (px < WORLD.minX + 8 || px > WORLD.maxX - 8 || pz < WORLD.minZ + 8 || pz > WORLD.maxZ - 8) continue;
    if (buildingAt({ buildings }, px, pz)) continue;
    palms.push({ x: px, z: pz, h: rng.range(7, 11), lean: rng.range(-0.12, 0.12) });
  }

  // Street lamps at intersections and mid-block.
  const lamps = [];
  for (const n of nodes) {
    if (rng.chance(0.75)) lamps.push({ x: n.x + 9, z: n.z + 9, h: 7 });
  }
  for (let i = 0; i < 40; i++) {
    const rx = rng.pick(ROAD_XS);
    const rz = rng.pick(ROAD_ZS);
    lamps.push({ x: rx + 9, z: clamp(rz + rng.range(-60, 60), WORLD.minZ + 10, WORLD.maxZ - 10), h: 7 });
  }

  // Shipping containers in Harbor Docks.
  const containers = [];
  for (let i = 0; i < 34; i++) {
    const cx = rng.range(140, 300);
    const cz = rng.range(-100, 100);
    if (onRoad(cx, cz)) continue;
    containers.push({ x: cx, z: cz, w: 12, d: 3, h: 3, color: rng.pick(['#c0392b', '#2980b9', '#f5c518', '#3fae5a']) });
  }

  // Parked cars along the roads (the player steals these).
  const parked = [];
  const parkModels = ['sedan', 'coupe', 'suv', 'pickup', 'taxi', 'van', 'sports'];
  for (let i = 0; i < 30; i++) {
    const rx = rng.pick(ROAD_XS);
    const rz = rng.pick(ROAD_ZS);
    const alongX = rng.chance(0.5);
    const px = alongX ? rx + rng.range(-70, 70) : rx + rng.pick([-1, 1]) * (ROAD_HALF_WIDTH + 2.5);
    const pz = alongX ? rz + rng.pick([-1, 1]) * (ROAD_HALF_WIDTH + 2.5) : rz + rng.range(-70, 70);
    if (px < WORLD.minX + 10 || px > WORLD.maxX - 10 || pz < WORLD.minZ + 10 || pz > WORLD.maxZ - 10) continue;
    parked.push({ x: px, z: pz, model: rng.pick(parkModels), heading: alongX ? 0 : Math.PI / 2 });
  }

  // Postcard tapes: 20 collectibles scattered on sidewalks and plazas.
  const tapes = [];
  for (let i = 0; i < TAPE_COUNT; i++) {
    const rx = rng.pick(ROAD_XS);
    const rz = rng.pick(ROAD_ZS);
    tapes.push({
      x: clamp(rx + rng.range(-60, 60), WORLD.minX + 12, WORLD.maxX - 12),
      z: clamp(rz + rng.range(-60, 60), WORLD.minZ + 12, WORLD.maxZ - 12),
      title: TAPE_TITLES[i % TAPE_TITLES.length],
      found: false,
    });
  }

  // Landmarks. None may sit in the sea (z > 240 fails cityCheck).
  const landmarks = [
    { id: 'pier', name: 'Wooden Pier', x: -260, z: 232 },
    { id: 'lighthouse', name: 'Marina Lighthouse', x: -300, z: 228 },
    { id: 'diner', name: "Rosa's Diner", x: DINER.x, z: DINER.z },
    { id: 'gunshop', name: 'Harbor Arms', x: GUNSHOP.x, z: GUNSHOP.z },
    { id: 'neonarch', name: 'Neon Arch', x: 0, z: 40 },
    { id: 'crane', name: 'Harbor Crane', x: 240, z: 0 },
    { id: 'viewpoint', name: 'Hill Viewpoint', x: -160, z: -200 },
    { id: 'towers', name: 'Glass Towers', x: 160, z: -160 },
    { id: 'helipad', name: 'Harbor Helipad', x: HELIPAD.x, z: HELIPAD.z },
    { id: 'safehouse', name: 'Safehouse', x: SAFEHOUSE.x, z: SAFEHOUSE.z },
  ];

  return {
    seed,
    nodes,
    edges,
    adj,
    nodeIndex,
    buildings,
    palms,
    lamps,
    containers,
    parked,
    tapes,
    landmarks,
    diner: DINER,
    gunshop: GUNSHOP,
    safehouse: SAFEHOUSE,
    workshop: WORKSHOP,
    helipad: HELIPAD,
    boats: MARINA_BOATS,
  };
}

// The city itself: a round island, generated once per seed. Roads are a ring
// plus six spokes plus a downtown grid; every building footprint is checked
// clear of every road centreline by ROAD_SETBACK, so no building ever covers
// a road. The same data feeds the sim, the renderer and the cityCheck gate.
import { CITY, WORLD, DISTRICTS } from './config.js';
import { MISSIONS, POSTCARDS, INTERIORS, RACE_ROUTES } from './data.js';
import { createRandom, floatBetween, intBetween, pick, dist2d } from './random.js';

/**
 * Gameplay points no building may ever cover: mission step targets,
 * postcards, interiors, race waypoints, the spawn, the safehouse, the
 * penthouse and the heli pad. A mission whose target sits inside a
 * building can never be finished, whatever the seed.
 */
export const PROTECTED_POINTS = (() => {
  const pts = [
    { x: 330, y: 396 }, // player spawn, Marina Boulevard
    { x: 210, y: 150 }, // Old Town Safehouse
    { x: 300, y: 210 }, // Penthouse Tower
    { x: 320, y: 200 }, // heli pad, Bank Tower forecourt
    { x: 330, y: 400 }, // parked coupe
  ];
  for (const m of MISSIONS) for (const st of m.steps) pts.push({ x: st.x, y: st.y });
  for (const p of POSTCARDS) pts.push({ x: p.x, y: p.y });
  for (const i of INTERIORS) pts.push({ x: i.x, y: i.y });
  for (const r of RACE_ROUTES) for (const [x, y] of r.path) pts.push({ x, y });
  return pts;
})();

function clearOfProtected(x, z, halfDiag) {
  for (const p of PROTECTED_POINTS) {
    if (dist2d(x, z, p.x, p.y) < halfDiag + 10) return false;
  }
  return true;
}

export const ROAD_WIDTH = 10;
export const SIDEWALK_WIDTH = 2.4;

function distToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (pz - az) * dz) / len2;
  t = Math.max(0, Math.min(1, t));
  return dist2d(px, pz, ax + t * dx, az + t * dz);
}

/**
 * True when a footprint centre is clear of every road: at least the
 * 12 m setback from the centreline, and far enough that no corner of the
 * footprint touches the asphalt. Both conditions, whichever is stricter.
 */
export function footprintClearOfRoads(x, z, roads, halfDiag) {
  const need = Math.max(ROAD_WIDTH / 2 + CITY.roadSetback, ROAD_WIDTH / 2 + halfDiag);
  for (const road of roads) {
    if (distToSegment(x, z, road.x1, road.z1, road.x2, road.z2) < need) return false;
  }
  return true;
}

function ringRoad(cx, cz, radius, segments) {
  const roads = [];
  for (let i = 0; i < segments; i += 1) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    roads.push({ x1: cx + Math.cos(a0) * radius, z1: cz + Math.sin(a0) * radius * 0.75, x2: cx + Math.cos(a1) * radius, z2: cz + Math.sin(a1) * radius * 0.75, ring: true });
  }
  return roads;
}

function spokeRoads(cx, cz, radius, count) {
  const roads = [];
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2 + 0.26;
    roads.push({ x1: cx, z1: cz, x2: cx + Math.cos(a) * radius, z2: cz + Math.sin(a) * radius * 0.75, spoke: true });
  }
  return roads;
}

function gridRoads(cx, cz, half, step) {
  const roads = [];
  for (let x = cx - half; x <= cx + half; x += step) roads.push({ x1: x, z1: cz - half, x2: x, z2: cz + half, grid: true });
  for (let z = cz - half; z <= cz + half; z += step) roads.push({ x1: cx - half, z1: z, x2: cx + half, z2: z, grid: true });
  return roads;
}

/** Pastel facade palette: warm, varied, never flat magenta or orange. */
export const FACADE_COLORS = ['#e8dcc8', '#d9c7a7', '#c8b8d9', '#a7c8d9', '#d9a7a7', '#b8d9a7', '#e8e0b8', '#c8c8c8', '#d9b8c8', '#a7b8c8'];

export const ROOF_SHAPES = ['flat', 'gable', 'hip', 'parapet', 'dome', 'sawtooth'];

export function generateCity(seed) {
  const random = createRandom(seed);
  const cx = WORLD.centreX;
  const cz = WORLD.centreY;
  const roads = [
    ...ringRoad(cx, cz, 150, 24),
    ...ringRoad(cx, cz, 88, 20),
    ...spokeRoads(cx, cz, 210, 6),
    // Downtown grid, 48 m blocks: wide enough that a building centre can
    // sit 17 m clear of every road and still fit between two streets.
    ...gridRoads(cx, cz, 72, 48),
    // Marina Boulevard runs along the south shore, where the cover chase happens.
    { x1: 130, z1: 396, x2: 510, z2: 396, boulevard: true },
    { x1: 130, z1: 84, x2: 510, z2: 84, boulevard: true },
  ];

  const buildings = [];
  // Candidates on a jittered grid cover the island evenly; pure random
  // sampling kept missing the gaps between roads and stalled near 100.
  const candidates = [];
  for (let gx = 70; gx <= 570; gx += 22) {
    for (let gz = 50; gz <= 430; gz += 22) {
      candidates.push({ x: gx + floatBetween(random, -7, 7), z: gz + floatBetween(random, -7, 7) });
    }
  }
  // A second, offset grid fills the gaps the first grid's roads ate.
  for (let gx = 81; gx <= 570; gx += 22) {
    for (let gz = 61; gz <= 430; gz += 22) {
      candidates.push({ x: gx + floatBetween(random, -7, 7), z: gz + floatBetween(random, -7, 7) });
    }
  }
  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = candidates[i];
    candidates[i] = candidates[j];
    candidates[j] = tmp;
  }
  let ci = 0;
  let tries = 0;
  while (buildings.length < CITY.buildingCount && (ci < candidates.length || tries < 8000)) {
    let x;
    let z;
    if (ci < candidates.length) {
      x = candidates[ci].x;
      z = candidates[ci].z;
      ci += 1;
    } else {
      tries += 1;
      const angle = random() * Math.PI * 2;
      const radius = 26 + random() * 196;
      x = cx + Math.cos(angle) * radius;
      z = cz + Math.sin(angle) * radius * 0.75;
    }
    // Ellipse test, matching the island's shape — the Euclidean test threw
    // away good plots at the north and south shores.
    const ex = (x - cx) / (WORLD.landRadius - 26);
    const ez = (z - cz) / ((WORLD.landRadius - 26) * 0.75);
    if (ex * ex + ez * ez > 1) continue;
    // Downtown blocks are small and tall; outer plots take bigger footprints.
    const downtown = dist2d(x, z, cx, cz) < 78;
    const w = downtown ? floatBetween(random, 8, 14) : floatBetween(random, 10, 18);
    const d = downtown ? floatBetween(random, 8, 14) : floatBetween(random, 10, 16);
    const halfDiag = Math.sqrt(w * w + d * d) / 2;
    if (!footprintClearOfRoads(x, z, roads, halfDiag)) continue;
    if (!clearOfProtected(x, z, halfDiag)) continue;
    let clash = false;
    for (const b of buildings) {
      if (Math.abs(b.x - x) < (b.w + w) / 2 + 2 && Math.abs(b.z - z) < (b.d + d) / 2 + 2) { clash = true; break; }
    }
    if (clash) continue;
    const floors = downtown ? intBetween(random, 6, 18) : intBetween(random, 1, 5);
    buildings.push({
      x, z, w, d, h: floors * 3.4 + 1.2, floors,
      color: pick(random, FACADE_COLORS), roof: pick(random, ROOF_SHAPES),
      lit: random(), setback: random() < 0.3, awning: random() < 0.45,
      neon: random() < 0.22 ? pick(random, ['#ff4fd8', '#37e6ff', '#ffb02e']) : null,
      rot: (random() - 0.5) * 0.12,
    });
  }

  // Landmarks sit on fixed, road-clear plots so the cover always finds them.
  const landmarks = [
    { id: 'bank-tower', name: 'Downtown Bank Tower', x: 320, y: 226, kind: 'tower', h: 68 },
    { id: 'ferris', name: 'Palma Ferris Wheel', x: 176, y: 380, kind: 'ferris', h: 42 },
    { id: 'lighthouse', name: 'Harbor Lighthouse', x: 472, y: 96, kind: 'lighthouse', h: 34 },
    { id: 'marina-pier', name: 'Marina Pier', x: 330, y: 414, kind: 'pier', h: 4 },
    { id: 'penthouse', name: 'Penthouse Tower', x: 300, y: 210, kind: 'tower', h: 52 },
  ];

  const palms = [];
  for (let i = 0; i < CITY.palmCount; i += 1) {
    const angle = random() * Math.PI * 2;
    const radius = WORLD.landRadius - 8 - random() * 26;
    const x = cx + Math.cos(angle) * radius;
    const z = cz + Math.sin(angle) * radius * 0.75;
    palms.push({ x, z, h: floatBetween(random, 5.5, 8.5), lean: floatBetween(random, -0.16, 0.16), fronds: intBetween(random, 6, 9) });
  }
  const trees = [];
  for (let i = 0; i < CITY.treeCount; i += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 30 + random() * 170;
    const x = cx + Math.cos(angle) * radius;
    const z = cz + Math.sin(angle) * radius * 0.75;
    if (dist2d(x, z, cx, cz) > WORLD.landRadius - 20) continue;
    trees.push({ x, z, h: floatBetween(random, 4, 6.5), canopy: floatBetween(random, 1.6, 2.6) });
  }

  const lamps = [];
  for (const road of roads) {
    const len = dist2d(road.x1, road.z1, road.x2, road.z2);
    const count = Math.floor(len / CITY.lampSpacing);
    for (let i = 1; i < count; i += 1) {
      const t = i / count;
      lamps.push({ x: road.x1 + (road.x2 - road.x1) * t, z: road.z1 + (road.z2 - road.z1) * t, side: i % 2 === 0 ? 1 : -1 });
    }
  }

  return { seed, roads, buildings, landmarks, palms, trees, lamps, districts: DISTRICTS };
}

/** The district whose centre is nearest a point. */
export function districtAt(x, z) {
  let best = DISTRICTS[0];
  let bestD = Infinity;
  for (const d of DISTRICTS) {
    const dd = dist2d(x, z, d.x, d.y);
    if (dd < bestD) { bestD = dd; best = d; }
  }
  return best;
}

/** True when a point is on land (inside the round map). */
export function onLand(x, z) {
  const dx = (x - WORLD.centreX) / WORLD.landRadius;
  const dz = (z - WORLD.centreY) / (WORLD.landRadius * 0.75);
  return dx * dx + dz * dz <= 1;
}

/** True when a point is in the sea (outside the beach ring). */
export function inSea(x, z) {
  const dx = (x - WORLD.centreX) / (WORLD.landRadius + 60);
  const dz = (z - WORLD.centreY) / ((WORLD.landRadius + 60) * 0.75);
  return dx * dx + dz * dz > 1;
}

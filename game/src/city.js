// SOLMAR 3D — the city itself. A round island, a ring road, a street
// grid, a coastal boulevard: the layout is generated from a seed, but
// the districts, landmarks and named streets are fixed, so every system
// (traffic, police, missions, shots) agrees on the map.
// No building footprint may sit within ROADS.setback of a road centreline.
import { WORLD, ROADS, CITY } from './config.js';
import { makeRng, clamp, dist2 } from './random.js';
import { DISTRICTS } from './data.js';

const PASTEL = [0xe8b4a0, 0xf2d8a0, 0xa8c8e8, 0xc8b4e8, 0xa8d8b4, 0xe8a8b8, 0xd8d0c0, 0x9ac8d8, 0xe8c8a0, 0xb8a8d8];
const ROOFS = ['flat', 'flat', 'flat', 'parapet', 'sloped', 'tower'];

function pointSegDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (pz - az) * dz) / len2;
  t = clamp(t, 0, 1);
  const cx = ax + t * dx;
  const cz = az + t * dz;
  return Math.sqrt(dist2(px, pz, cx, cz));
}

function insideIsland(x, z, margin) {
  return Math.sqrt(x * x + z * z) < WORLD.islandRadius - margin;
}

export function buildCity(seed) {
  const rng = makeRng(seed);
  const roads = [];
  const nodes = [];
  const edges = [];
  const nodeIndex = new Map();
  const addNode = (x, z) => {
    const key = `${Math.round(x)},${Math.round(z)}`;
    if (nodeIndex.has(key)) return nodeIndex.get(key);
    const id = nodes.length;
    nodes.push({ id, x, z });
    nodeIndex.set(key, id);
    return id;
  };
  const addEdge = (a, b) => {
    edges.push([a, b]);
  };

  // Ring road: 24 nodes around the circle.
  const ringIds = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const x = Math.cos(a) * WORLD.ringRoadRadius;
    const z = Math.sin(a) * WORLD.ringRoadRadius;
    ringIds.push(addNode(x, z));
  }
  for (let i = 0; i < 24; i++) addEdge(ringIds[i], ringIds[(i + 1) % 24]);
  // The ring polyline is CLOSED: the first node is repeated at the end,
  // so the segment from node 23 back to node 0 exists for the road
  // strip, the building setback filter, and the clearance gate. (The
  // graph edges already closed the ring; the polyline did not — a
  // building landed on the ring road at (200.8,-19.6), the race camera
  // was pushed up over its roof, and the race frame went black.)
  roads.push({ id: 'ring', name: 'Ring Road', width: ROADS.width, points: [...ringIds.map((id) => [nodes[id].x, nodes[id].z]), [nodes[ringIds[0]].x, nodes[ringIds[0]].z]] });

  // No radial avenues: a radial from the centre cuts every block it
  // crosses, and eight of them starved the city of buildings (the
  // mini-grid lost 74 of 154 in-island candidates to road distance).
  // The grid streets run out to the ring road and join it instead, so
  // the road graph stays connected and the blocks stay buildable.

  // Street grid in the middle: verticals and horizontals, 60 apart so a
  // block holds 2x2 buildings clear of the 12-unit road setback. Each
  // street runs out to the ring road and joins it, so the graph stays
  // connected without radial avenues — radials cut every central block
  // and starved the city of buildings, so there are none.
  const gridX = [-120, -60, 0, 60, 120];
  const gridZ = [-120, -60, 0, 60, 120];
  const ringRadius = WORLD.ringRoadRadius;
  const nearestRingId = (x, z) => {
    const a = Math.atan2(z, x);
    const idx = Math.round(((a < 0 ? a + Math.PI * 2 : a) / (Math.PI * 2)) * 24) % 24;
    return ringIds[idx];
  };
  const gridNode = {};
  for (const gx of gridX) {
    for (const gz of gridZ) {
      if (!insideIsland(gx, gz, 20)) continue;
      gridNode[`${gx},${gz}`] = addNode(gx, gz);
    }
  }
  for (const gx of gridX) {
    const col = gridZ.map((gz) => gridNode[`${gx},${gz}`]).filter((id) => id !== undefined);
    for (let i = 0; i + 1 < col.length; i++) addEdge(col[i], col[i + 1]);
    const zMax = Math.floor(Math.sqrt(ringRadius * ringRadius - gx * gx) / 5) * 5;
    const top = addNode(gx, zMax);
    const bottom = addNode(gx, -zMax);
    addEdge(top, nearestRingId(gx, zMax));
    addEdge(bottom, nearestRingId(gx, -zMax));
    if (col.length > 1) {
      addEdge(col[0], bottom);
      addEdge(col[col.length - 1], top);
    }
    roads.push({ id: `street-v-${gx}`, name: gx === 0 ? 'Bank Row' : 'Coral Street', width: ROADS.width, points: [[gx, -zMax], [gx, zMax]] });
  }
  for (const gz of gridZ) {
    const row = gridX.map((gx) => gridNode[`${gx},${gz}`]).filter((id) => id !== undefined);
    for (let i = 0; i + 1 < row.length; i++) addEdge(row[i], row[i + 1]);
    const xMax = Math.floor(Math.sqrt(ringRadius * ringRadius - gz * gz) / 5) * 5;
    const left = addNode(-xMax, gz);
    const right = addNode(xMax, gz);
    addEdge(left, nearestRingId(-xMax, gz));
    addEdge(right, nearestRingId(xMax, gz));
    if (row.length > 1) {
      addEdge(row[0], left);
      addEdge(row[row.length - 1], right);
    }
    roads.push({ id: `street-h-${gz}`, name: gz === -60 ? 'Gold Street' : gz === 0 ? 'Neon Avenue' : 'Palm Court', width: ROADS.width, points: [[-xMax, gz], [xMax, gz]] });
  }

  // Marina Boulevard: the coastal road on the east edge.
  const marinaPts = [];
  for (let z = -120; z <= 120; z += 30) marinaPts.push([182, z]);
  roads.push({ id: 'marina-blvd', name: 'Marina Boulevard', width: ROADS.width, points: marinaPts });
  const marinaNodes = marinaPts.map(([x, z]) => addNode(x, z));
  for (let i = 0; i + 1 < marinaNodes.length; i++) addEdge(marinaNodes[i], marinaNodes[i + 1]);
  addEdge(marinaNodes[0], nearestRingId(182, -120));
  addEdge(marinaNodes[marinaNodes.length - 1], nearestRingId(182, 120));

  // Distance from a point to the nearest road centreline.
  function distToRoads(x, z) {
    let best = Infinity;
    for (const road of roads) {
      const pts = road.points;
      for (let i = 0; i + 1 < pts.length; i++) {
        const d = pointSegDist(x, z, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
        if (d < best) best = d;
      }
    }
    return best;
  }

  // Fixed landmarks: named places missions and shots point at.
  const landmarks = [
    { id: 'bank-tower', name: 'Downtown Bank Tower', x: 30, z: -70, w: 26, d: 22, h: 85, kind: 'tower' },
    { id: 'diner', name: 'Neon Mile Diner', x: -40, z: 30, w: 20, d: 14, h: 9, kind: 'diner' },
    { id: 'penthouse', name: 'Penthouse Tower', x: 0, z: -100, w: 22, d: 20, h: 64, kind: 'tower' },
    { id: 'garage', name: 'Rosa’s Garage', x: -20, z: 62, w: 24, d: 16, h: 8, kind: 'garage' },
    { id: 'safehouse', name: 'Safehouse', x: -150, z: -20, w: 16, d: 12, h: 10, kind: 'house' },
    { id: 'helipad', name: 'Helipad', x: -60, z: -165, w: 24, d: 24, h: 2, kind: 'pad' },
    { id: 'ferris', name: 'Ferris Wheel', x: 200, z: 40, w: 18, d: 18, h: 30, kind: 'wheel' },
    { id: 'lighthouse', name: 'The Lighthouse', x: 215, z: -80, w: 8, d: 8, h: 34, kind: 'tower' },
    { id: 'market', name: 'Harbor Market', x: -90, z: -140, w: 30, d: 18, h: 10, kind: 'market' },
    { id: 'marina-bar', name: 'Marina Bar', x: 170, z: 55, w: 16, d: 12, h: 8, kind: 'bar' },
  ];

  // Buildings: two sources. (1) Block interiors: each 60x60 block holds
  // up to 2x2 buildings, jittered, with every footprint edge >= 12.5
  // from any road centreline (the 12-unit setback, plus margin).
  // (2) The annulus between the street grid and the ring road, on a
  // jittered 24-unit grid. The old single-grid pass starved the city:
  // its points sat almost on the streets (median 6 units away).
  const buildings = [];
  const placed = [];
  const debug = { candidates: 0, rejectedIsland: 0, rejectedRoad: 0, rejectedLandmark: 0, rejectedClash: 0, placed: 0, roadFailures: [] };
  const tryPlace = (x, z, big = false) => {
    debug.candidates += 1;
    if (buildings.length >= CITY.buildingTarget) return;
    if (!insideIsland(x, z, 26)) { debug.rejectedIsland += 1; return; }
    const district = nearestDistrict(x, z);
    const downtown = district.id === 'downtown';
    // Size follows the placement kind, not the district: a wide tower
    // cannot sit at a block edge, so only the centre placement is big.
    // Height still follows the district — downtown reads tall.
    const w = rng.range(9, big ? 20 : 11);
    const d = rng.range(9, big ? 18 : 11);
    if (distToRoads(x, z) < 12.5 + Math.max(w, d) / 2) {
      debug.rejectedRoad += 1;
      if (debug.roadFailures.length < 25) {
        debug.roadFailures.push({ x: +x.toFixed(1), z: +z.toFixed(1), dist: +distToRoads(x, z).toFixed(1), need: +(12.5 + Math.max(w, d) / 2).toFixed(1) });
      }
      return;
    }
    for (const lm of landmarks) {
      if (Math.abs(x - lm.x) < (lm.w / 2 + w / 2 + 2) && Math.abs(z - lm.z) < (lm.d / 2 + d / 2 + 2)) { debug.rejectedLandmark += 1; return; }
    }
    for (const p of placed) {
      if (Math.abs(x - p.x) < (w + p.w) / 2 + 2 && Math.abs(z - p.z) < (d + p.d) / 2 + 2) { debug.rejectedClash += 1; return; }
    }
    const floors = downtown ? rng.int(4, 16) : rng.int(1, 5);
    buildings.push({
      x, z, w, d, h: floors * 3.4 + 2, floors,
      color: rng.pick(PASTEL), district: district.id,
      roof: rng.pick(ROOFS), neon: rng.chance(district.id === 'neonmile' ? 0.5 : 0.12),
      awning: rng.chance(0.4), litFrac: rng.range(0.25, 0.75), rotY: rng.chance(0.5) ? 0 : Math.PI / 2,
    });
    placed.push({ x, z, w, d });
    debug.placed += 1;
  };
  const xEdges = [-180, -120, -60, 0, 60, 120, 180];
  const zEdges = [-180, -120, -60, 0, 60, 120, 180];
  for (let bi = 0; bi + 1 < xEdges.length; bi++) {
    for (let bj = 0; bj + 1 < zEdges.length; bj++) {
      // Mini-grid of centres inside the block, each at least the setback
      // plus half a building from every street. Small buildings (9-11)
      // fit 2x2; a downtown block gets one big tower at its centre
      // instead, because a wide tower cannot sit near a block edge.
      const cx = (xEdges[bi] + xEdges[bi + 1]) / 2;
      const cz = (zEdges[bj] + zEdges[bj + 1]) / 2;
      if (nearestDistrict(cx, cz).id === 'downtown') {
        tryPlace(cx + rng.range(-2, 2), cz + rng.range(-2, 2), true);
        continue;
      }
      for (let gx = xEdges[bi] + 20; gx <= xEdges[bi + 1] - 20; gx += 15) {
        for (let gz = zEdges[bj] + 20; gz <= zEdges[bj + 1] - 20; gz += 15) {
          tryPlace(gx + rng.range(-1, 1), gz + rng.range(-1, 1));
        }
      }
    }
  }
  for (let gx = -210; gx <= 210; gx += 24) {
    for (let gz = -210; gz <= 210; gz += 24) {
      if (Math.abs(gx) <= 168 && Math.abs(gz) <= 168) continue; // block area
      tryPlace(gx + rng.range(-6, 6), gz + rng.range(-6, 6));
    }
  }

  // Palms and street trees: beach palms on the east edge, street trees
  // along the grid, ring palms around the island.
  const palms = [];
  const addPalm = (x, z, kind) => {
    if (!insideIsland(x, z, 6)) return;
    if (distToRoads(x, z) < 6) return; // palms line the road edge
    palms.push({ x, z, h: rng.range(5.5, 8.5), lean: rng.range(-0.12, 0.12), kind });
  };
  for (let z = -170; z <= 170; z += 11) addPalm(196 + rng.range(-4, 4), z, 'palm');
  for (let a = 0; a < Math.PI * 2; a += 0.24) addPalm(Math.cos(a) * 196, Math.sin(a) * 196, 'palm');
  for (const gx of gridX) for (let gz = -140; gz <= 140; gz += 26) addPalm(gx + 10, gz, 'street');
  for (const gz of gridZ) for (let gx = -170; gx <= 170; gx += 26) addPalm(gx, gz + 10, 'street');
  while (palms.length > CITY.palmTarget) palms.splice(rng.int(0, palms.length - 1), 1);

  // Named road lookup for the HUD district banner.
  function districtAt(x, z) {
    return nearestDistrict(x, z);
  }
  function nearestDistrict(x, z) {
    let best = DISTRICTS[0];
    let bestD = Infinity;
    for (const d of DISTRICTS) {
      const dd = dist2(x, z, d.cx, d.cz);
      if (dd < bestD) { bestD = dd; best = d; }
    }
    return best;
  }

  return {
    seed, roads, nodes, edges, landmarks, buildings, palms, debug,
    distToRoads, districtAt,
    playerSpawn: { x: -8, z: -52, heading: Math.PI / 2 },
    carSpawn: { x: 175, z: 20, heading: Math.PI, type: 'vortex' },
    marina: { x: 190, z: 40 },
    beach: { x: 205, z: 90 },
  };
}

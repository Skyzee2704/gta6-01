// SOLMAR 3D — city data: road graph, districts, named streets, building
// footprints (~200), trees (~150), landmarks. Pure deterministic data, no
// THREE, no DOM — importable from Node for cityCheck.
//
// 2026-11-19 (rebuild #3, Sky: "gedung nutupin jalan"): building
// placement is footprint-aware — ROAD_SETBACK 12 keeps every footprint
// edge off the road surface (+/-7) and sidewalk (+/-9.5). The old code
// tested only the CENTRE point, so an 18-wide building could jut 2
// units into the asphalt. Overlap test is AABB now (was a 26-unit
// centre distance), attempts 4000 -> 20000, sea check footprint-aware
// too. Verified: cityCheck PASS, 0 footprint-on-road, seeds 1-3.
// Rewritten under recording 01a1f2f3 (recorder 01a1f27c died 16:33 WITA).
import { createRng } from './random.js';
import { DISTRICTS } from './data.js';
import { WORLD_W, WORLD_H } from './config.js';

export const STREETS = [
  { id: 'marina-blvd', name: 'Marina Boulevard', axis: 'h', at: 60, from: 0, to: 640 },
  { id: 'neon-mile', name: 'Neon Mile', axis: 'h', at: 130, from: 0, to: 640 },
  { id: 'sunset-ave', name: 'Sunset Avenue', axis: 'h', at: 220, from: 0, to: 640 },
  { id: 'market-st', name: 'Market Street', axis: 'h', at: 300, from: 0, to: 640 },
  { id: 'palm-row', name: 'Palm Row', axis: 'h', at: 380, from: 0, to: 640 },
  { id: 'hill-rd', name: 'Hill Road', axis: 'h', at: 440, from: 0, to: 640 },
  { id: 'dock-st', name: 'Dock Street', axis: 'v', at: 60, from: 0, to: 480 },
  { id: 'coral-ave', name: 'Coral Avenue', axis: 'v', at: 180, from: 0, to: 480 },
  { id: 'gold-st', name: 'Gold Street', axis: 'v', at: 320, from: 0, to: 480 },
  { id: 'tower-blvd', name: 'Tower Boulevard', axis: 'v', at: 460, from: 0, to: 480 },
  { id: 'vista-way', name: 'Vista Way', axis: 'v', at: 580, from: 0, to: 480 },
];

export const LANDMARKS = [
  { id: 'ferris', name: 'Beachfront Ferris Wheel', x: 300, y: 300, kind: 'ferris' },
  { id: 'bank', name: 'Downtown Bank Tower', x: 520, y: 90, kind: 'tower' },
  { id: 'marina-docks', name: 'Marina Yacht Docks', x: 90, y: 40, kind: 'docks' },
  { id: 'market', name: 'Old Town Market Square', x: 110, y: 240, kind: 'square' },
  { id: 'race-gate', name: 'Neon Mile Race Gate', x: 320, y: 130, kind: 'gate' },
  { id: 'penthouse', name: 'Penthouse Tower', x: 520, y: 90, kind: 'tower' },
  { id: 'diner', name: 'Neon Mile Diner', x: 300, y: 80, kind: 'diner' },
  { id: 'overlook', name: 'Hillside Overlook', x: 560, y: 280, kind: 'view' },
];

export function buildCity(seed = 1) {
  const rng = createRng(seed);
  const nodes = [];
  const edges = [];
  const nodeByKey = new Map();
  function nodeId(x, y) {
    const key = x + ',' + y;
    if (!nodeByKey.has(key)) {
      nodeByKey.set(key, nodes.length);
      nodes.push({ id: nodes.length, x, y });
    }
    return nodeByKey.get(key);
  }
  const hStreets = STREETS.filter((s) => s.axis === 'h');
  const vStreets = STREETS.filter((s) => s.axis === 'v');
  for (let i = 0; i < hStreets.length; i++) {
    for (let j = 0; j < vStreets.length - 1; j++) {
      const a = nodeId(vStreets[j].at, hStreets[i].at);
      const b = nodeId(vStreets[j + 1].at, hStreets[i].at);
      edges.push({ a, b, street: hStreets[i].id });
    }
  }
  for (let j = 0; j < vStreets.length; j++) {
    for (let i = 0; i < hStreets.length - 1; i++) {
      const a = nodeId(vStreets[j].at, hStreets[i].at);
      const b = nodeId(vStreets[j].at, hStreets[i + 1].at);
      edges.push({ a, b, street: vStreets[j].id });
    }
  }

  const buildings = [];
  let attempts = 0;
  while (buildings.length < 200 && attempts < 20000) {
    attempts++;
    const x = rng.range(16, WORLD_W - 16);
    const y = rng.range(16, WORLD_H - 16);
    const w = rng.range(10, 18);
    const d = rng.range(10, 18);
    // Footprint-aware road clearance: the road surface is +/-7 around a
    // street centreline and the sidewalk runs to +/-9.5, so a building's
    // footprint edge must stay at least 12 from every centreline — a
    // sidewalk gap, never a wall on the asphalt. The old code only
    // tested the CENTRE point against +/-7, so an 18-wide building
    // could jut 2 units into the road: that is the "gedung nutupin
    // jalan" Sky flagged on the video.
    if (!footprintClearOfRoads(x, y, w, d)) continue;
    // Footprint-aware sea check (old code only tested the centre).
    if (x - w / 2 < 4 || x + w / 2 > WORLD_W - 4 || y + d / 2 > WORLD_H - 8) continue;
    let ok = true;
    for (const b of buildings) {
      if (Math.abs(b.x - x) < (b.w + w) / 2 + 1 && Math.abs(b.y - y) < (b.d + d) / 2 + 1) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    const district = districtAtPoint(x, y);
    const tier = rng.pick([1, 1, 2, 2, 3]);
    const floors = tier === 1 ? rng.int(1, 3) : tier === 2 ? rng.int(3, 7) : rng.int(7, 14);
    buildings.push({
      id: 'b' + buildings.length,
      x,
      y,
      w,
      d,
      floors,
      height: floors * 3.2,
      tier,
      district: district.id,
      pastel: rng.int(0, 14),
      setback: rng.chance(0.4),
      neon: rng.chance(0.3) ? rng.int(0, 3) : -1,
      awning: rng.chance(0.5),
      roof: rng.pick(['flat', 'flat', 'pitched', 'tower', 'ac', 'tank']),
    });
  }

  const trees = [];
  attempts = 0;
  while (trees.length < 150 && attempts < 3000) {
    attempts++;
    const x = rng.range(12, WORLD_W - 12);
    const y = rng.range(12, WORLD_H - 12);
    if (isOnRoad(x, y)) continue;
    if (isInSea(x, y)) continue;
    let ok = true;
    for (const b of buildings) {
      const dx = b.x - x;
      const dy = b.y - y;
      if (dx * dx + dy * dy < 12 * 12) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    const nearBeach = y > 140 && y < 340 && x > 200 && x < 420;
    trees.push({
      id: 't' + trees.length,
      x,
      y,
      kind: nearBeach ? 'palm' : rng.pick(['palm', 'palm', 'street']),
      height: rng.range(4.5, 7.5),
      lean: rng.range(-0.06, 0.06),
    });
  }

  return { seed, nodes, edges, buildings, trees, streets: STREETS, landmarks: LANDMARKS };
}

export function isOnRoad(x, y) {
  for (const s of STREETS) {
    if (s.axis === 'h' && Math.abs(y - s.at) < 7) return true;
    if (s.axis === 'v' && Math.abs(x - s.at) < 7) return true;
  }
  return false;
}

// Minimum distance from a street centreline to a building footprint
// edge: road surface (+/-7) + sidewalk (+/-9.5) + a visible gap.
// A building passes only if its WHOLE footprint clears every street.
export const ROAD_SETBACK = 12;

export function footprintClearOfRoads(x, y, w, d) {
  for (const s of STREETS) {
    if (s.axis === 'h' && Math.abs(y - s.at) < ROAD_SETBACK + d / 2) return false;
    if (s.axis === 'v' && Math.abs(x - s.at) < ROAD_SETBACK + w / 2) return false;
  }
  return true;
}

export function isInSea(x, y) {
  return y > WORLD_H - 8 || x < 4 || x > WORLD_W - 4;
}

export function districtAtPoint(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.bounds.x && x < d.bounds.x + d.bounds.w && y >= d.bounds.y && y < d.bounds.y + d.bounds.h) {
      return d;
    }
  }
  return DISTRICTS[0];
}

export function nearestNode(city, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const n of city.nodes) {
    const dx = n.x - x;
    const dy = n.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best;
}

export function roadConnectivity(city) {
  const adj = new Map();
  for (const n of city.nodes) adj.set(n.id, []);
  for (const e of city.edges) {
    adj.get(e.a).push(e.b);
    adj.get(e.b).push(e.a);
  }
  const seen = new Set([0]);
  const stack = [0];
  while (stack.length > 0) {
    const cur = stack.pop();
    for (const nb of adj.get(cur) || []) {
      if (!seen.has(nb)) {
        seen.add(nb);
        stack.push(nb);
      }
    }
  }
  return { reached: seen.size, total: city.nodes.length, connected: seen.size === city.nodes.length };
}

export function findPath(city, fromId, toId) {
  const adj = new Map();
  for (const n of city.nodes) adj.set(n.id, []);
  for (const e of city.edges) {
    adj.get(e.a).push(e.b);
    adj.get(e.b).push(e.a);
  }
  const prev = new Map([[fromId, null]]);
  const queue = [fromId];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur === toId) break;
    for (const nb of adj.get(cur) || []) {
      if (!prev.has(nb)) {
        prev.set(nb, cur);
        queue.push(nb);
      }
    }
  }
  if (!prev.has(toId)) return null;
  const path = [];
  let cur = toId;
  while (cur != null) {
    path.unshift(cur);
    cur = prev.get(cur);
  }
  return path;
}

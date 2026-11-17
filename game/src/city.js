// The city of Solmar: a road grid, blocks full of buildings, a park, a
// beach and a harbour, all laid out from one seed. The module also answers
// the questions the simulation keeps asking: is this point on a road, does
// this circle hit a building, where can a car or a person spawn.
import {
  WORLD_W, WORLD_H, ROAD_X, ROAD_Y, ROAD_HALF, WALK_HALF,
  DISTRICTS, LANDMARKS, PALETTE,
} from './config.js';
import { makeRng, pick, range, rangeInt, chance } from './random.js';

const ROOF_COLORS = [
  PALETTE.roofA, PALETTE.roofB, PALETTE.roofC, PALETTE.roofD, PALETTE.roofE,
];

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && y >= d.y0 && y < d.y1) return d.name;
  }
  return 'Solmar Marina';
}

export function isOnRoad(x, y) {
  for (const rx of ROAD_X) if (Math.abs(x - rx) <= ROAD_HALF) return true;
  for (const ry of ROAD_Y) if (Math.abs(y - ry) <= ROAD_HALF) return true;
  return false;
}

export function isOnSidewalk(x, y) {
  for (const rx of ROAD_X) {
    const d = Math.abs(x - rx);
    if (d > ROAD_HALF && d <= WALK_HALF) return true;
  }
  for (const ry of ROAD_Y) {
    const d = Math.abs(y - ry);
    if (d > ROAD_HALF && d <= WALK_HALF) return true;
  }
  return false;
}

export function nearestRoadX(x) {
  let best = ROAD_X[0];
  for (const rx of ROAD_X) if (Math.abs(rx - x) < Math.abs(best - x)) best = rx;
  return best;
}

export function nearestRoadY(y) {
  let best = ROAD_Y[0];
  for (const ry of ROAD_Y) if (Math.abs(ry - y) < Math.abs(best - y)) best = ry;
  return best;
}

// Build the whole city from a seed. Buildings sit inside blocks (never on a
// road), the big park takes one central block, and the southern edge is a
// beach that runs into the water.
export function createCityMap(seed) {
  const rng = makeRng(seed);
  const buildings = [];
  const trees = [];
  const parks = [];

  // One large park in the middle of town, with a pond and a ring of palms.
  const parkBlock = { x: 1088, y: 768, w: 256, h: 224 };
  parks.push(parkBlock);
  for (let i = 0; i < 14; i += 1) {
    trees.push({
      x: parkBlock.x + range(rng, 16, parkBlock.w - 16),
      y: parkBlock.y + range(rng, 16, parkBlock.h - 16),
      r: range(rng, 9, 14),
    });
  }

  for (let col = 0; col < ROAD_X.length - 1; col += 1) {
    for (let row = 0; row < ROAD_Y.length - 1; row += 1) {
      const bx0 = ROAD_X[col] + WALK_HALF + 6;
      const bx1 = ROAD_X[col + 1] - WALK_HALF - 6;
      const by0 = ROAD_Y[row] + WALK_HALF + 6;
      const by1 = ROAD_Y[row + 1] - WALK_HALF - 6;
      const bw = bx1 - bx0;
      const bh = by1 - by0;
      if (bw < 60 || bh < 60) continue;
      // The block below the last street is the beach: no buildings there.
      if (by0 > 1700) continue;
      // Skip the park block.
      if (bx0 >= parkBlock.x - 4 && bx0 <= parkBlock.x + 4
        && by0 >= parkBlock.y - 4 && by0 <= parkBlock.y + 4) continue;
      const district = districtAt(bx0 + bw / 2, by0 + bh / 2);
      const tall = district === 'Downtown' || district === 'Neon Mile';
      const count = tall ? rangeInt(rng, 2, 3) : rangeInt(rng, 1, 3);
      if (count === 1) {
        buildings.push(makeBuilding(rng, bx0, by0, bw, bh, district, tall));
      } else if (count === 2) {
        const vertical = bw > bh;
        if (vertical) {
          const split = bx0 + bw * range(rng, 0.42, 0.58);
          buildings.push(makeBuilding(rng, bx0, by0, split - bx0 - 8, bh, district, tall));
          buildings.push(makeBuilding(rng, split + 8, by0, bx1 - split - 8, bh, district, tall));
        } else {
          const split = by0 + bh * range(rng, 0.42, 0.58);
          buildings.push(makeBuilding(rng, bx0, by0, bw, split - by0 - 8, district, tall));
          buildings.push(makeBuilding(rng, bx0, split + 8, bw, by1 - split - 8, district, tall));
        }
      } else {
        const mx = bx0 + bw / 2;
        const my = by0 + bh / 2;
        buildings.push(makeBuilding(rng, bx0, by0, mx - bx0 - 6, my - by0 - 6, district, tall));
        buildings.push(makeBuilding(rng, mx + 6, by0, bx1 - mx - 6, my - by0 - 6, district, tall));
        buildings.push(makeBuilding(rng, bx0, my + 6, mx - bx0 - 6, by1 - my - 6, district, tall));
        buildings.push(makeBuilding(rng, mx + 6, my + 6, bx1 - mx - 6, by1 - my - 6, district, tall));
      }
      // A couple of street trees per block, kept on the sidewalk corners.
      if (chance(rng, 0.7)) {
        trees.push({ x: bx0 - 8, y: by0 - 8, r: range(rng, 8, 12) });
      }
      if (chance(rng, 0.5)) {
        trees.push({ x: bx1 + 8, y: by1 + 8, r: range(rng, 8, 12) });
      }
    }
  }

  // Harbour docks: rows of containers on the eastern edge.
  const containers = [];
  for (let i = 0; i < 10; i += 1) {
    containers.push({
      x: 2260 + (i % 5) * 56,
      y: 1180 + Math.floor(i / 5) * 60,
      w: 48, h: 26,
      color: pick(rng, ['#b8574f', '#4a6fa5', '#c9b458', '#3f6b4f', '#8a4a9e']),
    });
  }

  // Parking bays: flat marked rectangles where parked cars can sit. Each
  // one sits on open ground — clear of roads and of every building block —
  // so a parked car is always reachable on foot.
  const parkingLots = [
    { x: 1470, y: 20, w: 130, h: 40 },
    { x: 2420, y: 500, w: 100, h: 70 },
    { x: 2420, y: 900, w: 100, h: 70 },
    { x: 420, y: 1560, w: 120, h: 60 },
  ];

  return {
    seed,
    buildings,
    trees,
    parks,
    containers,
    parkingLots,
    beachY: 1780,
    waterY: 1860,
    landmarks: LANDMARKS,
  };
}

function makeBuilding(rng, x, y, w, h, district, tall) {
  const inset = range(rng, 4, 14);
  return {
    x: x + inset,
    y: y + inset,
    w: Math.max(40, w - inset * 2),
    h: Math.max(36, h - inset * 2),
    height: tall ? rangeInt(rng, 14, 26) : rangeInt(rng, 6, 14),
    roof: pick(rng, ROOF_COLORS),
    district,
    neon: district === 'Neon Mile' && chance(rng, 0.5),
  };
}

// Does a circle of radius r at (x, y) overlap any building? Returns the
// building it hits, or null.
export function buildingHit(city, x, y, r) {
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy < r * r) return b;
  }
  return null;
}

// Push a circle out of whatever building it overlaps. Returns true when it
// had to move the circle at all.
export function pushOutOfBuildings(city, body) {
  let moved = false;
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(body.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(body.y, b.y + b.h));
    let dx = body.x - cx;
    let dy = body.y - cy;
    let dist = Math.hypot(dx, dy);
    if (dist >= body.r) continue;
    if (dist < 0.001) {
      // Dead centre of the building: shove out along the shortest side.
      const left = body.x - b.x;
      const right = b.x + b.w - body.x;
      const top = body.y - b.y;
      const bottom = b.y + b.h - body.y;
      const m = Math.min(left, right, top, bottom);
      if (m === left) { body.x = b.x - body.r; }
      else if (m === right) { body.x = b.x + b.w + body.r; }
      else if (m === top) { body.y = b.y - body.r; }
      else { body.y = b.y + b.h + body.r; }
    } else {
      dx /= dist;
      dy /= dist;
      body.x = cx + dx * body.r;
      body.y = cy + dy * body.r;
    }
    moved = true;
  }
  return moved;
}

// A random point on a road, for spawning traffic and police.
export function randomRoadPoint(rng) {
  if (chance(rng, 0.5)) {
    return { x: pick(rng, ROAD_X), y: range(rng, 60, WORLD_H - 140) };
  }
  return { x: range(rng, 60, WORLD_W - 60), y: pick(rng, ROAD_Y) };
}

// A random point on a sidewalk, for spawning pedestrians.
export function randomSidewalkPoint(rng) {
  if (chance(rng, 0.5)) {
    const rx = pick(rng, ROAD_X);
    const side = chance(rng, 0.5) ? -1 : 1;
    return { x: rx + side * range(rng, ROAD_HALF + 4, WALK_HALF - 2), y: range(rng, 60, WORLD_H - 140) };
  }
  const ry = pick(rng, ROAD_Y);
  const side = chance(rng, 0.5) ? -1 : 1;
  return { x: range(rng, 60, WORLD_W - 60), y: ry + side * range(rng, ROAD_HALF + 4, WALK_HALF - 2) };
}

// All intersections of the road grid, the nodes traffic steers between.
export function roadIntersections() {
  const nodes = [];
  for (const rx of ROAD_X) {
    for (const ry of ROAD_Y) nodes.push({ x: rx, y: ry });
  }
  return nodes;
}

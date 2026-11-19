import { ROOF_TYPES, FACADE_MATERIALS, SIGN_TEXTS } from './data.js';
import { randomInt, randomPick, clamp } from './random.js';

export function generateBuilding(rng, lot, district) {
  const seed = Math.floor(rng() * 4294967296);
  const floors = clamp(randomInt(rng, district.minFloors, district.maxFloors), district.minFloors, district.maxFloors);
  const bays = clamp(Math.floor(lot.w / 4), 3, 8);
  const weights = ROOF_TYPES.map(r => district.roofBias[r.id] || 0);
  let ticket = rng() * weights.reduce((a, b) => a + b, 0);
  let selected = ROOF_TYPES[0];
  for (let i = 0; i < weights.length; i++) {
    ticket -= weights[i];
    if (ticket < 0) { selected = ROOF_TYPES[i]; break; }
  }
  const roof = { type: selected.id, pitch: selected.pitch || 0,
    height: Math.min(lot.w, lot.d) * selected.heightFactor, overhang: selected.overhang };
  const windows = [];
  for (let floor = 0; floor < floors; floor++) {
    for (let bay = 0; bay < bays; bay++) windows.push({ floor, bay, lit: rng() < 0.3 });
  }
  const commercial = rng() < (district.id === 'palm-heights' ? 0.25 : 0.8);
  const sign = commercial && rng() < 0.4
    ? { text: randomPick(rng, SIGN_TEXTS[district.id]), side: randomPick(rng, ['north', 'south', 'east', 'west']) } : null;
  return { ...lot, floors, bays, floorH: 3.2, totalH: floors * 3.2 + roof.height,
    roof, facade: randomPick(rng, FACADE_MATERIALS.filter(f => f.district === district.id)).material,
    baseColor: randomPick(rng, district.palette), trimColor: randomPick(rng, district.palette),
    windows, sign, tier: { base: 3.2, shaft: (floors - 2) * 3.2, crown: 3.2 + roof.height }, seed };
}

export function generateBuildingsForBlock(rng, block, district) {
  const w = block.x1 - block.x0, d = block.z1 - block.z0;
  if (w < 8 || d < 8) return [];
  const count = w >= 20 && d >= 20 ? 4 : w >= 20 || d >= 20 ? 2 : 1;
  const cols = count === 4 || (count === 2 && w >= d) ? 2 : 1;
  const rows = count / cols;
  const result = [];
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const lotW = w / cols - 2, lotD = d / rows - 2;
    if (lotW < 8 || lotD < 8) continue;
    result.push(generateBuilding(rng, { x: block.x0 + (col + 0.5) * w / cols,
      z: block.z0 + (row + 0.5) * d / rows, w: lotW, d: lotD }, district));
  }
  return result;
}

export function buildingFootprint(b) {
  return { x0: b.x - b.w / 2, z0: b.z - b.d / 2, x1: b.x + b.w / 2, z1: b.z + b.d / 2 };
}

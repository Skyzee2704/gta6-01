// Procedural building detail: window grids, rooftop clutter and shopfronts,
// derived from the city data so the renderer and the checks agree exactly.
// Windows are lit or dark per building seed, never a uniform white grid.
import { createRandom } from './random.js';

/** Window cells for one building: {col, row, lit} in facade grid space. */
export function buildingWindows(building, seed) {
  const random = createRandom(seed * 7919 + Math.floor(building.x * 13 + building.z * 7));
  const cols = Math.max(2, Math.floor(building.w / 3.2));
  const rows = Math.max(1, building.floors);
  const cells = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      // Ground floor is shops and doors, not windows.
      if (row === 0) continue;
      cells.push({ col, row, lit: random() < 0.42 });
    }
  }
  return { cols, rows, cells };
}

/** Rooftop clutter: AC boxes, antennae, water tanks and beacons. */
export function rooftopItems(building, seed) {
  const random = createRandom(seed * 104729 + Math.floor(building.x * 5 + building.z * 11));
  const items = [];
  if (building.floors >= 3) items.push({ kind: 'ac', x: -building.w * 0.22, z: -building.d * 0.18 });
  if (building.floors >= 5) items.push({ kind: 'antenna', x: building.w * 0.25, z: building.d * 0.2, h: 4 + random() * 5 });
  if (building.floors >= 2 && random() < 0.5) items.push({ kind: 'tank', x: building.w * 0.15, z: -building.d * 0.25 });
  if (building.floors >= 8) items.push({ kind: 'beacon', x: 0, z: 0 });
  if (building.setback) items.push({ kind: 'setbackFloor', floors: 1 });
  return items;
}

/** Shopfront details for ground-floor buildings with awnings. */
export function shopfront(building) {
  if (!building.awning) return null;
  return {
    awningColor: building.neon || '#2e5fa3',
    signText: building.neon ? 'OPEN' : 'SHOP',
    hasDoor: true,
  };
}

/** A short English label for a building, used on the minimap and in the HUD. */
export function buildingLabel(building, index) {
  if (building.floors >= 14) return 'Tower';
  if (building.floors >= 6) return 'Offices';
  if (building.awning) return 'Shops';
  return `Block ${index + 1}`;
}

// buildings.js — procedural building detail (sim side).
// The city generator makes footprints; this module turns each footprint
// into the detail the renderer draws: floors, window grids, roof shape,
// facade color, and a sign. No THREE here — just data. The renderer
// reads the detail and builds meshes from it.

import { hash2 } from './random.js';

// Facade colors by district.
const FACADE = {
  marina: ['#e8f4f2', '#bfe3de', '#f0e6d2'],
  old: ['#e0a866', '#c98a5a', '#d8b48a'],
  neon: ['#3a2a4a', '#2a2a3a', '#4a2a3a'],
  harbor: ['#8a7a4a', '#6a6a6a', '#9a8a5a'],
  palm: ['#f0e6d2', '#d8ecc9', '#e8d8b8'],
  downtown: ['#7fb8e0', '#a8c8d8', '#5a8ab0'],
};

// Detail for one building: window grid, roof, facade, sign.
export function buildingDetail(building) {
  const h = hash2(building.x, building.z);
  const h2 = hash2(building.z, building.x);
  const palette = FACADE[building.district] || FACADE.downtown;
  const facade = palette[Math.floor(h * palette.length)];
  const cols = Math.max(2, Math.floor(building.w / 4));
  const rows = Math.max(1, building.floors);
  // Window grid: lit windows glow at golden hour.
  const windows = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lit = hash2(building.x + c * 7, building.z + r * 13) < 0.45;
      windows.push({ col: c, row: r, lit });
    }
  }
  // Roof: a shape and a height.
  const roofHeight = building.roof === 'flat' ? 0.4 : building.roof === 'gabled' ? 2.2 : 1.6;
  // A sign for shops (ground floor, facing the street).
  const sign = h2 < 0.4 ? { text: shopSign(building, h2), lit: true } : null;
  return {
    facade,
    cols,
    rows,
    windows,
    roof: building.roof,
    roofHeight,
    sign,
    // Glass towers get reflective windows.
    glass: building.district === 'downtown',
  };
}

const SIGNS = ['MART', 'CAFE', 'HOTEL', 'SUPPLY', 'GROCERY', 'BANK', 'DINER', 'MOTEL', 'SURF', 'MOTORS'];

function shopSign(building, h) {
  return SIGNS[Math.floor(h * SIGNS.length)];
}

// All building details for a city (computed once, cached on the city).
export function cityBuildingDetails(city) {
  if (city._details) return city._details;
  city._details = city.buildings.map((b) => ({ building: b, detail: buildingDetail(b) }));
  return city._details;
}

// Count the windows that are lit (for the renderer's glow budget).
export function litWindowCount(city) {
  let n = 0;
  for (const { detail } of cityBuildingDetails(city)) {
    for (const w of detail.windows) if (w.lit) n += 1;
  }
  return n;
}

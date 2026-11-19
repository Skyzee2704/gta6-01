// SOLMAR 3D — interiors: diner and garage. Two explorable interiors with
// their own room geometry, props, and enter/exit triggers. The penthouse
// and safehouse reuse the same room builder with different palettes.
import { box } from './materials.js';

export const INTERIOR_DEFS = [
  {
    id: 'diner',
    name: 'Neon Mile Diner',
    x: 300,
    y: 80,
    w: 18,
    d: 14,
    palette: { wall: 0xe8b4b8, floor: 0x6a4a3a, counter: 0x2e6fc2 },
  },
  {
    id: 'garage',
    name: 'Solmar Garage',
    x: 420,
    y: 220,
    w: 22,
    d: 16,
    palette: { wall: 0x8a8578, floor: 0x3a3a3e, counter: 0x6a7078 },
  },
  {
    id: 'penthouse',
    name: 'Penthouse Suite',
    x: 520,
    y: 90,
    w: 16,
    d: 12,
    palette: { wall: 0xf2d8a0, floor: 0x2a2a2e, counter: 0xffd27a },
  },
  {
    id: 'safehouse',
    name: 'Safehouse',
    x: 110,
    y: 240,
    w: 12,
    d: 10,
    palette: { wall: 0xa8c8a8, floor: 0x4a3a2e, counter: 0x8e2e6f },
  },
];

export function interiorAt(x, y) {
  for (const def of INTERIOR_DEFS) {
    if (Math.abs(x - def.x) <= def.w / 2 && Math.abs(y - def.y) <= def.d / 2) {
      return def;
    }
  }
  return null;
}

export function buildInteriorRoom(def, materials) {
  const g = new THREE.Group();
  g.name = 'interior-' + def.id;
  const wallMat = new THREE.MeshStandardMaterial({ color: def.palette.wall, roughness: 0.85 });
  const floorMat = new THREE.MeshStandardMaterial({ color: def.palette.floor, roughness: 0.9 });
  const floor = box(def.w, 0.3, def.d, floorMat);
  floor.position.y = -0.15;
  g.add(floor);
  const wallN = box(def.w, 3.2, 0.3, wallMat);
  wallN.position.set(0, 1.6, -def.d / 2);
  g.add(wallN);
  const wallS = box(def.w, 3.2, 0.3, wallMat);
  wallS.position.set(0, 1.6, def.d / 2);
  g.add(wallS);
  const wallW = box(0.3, 3.2, def.d, wallMat);
  wallW.position.set(-def.w / 2, 1.6, 0);
  g.add(wallW);
  const wallE = box(0.3, 3.2, def.d, wallMat);
  wallE.position.set(def.w / 2, 1.6, 0);
  g.add(wallE);
  const counterMat = new THREE.MeshStandardMaterial({ color: def.palette.counter, roughness: 0.5 });
  const counter = box(def.w * 0.6, 1.0, 1.4, counterMat);
  counter.position.set(0, 0.5, -def.d / 2 + 2.2);
  g.add(counter);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffe9a0, emissive: 0xffc85c, emissiveIntensity: 1.4 });
  for (const lx of [-def.w / 4, def.w / 4]) {
    const lamp = box(0.6, 0.15, 0.6, lampMat);
    lamp.position.set(lx, 3.0, 0);
    g.add(lamp);
  }
  const door = box(1.6, 2.4, 0.2, materials.glassDark);
  door.position.set(0, 1.2, def.d / 2 - 0.05);
  g.add(door);
  if (def.id === 'garage') {
    const lift = box(3, 0.4, 5, materials.metal);
    lift.position.set(-def.w / 4, 0.2, 1);
    g.add(lift);
    const rack = box(0.5, 2.2, 4, materials.chrome);
    rack.position.set(def.w / 2 - 1, 1.1, 0);
    g.add(rack);
  }
  if (def.id === 'diner') {
    for (let i = 0; i < 3; i++) {
      const booth = box(1.8, 0.9, 1.0, materials.neonPink);
      booth.position.set(-def.w / 2 + 2.5 + i * 4, 0.45, def.d / 2 - 2.5);
      g.add(booth);
      const table = box(1.2, 0.1, 0.8, materials.chrome);
      table.position.set(-def.w / 2 + 2.5 + i * 4, 0.75, def.d / 2 - 3.6);
      g.add(table);
    }
  }
  g.position.set(def.x, 0, def.y);
  g.visible = false;
  return g;
}

export function enterInterior(state, def) {
  state.interior = def.id;
  state.savedPos = { x: state.playerX, y: state.playerY };
  state.playerX = def.x;
  state.playerY = def.y;
  return def;
}

export function exitInterior(state) {
  const def = INTERIOR_DEFS.find((d) => d.id === state.interior);
  state.interior = null;
  if (state.savedPos) {
    state.playerX = state.savedPos.x;
    state.playerY = state.savedPos.y;
  }
  return def;
}

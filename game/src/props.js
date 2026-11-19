// SOLMAR 3D — street furniture and trees. Kiosk, billboard, bus shelter
// with lit ad, beach umbrella + sunbather, mast-arm traffic signals,
// bench, hydrant, bin, bus stop, awning, surfboard, ferris wheel.
// ALL static parts merge into TWO meshes (standard + neon-basic) via
// mergeBoxes — the whole city props cost 2 draw calls. Trees are
// proportionate: leaning trunks, modest canopies, never giant blobs.
//
// 2026-11-19 (rebuild #3): kiosks sit ON the sidewalk (8 from the
// street centreline), never on the asphalt — the old spots were 5
// from the centreline, i.e. in the traffic lane; same for the Market
// Street shelter (was dead-centre on the road at y=300, now y=308).
// Road surface 0x4a4640 -> 0x6a655c, sidewalk 0x46494c -> 0x5c6066:
// sun-lit warm grey, still dark asphalt — the cover frame is ~45%
// road seen at a grazing golden-hour angle and the near-black
// asphalt rendered at ~0.18 luma, the biggest drag on cover luma
// (road lift alone: 0.330 -> 0.334; with the sky lift in render.js
// the cover lands at 0.370, floor 0.35). Rewritten under recording
// 01a1f2f3 (recorder 01a1f27c died 16:33 WITA).
import { createRng } from './random.js';
import { mergeBoxes, vertexMaterial, neonVertexMaterial } from './materials.js';
import { WORLD_W, WORLD_H } from './config.js';

function place(list, ox, oz, rotY, local) {
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  for (const p of local) {
    const x = p.x || 0;
    const z = p.z || 0;
    list.push({
      w: p.w,
      h: p.h,
      d: p.d,
      x: ox + x * c + z * s,
      y: p.y || 0,
      z: oz - x * s + z * c,
      rx: p.rx || 0,
      ry: (p.ry || 0) + rotY,
      rz: p.rz || 0,
      color: p.color,
    });
  }
}

function treeParts(list, neon, t) {
  const trunkH = t.height * 0.62;
  list.push({ w: 0.42, h: trunkH, d: 0.42, x: t.x, y: trunkH / 2, z: t.y, rz: t.lean, color: 0x6a4a2e });
  const canopyH = t.height * 0.38;
  const topX = t.x + t.lean * trunkH * 0.8;
  list.push({ w: t.height * 0.42, h: canopyH, d: t.height * 0.42, x: topX, y: trunkH + canopyH / 2 - 0.2, z: t.y, ry: 0.6, color: 0x3f7a3a });
  list.push({ w: t.height * 0.3, h: canopyH * 0.7, d: t.height * 0.3, x: topX + 0.5, y: trunkH + canopyH * 0.55, z: t.y + 0.4, ry: 1.2, color: 0x4a8a42 });
}

function palmParts(list, neon, t) {
  const trunkH = t.height * 0.72;
  list.push({ w: 0.36, h: trunkH, d: 0.36, x: t.x, y: trunkH / 2, z: t.y, rz: t.lean, color: 0x6a4a2e });
  const topX = t.x + t.lean * trunkH * 0.8;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    list.push({
      w: 0.18,
      h: 0.08,
      d: t.height * 0.24,
      x: topX + Math.cos(a) * t.height * 0.1,
      y: trunkH + 0.15,
      z: t.y + Math.sin(a) * t.height * 0.1,
      rx: 0.3,
      ry: -a,
      color: 0x3f7a3a,
    });
  }
}

function kioskParts(list, neon, x, y) {
  place(list, x, y, 0, [
    { w: 3.2, h: 2.6, d: 2.2, y: 1.3, color: 0xc22e2e },
    { w: 3.4, h: 0.25, d: 2.4, y: 1.1, color: 0x8a6a42 },
    { w: 3.8, h: 0.25, d: 2.8, y: 2.85, color: 0x4a4a52 },
  ]);
  place(neon, x, y, 0, [{ w: 2.6, h: 0.6, d: 0.15, y: 2.35, z: 1.18, color: 0xffd27a }]);
}

function billboardParts(list, neon, x, y, rotY, rng) {
  const stripColors = [0xff2e88, 0x00c8e8, 0xffb35c, 0x2ee85c];
  place(list, x, y, rotY, [
    { w: 0.4, h: 6, d: 0.4, x: -2, y: 3, color: 0x6a7078 },
    { w: 0.4, h: 6, d: 0.4, x: 2, y: 3, color: 0x6a7078 },
    { w: 9, h: 4, d: 0.3, y: 8, color: 0xf2f0e8 },
  ]);
  place(neon, x, y, rotY, [{ w: 9, h: 0.8, d: 0.34, y: 6.4, color: stripColors[rng.int(0, 3)] }]);
}

function shelterParts(list, neon, x, y, rotY) {
  place(list, x, y, rotY, [
    { w: 5, h: 0.2, d: 2, y: 2.6, color: 0x2a3a4a },
    { w: 5, h: 2.4, d: 0.15, y: 1.3, z: -0.9, color: 0x9fd8e8 },
    { w: 3.4, h: 0.45, d: 0.6, y: 0.5, z: -0.5, color: 0x8a6a42 },
  ]);
  place(neon, x, y, rotY, [{ w: 1.6, h: 1.1, d: 0.1, x: 1.4, y: 1.4, z: -0.78, color: 0x00c8e8 }]);
}

function signalParts(list, neon, x, y, rotY) {
  place(list, x, y, rotY, [
    { w: 0.32, h: 5.4, d: 0.32, y: 2.7, color: 0x6a7078 },
    { w: 6.5, h: 0.3, d: 0.3, x: 3.1, y: 5.2, color: 0x6a7078 },
    { w: 0.5, h: 1.1, d: 0.4, x: 1.6, y: 4.7, color: 0x141416 },
    { w: 0.5, h: 1.1, d: 0.4, x: 3.4, y: 4.7, color: 0x141416 },
    { w: 0.5, h: 1.1, d: 0.4, x: 5.2, y: 4.7, color: 0x141416 },
  ]);
  place(neon, x, y, rotY, [
    { w: 0.3, h: 0.3, d: 0.1, x: 1.6, y: 4.95, z: 0.22, color: 0x2ee85c },
    { w: 0.3, h: 0.3, d: 0.1, x: 3.4, y: 4.95, z: 0.22, color: 0x2ee85c },
    { w: 0.3, h: 0.3, d: 0.1, x: 5.2, y: 4.95, z: 0.22, color: 0x2ee85c },
  ]);
}

function beachParts(list, neon, x, y, rng) {
  const cols = [0xff2e88, 0x00c8e8, 0xffb35c, 0x2ee85c];
  const c = cols[rng.int(0, 3)];
  place(list, x, y, 0, [
    { w: 0.16, h: 2.4, d: 0.16, y: 1.2, color: 0x6a7078 },
    { w: 2.6, h: 0.4, d: 2.6, y: 2.6, ry: 0.6, color: c },
    { w: 0.7, h: 0.25, d: 1.9, x: 1.4, y: 0.35, z: 0.4, ry: 0.4, color: 0x2e6fc2 },
    { w: 0.5, h: 0.08, d: 2.2, x: -1.3, y: 0.5, z: -0.8, rx: 0.4, ry: 0.7, color: 0xffd27a },
  ]);
}

function gateParts(list, neon, x, y) {
  place(list, x, y, 0, [
    { w: 0.5, h: 6, d: 0.5, x: 0, y: 3, z: -9, color: 0x6a7078 },
    { w: 0.5, h: 6, d: 0.5, x: 0, y: 3, z: 9, color: 0x6a7078 },
  ]);
  place(neon, x, y, 0, [
    { w: 0.8, h: 1.4, d: 18, x: 0, y: 6, z: 0, color: 0xffb35c },
  ]);
}

function ferrisParts(list, neon, x, y) {
  const cabColors = [0xe8b4b8, 0xa8d8c8, 0xf2d8a0, 0xb8c8e8];
  place(list, x, y, 0, [
    { w: 0.5, h: 14, d: 0.5, x: -3, y: 7, rz: 0.24, color: 0x6a7078 },
    { w: 0.5, h: 14, d: 0.5, x: 3, y: 7, rz: -0.24, color: 0x6a7078 },
    { w: 1.2, h: 1.2, d: 1.2, y: 14, color: 0xd8dce2 },
  ]);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(6, 0.28, 8, 40),
    new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.5, metalness: 0.6 }),
  );
  rim.position.set(x, 14, y);
  const cabs = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    cabs.push({ w: 1.4, h: 1.4, d: 1.4, x: Math.cos(a) * 6, y: 14 + Math.sin(a) * 6, color: cabColors[i % 4] });
  }
  place(list, x, y, 0, cabs);
  return rim;
}

export function buildProps(city, materials) {
  const group = new THREE.Group();
  group.name = 'props';
  const rng = createRng(city.seed * 17 + 11);
  const solid = [];
  const neon = [];
  for (const s of city.streets) {
    if (s.axis === 'h') {
      solid.push({ x: WORLD_W / 2, y: 0.03, z: s.at, w: WORLD_W, d: 13, h: 0.06, color: 0x6a655c });
      solid.push({ x: WORLD_W / 2, y: 0.04, z: s.at - 8, w: WORLD_W, d: 3, h: 0.08, color: 0x5c6066 });
      solid.push({ x: WORLD_W / 2, y: 0.04, z: s.at + 8, w: WORLD_W, d: 3, h: 0.08, color: 0x5c6066 });
      for (let x = 8; x < WORLD_W; x += 16) {
        solid.push({ x, y: 0.07, z: s.at, w: 4, d: 0.5, h: 0.06, color: 0xd8a020 });
      }
    } else {
      solid.push({ x: s.at, y: 0.03, z: WORLD_H / 2, w: 13, d: WORLD_H, h: 0.06, color: 0x6a655c });
      solid.push({ x: s.at - 8, y: 0.04, z: WORLD_H / 2, w: 3, d: WORLD_H, h: 0.08, color: 0x5c6066 });
      solid.push({ x: s.at + 8, y: 0.04, z: WORLD_H / 2, w: 3, d: WORLD_H, h: 0.08, color: 0x5c6066 });
      for (let y = 8; y < WORLD_H; y += 16) {
        solid.push({ x: s.at, y: 0.07, z: y, w: 0.5, d: 4, h: 0.06, color: 0xd8a020 });
      }
    }
  }
  for (const b of city.buildings) {
    const rng = createRng(city.seed * 31 + b.id * 7 + 5);
    const cx = b.x + b.w / 2;
    const cy = b.y + b.d / 2;
    if (rng.next() < 0.3) {
      solid.push({ x: cx, y: 2.6, z: cy + b.d / 2 + 1, w: b.w * 0.7, d: 1.2, h: 0.5, color: 0x8a6f4d, ry: 0 });
    }
  }
  for (const t of city.trees) {
    if (t.kind === 'palm') palmParts(solid, neon, t);
    else treeParts(solid, neon, t);
  }
  let ferrisRim = null;
  for (const lm of city.landmarks) {
    if (lm.kind === 'ferris') ferrisRim = ferrisParts(solid, neon, lm.x, lm.y);
  }
  gateParts(solid, neon, 320, 130);
  // Kiosks sit ON the sidewalk (8 from the street centreline), never on
  // the asphalt: the old spots were 5 from the centreline, i.e. in the
  // traffic lane. Same for the Market Street shelter (was dead-centre
  // on the road at y=300).
  for (const s of [{ x: 120, y: 52 }, { x: 300, y: 138 }, { x: 480, y: 212 }]) kioskParts(solid, neon, s.x, s.y);
  billboardParts(solid, neon, 180, 200, 0.2, rng);
  billboardParts(solid, neon, 520, 320, -0.3, rng);
  shelterParts(solid, neon, 240, 140, 0);
  shelterParts(solid, neon, 420, 308, Math.PI / 2);
  signalParts(solid, neon, 180, 130, 0);
  signalParts(solid, neon, 320, 220, Math.PI / 2);
  signalParts(solid, neon, 460, 130, 0);
  beachParts(solid, neon, 250, 175, rng);
  beachParts(solid, neon, 330, 290, rng);
  beachParts(solid, neon, 210, 320, rng);
  const solidMesh = new THREE.Mesh(mergeBoxes(solid), vertexMaterial());
  solidMesh.name = 'propsSolid';
  group.add(solidMesh);
  if (ferrisRim) {
    ferrisRim.name = 'ferrisRim';
    group.add(ferrisRim);
  }
  const neonMesh = new THREE.Mesh(mergeBoxes(neon), neonVertexMaterial());
  neonMesh.name = 'propsNeon';
  group.add(neonMesh);
  return group;
}

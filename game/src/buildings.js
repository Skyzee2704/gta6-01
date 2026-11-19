// SOLMAR 3D — procedural buildings. Towers as one InstancedMesh (pastel
// per-instance colour), lit windows as one emissive InstancedMesh, neon
// signs as one InstancedMesh per colour, rooftop details instanced too.
// Browser only (uses THREE). Keeps total draw calls far under budget.
//
// 2026-11-19 (rebuild #3): facades split by tier so window rows match
// floor counts (a 1-floor shop and a 14-floor tower no longer share one
// 8-row grid stretched over any height — the flat-slab look); setback
// towers are stepped volumes (2-floor base at full footprint + a
// narrower 0.7x upper tower); roofs are real shapes now (pitched
// pyramid, tank cylinder, spire/ac/flat boxes) instead of one slab
// each; ground-floor awnings sit on the face toward the nearest
// street; lit windows on setback upper floors sit on the narrower
// upper box, not floating beside it. Rewritten under recording
// 01a1f2f3 (recorder 01a1f27c died 16:33 WITA).
import { createRng } from './random.js';
import { STREETS } from './city.js';

function makeFacadeTexture(seed, rows = 8, band = true) {
  const rng = createRng(seed * 13 + 5);
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#e8e0d0';
  g.fillRect(0, 0, 128, 256);
  const cols = 4;
  const ww = 128 / cols;
  const wh = 256 / rows;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const lit = rng.chance(0.55);
      g.fillStyle = lit ? '#ffd27a' : '#46536a';
      g.fillRect(col * ww + 5, r * wh + 6, ww - 10, wh - 12);
      if (lit) {
        g.fillStyle = 'rgba(255, 210, 122, 0.35)';
        g.fillRect(col * ww + 5, r * wh + 6, ww - 10, 3);
      }
    }
  }
  if (band) {
    g.fillStyle = '#3a3a3a';
    g.fillRect(0, 244, 128, 12);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildBuildings(city, materials) {
  const group = new THREE.Group();
  group.name = 'buildings';
  const list = city.buildings;

  const towerGeo = new THREE.BoxGeometry(1, 1, 1);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const pastelHex = [
    0xe8b4b8, 0xf2d8a0, 0xa8d8c8, 0xb8c8e8, 0xe8c8a0,
    0xd8b8e8, 0xf8e8c8, 0xa8c8a8, 0xe8a0a0, 0x98c8d8,
    0xd8d8b8, 0xc8b8d8, 0xf0c8a0, 0x88b8c8, 0xe8d8d8,
  ];

  function towerMesh(items, tex, name) {
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0.02 });
    const inst = new THREE.InstancedMesh(towerGeo, mat, Math.max(1, items.length));
    items.forEach((it, i) => {
      dummy.position.set(it.x, it.y, it.z);
      dummy.scale.set(it.w, it.h, it.d);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
      color.setHex(pastelHex[it.pastel % pastelHex.length]);
      inst.setColorAt(i, color);
    });
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.name = name;
    group.add(inst);
  }

  // Facade textures split by tier so window rows match floor counts:
  // a 1-floor shop and a 14-floor tower no longer share one 8-row
  // window grid stretched over any height (the flat-slab look).
  const tierRows = { 1: 3, 2: 7, 3: 12 };
  for (const tier of [1, 2, 3]) {
    const items = list
      .filter((b) => !b.setback && b.tier === tier)
      .map((b) => ({ x: b.x, y: b.height / 2, z: b.y, w: b.w, h: b.height, d: b.d, pastel: b.pastel }));
    if (items.length === 0) continue;
    towerMesh(items, makeFacadeTexture(city.seed + tier * 101, tierRows[tier]), 'towersT' + tier);
  }
  // Setback buildings: 2-floor base at full footprint + a narrower
  // upper tower (0.7x) — the stepped silhouette the design asks for,
  // so a tall building reads as stacked volumes, not one slab.
  const baseH = 2 * 3.2;
  const setbacks = list.filter((b) => b.setback);
  const baseItems = setbacks.map((b) => {
    const h = Math.min(baseH, b.height);
    return { x: b.x, y: h / 2, z: b.y, w: b.w, h, d: b.d, pastel: b.pastel };
  });
  if (baseItems.length > 0) {
    towerMesh(baseItems, makeFacadeTexture(city.seed + 77, 2), 'towersBase');
  }
  const upperItems = setbacks
    .filter((b) => b.height > baseH)
    .map((b) => ({
      x: b.x, y: baseH + (b.height - baseH) / 2, z: b.y,
      w: b.w * 0.7, h: b.height - baseH, d: b.d * 0.7, pastel: b.pastel,
    }));
  if (upperItems.length > 0) {
    towerMesh(upperItems, makeFacadeTexture(city.seed + 55, 8, false), 'towersUpper');
  }

  // Roofs: flat/ac/tower share one box mesh (scale varies per kind —
  // tower gets a tall thin spire); pitched gets a real pyramid and
  // tank a real cylinder, so the six roof kinds actually read
  // differently from the street instead of one flat slab each.
  const roofBoxItems = [];
  const roofPyramidItems = [];
  const roofTankItems = [];
  for (const b of list) {
    const effW = b.setback ? b.w * 0.7 : b.w;
    const effD = b.setback ? b.d * 0.7 : b.d;
    if (b.roof === 'pitched') {
      roofPyramidItems.push({ x: b.x, y: b.height + 1.25, z: b.y, w: effW * 0.55, h: 2.5, d: effD * 0.55 });
    } else if (b.roof === 'tank') {
      roofTankItems.push({ x: b.x, y: b.height + 0.8, z: b.y, r: 1.3, h: 1.6 });
    } else {
      const rh = b.roof === 'tower' ? 2.6 : b.roof === 'ac' ? 0.9 : 0.5;
      const fw = b.roof === 'tower' ? 0.28 : 0.55;
      roofBoxItems.push({ x: b.x, y: b.height + rh / 2, z: b.y, w: effW * fw, h: rh, d: effD * fw });
    }
  }
  const roofGeo = new THREE.BoxGeometry(1, 1, 1);
  const roofs = new THREE.InstancedMesh(roofGeo, materials.roof, Math.max(1, roofBoxItems.length));
  roofBoxItems.forEach((it, i) => {
    dummy.position.set(it.x, it.y, it.z);
    dummy.scale.set(it.w, it.h, it.d);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    roofs.setMatrixAt(i, dummy.matrix);
  });
  roofs.instanceMatrix.needsUpdate = true;
  roofs.name = 'rooftops';
  group.add(roofs);
  if (roofPyramidItems.length > 0) {
    const pyrGeo = new THREE.ConeGeometry(1, 1, 4);
    const pyr = new THREE.InstancedMesh(pyrGeo, materials.roof, roofPyramidItems.length);
    roofPyramidItems.forEach((it, i) => {
      dummy.position.set(it.x, it.y, it.z);
      // Cone radius 1 => square base side sqrt(2); scale the base to
      // the roof footprint and rotate 45 deg to square with it.
      dummy.scale.set(it.w / Math.SQRT2, it.h, it.d / Math.SQRT2);
      dummy.rotation.set(0, Math.PI / 4, 0);
      dummy.updateMatrix();
      pyr.setMatrixAt(i, dummy.matrix);
    });
    pyr.instanceMatrix.needsUpdate = true;
    pyr.name = 'rooftopsPitched';
    group.add(pyr);
  }
  if (roofTankItems.length > 0) {
    const tankGeo = new THREE.CylinderGeometry(1, 1, 1, 8);
    const tankMat = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.6, metalness: 0.4 });
    const tanks = new THREE.InstancedMesh(tankGeo, tankMat, roofTankItems.length);
    roofTankItems.forEach((it, i) => {
      dummy.position.set(it.x, it.y, it.z);
      dummy.scale.set(it.r, it.h, it.r);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      tanks.setMatrixAt(i, dummy.matrix);
    });
    tanks.instanceMatrix.needsUpdate = true;
    tanks.name = 'rooftopsTank';
    group.add(tanks);
  }

  // Ground-floor awnings on the face toward the nearest street.
  const awnItems = [];
  for (const b of list) {
    if (!b.awning) continue;
    let best = null;
    let bestD = Infinity;
    for (const s of STREETS) {
      const dd = s.axis === 'h' ? Math.abs(b.y - s.at) : Math.abs(b.x - s.at);
      if (dd < bestD) {
        bestD = dd;
        best = s;
      }
    }
    const s = best;
    if (s.axis === 'h') {
      const faceZ = s.at < b.y ? b.y - b.d / 2 : b.y + b.d / 2;
      const out = s.at < b.y ? -0.6 : 0.6;
      awnItems.push({ x: b.x, y: 2.6, z: faceZ + out, w: b.w * 0.7, h: 0.3, d: 1.2 });
    } else {
      const faceX = s.at < b.x ? b.x - b.w / 2 : b.x + b.w / 2;
      const out = s.at < b.x ? -0.6 : 0.6;
      awnItems.push({ x: faceX + out, y: 2.6, z: b.y, w: 1.2, h: 0.3, d: b.d * 0.7 });
    }
  }
  if (awnItems.length > 0) {
    const awnGeo = new THREE.BoxGeometry(1, 1, 1);
    const awnMat = new THREE.MeshStandardMaterial({ color: 0x8a6f4d, roughness: 0.9, metalness: 0 });
    const awns = new THREE.InstancedMesh(awnGeo, awnMat, awnItems.length);
    awnItems.forEach((it, i) => {
      dummy.position.set(it.x, it.y, it.z);
      dummy.scale.set(it.w, it.h, it.d);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      awns.setMatrixAt(i, dummy.matrix);
    });
    awns.instanceMatrix.needsUpdate = true;
    awns.name = 'awnings';
    group.add(awns);
  }

  const litGeo = new THREE.PlaneGeometry(1.4, 1.8);
  const litMat = new THREE.MeshStandardMaterial({
    color: 0xffd27a,
    emissive: 0xffb35c,
    emissiveIntensity: 1.1,
    roughness: 0.4,
  });
  const rng = createRng(city.seed * 7 + 3);
  const litCount = Math.min(420, list.length * 3);
  const lit = new THREE.InstancedMesh(litGeo, litMat, Math.max(1, litCount));
  for (let i = 0; i < litCount; i++) {
    const b = list[i % list.length];
    const floor = rng.int(1, Math.max(1, b.floors));
    const face = rng.pick([0, 1, 2, 3]);
    // Setback buildings narrow above floor 2: windows on upper floors
    // sit on the narrower upper box, not floating beside it.
    const upper = b.setback && floor > 2;
    const halfW = upper ? b.w * 0.35 : b.w / 2;
    const halfD = upper ? b.d * 0.35 : b.d / 2;
    const h = floor * 3.2 - 1.2;
    if (face === 0) {
      const along = rng.range(-halfW + 1.2, halfW - 1.2);
      dummy.position.set(b.x + along, h, b.y + halfD + 0.06);
    }
    if (face === 1) {
      const along = rng.range(-halfW + 1.2, halfW - 1.2);
      dummy.position.set(b.x + along, h, b.y - halfD - 0.06);
    }
    if (face === 2) {
      const along = rng.range(-halfD + 1.2, halfD - 1.2);
      dummy.position.set(b.x + halfW + 0.06, h, b.y + along);
    }
    if (face === 3) {
      const along = rng.range(-halfD + 1.2, halfD - 1.2);
      dummy.position.set(b.x - halfW - 0.06, h, b.y + along);
    }
    dummy.rotation.set(0, face < 2 ? 0 : Math.PI / 2, 0);
    if (face === 1) dummy.rotation.y = Math.PI;
    if (face === 3) dummy.rotation.y = -Math.PI / 2;
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    lit.setMatrixAt(i, dummy.matrix);
  }
  lit.instanceMatrix.needsUpdate = true;
  lit.name = 'litWindows';
  group.add(lit);

  const neonColors = [0xff2e88, 0x00c8e8, 0xffb35c, 0x2ee85c];
  const neonMats = neonColors.map(
    (c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.8, roughness: 0.3 }),
  );
  const neonGeo = new THREE.BoxGeometry(1, 1, 1);
  for (let n = 0; n < 4; n++) {
    const subset = list.filter((b) => b.neon === n);
    if (subset.length === 0) continue;
    const inst = new THREE.InstancedMesh(neonGeo, neonMats[n], subset.length);
    subset.forEach((b, i) => {
      const signH = Math.min(b.height - 1, 9);
      const upper = b.setback && signH > 6.4;
      const effW = upper ? b.w * 0.7 : b.w;
      const effD = upper ? b.d * 0.7 : b.d;
      dummy.position.set(b.x, signH, b.y + effD / 2 + 0.35);
      dummy.scale.set(Math.min(8, effW * 0.7), 0.9, 0.25);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
    inst.name = 'neonSigns' + n;
    group.add(inst);
  }

  return group;
}

export function buildingAt(city, x, y, margin = 0) {
  for (const b of city.buildings) {
    if (Math.abs(x - b.x) <= b.w / 2 + margin && Math.abs(y - b.y) <= b.d / 2 + margin) {
      return b;
    }
  }
  return null;
}

export function roofDiversity(city) {
  const kinds = new Set(city.buildings.map((b) => b.roof));
  const tiers = new Set(city.buildings.map((b) => b.tier));
  return { roofKinds: kinds.size, tiers: tiers.size, count: city.buildings.length };
}

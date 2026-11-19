// SOLMAR 3D — the city, built in meshes. The island is a disc, not a
// square. Roads are dark asphalt strips laid over a sand rim and grass
// interior. Buildings are instanced boxes (one draw call for all of
// them), windows are instanced too, landmarks are the only individual
// meshes — that is how 200 buildings fit in the draw-call budget.
// Every sign is flat against a wall. Nothing covers a road.
import * as THREE from 'three';
import { FACADE_COLORS, makeTextTexture } from './materials.js';
import { lerpColor } from './weather.js';

export function buildCityMeshes(scene, state, mats) {
  const city = state.city;
  const group = new THREE.Group();
  group.name = 'city';
  scene.add(group);
  // Sea, sand rim, grass interior — the round island.
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), mats.sea);
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -0.6;
  sea.name = 'sea';
  group.add(sea);
  const sand = new THREE.Mesh(new THREE.CircleGeometry(232, 48), mats.sand);
  sand.rotation.x = -Math.PI / 2;
  sand.position.y = -0.2;
  group.add(sand);
  const grass = new THREE.Mesh(new THREE.CircleGeometry(226, 48), mats.grass);
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.1;
  group.add(grass);
  // Sky dome, sun, moon, clouds.
  const sky = new THREE.Mesh(new THREE.SphereGeometry(480, 24, 16), mats.sky);
  sky.name = 'sky';
  group.add(sky);
  const sun = new THREE.Mesh(new THREE.CircleGeometry(18, 24), mats.sun);
  sun.name = 'sun';
  group.add(sun);
  const moon = new THREE.Mesh(new THREE.CircleGeometry(9, 24), mats.moon);
  moon.name = 'moon';
  group.add(moon);
  const cloudGeo = new THREE.SphereGeometry(1, 8, 6);
  const clouds = new THREE.InstancedMesh(cloudGeo, mats.cloud, 10);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    p.set(Math.cos(a) * 200, 90 + (i % 3) * 18, Math.sin(a) * 200);
    s.set(28 + (i % 3) * 8, 5, 16 + (i % 4) * 4);
    m4.compose(p, q, s);
    clouds.setMatrixAt(i, m4);
  }
  clouds.name = 'clouds';
  group.add(clouds);
  // Roads: merged dark-asphalt strips, one draw call. The asphalt sits
  // ABOVE the sidewalk (y 0.05 vs 0.0): the sidewalk is the wider strip
  // (14) and shows as a grey border either side of the 10-wide driving
  // surface. The old order had it backwards — the sidewalk blanketed
  // the asphalt, so no road was visible at all.
  group.add(buildStripMesh(city.roads, 10, 0.05, mats.asphalt, 'roads'));
  // Sidewalks: wider matte strips just below the asphalt.
  group.add(buildStripMesh(city.roads, 14, 0.0, mats.sidewalk, 'sidewalks'));
  // Zebra crossings: white stripes across the road at grid intersections.
  const crossings = [];
  for (const gx of [-120, -60, 0, 60, 120]) {
    for (const gz of [-120, -60, 0, 60, 120]) {
      crossings.push({ x: gx, z: gz, angle: 0 });
    }
  }
  const zebraCount = crossings.length * 5;
  const zebra = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.1, 3.2), mats.zebra, Math.max(1, zebraCount));
  let zi = 0;
  for (const c of crossings) {
    for (let k = 0; k < 5; k++) {
      p.set(c.x + (k - 2) * 1.6 * Math.cos(c.angle), 0.12, c.z - (k - 2) * 1.6 * Math.sin(c.angle));
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), c.angle);
      s.set(1, 1, 1);
      m4.compose(p, q, s);
      zebra.setMatrixAt(zi++, m4);
    }
  }
  zebra.count = zi;
  zebra.name = 'zebra';
  group.add(zebra);
  // Buildings: instanced boxes, one draw call, facades from the palette.
  const bodies = city.buildings;
  const bodyGeo = new THREE.BoxGeometry(1, 1, 1);
  const bodiesMesh = new THREE.InstancedMesh(bodyGeo, new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 }), bodies.length);
  const color = new THREE.Color();
  bodies.forEach((b, i) => {
    p.set(b.x, b.h / 2, b.z);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), b.rotY);
    s.set(b.w, b.h, b.d);
    m4.compose(p, q, s);
    bodiesMesh.setMatrixAt(i, m4);
    color.setHex(b.color);
    bodiesMesh.setColorAt(i, color);
  });
  bodiesMesh.name = 'buildings';
  group.add(bodiesMesh);
  // Roofs: thin instanced slabs on top of each building.
  const roofs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mats.roof, bodies.length);
  bodies.forEach((b, i) => {
    p.set(b.x, b.h + 0.25, b.z);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), b.rotY);
    s.set(b.w + 0.6, 0.5, b.d + 0.6);
    m4.compose(p, q, s);
    roofs.setMatrixAt(i, m4);
  });
  roofs.name = 'roofs';
  group.add(roofs);
  // Windows: instanced lit boxes on the front face, capped per building.
  const winList = [];
  for (const b of bodies) {
    const floors = Math.min(6, Math.max(2, b.floors));
    const cols = Math.min(5, Math.max(2, Math.floor(b.w / 4)));
    for (let f = 0; f < floors; f++) {
      for (let c = 0; c < cols; c++) {
        const lit = (((b.x * 7 + b.z * 13 + f * 5 + c * 3) % 10) / 10) < b.litFrac;
        winList.push({ b, f, c, floors, cols, lit });
      }
    }
  }
  const wins = new THREE.InstancedMesh(new THREE.BoxGeometry(1.4, 1.8, 0.15), mats.windowLit, Math.max(1, winList.length));
  const winsDark = new THREE.InstancedMesh(new THREE.BoxGeometry(1.4, 1.8, 0.15), mats.windowDark, Math.max(1, winList.length));
  let wi = 0;
  let wd = 0;
  for (const w of winList) {
    const b = w.b;
    const fx = (w.c - (w.cols - 1) / 2) * (b.w / w.cols);
    const fy = 3 + w.f * ((b.h - 6) / w.floors);
    const lx = b.x + Math.sin(b.rotY) * (b.d / 2 + 0.1) + Math.cos(b.rotY) * fx;
    const lz = b.z + Math.cos(b.rotY) * (b.d / 2 + 0.1) - Math.sin(b.rotY) * fx;
    p.set(lx, fy, lz);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), b.rotY);
    s.set(1, 1, 1);
    m4.compose(p, q, s);
    if (w.lit) wins.setMatrixAt(wi++, m4);
    else winsDark.setMatrixAt(wd++, m4);
  }
  wins.count = wi;
  winsDark.count = wd;
  wins.name = 'windowsLit';
  winsDark.name = 'windowsDark';
  group.add(wins);
  group.add(winsDark);
  // Landmarks: the only individual meshes, each with its sign on the wall.
  buildLandmarks(group, state, mats);
  return group;
}

function buildStripMesh(roads, width, y, material, name) {
  const positions = [];
  const indices = [];
  let vi = 0;
  for (const road of roads) {
    const pts = road.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, z1] = pts[i];
      const [x2, z2] = pts[i + 1];
      const dx = x2 - x1;
      const dz = z2 - z1;
      const len = Math.hypot(dx, dz) || 1;
      const nx = -dz / len * width / 2;
      const nz = dx / len * width / 2;
      positions.push(x1 + nx, y, z1 + nz, x1 - nx, y, z1 - nz, x2 + nx, y, z2 + nz, x2 - nx, y, z2 - nz);
      // Winding: (v0, v2, v1) + (v1, v2, v3) so the face normal points
      // UP (+y). The old order (v0, v1, v2) wound the quad the other
      // way — the normal pointed down, the strip was backface-culled
      // from above, and no road was visible at all (the whole city
      // read as grass).
      indices.push(vi, vi + 2, vi + 1, vi + 1, vi + 2, vi + 3);
      vi += 4;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = name;
  return mesh;
}

function signMesh(text, fg, w, h) {
  const tex = makeTextTexture(text, { fg });
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  return mesh;
}

function buildLandmarks(group, state, mats) {
  const L = state.city.landmarks;
  const byId = {};
  for (const lm of L) byId[lm.id] = lm;
  const box = (x, y, z, w, h, d, mat, name) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.name = name;
    group.add(m);
    return m;
  };
  const std = (hex, r = 0.85) => new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: 0 });
  // Downtown Bank Tower — the tallest box in the city, glass front.
  const bank = byId['bank-tower'];
  if (bank) {
    box(bank.x, 42.5, bank.z, 22, 85, 22, std(0xc8d0d8, 0.5), 'bankTower');
    box(bank.x, 10, bank.z + 11.4, 16, 20, 0.4, mats.glass, 'bankGlass');
    const sign = signMesh('DOWNTOWN BANK', '#ffd34a', 20, 2.4);
    sign.position.set(bank.x, 62, bank.z + 11.6);
    group.add(sign);
  }
  // Neon Mile Diner — low box, neon sign, the 3 a.m. place.
  const diner = byId.diner;
  if (diner) {
    box(diner.x, 3, diner.z, 16, 6, 10, std(0xe8d8b8), 'diner');
    const sign = signMesh('NEON MILE DINER', '#ff5a8a', 15, 1.8);
    sign.position.set(diner.x, 7.2, diner.z + 5.2);
    group.add(sign);
    const neon = new THREE.Mesh(new THREE.BoxGeometry(16.4, 0.4, 0.4), mats.neon.pink);
    neon.position.set(diner.x, 6.4, diner.z + 5.2);
    group.add(neon);
  }
  // Penthouse Tower — home base, crown on top.
  const pent = byId.penthouse;
  if (pent) {
    box(pent.x, 30, pent.z, 18, 60, 18, std(0xd8c8a8), 'penthouse');
    box(pent.x, 61.5, pent.z, 12, 3, 12, std(0x2a2a30), 'penthouseCrown');
    const sign = signMesh('PENTHOUSE', '#ffd34a', 14, 1.7);
    sign.position.set(pent.x, 52, pent.z + 9.2);
    group.add(sign);
  }
  // Rosa's Garage — wide, open front, the mission hub.
  const garage = byId.garage;
  if (garage) {
    box(garage.x, 4, garage.z, 24, 8, 14, std(0x8a7a6a), 'garage');
    box(garage.x, 3.5, garage.z + 7.1, 20, 7, 0.3, std(0x141018), 'garageDoor');
    const sign = signMesh("ROSA'S GARAGE", '#7ad9ff', 18, 2.1);
    sign.position.set(garage.x, 9.4, garage.z + 7.2);
    group.add(sign);
  }
  // Safehouse — a small house with a porch.
  const safe = byId.safehouse;
  if (safe) {
    box(safe.x, 2.5, safe.z, 10, 5, 8, std(0xe0d0b0), 'safehouse');
    box(safe.x, 5.8, safe.z, 11, 1.6, 9, std(0x8a3a2a), 'safehouseRoof');
  }
  // Helipad — flat disc with an H, at the harbor.
  const heli = byId.helipad;
  if (heli) {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 0.6, 24), std(0x3a3a40));
    pad.position.set(heli.x, 0.3, heli.z);
    pad.name = 'helipad';
    group.add(pad);
    const h = signMesh('H', '#ffffff', 4, 4);
    h.rotation.x = -Math.PI / 2;
    h.position.set(heli.x, 0.65, heli.z);
    group.add(h);
  }
  // Ferris wheel — torus, spokes and cabins, turning slowly.
  const wheel = byId.ferris;
  if (wheel) {
    const g = new THREE.Group();
    g.position.set(wheel.x, 16, wheel.z);
    g.name = 'ferrisWheel';
    const rim = new THREE.Mesh(new THREE.TorusGeometry(14, 0.5, 8, 32), std(0xd8d8e0, 0.5));
    g.add(rim);
    for (let i = 0; i < 8; i++) {
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 28, 6), std(0xb8b8c0));
      spoke.rotation.z = (i / 8) * Math.PI;
      g.add(spoke);
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.4), mats.neon.cyan);
      cab.position.set(Math.cos(a) * 14, Math.sin(a) * 14, 0);
      g.add(cab);
    }
    const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 18, 8), std(0x6a6a70));
    leg1.position.set(-6, -8, 0);
    leg1.rotation.z = 0.4;
    g.add(leg1);
    const leg2 = leg1.clone();
    leg2.position.set(6, -8, 0);
    leg2.rotation.z = -0.4;
    g.add(leg2);
    group.add(g);
  }
  // Lighthouse — tapered tower at the marina point, light on top.
  const light = byId.lighthouse;
  if (light) {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.4, 22, 12), std(0xe8e0d0));
    tower.position.set(light.x, 11, light.z);
    tower.name = 'lighthouse';
    group.add(tower);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.6, 10, 8), mats.neon.gold);
    lamp.position.set(light.x, 23, light.z);
    group.add(lamp);
  }
  // Harbor Market — long hall with a striped awning.
  const market = byId.market;
  if (market) {
    box(market.x, 4, market.z, 26, 8, 12, std(0xc8b898), 'harborMarket');
    const awn = new THREE.Mesh(new THREE.BoxGeometry(27, 0.4, 4), std(0xd83a2a));
    awn.position.set(market.x, 7, market.z + 6);
    group.add(awn);
    const sign = signMesh('HARBOR MARKET', '#ffffff', 16, 2);
    sign.position.set(market.x, 9.2, market.z + 6.2);
    group.add(sign);
  }
  // Marina Bar — small box, cyan neon.
  const bar = byId['marina-bar'];
  if (bar) {
    box(bar.x, 3, bar.z, 12, 6, 9, std(0x3a4a5a), 'marinaBar');
    const sign = signMesh('MARINA BAR', '#7ad9ff', 11, 1.4);
    sign.position.set(bar.x, 7, bar.z + 4.7);
    group.add(sign);
  }
  // Old Town church — box plus bell tower.
  const church = byId.church;
  if (church) {
    box(church.x, 4, church.z, 12, 8, 10, std(0xd8c8a8), 'church');
    box(church.x + 7, 7, church.z, 4, 14, 4, std(0xc8b898), 'churchTower');
  }
}

// Lighting for the hour: sky colour, sun/moon position, window glow.
// Golden hour (18.6) is the locked look — warm low sun, long shadows.
export function updateCityLighting(scene, state, mats, light) {
  const sky = scene.getObjectByName('sky');
  if (sky) sky.material.color.setHex(light.sky);
  const sun = scene.getObjectByName('sun');
  const moon = scene.getObjectByName('moon');
  if (sun) {
    const el = light.sunElevation;
    sun.visible = el > -0.05;
    sun.position.set(Math.cos(light.sunAzimuth) * 420, Math.sin(el) * 420 + 20, Math.sin(light.sunAzimuth) * 420);
    sun.lookAt(0, 20, 0);
    sun.material.color.setHex(light.sunColor);
  }
  if (moon) {
    moon.visible = light.sunElevation < 0.1;
    moon.position.set(-Math.cos(light.sunAzimuth) * 400, 260, -Math.sin(light.sunAzimuth) * 400);
    moon.lookAt(0, 20, 0);
  }
  const wins = scene.getObjectByName('windowsLit');
  if (wins) {
    wins.material.emissiveIntensity = light.windowGlow;
    wins.visible = light.windowGlow > 0.05;
  }
  const lampHead = mats.lampHead;
  if (lampHead) lampHead.emissiveIntensity = light.lampGlow;
  // Neon signs glow harder after dark.
  for (const key of Object.keys(mats.neon)) {
    mats.neon[key].emissiveIntensity = 0.4 + light.neonGlow;
  }
  // Fog colour follows the sky so the horizon never pops.
  if (scene.fog) scene.fog.color.setHex(lerpColor(light.sky, 0x1a2430, 0.3));
}

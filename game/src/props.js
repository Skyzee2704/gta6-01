// SOLMAR 3D — props. Palms, street lamps, traffic lights, banners,
// postcards, the mission marker and the mission-4 crates. Palms are
// instanced (one draw call for every trunk, one for every frond) and
// look like palms: a leaning trunk, seven fronds fanning out, no
// lollipop balls. Banners hang flat on walls at real heights.
import * as THREE from 'three';
import { makeTextTexture } from './materials.js';

export function buildProps(scene, state, mats) {
  const group = new THREE.Group();
  group.name = 'props';
  scene.add(group);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  // Palms: trunk instanced cylinders, fronds instanced flat boxes.
  const palms = state.city.palms;
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.35, 0.55, 7, 7), mats.palmTrunk, Math.max(1, palms.length));
  const fronds = new THREE.InstancedMesh(new THREE.BoxGeometry(3.4, 0.18, 1.1), mats.palmLeaf, Math.max(1, palms.length * 7));
  let fi = 0;
  palms.forEach((pl, i) => {
    p.set(pl.x, 3.5, pl.z);
    q.setFromAxisAngle(up, pl.lean);
    s.set(1, 1, 1);
    m4.compose(p, q, s);
    trunks.setMatrixAt(i, m4);
    for (let f = 0; f < 7; f++) {
      const a = (f / 7) * Math.PI * 2 + pl.lean;
      const fx = pl.x + Math.cos(a) * 1.6;
      const fz = pl.z + Math.sin(a) * 1.6;
      p.set(fx, 7.2, fz);
      const e = new THREE.Euler(0, -a, 0.5);
      q.setFromEuler(e);
      m4.compose(p, q, s);
      fronds.setMatrixAt(fi++, m4);
    }
  });
  trunks.count = palms.length;
  fronds.count = fi;
  trunks.name = 'palmTrunks';
  fronds.name = 'palmFronds';
  group.add(trunks);
  group.add(fronds);
  // Street lamps: pole + head, instanced, along every road.
  const lampSpots = [];
  for (const road of state.city.roads) {
    const pts = road.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, z1] = pts[i];
      const [x2, z2] = pts[i + 1];
      const len = Math.hypot(x2 - x1, z2 - z1);
      const n = Math.floor(len / 28);
      for (let k = 1; k <= n; k++) {
        const t = k / (n + 1);
        lampSpots.push({ x: x1 + (x2 - x1) * t + 7, z: z1 + (z2 - z1) * t + 7 });
      }
    }
  }
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.14, 0.2, 7, 6), mats.lampPole, Math.max(1, lampSpots.length));
  const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.3, 0.4), mats.lampHead, Math.max(1, lampSpots.length));
  lampSpots.forEach((lp, i) => {
    p.set(lp.x, 3.5, lp.z);
    q.identity();
    s.set(1, 1, 1);
    m4.compose(p, q, s);
    poles.setMatrixAt(i, m4);
    p.set(lp.x, 7.1, lp.z);
    m4.compose(p, q, s);
    heads.setMatrixAt(i, m4);
  });
  poles.count = lampSpots.length;
  heads.count = lampSpots.length;
  group.add(poles);
  group.add(heads);
  // Traffic lights at the four big intersections: pole + three lamps.
  const tlGroup = new THREE.Group();
  tlGroup.name = 'trafficLights';
  const tlMat = new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.6 });
  const red = new THREE.MeshStandardMaterial({ color: 0xd83a2a, emissive: 0xd83a2a, emissiveIntensity: 0.9 });
  const amber = new THREE.MeshStandardMaterial({ color: 0xd8a02a, emissive: 0xd8a02a, emissiveIntensity: 0.2 });
  const green = new THREE.MeshStandardMaterial({ color: 0x2ad84a, emissive: 0x2ad84a, emissiveIntensity: 0.2 });
  const crossings = [];
  for (const gx of [-120, -60, 0, 60, 120]) {
    for (const gz of [-120, -60, 0, 60, 120]) {
      crossings.push({ x: gx, z: gz });
    }
  }
  for (const c of crossings.slice(0, 4)) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 5.4, 6), tlMat);
    pole.position.set(c.x + 6, 2.7, c.z + 6);
    tlGroup.add(pole);
    const boxM = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.9, 0.5), tlMat);
    boxM.position.set(c.x + 6, 5.6, c.z + 6);
    tlGroup.add(boxM);
    const mk = (mat, dy) => {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mat);
      lamp.position.set(c.x + 6, 5.6 + dy, c.z + 6.3);
      lamp.userData.kind = mat === red ? 'red' : mat === amber ? 'amber' : 'green';
      tlGroup.add(lamp);
      return lamp;
    };
    mk(red, 0.6);
    mk(amber, 0);
    mk(green, -0.6);
  }
  group.add(tlGroup);
  // Banners: flat against the penthouse and the diner, at real heights.
  const banner1 = bannerMesh('SOLMAR 88.5 — THE SOUND OF THE CITY', '#ffd34a', 26, 2.6);
  banner1.position.set(0, 10, -89.8);
  banner1.rotation.y = 0;
  group.add(banner1);
  const banner2 = bannerMesh('NEON MILE — RACE NIGHT FRIDAY', '#ff5a8a', 24, 2.4);
  banner2.position.set(-40, 8, 37.2);
  group.add(banner2);
  // Postcards: spinning gold diamonds, one per spot.
  const cards = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.9), mats.postcard, state.city.postcards.length);
  state.city.postcards.forEach((pc, i) => {
    p.set(pc.x, 1.6, pc.z);
    q.identity();
    s.set(1, 1, 1);
    m4.compose(p, q, s);
    cards.setMatrixAt(i, m4);
  });
  cards.name = 'postcards';
  group.add(cards);
  // Mission marker: a floating diamond over the current objective.
  const marker = new THREE.Mesh(new THREE.OctahedronGeometry(1.4), mats.marker);
  marker.name = 'missionMarker';
  marker.visible = false;
  group.add(marker);
  // Mission-4 crates: cover inside Rosa's Garage.
  const crates = new THREE.Group();
  crates.name = 'crates';
  for (let i = 0; i < 8; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), mats.crate);
    c.position.set(-20 + (i % 4) * 3.4, 0.8, 62 + Math.floor(i / 4) * 3.4);
    crates.add(c);
  }
  group.add(crates);
  return group;
}

function bannerMesh(text, fg, w, h) {
  const tex = makeTextTexture(text, { fg });
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
}

// Per-frame prop motion: marker bobbing, postcard spin, traffic lights.
export function updateProps(scene, state, dt) {
  const marker = scene.getObjectByName('missionMarker');
  if (marker) {
    const m = state.missions.marker;
    if (m) {
      marker.visible = true;
      marker.position.set(m.x, 3.2 + Math.sin(state.time.elapsed * 2) * 0.5, m.z);
      marker.rotation.y += dt * 2;
    } else {
      marker.visible = false;
    }
  }
  const cards = scene.getObjectByName('postcards');
  if (cards) {
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s = new THREE.Vector3(1, 1, 1);
    const p = new THREE.Vector3();
    state.city.postcards.forEach((pc, i) => {
      if (state.postcardsFound.has(pc.id)) {
        s.set(0.001, 0.001, 0.001);
      } else {
        s.set(1, 1, 1);
      }
      e.set(0, state.time.elapsed * 1.5 + i, 0);
      q.setFromEuler(e);
      p.set(pc.x, 1.6, pc.z);
      m4.compose(p, q, s);
      cards.setMatrixAt(i, m4);
    });
    cards.instanceMatrix.needsUpdate = true;
  }
  // Traffic lights cycle: green 8 s, amber 2 s, red 8 s.
  const tl = scene.getObjectByName('trafficLights');
  if (tl) {
    const phase = Math.floor(state.time.elapsed / 8) % 3;
    tl.children.forEach((child) => {
      if (!child.userData.kind) return;
      const mat = child.material;
      const on = (phase === 0 && child.userData.kind === 'green') ||
        (phase === 1 && child.userData.kind === 'amber') ||
        (phase === 2 && child.userData.kind === 'red');
      mat.emissiveIntensity = on ? 1.0 : 0.15;
    });
  }
  // The ferris wheel turns.
  const wheel = scene.getObjectByName('ferrisWheel');
  if (wheel) wheel.rotation.z += dt * 0.15;
}

// props.js — the prop meshes. Palms, lamps, benches, hydrants, traffic
// cones, containers, fences, and the shop signs. Props are built from
// boxes and cylinders (a palm trunk is a cylinder; the character is the
// only thing that must be box-only). Repeated props use InstancedMesh so
// a hundred palms cost two draw calls instead of two hundred.

/* global THREE */

import { mat, glow, glass } from './materials.js';

// A palm tree: a tapered trunk (cylinder) and a crown of flat fronds
// (thin boxes fanned out). Returns a Group.
export function buildPalm(height = 5) {
  const g = new THREE.Group();
  const trunkMat = mat('#8a6a45', 0.95);
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.22, height, 7),
    trunkMat,
  );
  trunk.position.y = height / 2;
  g.add(trunk);
  const frondMat = mat('#2e8b57', 0.9);
  const frondGeo = new THREE.BoxGeometry(2.2, 0.06, 0.5);
  for (let i = 0; i < 7; i++) {
    const frond = new THREE.Mesh(frondGeo, frondMat);
    const a = (i / 7) * Math.PI * 2;
    frond.position.set(Math.cos(a) * 0.7, height + 0.1, Math.sin(a) * 0.7);
    frond.rotation.y = -a;
    frond.rotation.z = 0.35;
    g.add(frond);
  }
  return g;
}

// A street lamp: a pole and a glowing head.
export function buildLamp(height = 4.5) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.12, height, 6),
    mat('#3a3a40', 0.6, 0.6),
  );
  pole.position.y = height / 2;
  g.add(pole);
  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.08, 0.08),
    mat('#3a3a40', 0.6, 0.6),
  );
  arm.position.set(0.55, height, 0);
  g.add(arm);
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.12, 0.25),
    glow('#ffe9a8', 2.0),
  );
  head.position.set(1.1, height - 0.05, 0);
  g.add(head);
  return g;
}

// A bench: seat + back + legs, all boxes.
export function buildBench() {
  const g = new THREE.Group();
  const wood = mat('#7a5230', 0.9);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.5), wood);
  seat.position.y = 0.45;
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.08), wood);
  back.position.set(0, 0.75, -0.22);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.45), mat('#333333', 0.7));
  legL.position.set(-0.75, 0.22, 0);
  const legR = legL.clone();
  legR.position.x = 0.75;
  g.add(seat, back, legL, legR);
  return g;
}

// A fire hydrant: a small cylinder + cap.
export function buildHydrant() {
  const g = new THREE.Group();
  const red = mat('#c0392b', 0.5, 0.3);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.6, 8), red);
  body.position.y = 0.3;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.15, 8), red);
  cap.position.y = 0.68;
  g.add(body, cap);
  return g;
}

// A traffic cone.
export function buildCone() {
  const g = new THREE.Group();
  const orange = mat('#e67e22', 0.8);
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.22, 0.6, 8), orange);
  cone.position.y = 0.3;
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.5), orange);
  base.position.y = 0.02;
  g.add(cone, base);
  return g;
}

// A shipping container (instanced elsewhere): a box with ribbed sides.
export function buildContainer(color = '#2e86c1') {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(6, 2.6, 2.5), mat(color, 0.7, 0.3));
  body.position.y = 1.3;
  g.add(body);
  for (let i = 0; i < 5; i++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.5, 2.55), mat('#1a1a1a', 0.8));
    rib.position.set(-2.4 + i * 1.2, 1.3, 0);
    g.add(rib);
  }
  return g;
}

// A shop sign: a projecting box that sticks out from the facade (not
// swallowed by the wall, not floating). The sign face is a glowing
// canvas texture with the shop's name.
export function buildSign(text, color = '#f5c518', w = 4, h = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#141414';
  ctx.fillRect(0, 0, 256, 64);
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 248, 56);
  ctx.fillStyle = color;
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase(), 128, 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const g = new THREE.Group();
  // The box body projects 0.5 out from the wall.
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, 0.5),
    new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.6 }),
  );
  g.add(body);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(w - 0.1, h - 0.1),
    new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.7, roughness: 0.5 }),
  );
  face.position.z = 0.26;
  g.add(face);
  return g;
}

// A helipad: a flat disc with an H.
export function buildHelipad() {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(7, 7, 0.2, 24),
    mat('#3a3a3a', 0.9),
  );
  disc.position.y = 0.1;
  g.add(disc);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(5.5, 0.25, 8, 32),
    glow('#ffd27a', 1.0),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.25;
  g.add(ring);
  return g;
}

// A boat: a hull (box) + cabin + mast.
export function buildBoat() {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 6), mat('#f0f0f0', 0.4, 0.2));
  hull.position.y = 0.4;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 2.2), glass('#cfe8f5', 0.7));
  cabin.position.set(0, 1.2, -0.5);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.15, 6.1), mat('#c0392b', 0.6));
  stripe.position.y = 0.8;
  g.add(hull, cabin, stripe);
  return g;
}

// A helicopter: body + tail + rotor.
export function buildHeli() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 1.4, 3.2), mat('#c0392b', 0.4, 0.3));
  body.position.y = 0.7;
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 3.5), mat('#c0392b', 0.4, 0.3));
  tail.position.set(0, 0.9, -3.2);
  const rotorGeo = new THREE.BoxGeometry(7, 0.05, 0.4);
  const rotor = new THREE.Mesh(rotorGeo, mat('#222222', 0.5, 0.5));
  rotor.position.y = 1.6;
  rotor.name = 'rotor';
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.4, 0.3), mat('#222222', 0.5));
  tailRotor.position.set(0.3, 0.9, -4.8);
  tailRotor.name = 'tailRotor';
  const skids = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 3.5), mat('#333333', 0.7));
  skids.position.y = -0.1;
  g.add(body, tail, rotor, tailRotor, skids);
  return g;
}

// A vehicle: body + cabin + wheels + brake lights. Built from boxes
// with shared geometry so the GPU cost stays low. The brake lights
// glow when the car brakes.
export function buildVehicle(model, color) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.5 });
  const glassMat = glass('#9fd4e8', 0.6);
  const darkMat = mat('#1a1a1a', 0.7);
  const dims = {
    sedan: { w: 1.9, l: 4.4, h: 0.7, cabinL: 2.2 },
    coupe: { w: 1.8, l: 4.0, h: 0.65, cabinL: 1.8 },
    suv: { w: 2.0, l: 4.6, h: 1.0, cabinL: 2.6 },
    pickup: { w: 2.0, l: 5.0, h: 0.9, cabinL: 1.6 },
    taxi: { w: 1.9, l: 4.4, h: 0.7, cabinL: 2.2 },
    van: { w: 2.0, l: 5.2, h: 1.6, cabinL: 4.0 },
    sports: { w: 1.9, l: 4.2, h: 0.55, cabinL: 1.6 },
    bus: { w: 2.4, l: 9.0, h: 2.2, cabinL: 7.5 },
    police: { w: 1.9, l: 4.5, h: 0.7, cabinL: 2.2 },
  }[model] || { w: 1.9, l: 4.4, h: 0.7, cabinL: 2.2 };
  const body = new THREE.Mesh(new THREE.BoxGeometry(dims.w, dims.h, dims.l), bodyMat);
  body.position.y = 0.45 + dims.h / 2;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(dims.w - 0.2, 0.55, dims.cabinL), glassMat);
  cabin.position.set(0, 0.45 + dims.h + 0.25, -0.2);
  g.add(cabin);
  // Wheels: 4 cylinders, shared geometry.
  const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelPos = [
    [-dims.w / 2 + 0.1, 0.35, dims.l / 2 - 0.8],
    [dims.w / 2 - 0.1, 0.35, dims.l / 2 - 0.8],
    [-dims.w / 2 + 0.1, 0.35, -dims.l / 2 + 0.8],
    [dims.w / 2 - 0.1, 0.35, -dims.l / 2 + 0.8],
  ];
  for (const [x, y, z] of wheelPos) {
    const wheel = new THREE.Mesh(wheelGeo, darkMat);
    wheel.position.set(x, y, z);
    g.add(wheel);
  }
  // Brake lights: two small glowing boxes at the rear.
  const brakeMat = glow('#ff2200', 0.6);
  const brakeGeo = new THREE.BoxGeometry(0.3, 0.12, 0.06);
  const brakeL = new THREE.Mesh(brakeGeo, brakeMat);
  brakeL.position.set(-dims.w / 2 + 0.35, 0.45 + dims.h * 0.6, -dims.l / 2 - 0.01);
  const brakeR = new THREE.Mesh(brakeGeo, brakeMat);
  brakeR.position.set(dims.w / 2 - 0.35, 0.45 + dims.h * 0.6, -dims.l / 2 - 0.01);
  brakeL.name = 'brakeL';
  brakeR.name = 'brakeR';
  g.add(brakeL, brakeR);
  // Taxi sign / police light bar.
  if (model === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.4), glow('#ffd27a', 1.5));
    sign.position.set(0, 0.45 + dims.h + 0.6, -0.2);
    g.add(sign);
  }
  if (model === 'police') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.15, 0.4), glow('#ff0000', 2.0));
    bar.position.set(0, 0.45 + dims.h + 0.6, -0.2);
    bar.name = 'lightBar';
    g.add(bar);
  }
  g.userData.brakeMat = brakeMat;
  return g;
}

// SOLMAR 3D — characters. Boxy but PRECISE and human: head:body 1:7.5,
// crotch at the midpoint, shoulders 2 head-widths, arms to mid-thigh,
// clear head/torso/arms/legs/hands. Walk cycle, chase cam boom 13-16,
// FOV 60-72 swing 0.35, keepClear stepping until free.
import { createRng } from './random.js';
import { box, mergeBoxes, vertexMaterial } from './materials.js';

export const CHAR_HEIGHT = 1.8;
export const HEAD = CHAR_HEIGHT / 7.5;

export function buildCharacterMesh(opts = {}) {
  const skin = opts.skin || 0xe8b890;
  const shirt = opts.shirt || 0xc22e2e;
  const pants = opts.pants || 0x2a3542;
  const hair = opts.hair || 0x2a2018;
  const g = new THREE.Group();
  const h = HEAD;
  const bodyParts = [
    { w: h * 0.9, h: h, d: h * 0.85, x: 0, y: 7 * h, z: 0, color: skin },
    { w: h * 0.95, h: h * 0.35, d: h * 0.9, x: 0, y: 7.5 * h - h * 0.18, z: 0, color: hair },
    { w: h * 0.16, h: h * 0.18, d: h * 0.14, x: 0, y: 7 * h - h * 0.05, z: h * 0.5, color: skin },
    { w: 2 * h, h: 2.6 * h, d: 1.05 * h, x: 0, y: 5 * h, z: 0, color: shirt },
    { w: 2 * h + 0.04, h: 0.22 * h, d: 1.08 * h, x: 0, y: 3.75 * h, z: 0, color: 0x141416 },
  ];
  const body = new THREE.Mesh(mergeBoxes(bodyParts), vertexMaterial());
  body.name = 'body';
  g.add(body);

  function limb(x, y, topColor, bottomColor, bottomY) {
    const grp = new THREE.Group();
    grp.position.set(x, y, 0);
    const upper = box(0.55 * h, 1.5 * h, 0.55 * h, new THREE.MeshStandardMaterial({ color: topColor, roughness: 0.85 }));
    upper.position.y = -0.75 * h;
    grp.add(upper);
    const lower = box(0.5 * h, 1.45 * h, 0.5 * h, new THREE.MeshStandardMaterial({ color: bottomColor, roughness: 0.8 }));
    lower.position.y = -2.2 * h;
    grp.add(lower);
    return grp;
  }

  const armL = limb(-1.15 * h, 6 * h, shirt, skin);
  armL.name = 'armL';
  g.add(armL);
  const armR = limb(1.15 * h, 6 * h, shirt, skin);
  armR.name = 'armR';
  g.add(armR);
  const legL = limb(-0.5 * h, 3.75 * h, pants, pants);
  legL.name = 'legL';
  g.add(legL);
  const legR = limb(0.5 * h, 3.75 * h, pants, pants);
  legR.name = 'legR';
  g.add(legR);
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf2f0e8, roughness: 0.7 });
  for (const leg of [legL, legR]) {
    const shoe = box(0.6 * h, 0.3 * h, 1.05 * h, shoeMat);
    shoe.position.set(0, -3.6 * h, 0.18 * h);
    leg.add(shoe);
  }

  g.userData = { armL, armR, legL, legR, walkPhase: 0 };
  return g;
}

// NPC pedestrians: ONE merged mesh (vertex colours), no articulation —
// the walk cycle is a bob + lean. Keeps a crowd of 14 peds at 14 draw
// calls instead of 100+. The hero (Milo) uses buildCharacterMesh.
export function buildPedMesh(look) {
  const h = HEAD;
  const skin = look.skin || 0xe8b890;
  const shirt = look.shirt || 0xc22e2e;
  const pants = look.pants || 0x2a3542;
  const hair = look.hair || 0x2a2018;
  const parts = [
    { w: h * 0.9, h: h, d: h * 0.85, x: 0, y: 7 * h, z: 0, color: skin },
    { w: h * 0.95, h: h * 0.35, d: h * 0.9, x: 0, y: 7.5 * h - h * 0.18, z: 0, color: hair },
    { w: 2 * h, h: 2.6 * h, d: 1.05 * h, x: 0, y: 5 * h, z: 0, color: shirt },
    { w: 0.55 * h, h: 3 * h, d: 0.55 * h, x: -1.15 * h, y: 4.5 * h, z: 0, color: shirt },
    { w: 0.55 * h, h: 3 * h, d: 0.55 * h, x: 1.15 * h, y: 4.5 * h, z: 0, color: shirt },
    { w: 0.62 * h, h: 3.6 * h, d: 0.62 * h, x: -0.5 * h, y: 1.9 * h, z: 0, color: pants },
    { w: 0.62 * h, h: 3.6 * h, d: 0.62 * h, x: 0.5 * h, y: 1.9 * h, z: 0, color: pants },
    { w: 0.6 * h, h: 0.3 * h, d: 1.05 * h, x: -0.5 * h, y: 0.15 * h, z: 0.18 * h, color: 0xf2f0e8 },
    { w: 0.6 * h, h: 0.3 * h, d: 1.05 * h, x: 0.5 * h, y: 0.15 * h, z: 0.18 * h, color: 0xf2f0e8 },
  ];
  const mesh = new THREE.Mesh(mergeBoxes(parts), vertexMaterial());
  mesh.userData = { walkPhase: 0, ped: true };
  return mesh;
}

export function updateWalkCycle(mesh, speed, dt) {
  const ud = mesh.userData;
  ud.walkPhase += dt * (2 + speed * 1.6);
  if (ud.armL && ud.legL) {
    const swing = Math.min(0.6, speed * 0.35) * Math.sin(ud.walkPhase);
    const swing2 = Math.min(0.6, speed * 0.35) * Math.sin(ud.walkPhase + Math.PI);
    ud.legL.rotation.x = swing;
    ud.legR.rotation.x = swing2;
    ud.armL.rotation.x = swing2 * 0.8;
    ud.armR.rotation.x = swing * 0.8;
    mesh.position.y = Math.abs(Math.sin(ud.walkPhase)) * 0.03 * Math.min(1, speed / 3);
  } else {
    mesh.position.y = Math.abs(Math.sin(ud.walkPhase)) * 0.05 * Math.min(1, speed / 2);
    mesh.rotation.z = Math.sin(ud.walkPhase) * 0.04 * Math.min(1, speed / 2);
  }
}

export function createCharacterState(opts = {}) {
  return {
    x: opts.x || 320,
    y: opts.y || 130,
    z: 0,
    heading: opts.heading || 0,
    speed: 0,
    onFoot: opts.onFoot !== false,
    mesh: null,
    walkPhase: 0,
  };
}

export function updateChaseCamera(camera, target, opts = {}) {
  let boom = opts.boom || 14;
  const height = opts.height || 6;
  const fov = opts.fov || 66;
  const heading = target.heading || 0;
  if (opts.clearFn) {
    let tries = 0;
    while (tries < 8) {
      const cx = target.x - Math.sin(heading) * boom;
      const cy = target.y - Math.cos(heading) * boom;
      if (!opts.clearFn(cx, cy)) break;
      boom *= 0.78;
      tries++;
    }
  }
  const backX = -Math.sin(heading) * boom;
  const backY = -Math.cos(heading) * boom;
  const desired = new THREE.Vector3(target.x + backX, height, target.y + backY);
  if (camera.position.distanceTo(desired) > 30) {
    camera.position.copy(desired);
  } else {
    // Frame-rate independent follow: the same lag at 60 fps and at 1 fps.
    // dt is the real frame delta (clamped by the caller); 0 means shot mode,
    // where we keep the classic 0.016 s step so the camera still converges.
    const step = opts.dt && opts.dt > 0 ? opts.dt : 0.016;
    camera.position.lerp(desired, 1 - Math.pow(0.001, step));
  }
  camera.position.y = height;
  camera.fov = fov;
  camera.updateProjectionMatrix();
  const lookX = target.x + Math.sin(heading) * 6;
  const lookY = target.y + Math.cos(heading) * 6;
  camera.lookAt(lookX, opts.lookHeight || 1.6, lookY);
  return camera;
}

export function keepClearPosition(city, x, y, buildingAtFn, minClear = 4) {
  let px = x;
  let py = y;
  let steps = 0;
  while (steps < 12) {
    const hit = buildingAtFn(city, px, py, minClear);
    if (!hit) break;
    const dx = px - hit.x;
    const dy = py - hit.y;
    const d = Math.hypot(dx, dy) || 1;
    px = hit.x + (dx / d) * (hit.w / 2 + minClear + 2);
    py = hit.y + (dy / d) * (hit.d / 2 + minClear + 2);
    steps++;
  }
  return { x: px, y: py, steps };
}

export function randomPedestrian(seed) {
  const rng = createRng(seed);
  return {
    skin: rng.pick([0xe8b890, 0xc89066, 0x8a5a3a, 0xf0c8a0]),
    shirt: rng.pick([0xc22e2e, 0x2e6fc2, 0xe0a030, 0x3f7a3a, 0x8e2e6f, 0xf2f0e8]),
    pants: rng.pick([0x2a3542, 0x4a4a52, 0x6a5a42]),
    hair: rng.pick([0x2a2018, 0x141416, 0x6a4a2e, 0x8a8a8a]),
  };
}

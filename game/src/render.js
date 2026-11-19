// SOLMAR 3D — the renderer. Three.js r160, vendored, no network. The
// camera sits behind the player — never inside a building (it is pushed
// up over any roof it would clip). Cars, peds and wheels are instanced
// meshes so the whole city fits the draw-call budget. The player
// character is built from boxes at 1:7.5 head-to-body, arms and legs
// and hands all present, walking with a real swing.
import * as THREE from 'three';
import { createMaterials } from './materials.js';
import { buildCityMeshes, updateCityLighting } from './buildings.js';
import { buildProps, updateProps } from './props.js';
import { lightAt } from './weather.js';
import { bodyParts } from './character.js';
import { NEON } from './data.js';

const VEHICLE_CAP = 64;
const PED_CAP = 64;

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  // Exposure 2.25: 2.05 left cover/race at 0.334/0.331 against the
  // 0.35 floor (measured, shots gate); the extra stop lifts the dark
  // asphalt and grass into range without touching the sun.
  renderer.toneMappingExposure = 2.4; // was 2.25: cover luma 0.356 vs the 0.35 floor — a small lift for margin, other shots stay in budget
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xf2a35e, 120, 420);
  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 1200);
  const mats = createMaterials();
  // Lights: sun (directional, shadowed), sky hemisphere, small ambient.
  const sun = new THREE.DirectionalLight(0xffd9a0, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -80;
  sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 80;
  sun.shadow.camera.bottom = -80;
  sun.shadow.camera.far = 400;
  scene.add(sun);
  scene.add(sun.target);
  const hemi = new THREE.HemisphereLight(0x8aa0c0, 0x3a2a20, 0.7);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(ambient);
  return { renderer, scene, camera, mats, sun, hemi, ambient, built: false };
}

function buildCharacterGroup(mats, opts) {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: opts.skin, roughness: 0.8 });
  const shirt = new THREE.MeshStandardMaterial({ color: opts.shirt, roughness: 0.85 });
  const pants = new THREE.MeshStandardMaterial({ color: opts.pants, roughness: 0.9 });
  const hairM = new THREE.MeshStandardMaterial({ color: opts.hair, roughness: 0.9 });
  const box = (w, h, d, mat, x, y, z, name) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.name = name;
    m.castShadow = true;
    g.add(m);
    return m;
  };
  // One source of truth: bodyParts() in character.js. 1.8 tall,
  // continuous — legs 0.86, torso 0.70, head 0.24, arms 0.72.
  const P = bodyParts();
  box(P.legL.w, P.legL.h, P.legL.d, pants, P.legL.x, P.legL.y, 0, 'legL');
  box(P.legR.w, P.legR.h, P.legR.d, pants, P.legR.x, P.legR.y, 0, 'legR');
  box(P.torso.w, P.torso.h, P.torso.d, shirt, 0, P.torso.y, 0, 'torso');
  box(P.head.w, P.head.h, P.head.d, skin, 0, P.head.y, 0, 'head');
  box(P.hair.w, P.hair.h, P.hair.d, hairM, 0, P.hair.y, 0, 'hair');
  box(P.armL.w, P.armL.h, P.armL.d, shirt, P.armL.x, P.armL.y, 0, 'armL');
  box(P.armR.w, P.armR.h, P.armR.d, shirt, P.armR.x, P.armR.y, 0, 'armR');
  box(P.handL.w, P.handL.h, P.handL.d, skin, P.handL.x, P.handL.y, 0, 'handL');
  box(P.handR.w, P.handR.h, P.handR.d, skin, P.handR.x, P.handR.y, 0, 'handR');
  return g;
}

export function buildWorld(r, state) {
  if (r.built) return;
  r.built = true;
  buildCityMeshes(r.scene, state, r.mats);
  buildProps(r.scene, state, r.mats);
  // Vehicles: body, cabin, wheels — all instanced, capacity for the
  // whole street at once. frustumCulled is OFF for every moving
  // instanced mesh: three.js caches the bounding sphere from the
  // first frame's matrices, and once the cars/peds drive away from
  // those positions the stale sphere culls the whole mesh — the
  // player's car vanished from the demo the moment it reached the
  // far pier. (Static instanced meshes — buildings, palms, lamps —
  // keep their correct spheres and stay culled normally.)
  r.vehicleBody = new THREE.InstancedMesh(new THREE.BoxGeometry(1.9, 0.55, 4.4), r.mats.carBody.clone(), VEHICLE_CAP);
  r.vehicleBody.castShadow = true;
  r.vehicleBody.frustumCulled = false;
  r.vehicleCabin = new THREE.InstancedMesh(new THREE.BoxGeometry(1.7, 0.5, 2.2), r.mats.carGlass, VEHICLE_CAP);
  r.vehicleCabin.frustumCulled = false;
  r.vehicleWheel = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 10), r.mats.wheel, VEHICLE_CAP * 4);
  r.vehicleWheel.frustumCulled = false;
  r.scene.add(r.vehicleBody);
  r.scene.add(r.vehicleCabin);
  r.scene.add(r.vehicleWheel);
  // Peds: torso, legs, head, arms — instanced, same proportions as the player.
  r.pedTorso = new THREE.InstancedMesh(new THREE.BoxGeometry(0.52, 0.70, 0.3), new THREE.MeshStandardMaterial({ roughness: 0.85 }), PED_CAP);
  r.pedLegs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.46, 0.86, 0.24), new THREE.MeshStandardMaterial({ roughness: 0.9 }), PED_CAP);
  r.pedHead = new THREE.InstancedMesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), new THREE.MeshStandardMaterial({ roughness: 0.8 }), PED_CAP);
  r.pedArm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.13, 0.72, 0.16), new THREE.MeshStandardMaterial({ roughness: 0.85 }), PED_CAP * 2);
  for (const m of [r.pedTorso, r.pedLegs, r.pedHead, r.pedArm]) m.frustumCulled = false;
  r.scene.add(r.pedTorso);
  r.scene.add(r.pedLegs);
  r.scene.add(r.pedHead);
  r.scene.add(r.pedArm);
  // The player: one full character, Milo.
  r.playerChar = buildCharacterGroup(r.mats, { skin: 0xc98f66, shirt: 0x2a4a6a, pants: 0x2a2a30, hair: 0x1a1210 });
  r.scene.add(r.playerChar);
  // The held weapon, a box model in the player's hands.
  r.weaponMesh = new THREE.Group();
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.4, metalness: 0.6 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.7 });
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.75), gunMat);
  barrel.position.set(0, 0, 0.3);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.16, 0.3), woodMat);
  stock.position.set(0, -0.04, -0.2);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.22, 0.1), gunMat);
  mag.position.set(0, -0.14, 0.08);
  r.weaponMesh.add(barrel);
  r.weaponMesh.add(stock);
  r.weaponMesh.add(mag);
  r.scene.add(r.weaponMesh);
  // Muzzle flash: a small bright plane at the barrel tip. 0.35, not
  // 0.5 — at 0.5 the frozen burst in a still covered the whole rifle;
  // the flash is a flicker in gameplay, it only needs to read as one.
  r.muzzle = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.35), new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
  r.muzzle.visible = false;
  r.scene.add(r.muzzle);
  // Helicopter (flyable) and police heli: body + tail + rotor.
  r.heliMesh = makeHeli(r.mats, 0xd83a2a);
  r.scene.add(r.heliMesh);
  r.policeHeliMesh = makeHeli(r.mats, 0x2a4a6a);
  r.scene.add(r.policeHeliMesh);
  // Boats: hull + cabin.
  r.boatMeshes = state.boats.map((b) => {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 6), new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.5 }));
    hull.position.y = 0.2;
    g.add(hull);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 2.2), r.mats.carGlass);
    cab.position.set(0, 0.9, -0.6);
    g.add(cab);
    r.scene.add(g);
    return g;
  });
  // Tracers: a line pool.
  r.tracerGeo = new THREE.BufferGeometry();
  r.tracerPos = new Float32Array(64 * 6);
  r.tracerGeo.setAttribute('position', new THREE.BufferAttribute(r.tracerPos, 3));
  r.tracerMat = new THREE.LineBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.9 });
  r.tracers = new THREE.LineSegments(r.tracerGeo, r.tracerMat);
  r.tracers.frustumCulled = false;
  r.scene.add(r.tracers);
  // Police searchlight beam: a cone from the heli to the player.
  const beamGeo = new THREE.ConeGeometry(6, 1, 16, 1, true);
  r.beam = new THREE.Mesh(beamGeo, r.mats.beam);
  r.beam.visible = false;
  r.scene.add(r.beam);
  // Interior rooms (far away at 1000, 0, 1000 so they never overlap).
  buildInteriorsMeshes(r, state);
}

function makeHeli(mats, color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 4.6), new THREE.MeshStandardMaterial({ color, roughness: 0.5 }));
  body.position.y = 0.4;
  g.add(body);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.9, 1.6), mats.carGlass);
  glass.position.set(0, 0.7, 1.6);
  g.add(glass);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 3.4), new THREE.MeshStandardMaterial({ color, roughness: 0.5 }));
  tail.position.set(0, 0.6, -3.6);
  g.add(tail);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 0.4), new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.4 }));
  rotor.position.y = 1.5;
  rotor.name = 'rotor';
  g.add(rotor);
  const skid1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 3.6), mats.lampPole);
  skid1.position.set(-0.9, -0.6, 0);
  g.add(skid1);
  const skid2 = skid1.clone();
  skid2.position.x = 0.9;
  g.add(skid2);
  return g;
}

function buildInteriorsMeshes(r, state) {
  const g = new THREE.Group();
  g.name = 'interiors';
  const IX = 1000;
  const IZ = 1000;
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x6a5a4a, roughness: 0.9 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xd8c8b0, roughness: 0.9 });
  const room = (ox, oz, w, d, name) => {
    const rm = new THREE.Group();
    rm.position.set(IX + ox, 0, IZ + oz);
    rm.name = name;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.05;
    rm.add(floor);
    const wallN = new THREE.Mesh(new THREE.BoxGeometry(w, 4, 0.3), wallMat);
    wallN.position.set(0, 2, -d / 2);
    rm.add(wallN);
    const wallS = wallN.clone();
    wallS.position.z = d / 2;
    rm.add(wallS);
    const wallW = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4, d), wallMat);
    wallW.position.set(-w / 2, 2, 0);
    rm.add(wallW);
    const wallE = wallW.clone();
    wallE.position.x = w / 2;
    rm.add(wallE);
    g.add(rm);
    return rm;
  };
  // Diner: counter + 4 tables with chairs.
  const diner = room(0, 0, 18, 12, 'interior-diner');
  const counter = new THREE.Mesh(new THREE.BoxGeometry(8, 1.1, 1.2), new THREE.MeshStandardMaterial({ color: 0x8a2a3a, roughness: 0.6 }));
  counter.position.set(0, 0.55, -4);
  diner.add(counter);
  for (let i = 0; i < 4; i++) {
    const tx = -6 + (i % 2) * 12;
    const tz = 1 + Math.floor(i / 2) * 4;
    const table = new THREE.Mesh(new THREE.BoxGeometry(2, 0.15, 2), new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.7 }));
    table.position.set(tx, 0.9, tz);
    diner.add(table);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.9, 0.2), new THREE.MeshStandardMaterial({ color: 0x2a2a30 }));
    leg.position.set(tx, 0.45, tz);
    diner.add(leg);
  }
  const neon = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 0.2), r.mats.neon.pink);
  neon.position.set(0, 3.2, -5.8);
  diner.add(neon);
  // Market: 3 stalls.
  const market = room(30, 0, 20, 14, 'interior-market');
  for (let i = 0; i < 3; i++) {
    const stall = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 2), new THREE.MeshStandardMaterial({ color: [0xd83a2a, 0x2ad84a, 0x7ad9ff][i], roughness: 0.8 }));
    stall.position.set(-6 + i * 6, 0.5, -3);
    market.add(stall);
  }
  // Garage: workbench + lift.
  const garage = room(0, 30, 20, 14, 'interior-garage');
  const bench = new THREE.Mesh(new THREE.BoxGeometry(6, 1, 1.4), new THREE.MeshStandardMaterial({ color: 0x6a6a70, roughness: 0.6, metalness: 0.4 }));
  bench.position.set(-5, 0.5, -5);
  garage.add(bench);
  const lift = new THREE.Mesh(new THREE.BoxGeometry(3, 0.4, 6), new THREE.MeshStandardMaterial({ color: 0xd8a02a, roughness: 0.5 }));
  lift.position.set(4, 0.2, 0);
  garage.add(lift);
  // Penthouse: bed, couch, TV.
  const pent = room(30, 30, 16, 12, 'interior-penthouse');
  const bed = new THREE.Mesh(new THREE.BoxGeometry(4, 0.6, 6), new THREE.MeshStandardMaterial({ color: 0x2a4a6a, roughness: 0.9 }));
  bed.position.set(-4, 0.3, -2);
  pent.add(bed);
  const couch = new THREE.Mesh(new THREE.BoxGeometry(5, 0.9, 2), new THREE.MeshStandardMaterial({ color: 0x8a2a3a, roughness: 0.9 }));
  couch.position.set(3, 0.45, 3);
  pent.add(couch);
  const tv = new THREE.Mesh(new THREE.BoxGeometry(3, 1.8, 0.2), new THREE.MeshStandardMaterial({ color: 0x0a0a12, roughness: 0.2, metalness: 0.4 }));
  tv.position.set(3, 2, -5.8);
  pent.add(tv);
  r.scene.add(g);
  void state;
}

const _v = new THREE.Vector3();
const _m4 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3(1, 1, 1);
const _p = new THREE.Vector3();
const _e = new THREE.Euler();
const _c = new THREE.Color();

function setInstance(mesh, i, x, y, z, heading, sx, sy, sz, colorHex) {
  _e.set(0, heading, 0);
  _q.setFromEuler(_e);
  _p.set(x, y, z);
  _s.set(sx, sy, sz);
  _m4.compose(_p, _q, _s);
  mesh.setMatrixAt(i, _m4);
  if (colorHex !== undefined) {
    _c.setHex(colorHex);
    mesh.setColorAt(i, _c);
  }
}

export function renderFrame(r, state, dt) {
  buildWorld(r, state);
  const p = state.player;
  const light = lightAt(state.time.hour, state.weather);
  // Sun + sky.
  const sunEl = light.sunElevation;
  const sunAz = light.sunAzimuth;
  r.sun.position.set(Math.cos(sunAz) * 200, Math.max(30, Math.sin(sunEl) * 200), Math.sin(sunAz) * 200);
  r.sun.target.position.set(p.x, 0, p.z);
  r.sun.color.setHex(light.sunColor);
  r.sun.intensity = light.sunIntensity;
  r.hemi.intensity = light.hemiIntensity;
  // Ambient 0.40 (was 0.25): the second lever for golden hour, after
  // exposure — it lifts every surface a little, including the shaded
  // faces the low sun never reaches, so the frame never goes muddy.
  r.ambient.intensity = 0.4;
  r.scene.fog.color.setHex(light.sky);
  r.scene.background = new THREE.Color(light.sky);
  updateCityLighting(r.scene, state, r.mats, light);
  updateProps(r.scene, state, dt);
  // Camera: behind the player, never inside a building.
  const cam = r.camera;
  const yaw = state.camera.yaw;
  const pitch = state.camera.pitch;
  const dist = p.onFoot ? 7 : 11;
  const cx = p.x + Math.sin(yaw) * Math.cos(pitch) * dist;
  const cz = p.z + Math.cos(yaw) * Math.cos(pitch) * dist;
  let cy = (p.onFoot ? 1.7 : 2.2) + Math.sin(pitch) * dist + 1.2;
  // Push the camera over any roof it would clip.
  for (const b of state.city.buildings) {
    if (Math.abs(cx - b.x) < b.w / 2 + 1 && Math.abs(cz - b.z) < b.d / 2 + 1 && cy < b.h + 2) {
      cy = b.h + 2;
    }
  }
  cam.position.set(cx, cy, cz);
  cam.lookAt(p.x, (p.onFoot ? 1.5 : 1.2), p.z);
  // Vehicles: player/parked cars + traffic + police cruisers, instanced.
  const vehicles = state.vehicles.concat(
    state.traffic || [],
    (state.police.units || []).filter((u) => u.kind === 'cruiser').map((u) => ({
      x: u.x, z: u.z, heading: u.heading, color: 0x1e3a5a, kind: 'car',
    })),
  );
  const n = Math.min(vehicles.length, VEHICLE_CAP);
  for (let i = 0; i < n; i++) {
    const v = vehicles[i];
    const y = 0.55;
    setInstance(r.vehicleBody, i, v.x, y, v.z, v.heading, 1, 1, 1, v.color);
    setInstance(r.vehicleCabin, i, v.x, y + 0.5, v.z - 0.3, v.heading, 1, 1, 1);
    const wheelY = 0.34;
    const offs = [[-0.85, 1.4], [0.85, 1.4], [-0.85, -1.4], [0.85, -1.4]];
    for (let w = 0; w < 4; w++) {
      const [ox, oz] = offs[w];
      const wx = v.x + Math.cos(v.heading) * ox + Math.sin(v.heading) * oz;
      const wz = v.z - Math.sin(v.heading) * ox + Math.cos(v.heading) * oz;
      _e.set(0, v.heading, Math.PI / 2);
      _q.setFromEuler(_e);
      _p.set(wx, wheelY, wz);
      _s.set(1, 1, 1);
      _m4.compose(_p, _q, _s);
      r.vehicleWheel.setMatrixAt(i * 4 + w, _m4);
    }
  }
  r.vehicleBody.count = n;
  r.vehicleCabin.count = n;
  r.vehicleWheel.count = n * 4;
  r.vehicleBody.instanceMatrix.needsUpdate = true;
  r.vehicleCabin.instanceMatrix.needsUpdate = true;
  r.vehicleWheel.instanceMatrix.needsUpdate = true;
  if (r.vehicleBody.instanceColor) r.vehicleBody.instanceColor.needsUpdate = true;
  // Peds: torso, legs, head, arms with a walk swing.
  const peds = state.peds.filter((x) => !x.dead);
  const pn = Math.min(peds.length, PED_CAP);
  for (let i = 0; i < pn; i++) {
    const ped = peds[i];
    const swing = Math.sin(ped.walkPhase) * 0.5;
    setInstance(r.pedTorso, i, ped.x, 1.21, ped.z, ped.heading, 1, 1, 1, ped.shirt);
    setInstance(r.pedLegs, i, ped.x, 0.43, ped.z, ped.heading, 1, 1, 1, ped.pants);
    setInstance(r.pedHead, i, ped.x, 1.68, ped.z, ped.heading, 1, 1, 1, ped.skin);
    const armLx = ped.x + Math.cos(ped.heading) * -0.33;
    const armLz = ped.z - Math.sin(ped.heading) * -0.33;
    const armRx = ped.x + Math.cos(ped.heading) * 0.33;
    const armRz = ped.z - Math.sin(ped.heading) * 0.33;
    _e.set(swing, ped.heading, 0);
    _q.setFromEuler(_e);
    _p.set(armLx, 1.20, armLz);
    _s.set(1, 1, 1);
    _m4.compose(_p, _q, _s);
    r.pedArm.setMatrixAt(i * 2, _m4);
    _e.set(-swing, ped.heading, 0);
    _q.setFromEuler(_e);
    _p.set(armRx, 1.20, armRz);
    _m4.compose(_p, _q, _s);
    r.pedArm.setMatrixAt(i * 2 + 1, _m4);
  }
  r.pedTorso.count = pn;
  r.pedLegs.count = pn;
  r.pedHead.count = pn;
  r.pedArm.count = pn * 2;
  for (const m of [r.pedTorso, r.pedLegs, r.pedHead, r.pedArm]) m.instanceMatrix.needsUpdate = true;
  // Player character.
  const pc = r.playerChar;
  if (p.onFoot) {
    pc.visible = true;
    pc.position.set(p.x, 0, p.z);
    pc.rotation.y = p.heading;
    const swing = Math.sin(p.walkPhase) * 0.6;
    const legL = pc.getObjectByName('legL');
    const legR = pc.getObjectByName('legR');
    const armL = pc.getObjectByName('armL');
    const armR = pc.getObjectByName('armR');
    if (legL) legL.rotation.x = swing;
    if (legR) legR.rotation.x = -swing;
    if (armL) armL.rotation.x = -swing * 0.8;
    if (armR) armR.rotation.x = swing * 0.8;
  } else {
    pc.visible = false;
  }
  // Held weapon, in the hands, always visible on foot — no right click.
  const wm = r.weaponMesh;
  if (p.onFoot) {
    wm.visible = true;
    // Forward is (sin h, cos h) — the same convention as movement
    // (character.js: heading = atan2(mx, mz)) and every vehicle. The
    // old code used the camera's (-sin, -cos) here, which put the
    // rifle 0.45 BEHIND Milo and the flash on the wrong side of him.
    const fx = Math.sin(p.heading);
    const fz = Math.cos(p.heading);
    wm.position.set(p.x + fx * 0.45 + Math.cos(p.heading) * 0.3, 1.25, p.z + fz * 0.45 - Math.sin(p.heading) * 0.3);
    wm.rotation.y = p.heading;
    wm.rotation.x = -0.15;
  } else {
    wm.visible = false;
  }
  // Muzzle flash at the barrel tip while the shot is fresh.
  if (state.weapons.muzzleFlash > 0 && p.onFoot) {
    r.muzzle.visible = true;
    const fx = Math.sin(p.heading);
    const fz = Math.cos(p.heading);
    r.muzzle.position.set(p.x + fx * 1.1, 1.3, p.z + fz * 1.1);
    r.muzzle.lookAt(cam.position);
    r.muzzle.material.opacity = state.weapons.muzzleFlash / 0.07;
  } else {
    r.muzzle.visible = false;
  }
  // Helicopters.
  const h = state.heli;
  r.heliMesh.position.set(h.x, h.y + 0.4, h.z);
  r.heliMesh.rotation.y = h.heading;
  const rotor = r.heliMesh.getObjectByName('rotor');
  if (rotor) rotor.rotation.y = h.rotor;
  const ph = state.police.heli;
  if (ph) {
    r.policeHeliMesh.visible = true;
    r.policeHeliMesh.position.set(ph.x, ph.y, ph.z);
    r.policeHeliMesh.rotation.y = ph.angle + Math.PI / 2;
    const pr = r.policeHeliMesh.getObjectByName('rotor');
    if (pr) pr.rotation.y = state.time.elapsed * 22;
  } else {
    r.policeHeliMesh.visible = false;
  }
  // Boats.
  state.boats.forEach((b, i) => {
    const g = r.boatMeshes[i];
    if (!g) return;
    g.position.set(b.x, Math.sin(state.time.elapsed * 1.2 + i) * 0.12, b.z);
    g.rotation.y = b.heading;
    g.rotation.z = Math.sin(state.time.elapsed * 0.9 + i) * 0.03;
  });
  // Tracers.
  const tr = state.combat.tracers;
  for (let i = 0; i < 64; i++) {
    const t = tr[i];
    if (t) {
      r.tracerPos[i * 6] = t.x1;
      r.tracerPos[i * 6 + 1] = t.y1;
      r.tracerPos[i * 6 + 2] = t.z1;
      r.tracerPos[i * 6 + 3] = t.x2;
      r.tracerPos[i * 6 + 4] = t.y2;
      r.tracerPos[i * 6 + 5] = t.z2;
    } else {
      r.tracerPos[i * 6] = 0;
      r.tracerPos[i * 6 + 1] = -100;
      r.tracerPos[i * 6 + 2] = 0;
      r.tracerPos[i * 6 + 3] = 0;
      r.tracerPos[i * 6 + 4] = -100;
      r.tracerPos[i * 6 + 5] = 0;
    }
  }
  r.tracerGeo.attributes.position.needsUpdate = true;
  // Searchlight beam from the police heli to the player.
  if (ph) {
    r.beam.visible = true;
    const dx = p.x - ph.x;
    const dz = p.z - ph.z;
    const len = Math.hypot(dx, ph.y, dz);
    r.beam.position.set((ph.x + p.x) / 2, ph.y / 2, (ph.z + p.z) / 2);
    r.beam.scale.set(1, len, 1);
    r.beam.lookAt(p.x, 0, p.z);
    r.beam.rotateX(Math.PI / 2);
  } else {
    r.beam.visible = false;
  }
  r.renderer.render(r.scene, cam);
}

// Project a world point to screen pixels for the HUD chevron.
export function makeProjector(r, W, H) {
  return (x, y, z) => {
    _v.set(x, y, z).project(r.camera);
    if (_v.z > 1) return { x: 0, y: 0, visible: false };
    return { x: (_v.x + 1) / 2 * W, y: (1 - _v.y) / 2 * H, visible: true };
  };
}

export function renderStats(r) {
  const info = r.renderer.info.render;
  return { drawCalls: info.calls, triangles: info.triangles };
}

export function resizeRenderer(r, W, H) {
  r.renderer.setSize(W, H, false);
  r.camera.aspect = W / H;
  r.camera.updateProjectionMatrix();
}

export { NEON };

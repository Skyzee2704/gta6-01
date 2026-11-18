// render.js — the Three.js renderer. UMD THREE (global, from
// game/vendor/three.min.js). Procedural sky dome, living sea, the city,
// vehicles, boxy people, particles, and the chase camera. No texture
// files, no network: everything is built from boxes, canvas textures,
// and a small sky shader.

/* global THREE */

import { HEAD, PERSON_HEIGHT, buildPlayer, buildPerson, animatePerson, carryPose, chaseCamera, chaseFov } from './character.js';
import { buildPalm, buildLamp, buildBench, buildHydrant, buildCone, buildContainer, buildSign, buildHelipad, buildBoat, buildHeli, buildVehicle } from './props.js';
import { mat, glow, glass, buildingMaterial, roadTexture } from './materials.js';
import { clamp, lerp } from './random.js';
import { START_HOUR, ROAD_XS, ROAD_ZS } from './config.js';

// --- Sky shader -------------------------------------------------------
// A dome that blends the horizon color into the zenith color, with a
// bright sun disc. The sun direction is set per frame from the hour.
const skyUniforms = {
  sunDir: { value: new THREE.Vector3(0, 0.5, 0.8) },
  horizon: { value: new THREE.Color('#f5b45a') },
  zenith: { value: new THREE.Color('#2a4a6b') },
  sunColor: { value: new THREE.Color('#ffd27a') },
};
const skyMat = new THREE.ShaderMaterial({
  uniforms: skyUniforms,
  side: THREE.BackSide,
  depthWrite: false,
  vertexShader: `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_Position.z = gl_Position.w;
    }
  `,
  fragmentShader: `
    uniform vec3 sunDir;
    uniform vec3 horizon;
    uniform vec3 zenith;
    uniform vec3 sunColor;
    varying vec3 vDir;
    void main() {
      float h = clamp(vDir.y, 0.0, 1.0);
      vec3 col = mix(horizon, zenith, pow(h, 0.6));
      float sunAmt = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
      col += sunColor * (pow(sunAmt, 350.0) * 1.5 + pow(sunAmt, 8.0) * 0.35);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
});

// --- Renderer state ---------------------------------------------------
let renderer = null;
let scene = null;
let camera = null;
let sunLight = null;
let hemiLight = null;
let skyDome = null;
let seaMesh = null;
let seaMat = null;
let foamRing = null;
let clouds = [];
let staticGroup = null;
let dynamicGroup = null;
let vehicleMeshes = new Map();
let personMeshes = new Map();
let boatMeshes = new Map();
let heliMeshes = new Map();
let gateMeshes = new Map();
let rivalMeshes = new Map();
let playerMesh = null;
let weaponMesh = null;
let particlePool = [];
let builtCitySeed = -1;

// The golden-hour palette.
function goldenBlend(hour) {
  // hour 18.2 = deep gold; 12 = midday blue; 0 = night.
  const t = clamp(Math.sin((hour / 24) * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5, 0, 1);
  return t;
}

// Create the renderer + scene. Call once with a canvas.
export function initRenderer(canvas) {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#e8a54a', 120, 700);
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
  // Sun (directional, casts shadows).
  sunLight = new THREE.DirectionalLight('#ffd27a', 2.2);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -160;
  sunLight.shadow.camera.right = 160;
  sunLight.shadow.camera.top = 160;
  sunLight.shadow.camera.bottom = -160;
  sunLight.shadow.camera.far = 600;
  scene.add(sunLight);
  scene.add(sunLight.target);
  // Hemisphere light (sky + ground bounce).
  hemiLight = new THREE.HemisphereLight('#8fb8d8', '#5a4632', 0.7);
  scene.add(hemiLight);
  // Sky dome.
  skyDome = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 16), skyMat);
  scene.add(skyDome);
  // Sea: a big plane around the island. Phong for a sharp sun glint.
  seaMat = new THREE.MeshPhongMaterial({ color: '#1a5a7a', shininess: 120, specular: '#ffd27a' });
  seaMesh = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400, 48, 48), seaMat);
  seaMesh.rotation.x = -Math.PI / 2;
  seaMesh.position.y = -0.4;
  scene.add(seaMesh);
  // Beach foam: a ring at the shoreline that pulses.
  foamRing = new THREE.Mesh(
    new THREE.RingGeometry(318, 326, 64),
    new THREE.MeshBasicMaterial({ color: '#e8f4f8', transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
  );
  foamRing.rotation.x = -Math.PI / 2;
  foamRing.position.y = -0.2;
  scene.add(foamRing);
  // Clouds: flattened white blobs drifting slowly.
  for (let i = 0; i < 12; i++) {
    const cloud = new THREE.Mesh(
      new THREE.SphereGeometry(1, 12, 8),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.75 }),
    );
    cloud.scale.set(18 + Math.random() * 14, 3.5, 10 + Math.random() * 8);
    cloud.position.set(-400 + Math.random() * 800, 90 + Math.random() * 60, -400 + Math.random() * 800);
    cloud.userData.speed = 0.5 + Math.random() * 0.8;
    clouds.push(cloud);
    scene.add(cloud);
  }
  staticGroup = new THREE.Group();
  scene.add(staticGroup);
  dynamicGroup = new THREE.Group();
  scene.add(dynamicGroup);
  // The player mesh + weapon.
  playerMesh = buildPlayer();
  playerMesh.castShadow = true;
  dynamicGroup.add(playerMesh);
  weaponMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.7), mat('#222222', 0.4, 0.6));
  weaponMesh.position.set(0.35, 1.15, 0.25);
  playerMesh.add(weaponMesh);
  // Rain / smoke / blood particles: a pool of small boxes.
  for (let i = 0; i < 200; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9 }));
    p.visible = false;
    particlePool.push(p);
    dynamicGroup.add(p);
  }
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  return { renderer, scene, camera };
}

// --- Static city ------------------------------------------------------
// Build the island, roads, buildings, palms, lamps, containers, signs,
// and the helipad. Rebuilds only when the city seed changes.
export function buildStatic(world) {
  const city = world.city;
  if (builtCitySeed === city.seed) return;
  builtCitySeed = city.seed;
  // Clear the old static group.
  while (staticGroup.children.length > 0) {
    staticGroup.remove(staticGroup.children[0]);
  }
  // Island ground: an ellipse (GTA San Andreas round map).
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(340, 64),
    new THREE.MeshStandardMaterial({ color: '#c2a878', roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.scale.set(1, 0.75, 1);
  ground.receiveShadow = true;
  staticGroup.add(ground);
  // Beach ring: sand-colored torus around the island edge.
  const beach = new THREE.Mesh(
    new THREE.RingGeometry(300, 340, 64),
    new THREE.MeshStandardMaterial({ color: '#e8d5a8', roughness: 1 }),
  );
  beach.rotation.x = -Math.PI / 2;
  beach.scale.set(1, 0.75, 1);
  beach.position.y = 0.02;
  staticGroup.add(beach);
  // Roads: dark planes along the grid.
  const roadMat = new THREE.MeshStandardMaterial({ map: roadTexture(), roughness: 0.95 });
  roadMat.map.repeat.set(1, 20);
  for (const x of ROAD_XS) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(8, 500), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(x, 0.05, 0);
    road.receiveShadow = true;
    staticGroup.add(road);
  }
  const roadMatH = roadMat.clone();
  roadMatH.map = roadTexture();
  roadMatH.map.repeat.set(20, 1);
  for (const z of ROAD_ZS) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(500, 8), roadMatH);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.05, z);
    road.receiveShadow = true;
    staticGroup.add(road);
  }
  // Buildings: boxes with window-grid facades, one mesh each.
  const districtColors = {
    marina: '#a89878',
    downtown: '#8a8a96',
    hills: '#c8a888',
    docks: '#7a8a9a',
    beach: '#e0d0b0',
  };
  for (const b of city.buildings) {
    const color = districtColors[b.district] || '#7a7a7a';
    const cols = Math.max(2, Math.round(b.w / 3));
    const rows = Math.max(2, Math.round(b.h / 4));
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(b.w, b.h, b.d),
      buildingMaterial(b.district, cols, rows, color),
    );
    m.position.set(b.x, b.h / 2, b.z);
    m.rotation.y = b.rot || 0;
    m.castShadow = true;
    m.receiveShadow = true;
    staticGroup.add(m);
    // A roof rim.
    const rim = new THREE.Mesh(
      new THREE.BoxGeometry(b.w + 0.4, 0.4, b.d + 0.4),
      mat('#2a2a2a', 0.9),
    );
    rim.position.set(b.x, b.h + 0.2, b.z);
    rim.rotation.y = b.rot || 0;
    staticGroup.add(rim);
  }
  // Shop signs: projecting boxes on the landmark facades.
  const signDefs = [
    { text: 'DINER', x: city.diner.x, z: city.diner.z, color: '#f5c518' },
    { text: 'GUN SHOP', x: city.gunshop.x, z: city.gunshop.z, color: '#ff5555' },
    { text: 'WORKSHOP', x: -180, z: 60, color: '#5ad0ff' },
    { text: 'HOTEL', x: 200, z: 40, color: '#ff8ad0' },
  ];
  for (const s of signDefs) {
    const sign = buildSign(s.text, s.color, 4.5, 1);
    sign.position.set(s.x, 4.5, s.z - 6);
    sign.rotation.y = 0;
    staticGroup.add(sign);
  }
  // Palms: instanced (trunks + fronds are two instanced meshes).
  const palmTrunkGeo = new THREE.CylinderGeometry(0.14, 0.22, 5, 7);
  const palmTrunkMat = mat('#8a6a45', 0.95);
  const palmFrondGeo = new THREE.BoxGeometry(2.2, 0.06, 0.5);
  const palmFrondMat = mat('#2e8b57', 0.9);
  const trunkIM = new THREE.InstancedMesh(palmTrunkGeo, palmTrunkMat, city.palms.length);
  const frondIM = new THREE.InstancedMesh(palmFrondGeo, palmFrondMat, city.palms.length * 7);
  const dummy = new THREE.Object3D();
  city.palms.forEach((p, i) => {
    dummy.position.set(p.x, 2.5, p.z);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    trunkIM.setMatrixAt(i, dummy.matrix);
    for (let f = 0; f < 7; f++) {
      const a = (f / 7) * Math.PI * 2;
      dummy.position.set(p.x + Math.cos(a) * 0.7, 5.1, p.z + Math.sin(a) * 0.7);
      dummy.rotation.set(0, -a, 0.35);
      dummy.updateMatrix();
      frondIM.setMatrixAt(i * 7 + f, dummy.matrix);
    }
  });
  trunkIM.castShadow = true;
  staticGroup.add(trunkIM);
  staticGroup.add(frondIM);
  // Lamps: instanced poles + glowing heads.
  const lampPoleGeo = new THREE.CylinderGeometry(0.08, 0.12, 4.5, 6);
  const lampPoleMat = mat('#3a3a40', 0.6, 0.6);
  const lampHeadGeo = new THREE.BoxGeometry(0.5, 0.12, 0.25);
  const lampHeadMat = glow('#ffe9a8', 2.0);
  const poleIM = new THREE.InstancedMesh(lampPoleGeo, lampPoleMat, city.lamps.length);
  const headIM = new THREE.InstancedMesh(lampHeadGeo, lampHeadMat, city.lamps.length);
  city.lamps.forEach((l, i) => {
    dummy.position.set(l.x, 2.25, l.z);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    poleIM.setMatrixAt(i, dummy.matrix);
    dummy.position.set(l.x + 1.1, 4.45, l.z);
    dummy.updateMatrix();
    headIM.setMatrixAt(i, dummy.matrix);
  });
  staticGroup.add(poleIM);
  staticGroup.add(headIM);
  // Containers: instanced boxes.
  const contGeo = new THREE.BoxGeometry(6, 2.6, 2.5);
  const contMat = mat('#2e86c1', 0.7, 0.3);
  const contIM = new THREE.InstancedMesh(contGeo, contMat, city.containers.length);
  city.containers.forEach((c, i) => {
    dummy.position.set(c.x, 1.3, c.z);
    dummy.rotation.set(0, c.rot || 0, 0);
    dummy.updateMatrix();
    contIM.setMatrixAt(i, dummy.matrix);
  });
  contIM.castShadow = true;
  staticGroup.add(contIM);
  // Helipad.
  const pad = buildHelipad();
  pad.position.set(280, 0, -80);
  staticGroup.add(pad);
  // Benches + hydrants near the diner.
  for (let i = 0; i < 4; i++) {
    const bench = buildBench();
    bench.position.set(-200 + i * 4 - 6, 0, 86);
    staticGroup.add(bench);
  }
  const hyd = buildHydrant();
  hyd.position.set(-196, 0, 76);
  staticGroup.add(hyd);
}

// --- Dynamic sync -----------------------------------------------------
// Sync the meshes to the sim state each frame.
function syncVehicle(v) {
  let mesh = vehicleMeshes.get(v.id);
  if (!mesh) {
    const color = v.color || '#888888';
    mesh = buildVehicle(v.model, color);
    mesh.castShadow = true;
    vehicleMeshes.set(v.id, mesh);
    dynamicGroup.add(mesh);
  }
  mesh.position.set(v.x, 0, v.z);
  mesh.rotation.y = v.heading;
  // Brake lights glow when the car is slowing.
  const braking = v.braking || (v.speed !== undefined && Math.abs(v.speed) < 1 && !v.parked);
  const bm = mesh.userData.brakeMat;
  if (bm) bm.emissiveIntensity = braking ? 3.0 : 0.6;
  // Damage smoke: a dark puff when health is low.
  mesh.userData.smoking = v.health < 35;
  return mesh;
}

function syncPerson(mesh, x, z, heading, phase, speed, aiming) {
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  animatePerson(mesh, phase, speed);
  carryPose(mesh, aiming);
  return mesh;
}

// --- Race gates + rivals ----------------------------------------------
// A lit checkpoint gate: a standing torus the car drives through plus a
// flat ground ring marking its footprint. Each gate gets its own
// materials (never the shared glow cache) so the next gate can pulse
// without lighting up every lamp and brake light in the city.
function buildGate(color) {
  const g = new THREE.Group();
  const torusMat = new THREE.MeshStandardMaterial({
    color: '#111111', emissive: color, emissiveIntensity: 0.9, roughness: 0.4,
  });
  const torus = new THREE.Mesh(new THREE.TorusGeometry(6, 0.35, 10, 32), torusMat);
  torus.position.y = 6;
  g.add(torus);
  const ringMat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.35, side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(5, 6.5, 32), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.1;
  g.add(ring);
  g.userData.torusMat = torusMat;
  g.userData.ringMat = ringMat;
  return g;
}

// A floating name tag: a canvas sprite that always faces the camera.
function makeNameTag(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(10,10,14,0.72)';
  ctx.fillRect(0, 0, 256, 64);
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.strokeRect(3, 3, 250, 58);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase(), 128, 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.set(7, 1.75, 1);
  return sprite;
}

// Sync the race visuals to state.race each frame: lit gates at every
// checkpoint (the next one glows bright and pulses, cleared ones hide)
// and a sports car + floating name tag for each rival at its sim
// position. When no race is active every gate and rival mesh is
// removed so a finished race leaves nothing behind.
function syncRace(state, time) {
  const race = state.race;
  if (!race || !race.active) {
    for (const [, mesh] of gateMeshes) dynamicGroup.remove(mesh);
    gateMeshes.clear();
    for (const [, entry] of rivalMeshes) dynamicGroup.remove(entry.group);
    rivalMeshes.clear();
    return;
  }
  const GATE_COLOR = '#ffd23e';
  const seenGates = new Set();
  race.checkpoints.forEach((cp, i) => {
    seenGates.add(i);
    const isNext = i === race.cp;
    const isPassed = i < race.cp;
    let gate = gateMeshes.get(i);
    if (!gate) {
      gate = buildGate(GATE_COLOR);
      gateMeshes.set(i, gate);
      dynamicGroup.add(gate);
    }
    gate.position.set(cp.x, 0, cp.z);
    // Face the gate at the driver: toward the next checkpoint from the
    // start line, otherwise along the approach from the previous one.
    const prev = race.checkpoints[i - 1];
    const next = race.checkpoints[i + 1];
    const ax = i === 0 ? (next ? next.x - cp.x : 0) : cp.x - prev.x;
    const az = i === 0 ? (next ? next.z - cp.z : 0) : cp.z - prev.z;
    gate.rotation.y = Math.atan2(ax, az);
    gate.visible = !isPassed;
    gate.userData.torusMat.emissiveIntensity = isNext
      ? 2.2 + Math.sin(time * 4) * 0.9
      : 0.9;
    gate.userData.ringMat.opacity = isNext ? 0.85 : 0.35;
  });
  for (const [i, mesh] of gateMeshes) {
    if (!seenGates.has(i)) {
      dynamicGroup.remove(mesh);
      gateMeshes.delete(i);
    }
  }
  const seenRivals = new Set();
  for (const rv of race.rivals || []) {
    seenRivals.add(rv.name);
    let entry = rivalMeshes.get(rv.name);
    if (!entry) {
      const car = buildVehicle('sports', rv.color);
      car.castShadow = true;
      const tag = makeNameTag(rv.name, rv.color);
      tag.position.set(0, 2.9, 0);
      const group = new THREE.Group();
      group.add(car);
      group.add(tag);
      entry = { group, car, tag };
      rivalMeshes.set(rv.name, entry);
      dynamicGroup.add(group);
    }
    entry.group.position.set(rv.x, 0, rv.z);
    entry.group.rotation.y = rv.heading;
  }
  for (const [name, entry] of rivalMeshes) {
    if (!seenRivals.has(name)) {
      dynamicGroup.remove(entry.group);
      rivalMeshes.delete(name);
    }
  }
}

// --- Main render ------------------------------------------------------
// Render one frame. `input` is the current input (for camera mouse).
export function renderFrame(state, world, dt, input) {
  const city = world.city;
  buildStatic(world);
  const time = state.time || 0;
  const hour = state.hour ?? START_HOUR;
  // --- Sky + sun ------------------------------------------------------
  // Sun elevation from the hour. The day runs 06:00 (sunrise) to 20:00
  // (sunset), 14 hours; at 18.2 the sun is low but clearly up — a real
  // golden hour, bright and warm, not night. (A 12-hour day put the sun
  // below the horizon by 18.8 and made the whole scene black.)
  const sunAngle = ((hour - 6) / 14) * Math.PI;
  const sunEl = Math.sin(sunAngle) * 0.9 + 0.1;
  const sunAz = Math.cos(sunAngle);
  const sunDir = new THREE.Vector3(sunAz * 0.7, Math.max(0.12, sunEl), 0.55).normalize();
  skyUniforms.sunDir.value.copy(sunDir);
  // Golden-hour blend: warm at 18.2, blue at noon, dark at night.
  const gold = clamp(1 - Math.abs(hour - 18.2) / 4, 0, 1);
  const day = clamp(sunEl, 0, 1);
  const horizon = new THREE.Color().setHSL(0.09 + gold * 0.01, 0.75, 0.55 + day * 0.15);
  const zenith = new THREE.Color().setHSL(0.6, 0.55, 0.28 + day * 0.35);
  skyUniforms.horizon.value.copy(horizon);
  skyUniforms.zenith.value.copy(zenith);
  skyUniforms.sunColor.value.setHSL(0.1, 0.9, 0.65 + gold * 0.2);
  sunLight.position.set(sunDir.x * 300, sunDir.y * 300, sunDir.z * 300);
  sunLight.target.position.set(state.player.x, 0, state.player.z);
  sunLight.intensity = 1.2 + day * 1.6;
  sunLight.color.setHSL(0.09, 0.85, 0.68 + gold * 0.12);
  hemiLight.intensity = 0.7 + day * 0.5;
  // Fog follows the horizon color.
  scene.fog.color.copy(horizon);
  scene.fog.near = 120 + day * 60;
  scene.fog.far = 500 + day * 300;
  // --- Sea: living water ----------------------------------------------
  // The sea plane's vertices bob (a slow sine swell) and the sun glint
  // follows the sun. The foam ring pulses at the shore.
  const seaPos = seaMesh.geometry.attributes.position;
  for (let i = 0; i < seaPos.count; i++) {
    const x = seaPos.getX(i);
    const y = seaPos.getY(i);
    seaPos.setZ(i, Math.sin(x * 0.02 + time * 0.8) * 0.4 + Math.cos(y * 0.025 + time * 0.6) * 0.4);
  }
  seaPos.needsUpdate = true;
  seaMesh.geometry.computeVertexNormals();
  // Sun glitter: the specular highlight moves with the sun (Phong does
  // this automatically); the sea color warms at golden hour.
  seaMat.color.setHSL(0.55, 0.6, 0.18 + gold * 0.1 + day * 0.08);
  foamRing.material.opacity = 0.35 + Math.sin(time * 1.2) * 0.15;
  foamRing.scale.setScalar(1 + Math.sin(time * 0.5) * 0.01);
  // Clouds drift.
  for (const c of clouds) {
    c.position.x += c.userData.speed * dt;
    if (c.position.x > 450) c.position.x = -450;
  }
  // --- Player ---------------------------------------------------------
  const p = state.player;
  playerMesh.position.set(p.x, 0, p.z);
  playerMesh.rotation.y = p.heading;
  const pSpeed = p.onFoot ? (Math.abs(p.speed || 0) || 0) : 0;
  const walkPhase = (state.time || 0) * 8;
  animatePerson(playerMesh, walkPhase, p.onFoot ? (p.running ? 6 : 3) : 0);
  // Weapon always visible (carry pose).
  const aiming = !!(input && input.aim);
  carryPose(playerMesh, aiming);
  weaponMesh.visible = !p.onFoot ? false : true;
  // --- Vehicles -------------------------------------------------------
  const seenVehicles = new Set();
  for (const v of state.vehicles) {
    seenVehicles.add(v.id);
    syncVehicle(v);
  }
  for (const [id, mesh] of vehicleMeshes) {
    if (!seenVehicles.has(id)) {
      dynamicGroup.remove(mesh);
      vehicleMeshes.delete(id);
    }
  }
  // --- People (peds + cops + enemies) ---------------------------------
  const seenPeople = new Set();
  const allPeople = [];
  for (const ped of state.peds) allPeople.push({ key: 'ped' + ped.id, x: ped.x, z: ped.z, h: ped.heading, speed: 2, color: ped.color || '#888888', shirt: ped.shirt });
  for (const cop of state.cops) allPeople.push({ key: 'cop' + cop.id, x: cop.x, z: cop.z, h: cop.heading, speed: 3, color: '#1a3a6b', shirt: '#1a3a6b' });
  for (const e of state.enemies) {
    if (e.alive) allPeople.push({ key: 'en' + e.id, x: e.x, z: e.z, h: e.heading || 0, speed: 3, color: '#c0392b', shirt: '#c0392b' });
  }
  for (const person of allPeople) {
    seenPeople.add(person.key);
    let mesh = personMeshes.get(person.key);
    if (!mesh) {
      mesh = buildPerson({ shirt: person.shirt || person.color, pants: '#2a2a3a' });
      mesh.castShadow = true;
      personMeshes.set(person.key, mesh);
      dynamicGroup.add(mesh);
    }
    syncPerson(mesh, person.x, person.z, person.h, time * 6 + person.x, person.speed, false);
  }
  for (const [key, mesh] of personMeshes) {
    if (!seenPeople.has(key)) {
      dynamicGroup.remove(mesh);
      personMeshes.delete(key);
    }
  }
  // --- Race gates + rivals ------------------------------------------
  syncRace(state, time);
  // --- Boats + helis --------------------------------------------------
  const seenBoats = new Set();
  for (const b of state.boats) {
    seenBoats.add(b.id);
    let mesh = boatMeshes.get(b.id);
    if (!mesh) {
      mesh = buildBoat();
      boatMeshes.set(b.id, mesh);
      dynamicGroup.add(mesh);
    }
    mesh.position.set(b.x, Math.sin(time * 0.8 + b.id) * 0.15, b.z);
    mesh.rotation.y = b.heading;
    mesh.rotation.z = Math.sin(time * 0.6 + b.id) * 0.03;
  }
  for (const [id, mesh] of boatMeshes) {
    if (!seenBoats.has(id)) { dynamicGroup.remove(mesh); boatMeshes.delete(id); }
  }
  const seenHelis = new Set();
  for (const h of state.helis) {
    seenHelis.add(h.id);
    let mesh = heliMeshes.get(h.id);
    if (!mesh) {
      mesh = buildHeli();
      heliMeshes.set(h.id, mesh);
      dynamicGroup.add(mesh);
    }
    mesh.position.set(h.x, h.y, h.z);
    mesh.rotation.y = h.heading || 0;
    const rotor = mesh.getObjectByName('rotor');
    if (rotor) rotor.rotation.y += dt * 20;
  }
  for (const [id, mesh] of heliMeshes) {
    if (!seenHelis.has(id)) { dynamicGroup.remove(mesh); heliMeshes.delete(id); }
  }
  // --- Particles (rain / smoke / blood) -------------------------------
  const rain = state.weather && state.weather.kind === 'rain';
  let pi = 0;
  for (const part of state.particles || []) {
    if (pi >= particlePool.length) break;
    const mesh = particlePool[pi++];
    mesh.visible = true;
    mesh.position.set(part.x, part.y ?? 0.5, part.z);
    const c = part.color || '#ffffff';
    mesh.material.color.set(c);
    const life = part.life ?? 1;
    mesh.material.opacity = clamp(life, 0, 1);
    const s = part.size || 0.08;
    mesh.scale.setScalar(s / 0.08);
  }
  // Rain streaks: reuse the pool when it rains.
  if (rain) {
    for (let i = 0; i < 120 && pi < particlePool.length; i++) {
      const mesh = particlePool[pi++];
      mesh.visible = true;
      const rx = p.x + ((i * 37) % 60) - 30;
      const rz = p.z + ((i * 53) % 60) - 30;
      const ry = 8 - ((time * 12 + i) % 8);
      mesh.position.set(rx, ry, rz);
      mesh.material.color.set('#aaccff');
      mesh.material.opacity = 0.5;
      mesh.scale.set(0.5, 4, 0.5);
    }
  }
  for (; pi < particlePool.length; pi++) {
    particlePool[pi].visible = false;
  }
  // --- Camera ---------------------------------------------------------
  // Chase camera with the keepClear boom (never inside a building).
  const speed = p.vehicleId !== null && p.vehicleId !== undefined
    ? (state.vehicles.find(v => v.id === p.vehicleId)?.speed || 0)
    : 0;
  const boom = p.onFoot ? 7 : 11;
  const height = p.onFoot ? 3.2 : 4.5;
  const cam = chaseCamera(state, city, boom, height);
  camera.position.set(cam.x, cam.y, cam.z);
  // Look at the player, slightly ahead.
  const lookX = p.x + Math.sin(p.heading) * 3;
  const lookZ = p.z + Math.cos(p.heading) * 3;
  camera.lookAt(lookX, 1.6, lookZ);
  camera.fov = chaseFov(speed);
  camera.updateProjectionMatrix();
  // The sky dome follows the camera so the horizon never ends.
  skyDome.position.set(camera.position.x, 0, camera.position.z);
  // --- Render ---------------------------------------------------------
  renderer.render(scene, camera);
  return { drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
}

// Expose the scene/camera for the shot stager.
export function getRenderer() {
  return { renderer, scene, camera };
}

// Resize handler for the canvas.
export function resizeRenderer(w, h) {
  if (!renderer) return;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

// Renderer: three.js r160 UMD via global THREE. Reads sim state, never writes
// it. InstancedMesh for buildings/palms/lamps, merged static geometry for
// roads, one sun shadow map following the player, day/night keyframes,
// custom bloom (bright pass + blur + ACES composite), animated sea, rain
// drops as one InstancedMesh, adaptive resolution, top-down V view, and a
// red failLoud screen if WebGL fails.
import { PALETTE } from './config.js';
import { clamp, lerp, hash2 } from './random.js';
import { createCameraRig, updateCameraRig, cameraPosition, playerWalkPhase } from './character.js';
import { DISTRICTS, RACES } from './data.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_MAP = 'map';

function skyColors(hour) {
  // Keyframes: sunrise ~05:00, sunset ~19:30, night after. Golden hour
  // is a low sun near 18:15-19:00, not full dark. The ambient base stays
  // high even when the sun is low — a low sun alone leaves the ground and
  // the shadowed building faces near-black (the sky is still bright and
  // scatters fill light at golden hour).
  const sunElev = Math.sin(((hour - 5) / 14.5) * Math.PI);
  if (hour >= 5 && hour < 19.5) {
    const warmth = clamp(1 - Math.abs(sunElev - 0.15) * 4, 0, 1);
    return { top: [0x6fb7e8, 0xff9a4a, warmth], horizon: [0xcfe8f5, 0xffc27a, warmth], sun: sunElev, fog: 420, ambient: 0.95 + Math.max(0, sunElev) * 0.35, sunI: 1.2 + Math.max(0, sunElev) * 1.2 };
  }
  return { top: [0x0b1026, 0x0b1026, 0], horizon: [0x1a2340, 0x1a2340, 0], sun: -0.3, fog: 300, ambient: 0.55, sunI: 0.25 };
}
// Per-weapon procedural 3D models (boxes only, muzzle +Z, origin at the grip).
// pose 'aim' = two-handed, muzzle forward; 'carry' = one-handed, muzzle down
// from the right hand. Molotov stays upright in carry. Built once per id+pose.
const _gunmetal = () => new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.5 });
const _wood = () => new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.9 });
function buildWeaponMesh(id) {
  const g = new THREE.Group();
  const metal = _gunmetal(), wood = _wood();
  const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); g.add(m); return m; };
  if (id === 'pistol') { box(0.07, 0.09, 0.28, metal, 0, 0.02, 0.1); box(0.06, 0.15, 0.08, wood, 0, -0.08, -0.02); }
  else if (id === 'smg') { box(0.08, 0.12, 0.4, metal, 0, 0.02, 0.12); box(0.06, 0.17, 0.08, metal, 0, -0.1, 0.1); box(0.07, 0.1, 0.12, wood, 0, 0, -0.16); }
  else if (id === 'rifle') { box(0.08, 0.12, 0.5, metal, 0, 0.02, 0.14); box(0.05, 0.05, 0.42, metal, 0, 0.04, 0.5); box(0.06, 0.18, 0.09, metal, 0, -0.11, 0.12); box(0.07, 0.11, 0.16, wood, 0, 0, -0.2); }
  else if (id === 'shotgun') { box(0.09, 0.09, 0.55, metal, 0, 0.03, 0.2); box(0.08, 0.07, 0.2, wood, 0, -0.03, 0.25); box(0.08, 0.12, 0.18, wood, 0, 0, -0.22); }
  else if (id === 'sniper') { box(0.07, 0.1, 0.45, metal, 0, 0.02, 0.1); box(0.04, 0.04, 0.7, metal, 0, 0.04, 0.55); box(0.05, 0.07, 0.2, metal, 0, 0.1, 0.12); box(0.07, 0.11, 0.16, wood, 0, 0, -0.2); }
  else if (id === 'melee') { box(0.05, 0.22, 0.05, wood, 0, -0.05, 0); const hook = box(0.05, 0.05, 0.22, metal, 0, 0.08, 0.08); hook.rotation.x = -0.6; }
  else if (id === 'molotov') { box(0.1, 0.18, 0.1, new THREE.MeshStandardMaterial({ color: 0x2a7a3a, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.85 }), 0, 0, 0); box(0.04, 0.07, 0.04, metal, 0, 0.12, 0); box(0.05, 0.06, 0.05, new THREE.MeshStandardMaterial({ color: 0xf5ead2, roughness: 1 }), 0.03, 0.14, 0); }
  else { box(0.07, 0.09, 0.28, metal, 0, 0.02, 0.1); box(0.06, 0.15, 0.08, wood, 0, -0.08, -0.02); }
  return g;
}
function updateWeaponPose(pWeapon, p, state) {
  const id = state.weapons.current || 'pistol';
  const pose = p.aiming ? 'aim' : 'carry';
  const key = id + ':' + pose;
  if (pWeapon.userData.key !== key) {
    pWeapon.userData.key = key;
    while (pWeapon.children.length) pWeapon.remove(pWeapon.children[0]);
    pWeapon.add(buildWeaponMesh(id));
  }
  if (pose === 'aim') { pWeapon.position.set(0.12, 1.32, 0.28); pWeapon.rotation.set(0, 0, 0); }
  else if (id === 'molotov') { pWeapon.position.set(0.42, 1.12, 0.05); pWeapon.rotation.set(0, 0, 0); }
  else { pWeapon.position.set(0.42, 1.15, 0.05); pWeapon.rotation.set(Math.PI / 2, 0, 0); }
}

export function createRenderer(canvas, state, city) {
  let renderer = null, failed = false;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) { failed = true; }
  if (!renderer || !renderer.getContext()) failed = true;
  const rig = createCameraRig();
  const api = { rig, failed, drawCalls: 0, triangles: 0, fps: 0, bloomOn: true, scale: 1 };
  if (failed) {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;background:#c00;color:#fff;font:32px system-ui;display:flex;align-items:center;justify-content:center;z-index:99';
    el.textContent = '3D RENDERER FAILED';
    document.body.appendChild(el);
    api.draw = () => {};
    api.setTopDown = (v) => { rig.topDown = v; };
    return api;
  }
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1200);
  const sun = new THREE.DirectionalLight(0xffd9a0, 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -90; sun.shadow.camera.right = 90; sun.shadow.camera.top = 90; sun.shadow.camera.bottom = -90; sun.shadow.camera.far = 400;
  scene.add(sun); scene.add(sun.target);
  const ambient = new THREE.AmbientLight(0xffffff, 0.6); scene.add(ambient);
  const hemi = new THREE.HemisphereLight(0x8fc7e8, 0x3a2a1a, 0.5); scene.add(hemi);
  // Live sky dome: gradient (zenith -> horizon), sun disc + warm glow, and
  // slow procedural clouds. Replaces the flat background colour; the sun
  // and fog already update per frame from state.hour (skyColors).
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x6fb7e8) },
      horizonColor: { value: new THREE.Color(0xcfe8f5) },
      sunDir: { value: new THREE.Vector3(0, 0.3, -1) },
      sunColor: { value: new THREE.Color(0xffd9a0) },
      uTime: { value: 0 },
    },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; }',
    fragmentShader: [
      'varying vec3 vDir; uniform vec3 topColor; uniform vec3 horizonColor; uniform vec3 sunDir; uniform vec3 sunColor; uniform float uTime;',
      'void main(){',
      '  float h = clamp(vDir.y, -0.05, 1.0);',
      '  vec3 col = mix(horizonColor, topColor, pow(max(h, 0.0), 0.6));',
      '  float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0);',
      '  col += sunColor * (pow(s, 350.0) * 3.0 + pow(s, 24.0) * 0.35 + pow(s, 6.0) * 0.18);',
      '  float cl = sin(vDir.x * 6.0 + uTime * 0.01) * sin(vDir.z * 8.0 - uTime * 0.013) * sin(vDir.y * 14.0 + uTime * 0.007);',
      '  float cloud = smoothstep(0.55, 0.95, cl) * smoothstep(0.02, 0.25, vDir.y);',
      '  col = mix(col, vec3(1.0, 0.98, 0.95), cloud * 0.35);',
      '  gl_FragColor = vec4(col, 1.0);',
      '}',
    ].join('\n'),
  });
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 16), skyMat);
  skyDome.frustumCulled = false;
  scene.add(skyDome);
  // Ground: big plane + road strips merged into one geometry. Procedural
  // grass texture (canvas noise splotches) instead of a flat colour.
  const groundCanvas = document.createElement('canvas'); groundCanvas.width = 256; groundCanvas.height = 256;
  const gc = groundCanvas.getContext('2d');
  gc.fillStyle = '#7d9155'; gc.fillRect(0, 0, 256, 256);
  // Deterministic splotches (hash2, not Math.random) so the texture is the
  // same on every load.
  for (let i = 0; i < 900; i++) {
    const h1 = hash2(i, 7), h2 = hash2(i, 13), h3 = hash2(i, 29);
    const g = 120 + Math.floor(h1 * 60);
    gc.fillStyle = `rgba(${90 + Math.floor(h2 * 40)}, ${g}, ${60 + Math.floor(h3 * 30)}, 0.25)`;
    gc.fillRect(h2 * 256, h3 * 256, 2 + h1 * 5, 2 + h2 * 5);
  }
  const groundTex = new THREE.CanvasTexture(groundCanvas);
  groundTex.wrapS = THREE.RepeatWrapping; groundTex.wrapT = THREE.RepeatWrapping;
  groundTex.repeat.set(10, 8);
  const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 560), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.05, 10); ground.receiveShadow = true; scene.add(ground);
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x4a4a52, roughness: 1, metalness: 0 });
  const roadGeos = [];
  for (const x of [-280, -200, -120, -40, 40, 120, 200, 280]) {
    const g = new THREE.PlaneGeometry(16, 480); g.rotateX(-Math.PI / 2); g.translate(x, 0.02, 0); roadGeos.push(g);
  }
  for (const z of [-200, -120, -40, 40, 120, 200]) {
    const g = new THREE.PlaneGeometry(640, 16); g.rotateX(-Math.PI / 2); g.translate(0, 0.02, z); roadGeos.push(g);
  }
  const roads = new THREE.Mesh(mergeGeos(roadGeos), roadMat);
  roads.receiveShadow = true; scene.add(roads);
  // Sea plane south of the beach.
  const seaMat = new THREE.MeshStandardMaterial({ color: 0x1f8fa8, roughness: 0.25, metalness: 0.3, transparent: true, opacity: 0.92 });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(700, 120), seaMat);
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.1, 300); scene.add(sea);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(700, 16), new THREE.MeshStandardMaterial({ color: 0xe8d29a, roughness: 1 }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.03, 236); scene.add(sand);
  // Sun glitter streak on the water (additive, shimmering) + animated beach
  // foam strips along the waterline. The sea stays a flat plane as fallback.
  const glitterMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
  const glitter = new THREE.Mesh(new THREE.PlaneGeometry(46, 280), glitterMat);
  glitter.rotation.x = -Math.PI / 2; glitter.position.set(0, 0.16, 300); scene.add(glitter);
  const foamMats = [];
  for (let i = 0; i < 3; i++) {
    const fm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, depthWrite: false });
    const foam = new THREE.Mesh(new THREE.PlaneGeometry(700, 2.5), fm);
    foam.rotation.x = -Math.PI / 2; foam.position.set(0, 0.14, 244 + i * 4); scene.add(foam);
    foamMats.push({ mat: fm, mesh: foam, baseZ: 244 + i * 4, phase: i * 2.1 });
  }
  // Buildings: one InstancedMesh, colour per instance.
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const bMat = new THREE.MeshStandardMaterial({ roughness: 0.85 });
  const bMesh = new THREE.InstancedMesh(boxGeo, bMat, city.buildings.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3(), col = new THREE.Color(), off = new THREE.Vector3();
  city.buildings.forEach((b, i) => {
    pos.set(b.x, b.h / 2, b.z); sc.set(b.w, b.h, b.d);
    m4.compose(pos, q, sc); bMesh.setMatrixAt(i, m4);
    col.setHex(b.color); bMesh.setColorAt(i, col);
  });
  bMesh.castShadow = true; bMesh.receiveShadow = true; scene.add(bMesh);
  // Race checkpoint gate: lit torus + ground ring at the next checkpoint.
  const gateMat = new THREE.MeshBasicMaterial({ color: 0x2ee6c8 });
  const gate = new THREE.Mesh(new THREE.TorusGeometry(6, 0.35, 10, 32), gateMat);
  gate.visible = false; scene.add(gate);
  const gateRing = new THREE.Mesh(new THREE.RingGeometry(5, 6.5, 32), new THREE.MeshBasicMaterial({ color: 0x2ee6c8, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
  gateRing.rotation.x = -Math.PI / 2; gateRing.visible = false; scene.add(gateRing);
  // Rival race cars + name tags (canvas-texture sprites above each car).
  const rivalCars = [];
  const rivalColors = [0xff4f6d, 0x2ee6c8, 0xffc94d];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 4.4), new THREE.MeshStandardMaterial({ color: rivalColors[i], roughness: 0.4, metalness: 0.3 }));
    body.position.y = 0.6; g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 2.2), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.5 }));
    cab.position.y = 1.25; g.add(cab);
    g.visible = false; scene.add(g);
    rivalCars.push(g);
  }
  const rivalTags = [];
  for (const name of (RACES[0].rivals || ['Neri Flint', 'Zella Coil', 'Ivo Switch'])) {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 56;
    const c2 = cv.getContext('2d');
    c2.fillStyle = 'rgba(0,0,0,0.55)'; c2.fillRect(0, 0, 256, 56);
    c2.fillStyle = '#fff'; c2.font = 'bold 28px system-ui, sans-serif'; c2.textAlign = 'center'; c2.textBaseline = 'middle';
    c2.fillText(name, 128, 30);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
    spr.scale.set(9, 2, 1); spr.visible = false; scene.add(spr);
    rivalTags.push(spr);
  }
  // on 10+ floor buildings.
  const tallB = city.buildings.filter(b => (b.floors ?? Math.round(b.h / 3)) >= 6);
  const veryTallB = city.buildings.filter(b => (b.floors ?? Math.round(b.h / 3)) >= 10);
  const tankMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.4, 1.4, 2.2, 8), new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 0.9 }), Math.max(1, tallB.length));
  tallB.forEach((b, i) => { pos.set(b.x + b.w * 0.2, b.h + 1.6, b.z - b.d * 0.15); sc.set(1, 1, 1); m4.compose(pos, q, sc); tankMesh.setMatrixAt(i, m4); });
  tankMesh.count = tallB.length; scene.add(tankMesh);
  const antMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.12, 6, 5), new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.6, metalness: 0.6 }), Math.max(1, veryTallB.length));
  veryTallB.forEach((b, i) => { pos.set(b.x - b.w * 0.25, b.h + 3, b.z + b.d * 0.2); sc.set(1, 1, 1); m4.compose(pos, q, sc); antMesh.setMatrixAt(i, m4); });
  antMesh.count = veryTallB.length; scene.add(antMesh);
  const beaconMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0xff2a2a }), Math.max(1, veryTallB.length));
  veryTallB.forEach((b, i) => { pos.set(b.x - b.w * 0.25, b.h + 6.2, b.z + b.d * 0.2); sc.set(1, 1, 1); m4.compose(pos, q, sc); beaconMesh.setMatrixAt(i, m4); });
  beaconMesh.count = veryTallB.length; scene.add(beaconMesh);
  // Window glow strips on tall buildings at night (emissive planes).
  const winMat = new THREE.MeshBasicMaterial({ color: 0xffd27a });
  const winGeo = new THREE.PlaneGeometry(1, 1);
  const winMesh = new THREE.InstancedMesh(winGeo, winMat, Math.min(400, city.buildings.length * 2));
  let wi = 0;
  city.buildings.forEach((b) => {
    if (b.h < 20 || wi >= 400) return;
    for (let k = 0; k < 2 && wi < 400; k++) {
      pos.set(b.x - b.w / 2 - 0.05, b.h * (0.4 + k * 0.3), b.z); sc.set(2, 3, 1);
      m4.compose(pos, q, sc); winMesh.setMatrixAt(wi++, m4);
    }
  });
  winMesh.count = wi; scene.add(winMesh);
  // Palms: curved trunk (one bent tube, instanced) + V-folded ribbon fronds
  // (9 per palm, drooping) + coconut cluster. No sphere crowns.
  const trunkCurve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.5, 4, 0.2), new THREE.Vector3(1.0, 8, 0.4));
  const trunkGeo = new THREE.TubeGeometry(trunkCurve, 6, 0.22, 5);
  const palmMesh = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 1 }), city.palms.length);
  city.palms.forEach((pl, i) => { pos.set(pl.x, 0, pl.z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), hash2(pl.x, pl.z) * Math.PI * 2); sc.set(1, pl.h / 8, 1); m4.compose(pos, q, sc); palmMesh.setMatrixAt(i, m4); });
  palmMesh.castShadow = true; scene.add(palmMesh);
  const frondGeo = (() => {
    const g = new THREE.PlaneGeometry(2.6, 0.7, 6, 2);
    const pa = g.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i), y = pa.getY(i);
      const t = (x + 1.3) / 2.6; // 0 at base, 1 at tip
      pa.setZ(i, Math.abs(y) * 0.45); // V-fold across the width
      pa.setY(i, y - t * t * 0.9); // droop toward the tip
    }
    g.translate(1.3, 0, 0); // base at the trunk, tip 2.6 out
    g.computeVertexNormals();
    return g;
  })();
  const frondMesh = new THREE.InstancedMesh(frondGeo, new THREE.MeshStandardMaterial({ color: 0x3f7a2a, roughness: 1, side: THREE.DoubleSide }), city.palms.length * 9);
  {
    let fi = 0;
    city.palms.forEach((pl) => {
      for (let j = 0; j < 9; j++) {
        pos.set(pl.x, pl.h + 0.6, pl.z);
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (j / 9) * Math.PI * 2 + hash2(pl.x, j) * 0.5);
        sc.set(1, 1, 1); m4.compose(pos, q, sc); frondMesh.setMatrixAt(fi++, m4);
      }
    });
  }
  frondMesh.castShadow = true; scene.add(frondMesh);
  const nutMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), new THREE.MeshStandardMaterial({ color: 0x4a3220, roughness: 1 }), city.palms.length * 3);
  {
    let ni2 = 0;
    city.palms.forEach((pl) => {
      for (let j = 0; j < 3; j++) {
        pos.set(pl.x + (hash2(pl.x, j * 7) - 0.5) * 0.8, pl.h + 0.35, pl.z + (hash2(pl.z, j * 3) - 0.5) * 0.8);
        q.identity(); sc.set(1, 1, 1); m4.compose(pos, q, sc); nutMesh.setMatrixAt(ni2++, m4);
      }
    });
  }
  scene.add(nutMesh);
  // Street lamps (emissive heads at night).
  const lampGeo = new THREE.CylinderGeometry(0.12, 0.12, 6, 5);
  const lampMesh = new THREE.InstancedMesh(lampGeo, new THREE.MeshStandardMaterial({ color: 0x333333 }), city.lamps.length);
  city.lamps.forEach((l, i) => { pos.set(l.x, 3, l.z); sc.set(1, 1, 1); m4.compose(pos, q, sc); lampMesh.setMatrixAt(i, m4); });
  scene.add(lampMesh);
  const lampHead = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }), city.lamps.length);
  city.lamps.forEach((l, i) => { pos.set(l.x, 6.2, l.z); sc.set(1, 1, 1); m4.compose(pos, q, sc); lampHead.setMatrixAt(i, m4); });
  scene.add(lampHead);
  // Neon signs on Neon Mile buildings.
  const neonMat = new THREE.MeshBasicMaterial({ color: 0xff4fa3 });
  const neonMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(6, 1.2), neonMat, 24);
  let ni = 0;
  for (const b of city.buildings) { if (b.neon && ni < 24) { pos.set(b.x, b.h * 0.8, b.z + b.d / 2 + 0.1); sc.set(1, 1, 1); m4.compose(pos, q, sc); neonMesh.setMatrixAt(ni++, m4); } }
  neonMesh.count = ni; scene.add(neonMesh);
  // Shop signs: projecting box (depth 0.5) with the brand on a canvas texture.
  // Back sits flush on the shaft wall (z = b.z + b.d/2); front clears any
  // protrusion. Canvas texture on the +Z face only, dark board elsewhere.
  const signTargets = city.buildings
    .filter(b => b.sign || b.hotel)
    .sort((a, b) => ((b.hotel ? 1 : 0) - (a.hotel ? 1 : 0)) || b.h - a.h)
    .slice(0, 16);
  for (const b of signTargets) {
    const label = b.hotel || b.sign;
    const sw = Math.min(b.w * 0.7, 9), sh = 1.3;
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 48;
    const c2 = cv.getContext('2d');
    c2.fillStyle = '#1a2027'; c2.fillRect(0, 0, 256, 48);
    c2.fillStyle = '#ffc94d'; c2.font = 'bold 26px system-ui, sans-serif'; c2.textAlign = 'center'; c2.textBaseline = 'middle';
    c2.fillText(label.slice(0, 18), 128, 26);
    const tex = new THREE.CanvasTexture(cv);
    const dark = new THREE.MeshStandardMaterial({ color: 0x1a2027, roughness: 0.9 });
    const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
    const signMesh = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, 0.5), [dark, dark, dark, dark, face, dark]);
    signMesh.position.set(b.x, b.h * 0.62, b.z + b.d / 2 + 0.25);
    scene.add(signMesh);
  }
  // Containers at the harbor.
  const contMesh = new THREE.InstancedMesh(boxGeo, new THREE.MeshStandardMaterial({ roughness: 0.7 }), Math.max(1, city.containers.length));
  city.containers.forEach((c, i) => { pos.set(c.x, 1.5, c.z); sc.set(6, 3, 2.5); m4.compose(pos, q, sc); contMesh.setMatrixAt(i, m4); col.setHex(c.color); contMesh.setColorAt(i, col); });
  scene.add(contMesh);
  // Dynamic pools: vehicles, peds, enemies, player, boats, helis, particles, rain.
  const carGeo = new THREE.BoxGeometry(1, 1, 1);
  const carMat = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.4 });
  const carMesh = new THREE.InstancedMesh(carGeo, carMat, 64);
  carMesh.castShadow = true; scene.add(carMesh);
  // Car glass: the cabin is transparent blue glass, not solid dark.
  const cabMesh = new THREE.InstancedMesh(carGeo, new THREE.MeshStandardMaterial({ color: 0x7fb8d8, roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.55 }), 64);
  scene.add(cabMesh);
  // Brake lights: small red strip at the rear; bright when braking.
  const brakeMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.18, 0.3), new THREE.MeshBasicMaterial({ color: 0xffffff }), 64);
  scene.add(brakeMesh);
  // Damage smoke: grey puffs above badly damaged cars (v.smoke 0-1).
  const smokeMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.9, 8, 6), new THREE.MeshStandardMaterial({ color: 0x555555, transparent: true, opacity: 0.5, roughness: 1 }), 16);
  scene.add(smokeMesh);
  // Enemy chevron: a small red marker above each enemy.
  const chevronMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(0.4, 0.7, 4), new THREE.MeshBasicMaterial({ color: 0xff2222 }), 32);
  scene.add(chevronMesh);
  // Corpses (lying-down box) + blood decal (flat dark-red disc), 25 s.
  const corpseMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.7, 0.35, 0.6), new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 1 }), 32);
  scene.add(corpseMesh);
  const bloodMesh = new THREE.InstancedMesh(new THREE.CircleGeometry(0.9, 12), new THREE.MeshBasicMaterial({ color: 0x660000, transparent: true, opacity: 0.7 }), 32);
  scene.add(bloodMesh);
  // Police heli searchlight beam (level 4+): translucent cone + a dark heli
  // silhouette + a bright pool on the ground at the searchlight point.
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 9, 60, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.visible = false; scene.add(beam);
  const beamPool = new THREE.Mesh(new THREE.CircleGeometry(9, 20), new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
  beamPool.rotation.x = -Math.PI / 2; beamPool.visible = false; scene.add(beamPool);
  const npcHeli = new THREE.Group();
  const npcHeliBody = new THREE.Mesh(new THREE.BoxGeometry(3, 1.2, 6), new THREE.MeshStandardMaterial({ color: 0x1a2a4a, roughness: 0.5, metalness: 0.4 }));
  npcHeli.add(npcHeliBody);
  const npcRotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.1, 0.5), new THREE.MeshStandardMaterial({ color: 0x111111 }));
  npcRotor.position.y = 0.9; npcHeli.add(npcRotor);
  npcHeli.visible = false; scene.add(npcHeli);
  // Street props: billboards, beach umbrellas, kiosks (static, no sim cost).
  const billboardSpots = [[-120, 40, 'SOLMAR'], [120, -40, 'NEON MILE'], [40, 200, 'MARINA']];
  for (const [bx, bz, label] of billboardSpots) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 8, 8), new THREE.MeshStandardMaterial({ color: 0x555555 }));
    pole.position.set(bx, 4, bz); scene.add(pole);
    const bc = document.createElement('canvas'); bc.width = 256; bc.height = 96;
    const b2 = bc.getContext('2d');
    b2.fillStyle = '#1a2a4a'; b2.fillRect(0, 0, 256, 96);
    b2.fillStyle = '#ffc94d'; b2.font = 'bold 40px system-ui, sans-serif'; b2.textAlign = 'center'; b2.textBaseline = 'middle';
    b2.fillText(label, 128, 50);
    const board = new THREE.Mesh(new THREE.BoxGeometry(10, 3.6, 0.4), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(bc), roughness: 0.8 }));
    board.position.set(bx, 9.5, bz); scene.add(board);
  }
  for (let i = 0; i < 8; i++) {
    const ux = -260 + i * 70, uz = 228 + (i % 2) * 4;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 6), new THREE.MeshStandardMaterial({ color: 0xdddddd }));
    pole.position.set(ux, 1.1, uz); scene.add(pole);
    const umb = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.1, 8), new THREE.MeshStandardMaterial({ color: [0xff4fa3, 0x2ee6c8, 0xffc94d, 0xff6b4a][i % 4], roughness: 0.9 }));
    umb.position.set(ux, 2.5, uz); scene.add(umb);
  }
  for (const [kx, kz] of [[-180, 210], [60, 210], [-60, -140], [200, 120]]) {
    const kiosk = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 3), new THREE.MeshStandardMaterial({ color: 0xe8d29a, roughness: 0.9 }));
    kiosk.position.set(kx, 1.5, kz); scene.add(kiosk);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.3, 3.6), new THREE.MeshStandardMaterial({ color: 0xc96f3f, roughness: 0.9 }));
    roof.position.set(kx, 3.2, kz); scene.add(roof);
  }
  // Rain puddles: glossy dark patches on the roads, only when raining.
  const puddleMat = new THREE.MeshStandardMaterial({ color: 0x2a3a4a, roughness: 0.05, metalness: 0.6 });
  const puddles = [];
  for (const [px, pz] of [[-180, 40], [60, -40], [120, 120], [-60, -120], [200, 40], [0, 200]]) {
    const pud = new THREE.Mesh(new THREE.PlaneGeometry(9, 5), puddleMat);
    pud.rotation.x = -Math.PI / 2; pud.position.set(px, 0.06, pz); pud.visible = false; scene.add(pud);
    puddles.push(pud);
  }
  // Vehicle trim: side skirt (low dark band) + exhaust pipe + door handles.
  const skirtMesh = new THREE.InstancedMesh(carGeo, new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 }), 64);
  scene.add(skirtMesh);
  const exhaustGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.5, 6); exhaustGeo.rotateX(Math.PI / 2);
  const exhaustMesh = new THREE.InstancedMesh(exhaustGeo, new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.6 }), 64);
  scene.add(exhaustMesh);
  const handleMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.06, 0.06), new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.4, metalness: 0.7 }), 128);
  scene.add(handleMesh);
  // People: boxy, readable humans — NO capsules, NO spheres. One instanced
  // body box + one instanced head box; colour per instance (ped / enemy / cop).
  const personBodyGeo = new THREE.BoxGeometry(0.55, 1.15, 0.32);
  const personBodyMesh = new THREE.InstancedMesh(personBodyGeo, new THREE.MeshStandardMaterial({ roughness: 0.9 }), 64);
  personBodyMesh.castShadow = true; scene.add(personBodyMesh);
  const personHeadGeo = new THREE.BoxGeometry(0.26, 0.28, 0.26);
  const personHeadMesh = new THREE.InstancedMesh(personHeadGeo, new THREE.MeshStandardMaterial({ roughness: 0.9 }), 64);
  personHeadMesh.castShadow = true; scene.add(personHeadMesh);
  // Enemy / cop gun: one instanced box, posed forward (aim) or down (carry).
  const gunGeo = new THREE.BoxGeometry(0.07, 0.1, 0.42);
  const gunMesh = new THREE.InstancedMesh(gunGeo, new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.5 }), 32);
  scene.add(gunMesh);
  const playerMesh = new THREE.Group();
  // Milo Cruz: boxy but precise human, 1:7.5 head canon (total ~1.8, head 0.24).
  // ZERO spheres: torso 2 tapered boxes + belt, box head + flat hair, box arms/hands.
  const jacketMat = new THREE.MeshStandardMaterial({ color: 0xffc94d, roughness: 0.85 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd9a066, roughness: 0.9 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.9 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 1 });
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.55, 0.34), jacketMat);
  chest.position.y = 1.28; chest.castShadow = true; playerMesh.add(chest);
  const waist = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.45, 0.3), jacketMat);
  waist.position.y = 0.85; playerMesh.add(waist);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.08, 0.32), darkMat);
  belt.position.y = 0.62; playerMesh.add(belt);
  const pHead = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.24), skinMat);
  pHead.position.y = 1.68; pHead.castShadow = true; playerMesh.add(pHead);
  const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.26), hairMat);
  hairTop.position.y = 1.84; playerMesh.add(hairTop);
  const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.06), hairMat);
  hairBack.position.set(0, 1.76, -0.12); playerMesh.add(hairBack);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.05), skinMat);
  nose.position.set(0, 1.66, 0.14); playerMesh.add(nose);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1 });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.02), eyeMat);
    eye.position.set(s * 0.06, 1.71, 0.13); playerMesh.add(eye);
  }
  // Arms hang at the sides (pivot at shoulder so the walk swing reads).
  const armGeo = new THREE.BoxGeometry(0.15, 0.62, 0.18); armGeo.translate(0, -0.31, 0);
  const handGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12); handGeo.translate(0, -0.68, 0);
  const pArmL = new THREE.Group(); pArmL.position.set(-0.39, 1.5, 0);
  const pArmR = new THREE.Group(); pArmR.position.set(0.39, 1.5, 0);
  for (const arm of [pArmL, pArmR]) {
    arm.add(new THREE.Mesh(armGeo, jacketMat));
    arm.add(new THREE.Mesh(handGeo, skinMat));
    playerMesh.add(arm);
  }
  // Legs (pivot at hip so the walk swing reads).
  const legGeo = new THREE.BoxGeometry(0.22, 0.6, 0.24); legGeo.translate(0, -0.3, 0);
  const pLegL = new THREE.Mesh(legGeo, darkMat); pLegL.position.set(-0.14, 0.6, 0); playerMesh.add(pLegL);
  const pLegR = new THREE.Mesh(legGeo, darkMat); pLegR.position.set(0.14, 0.6, 0); playerMesh.add(pLegR);
  const bootGeo = new THREE.BoxGeometry(0.22, 0.08, 0.32); bootGeo.translate(0, -0.62, 0.03);
  const pBootL = new THREE.Mesh(bootGeo, darkMat); pBootL.position.set(-0.14, 0.6, 0); playerMesh.add(pBootL);
  const pBootR = new THREE.Mesh(bootGeo, darkMat); pBootR.position.set(0.14, 0.6, 0); playerMesh.add(pBootR);
  // Player weapon: held in the right hand, posed by updateWeaponPose below.
  const pWeapon = new THREE.Group(); pWeapon.position.set(0.39, 1.5, 0); playerMesh.add(pWeapon);
  scene.add(playerMesh);
  const boatMesh = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }));
  hull.position.y = 0.4; boatMesh.add(hull);
  scene.add(boatMesh);
  const heliMesh = new THREE.Group();
  const hBody = new THREE.Mesh(new THREE.BoxGeometry(2, 1.6, 5), new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.4, metalness: 0.3 }));
  hBody.position.y = 1; heliMesh.add(hBody);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.1, 0.5), new THREE.MeshStandardMaterial({ color: 0x222222 }));
  rotor.position.y = 2.1; heliMesh.add(rotor);
  scene.add(heliMesh);
  // Particles as points.
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(240 * 3);
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const points = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xffc94d, size: 0.6, transparent: true, opacity: 0.9 }));
  scene.add(points);
  // Rain: one InstancedMesh of ~1500 drops around the player.
  const rainMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.9, 0.05), new THREE.MeshBasicMaterial({ color: 0x9ab8d8, transparent: true, opacity: 0.5 }), 1200);
  rainMesh.visible = false; scene.add(rainMesh);
  // Bloom: bright pass + 2-level blur + composite (ACES + grade + vignette).
  const rtOpts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
  const sceneRT = new THREE.WebGLRenderTarget(1280, 720, rtOpts);
  const brightRT = new THREE.WebGLRenderTarget(640, 360, rtOpts);
  const blurRT = new THREE.WebGLRenderTarget(640, 360, rtOpts);
  const quadScene = new THREE.Scene();
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const brightMat = new THREE.ShaderMaterial({ uniforms: { t: { value: sceneRT.texture }, threshold: { value: 0.85 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }', fragmentShader: 'varying vec2 vUv; uniform sampler2D t; uniform float threshold; void main(){ vec3 c=texture2D(t,vUv).rgb; float l=dot(c,vec3(.3,.6,.1)); gl_FragColor=vec4(c*step(threshold,l),1.); }' });
  const blurMat = new THREE.ShaderMaterial({ uniforms: { t: { value: brightRT.texture }, dir: { value: new THREE.Vector2(1, 0) } }, vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }', fragmentShader: 'varying vec2 vUv; uniform sampler2D t; uniform vec2 dir; void main(){ vec3 c=vec3(0.); for(int i=-4;i<=4;i++){ c+=texture2D(t,vUv+dir*float(i)*0.004).rgb; } gl_FragColor=vec4(c/9.,1.); }' });
  // Composite: scene + bloom, vignette, then ACES tone mapping + sRGB
  // conversion. The scene is rendered to a render target in LINEAR space
  // (no tone mapping / output encoding there), so the composite must do
  // both — without it the bloom path comes out far too dark.
  const compMat = new THREE.ShaderMaterial({ uniforms: { t: { value: sceneRT.texture }, b: { value: blurRT.texture }, strength: { value: 0.7 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }', fragmentShader: 'varying vec2 vUv; uniform sampler2D t; uniform sampler2D b; uniform float strength; vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); } void main(){ vec3 c=texture2D(t,vUv).rgb + texture2D(b,vUv).rgb*strength; float d=distance(vUv,vec2(.5)); c*=1.0-d*0.35; c=aces(c*1.05); c=pow(c, vec3(1.0/2.2)); gl_FragColor=vec4(c,1.); }' });
  // FXAA (fast approximate anti-aliasing): luma-edge blend as the final pass,
  // so building/vehicle edges stop shimmering. No SMAA addon is vendored in
  // v2, so this compact shader does the job in the existing custom pipeline.
  const compRT = new THREE.WebGLRenderTarget(1280, 720, rtOpts);
  const fxaaMat = new THREE.ShaderMaterial({
    uniforms: { t: { value: compRT.texture }, invRes: { value: new THREE.Vector2(1 / 1280, 1 / 720) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }',
    fragmentShader: [
      'varying vec2 vUv; uniform sampler2D t; uniform vec2 invRes;',
      'float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }',
      'void main(){',
      '  vec2 r = invRes;',
      '  vec3 cM = texture2D(t, vUv).rgb;',
      '  float lM = luma(cM);',
      '  float lN = luma(texture2D(t, vUv + vec2(0.0, -r.y)).rgb);',
      '  float lS = luma(texture2D(t, vUv + vec2(0.0,  r.y)).rgb);',
      '  float lW = luma(texture2D(t, vUv + vec2(-r.x, 0.0)).rgb);',
      '  float lE = luma(texture2D(t, vUv + vec2( r.x, 0.0)).rgb);',
      '  float lNW = luma(texture2D(t, vUv + vec2(-r.x, -r.y)).rgb);',
      '  float lNE = luma(texture2D(t, vUv + vec2( r.x, -r.y)).rgb);',
      '  float lSW = luma(texture2D(t, vUv + vec2(-r.x,  r.y)).rgb);',
      '  float lSE = luma(texture2D(t, vUv + vec2( r.x,  r.y)).rgb);',
      '  float lMin = min(lM, min(min(lN, lS), min(min(lW, lE), min(min(lNW, lNE), min(lSW, lSE)))));',
      '  float lMax = max(lM, max(max(lN, lS), max(max(lW, lE), max(max(lNW, lNE), max(lSW, lSE)))));',
      '  float range = lMax - lMin;',
      '  if (range < max(0.0312, lMax * 0.125)) { gl_FragColor = vec4(cM, 1.0); return; }',
      '  float dH = -2.0*lW + lNW + lSW + 2.0*lE - lNE - lSE;',
      '  float dV = -2.0*lN + lNW + lNE + 2.0*lS - lSW - lSE;',
      '  vec2 dir = vec2(dH, dV);',
      '  float len = length(dir);',
      '  if (len < 0.0001) { gl_FragColor = vec4(cM, 1.0); return; }',
      '  dir /= len;',
      '  vec2 off = vec2(-dir.y, dir.x) * r;',
      '  vec3 avg = (texture2D(t, vUv + off * 0.5).rgb + texture2D(t, vUv - off * 0.5).rgb) * 0.5;',
      '  float blend = clamp(abs(luma(avg) - lM) / range, 0.0, 1.0);',
      '  gl_FragColor = vec4(mix(cM, avg, blend), 1.0);',
      '}',
    ].join('\n'),
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), compMat);
  quadScene.add(quad);
  function renderPass(mat, target) {
    quad.material = mat;
    renderer.setRenderTarget(target);
    renderer.render(quadScene, quadCam);
  }
  let lastT = performance.now(), frames = 0, fpsT = 0;
  function resize() {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    const pr = Math.min(window.devicePixelRatio || 1, 2) * api.scale;
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    sceneRT.setSize(Math.floor(w * pr), Math.floor(h * pr));
    compRT.setSize(Math.floor(w * pr), Math.floor(h * pr));
    fxaaMat.uniforms.invRes.value.set(1 / Math.floor(w * pr), 1 / Math.floor(h * pr));
  }
  window.addEventListener('resize', resize);
  resize();
  api.setTopDown = (v) => { rig.topDown = v; };
  api.draw = (state, screen, input, dt) => {
    const now = performance.now();
    frames++; fpsT += now - lastT; lastT = now;
    if (fpsT > 1000) { api.fps = Math.round(frames * 1000 / fpsT); frames = 0; fpsT = 0; }
    updateCameraRig(rig, state, dt, input);
    const cp = cameraPosition(rig, state, city);
    camera.position.set(cp.x, cp.y, cp.z);
    camera.lookAt(cp.lookX, cp.lookY, cp.lookZ);
    camera.fov = rig.topDown ? 50 : rig.fov;
    camera.updateProjectionMatrix();
    // Day/night keyframes.
    const sky = skyColors(state.hour);
    const night = state.hour < 5 || state.hour >= 19.5;
    // Blend the horizon colour toward dusk orange by warmth (golden hour).
    const bgCol = new THREE.Color(sky.horizon[0]).lerp(new THREE.Color(sky.horizon[1]), sky.horizon[2]);
    const topCol = new THREE.Color(sky.top[0]).lerp(new THREE.Color(sky.top[1]), sky.top[2]);
    // The sky dome IS the background now (no flat scene.background); the fog
    // still follows the horizon colour.
    scene.fog = new THREE.Fog(bgCol.getHex(), 120, sky.fog * (state.weather.kind === 'rain' ? 0.6 : 1));
    const sunAngle = ((state.hour - 6) / 12) * Math.PI;
    sun.position.set(Math.cos(sunAngle) * 200 + state.player.x, Math.max(60, Math.sin(sunAngle) * 180), state.player.z + 60);
    sun.target.position.set(state.player.x, 0, state.player.z);
    sun.intensity = sky.sunI;
    ambient.intensity = sky.ambient;
    hemi.intensity = 0.6 + sky.sun * 0.4;
    // Sky dome follows the camera; uniforms track the hour + sun direction.
    skyDome.position.set(camera.position.x, camera.position.y, camera.position.z);
    skyMat.uniforms.topColor.value.copy(topCol);
    skyMat.uniforms.horizonColor.value.copy(bgCol);
    skyMat.uniforms.sunDir.value.set(sun.position.x - state.player.x, sun.position.y, sun.position.z - state.player.z).normalize();
    skyMat.uniforms.uTime.value = state.time;
    winMesh.visible = night; lampHead.visible = true;
    lampHead.material.color.setHex(night ? 0xffe9a8 : 0x888888);
    neonMesh.visible = night || state.hour > 17.5;
    // Sea shimmer: colour by hour, gentle bob, sun glitter streak aimed at
    // the sun, and beach foam washing in/out along the waterline.
    sea.material.color.setHex(state.hour > 17 && state.hour < 19.5 ? 0x2a7a9a : 0x1f8fa8);
    sea.position.y = 0.1 + Math.sin(state.time * 0.8) * 0.05;
    glitter.rotation.z = Math.atan2(sun.position.x - state.player.x, sun.position.z - state.player.z);
    glitterMat.opacity = 0.22 + 0.13 * Math.sin(state.time * 1.3);
    for (const f of foamMats) {
      const w = Math.sin(state.time * 0.6 + f.phase);
      f.mat.opacity = 0.08 + 0.22 * Math.max(0, w);
      f.mesh.position.z = f.baseZ + w * 1.5;
    }
    // Race checkpoint gate (lit torus + ground ring, pulsing) + rival cars
    // with their name tags above them.
    if (state.race.active) {
      const raceDef = RACES.find(q => q.id === state.race.id);
      if (raceDef) {
        const cp = raceDef.checkpoints[Math.min(state.race.checkpoint, raceDef.checkpoints.length - 1)];
        gate.visible = true; gateRing.visible = true;
        gate.position.set(cp[0], 3, cp[1]);
        gateRing.position.set(cp[0], 0.15, cp[1]);
        const pulse = 1 + 0.08 * Math.sin(state.time * 4);
        gate.scale.set(pulse, pulse, pulse);
      }
      if (state.race.rivals) {
        state.race.rivals.forEach((rv, i) => {
          const g = rivalCars[i], tag = rivalTags[i];
          if (!g || !tag) return;
          g.visible = true; tag.visible = true;
          g.position.set(rv.x, 0, rv.z);
          const raceDef2 = RACES.find(q => q.id === state.race.id);
          const cp = raceDef2 ? raceDef2.checkpoints[Math.min(rv.cp, raceDef2.checkpoints.length - 1)] : [rv.x, rv.z + 1];
          g.rotation.y = Math.atan2(cp[0] - rv.x, cp[1] - rv.z);
          tag.position.set(rv.x, 3.4, rv.z);
        });
      }
    } else {
      gate.visible = false; gateRing.visible = false;
      for (const g of rivalCars) g.visible = false;
      for (const t of rivalTags) t.visible = false;
    }
    // Vehicles.
    let ci = 0;
    for (const v of state.vehicles) {
      if (ci >= 64) break;
      const d = Math.hypot(v.x - state.player.x, v.z - state.player.z);
      if (d > 260) continue;
      pos.set(v.x, 0.6, v.z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), v.heading);
      sc.set(v.def.wid, 1.0, v.def.len); m4.compose(pos, q, sc);
      carMesh.setMatrixAt(ci, m4); col.setHex(v.model === 'cruiser' ? 0xffffff : v.color); carMesh.setColorAt(ci, col);
      pos.y = 1.35; sc.set(v.def.wid * 0.8, 0.7, v.def.len * 0.5); m4.compose(pos, q, sc);
      cabMesh.setMatrixAt(ci, m4);
      // Trim: side skirt, exhaust pipe at the rear, door handles both sides.
      pos.set(v.x, 0.32, v.z); sc.set(v.def.wid + 0.12, 0.22, v.def.len * 0.72); m4.compose(pos, q, sc);
      skirtMesh.setMatrixAt(ci, m4);
      off.set(0.35, 0.3, -v.def.len / 2 - 0.15).applyQuaternion(q);
      pos.set(v.x + off.x, 0.3, v.z + off.z); sc.set(1, 1, 1); m4.compose(pos, q, sc);
      exhaustMesh.setMatrixAt(ci, m4);
      for (const s of [-1, 1]) {
        off.set(s * (v.def.wid / 2 + 0.03), 0.75, 0.3).applyQuaternion(q);
        pos.set(v.x + off.x, 0.75, v.z + off.z); sc.set(1, 1, 1); m4.compose(pos, q, sc);
        handleMesh.setMatrixAt(ci * 2 + (s < 0 ? 0 : 1), m4);
      }
      // Brake light at the rear: bright red when braking (player handbrake
      // / reverse, or a traffic car blocked ahead), dim otherwise.
      off.set(0, 0.75, -v.def.len / 2 - 0.05).applyQuaternion(q);
      pos.set(v.x + off.x, 0.75, v.z + off.z); sc.set(v.def.wid * 0.7, 1, 1); m4.compose(pos, q, sc);
      brakeMesh.setMatrixAt(ci, m4);
      const braking = (v.id === state.player.vehicleId && (input.handbrake || input.back)) || (v.blocked || 0) > 0;
      col.setHex(braking ? 0xff2222 : 0x661111); brakeMesh.setColorAt(ci, col);
      ci++;
    }
    carMesh.count = ci; cabMesh.count = ci; skirtMesh.count = ci; exhaustMesh.count = ci; handleMesh.count = ci * 2; brakeMesh.count = ci;
    carMesh.instanceMatrix.needsUpdate = true; cabMesh.instanceMatrix.needsUpdate = true;
    skirtMesh.instanceMatrix.needsUpdate = true; exhaustMesh.instanceMatrix.needsUpdate = true; handleMesh.instanceMatrix.needsUpdate = true; brakeMesh.instanceMatrix.needsUpdate = true;
    if (carMesh.instanceColor) carMesh.instanceColor.needsUpdate = true;
    if (brakeMesh.instanceColor) brakeMesh.instanceColor.needsUpdate = true;
    // Damage smoke puffs above badly damaged cars (v.smoke 0-1).
    let si = 0;
    for (const v of state.vehicles) {
      if (!v.smoke || v.smoke <= 0 || si >= 16) continue;
      if (Math.hypot(v.x - state.player.x, v.z - state.player.z) > 260) continue;
      const puff = (0.5 + v.smoke * 1.1) * (1 + 0.15 * Math.sin(state.time * 2 + v.id));
      pos.set(v.x, 1.8 + 0.4 * Math.sin(state.time * 1.5 + v.id), v.z);
      q.identity(); sc.set(puff, puff, puff); m4.compose(pos, q, sc);
      smokeMesh.setMatrixAt(si++, m4);
    }
    smokeMesh.count = si; smokeMesh.instanceMatrix.needsUpdate = true;
    // Peds + enemies + on-foot cops: boxy body + box head, gun where armed.
    const SKINS = [0xd9a066, 0xc98a5a, 0xe8b48a, 0x8a5a3a];
    let pi = 0, gi = 0, chi = 0, coi = 0;
    const up = new THREE.Vector3(0, 1, 0);
    for (const q2 of state.peds) {
      if (!q2.alive) {
        // Corpse + blood decal, visible for the 25 s before cleanup.
        if (q2.deadTimer < 25 && coi < 32 && Math.hypot(q2.x - state.player.x, q2.z - state.player.z) < 220) {
          pos.set(q2.x, 0.2, q2.z); q.setFromEuler(new THREE.Euler(0, q2.heading, Math.PI / 2)); sc.set(1, 1, 1); m4.compose(pos, q, sc);
          corpseMesh.setMatrixAt(coi, m4);
          pos.set(q2.x, 0.06, q2.z); q.identity(); sc.set(1, 1, 1); m4.compose(pos, q, sc);
          bloodMesh.setMatrixAt(coi, m4);
          coi++;
        }
        continue;
      }
      if (pi >= 64) continue;
      if (Math.hypot(q2.x - state.player.x, q2.z - state.player.z) > 220) continue;
      const hs = q2.height / 1.8;
      pos.set(q2.x, 0.9 * hs, q2.z); q.setFromAxisAngle(up, q2.heading);
      sc.set(1, hs, 1); m4.compose(pos, q, sc); personBodyMesh.setMatrixAt(pi, m4);
      col.setHex(q2.color); personBodyMesh.setColorAt(pi, col);
      pos.y = 1.62 * hs; sc.set(1, hs, 1); m4.compose(pos, q, sc); personHeadMesh.setMatrixAt(pi, m4);
      col.setHex(SKINS[Math.floor(hash2(q2.x, q2.z) * SKINS.length) % SKINS.length]); personHeadMesh.setColorAt(pi, col);
      pi++;
    }
    for (const e of state.enemies) {
      if (!e.alive || pi >= 64) continue;
      const hs = 1;
      pos.set(e.x, 0.9, e.z); q.setFromAxisAngle(up, e.heading);
      sc.set(1, hs, 1); m4.compose(pos, q, sc); personBodyMesh.setMatrixAt(pi, m4);
      col.setHex(0xd81a1a); personBodyMesh.setColorAt(pi, col);
      pos.y = 1.62; m4.compose(pos, q, sc); personHeadMesh.setMatrixAt(pi, m4);
      col.setHex(0xd9a066); personHeadMesh.setColorAt(pi, col);
      pi++;
      // Enemy always aims: gun forward at chest height.
      if (gi < 32) {
        pos.set(e.x + Math.sin(e.heading) * 0.35, 1.3, e.z + Math.cos(e.heading) * 0.35);
        q.setFromAxisAngle(up, e.heading); sc.set(1, 1, 1); m4.compose(pos, q, sc);
        gunMesh.setMatrixAt(gi++, m4);
      }
      // Red chevron above the enemy (bobs gently so it reads at a glance).
      if (chi < 32) {
        pos.set(e.x, 2.6 + 0.15 * Math.sin(state.time * 3 + e.x), e.z);
        q.setFromEuler(new THREE.Euler(Math.PI, 0, 0)); sc.set(1, 1, 1); m4.compose(pos, q, sc);
        chevronMesh.setMatrixAt(chi++, m4);
      }
    }
    for (const c of state.cops) {
      if (!c.onFoot || pi >= 64) continue;
      if (Math.hypot(c.x - state.player.x, c.z - state.player.z) > 220) continue;
      const ch = Math.atan2(state.player.x - c.x, state.player.z - c.z);
      pos.set(c.x, 0.9, c.z); q.setFromAxisAngle(up, ch);
      sc.set(1, 1, 1); m4.compose(pos, q, sc); personBodyMesh.setMatrixAt(pi, m4);
      col.setHex(0x2a4a7a); personBodyMesh.setColorAt(pi, col);
      pos.y = 1.62; m4.compose(pos, q, sc); personHeadMesh.setMatrixAt(pi, m4);
      col.setHex(0xd9a066); personHeadMesh.setColorAt(pi, col);
      pi++;
      // Cop gun: aim when the player aims, else carried muzzle-down.
      if (gi < 32) {
        if (state.player.aiming) {
          pos.set(c.x + Math.sin(ch) * 0.35, 1.3, c.z + Math.cos(ch) * 0.35);
          q.setFromAxisAngle(up, ch);
        } else {
          pos.set(c.x + Math.cos(ch) * 0.35, 1.0, c.z - Math.sin(ch) * 0.35);
          q.setFromEuler(new THREE.Euler(Math.PI / 2, ch, 0, 'YXZ'));
        }
        sc.set(1, 1, 1); m4.compose(pos, q, sc); gunMesh.setMatrixAt(gi++, m4);
      }
    }
    personBodyMesh.count = pi; personHeadMesh.count = pi; gunMesh.count = gi; chevronMesh.count = chi; corpseMesh.count = coi; bloodMesh.count = coi;
    personBodyMesh.instanceMatrix.needsUpdate = true; personHeadMesh.instanceMatrix.needsUpdate = true; gunMesh.instanceMatrix.needsUpdate = true; chevronMesh.instanceMatrix.needsUpdate = true; corpseMesh.instanceMatrix.needsUpdate = true; bloodMesh.instanceMatrix.needsUpdate = true;
    if (personBodyMesh.instanceColor) personBodyMesh.instanceColor.needsUpdate = true;
    if (personHeadMesh.instanceColor) personHeadMesh.instanceColor.needsUpdate = true;
    // Player figure.
    const p = state.player;
    playerMesh.visible = p.onFoot;
    playerMesh.position.set(p.x, p.y, p.z);
    playerMesh.rotation.y = p.heading;
    const phase = playerWalkPhase(state, dt);
    const swing = p.speed > 0.5 ? 1 : 0;
    pLegL.rotation.x = Math.sin(phase) * 0.6 * swing;
    pLegR.rotation.x = -Math.sin(phase) * 0.6 * swing;
    pBootL.rotation.x = pLegL.rotation.x; pBootR.rotation.x = pLegR.rotation.x;
    pArmL.rotation.x = -Math.sin(phase) * 0.45 * swing;
    pArmR.rotation.x = Math.sin(phase) * 0.45 * swing;
    updateWeaponPose(pWeapon, p, state);
    // Boats.
    const boat = state.boats.find(b => b.driver);
    boatMesh.visible = !!boat;
    if (boat) { boatMesh.position.set(boat.x, Math.sin(boat.bob) * 0.15, boat.z); boatMesh.rotation.y = boat.heading; boatMesh.rotation.z = Math.sin(boat.bob) * 0.05; }
    // Helicopters.
    const heli = state.helis.find(h => h.pilot);
    heliMesh.visible = !!heli;
    if (heli) { heliMesh.position.set(heli.x, heli.y + 1, heli.z); heliMesh.rotation.y = heli.heading; rotor.rotation.y = heli.rotor; }
    // Police heli searchlight beam (level 4+): a translucent cone from the
    // hovering heli down to the searchlight pool on the ground.
    const showBeam = !!(state._searchlight && state.wanted && state.wanted.level >= 4);
    beam.visible = showBeam; beamPool.visible = showBeam; npcHeli.visible = showBeam;
    if (showBeam) {
      const sl = state._searchlight;
      beam.position.set(sl.x, 30, sl.z);
      beamPool.position.set(sl.x, 0.1, sl.z);
      npcHeli.position.set(sl.x, 60, sl.z);
      npcHeli.rotation.y = state.time * 0.2;
      npcRotor.rotation.y = state.time * 12;
    }
    // Rain puddles: glossy patches on the roads, only while it rains.
    const raining = state.weather && state.weather.kind === 'rain';
    for (const pud of puddles) pud.visible = raining;
    // Particles.
    let pp = 0;
    for (const pt of state.particles) {
      if (!pt.active || pp >= 240) continue;
      pPos[pp * 3] = pt.x; pPos[pp * 3 + 1] = pt.y; pPos[pp * 3 + 2] = pt.z; pp++;
    }
    pGeo.setDrawRange(0, pp);
    pGeo.attributes.position.needsUpdate = true;
    points.visible = pp > 0;
    // Rain drops.
    rainMesh.visible = state.weather.rain > 0.2;
    if (rainMesh.visible) {
      for (let i = 0; i < 1200; i++) {
        const rx = p.x + hash2(i, 1) * 80 - 40, rz = p.z + hash2(i, 2) * 80 - 40;
        const ry = 20 - ((state.time * 30 + i * 0.7) % 20);
        pos.set(rx, ry, rz); q.identity(); sc.set(1, 1, 1); m4.compose(pos, q, sc);
        rainMesh.setMatrixAt(i, m4);
      }
      rainMesh.instanceMatrix.needsUpdate = true;
    }
    // Adaptive resolution: drop scale when slow.
    if (api._frameMs > 24 && api.scale > 0.6) { api.scale -= 0.1; resize(); }
    else if (api._frameMs < 15 && api.scale < 1) { api.scale += 0.05; resize(); }
    const t0 = performance.now();
    if (api.bloomOn) {
      renderer.setRenderTarget(sceneRT);
      renderer.render(scene, camera);
      // Capture scene stats here: the bloom passes reset info.render.
      api.drawCalls = renderer.info.render.calls; api.triangles = renderer.info.render.triangles;
      renderPass(brightMat, brightRT);
      blurMat.uniforms.dir.value.set(1, 0); renderPass(blurMat, blurRT);
      blurMat.uniforms.t.value = blurRT.texture; blurMat.uniforms.dir.value.set(0, 1);
      renderPass(blurMat, brightRT);
      compMat.uniforms.b.value = brightRT.texture;
      renderPass(compMat, compRT);
      renderPass(fxaaMat, null);
    } else {
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    }
    api._frameMs = performance.now() - t0;
    if (!api.bloomOn) { const info = renderer.info; api.drawCalls = info.render.calls; api.triangles = info.render.triangles; }
    // Title screen: slow cinematic orbit.
    if (screen === SCREEN_TITLE) { rig.orbit += dt * 0.05; rig.yaw = rig.orbit; }
  };
  return api;
}
function mergeGeos(geos) {
  // Minimal merge: BufferGeometryUtils-free concatenation of position/normal/uv.
  let vCount = 0, iCount = 0;
  for (const g of geos) { vCount += g.attributes.position.count; iCount += g.index.count; }
  const pos = new Float32Array(vCount * 3), nor = new Float32Array(vCount * 3), uv = new Float32Array(vCount * 2);
  const idx = new Uint32Array(iCount);
  let vo = 0, io = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, vo * 3);
    nor.set(g.attributes.normal.array, vo * 3);
    uv.set(g.attributes.uv.array, vo * 2);
    const gi = g.index.array;
    for (let i = 0; i < gi.length; i++) idx[io + i] = gi[i] + vo;
    vo += g.attributes.position.count; io += gi.length;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

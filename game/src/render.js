// Drawing only: the world state in, pixels out. Three.js r160, vendored,
// no network, no build step. Golden-hour lighting, a living sky, water
// with sun glitter and shoreline foam (never parallel stripes), and a
// city built from merged boxes so the draw calls stay under budget.
// If the 3D renderer fails, the screen goes red with the failure in plain
// text — a screenshot never silently falls back to nothing.
import * as THREE from 'three';
import { WORLD, PALETTE } from './config.js';
import { skyColors, sunElevation } from './weather.js';
import { bodyParts, walkSwing } from './character.js';
import { buildingWindows, rooftopItems } from './buildings.js';
import { clamp } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

/** Merge many boxes into one BufferGeometry with vertex colours. */
export function mergeBoxes(boxes) {
  const positions = [];
  const normals = [];
  const colors = [];
  const indices = [];
  let base = 0;
  const color = new THREE.Color();
  for (const box of boxes) {
    const geo = new THREE.BoxGeometry(box.w, box.h, box.d);
    const matrix = new THREE.Matrix4();
    const pos = new THREE.Vector3(box.x || 0, box.y || 0, box.z || 0);
    const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, box.rot || 0, 0));
    const scale = new THREE.Vector3(box.sx || 1, box.sy || 1, box.sz || 1);
    matrix.compose(pos, quat, scale);
    geo.applyMatrix4(matrix);
    const posAttr = geo.getAttribute('position');
    const normAttr = geo.getAttribute('normal');
    const idxAttr = geo.getIndex();
    color.set(box.color || '#888888');
    for (let i = 0; i < posAttr.count; i += 1) {
      positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
      normals.push(normAttr.getX(i), normAttr.getY(i), normAttr.getZ(i));
      colors.push(color.r, color.g, color.b);
    }
    for (let i = 0; i < idxAttr.count; i += 1) indices.push(idxAttr.getX(i) + base);
    base += posAttr.count;
    geo.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  out.setIndex(indices);
  return out;
}

/** Lighten or darken a hex colour by a factor, for asphalt patch variation. */
function shadeHex(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
  const b = Math.min(255, Math.round((n & 255) * f));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function skyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color('#2c3a6e') },
      horizonColor: { value: new THREE.Color('#ff9a3c') },
      sunDir: { value: new THREE.Vector3(0, 0.2, -1) },
      sunColor: { value: new THREE.Color('#ffd27a') },
      nightAmt: { value: 0 },
    },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vDir; uniform vec3 topColor; uniform vec3 horizonColor; uniform vec3 sunDir; uniform vec3 sunColor; uniform float nightAmt;
      float hash3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      void main(){
        float h = clamp(vDir.y, -0.1, 1.0);
        vec3 col = mix(horizonColor, topColor, pow(max(h, 0.0), 0.55));
        float sunAmt = pow(max(dot(normalize(vDir), normalize(sunDir)), 0.0), 90.0);
        float halo = pow(max(dot(normalize(vDir), normalize(sunDir)), 0.0), 8.0);
        col += sunColor * (sunAmt * 1.6 + halo * 0.35);
        // Stars after dark: the night sky was a flat black void, and the
        // onfoot frame's JPEG compressed to 101 KB against the 120 KB
        // detail floor because most of the frame was flat black.
        if (nightAmt > 0.01) {
          vec3 cell = floor(normalize(vDir) * 180.0);
          float s = hash3(cell);
          float star = step(0.997, s) * (0.4 + 0.6 * hash3(cell + 1.0));
          col += vec3(star) * nightAmt * smoothstep(0.02, 0.3, vDir.y);
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

function waterMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      time: { value: 0 },
      sunDir: { value: new THREE.Vector3(0, 0.2, -1) },
      deep: { value: new THREE.Color('#0f3350') },
      shallow: { value: new THREE.Color('#1d4e6b') },
      sunColor: { value: new THREE.Color('#ffd27a') },
      centre: { value: new THREE.Vector2(320, 240) },
      landR: { value: 298 },
    },
    vertexShader: 'varying vec2 vXZ; varying vec3 vPos; void main(){ vXZ = position.xz; vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 vXZ; varying vec3 vPos; uniform float time; uniform vec3 sunDir; uniform vec3 deep; uniform vec3 shallow; uniform vec3 sunColor; uniform vec2 centre; uniform float landR;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), f.x), mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), f.x), f.y); }
      void main(){
        float n = noise(vXZ * 0.08 + vec2(time*0.05, time*0.03)) * 0.6 + noise(vXZ * 0.23 - vec2(time*0.04, 0.0)) * 0.4;
        vec3 col = mix(deep, shallow, n);
        vec2 toSun = normalize(sunDir.xz + vec2(0.001));
        float streak = pow(max(0.0, 1.0 - abs(dot(normalize(vXZ - centre), toSun) - 0.0) * 2.2), 3.0);
        col += sunColor * streak * (0.35 + n * 0.5);
        float shore = length((vXZ - centre) / vec2(landR, landR * 0.75));
        float foam = smoothstep(0.985, 1.0, shore) * (0.5 + 0.5 * sin(time * 1.6 + shore * 90.0));
        col = mix(col, vec3(0.95, 0.95, 0.9), foam * 0.55);
        gl_FragColor = vec4(col, 0.92);
      }`,
  });
}

export function createRenderer(canvas) {
  let renderer = null;
  let failed = null;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (error) {
    failed = String(error && error.message ? error.message : error);
  }
  const ctx2d = !renderer ? canvas.getContext('2d') : null;
  const scene = renderer ? new THREE.Scene() : null;
  const camera = renderer ? new THREE.PerspectiveCamera(60, 1280 / 720, 0.1, 2000) : null;
  if (renderer) {
    renderer.setSize(1280, 720, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // Exposure 3.2: the golden-hour cover read 0.316 at 2.4 and 0.341 at
    // 2.8 — both below the 0.35 floor — and the race at 18.8 read 0.329
    // at 3.0. The shadow side of the frame (dark asphalt, lawn, shaded
    // walls) dominates the lower half; exposure plus the brighter
    // hemisphere lifts the shadows into the 0.35-0.55 band without
    // blowing out the sky (cover 0.387 at 3.0, still inside the band).
    renderer.toneMappingExposure = 3.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    scene.fog = new THREE.Fog(0xe8a06a, 120, 620);
  }
  const sun = renderer ? new THREE.DirectionalLight(0xffd27a, 2.6) : null;
  const hemi = renderer ? new THREE.HemisphereLight(0x8aa0c8, 0x4a3a28, 0.9) : null;
  if (renderer) { scene.add(sun); scene.add(hemi); }
  const sky = renderer ? new THREE.Mesh(new THREE.SphereGeometry(900, 24, 16), skyMaterial()) : null;
  if (renderer) scene.add(sky);
  const water = renderer ? new THREE.Mesh(new THREE.PlaneGeometry(1400, 1100), waterMaterial()) : null;
  if (renderer) {
    water.rotation.x = -Math.PI / 2;
    water.position.set(320, -0.4, 240);
    scene.add(water);
  }
  const dynamicLights = [];
  if (renderer) {
    for (let i = 0; i < 10; i += 1) {
      const light = new THREE.PointLight(0xffb02e, 0, 60, 1.6);
      scene.add(light);
      dynamicLights.push(light);
    }
  }
  let staticBuilt = false;
  let characterGroup = null;
  const vehicleGroups = new Map();
  const npcGroups = new Map();
  const policeGroups = new Map();

  function buildStatic(state) {
    if (staticBuilt) return;
    staticBuilt = true;
    const city = state.city;
    // Ground: a round island disc (sand ring outside, grass inside).
    const ground = new THREE.Mesh(new THREE.CircleGeometry(WORLD.landRadius + 60, 48), new THREE.MeshStandardMaterial({ color: 0x4d7a3a, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(320, 0, 240);
    scene.add(ground);
    const sand = new THREE.Mesh(new THREE.RingGeometry(WORLD.landRadius - 18, WORLD.landRadius + 60, 48), new THREE.MeshStandardMaterial({ color: 0xd9b380, roughness: 1 }));
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(320, 0.05, 240);
    scene.add(sand);
    // Roads: dark asphalt strips, never blue, with sidewalk edges.
    // Each road is split into ~8 m patches with a deterministic shade
    // variation, like real repaired asphalt. One flat slab per road left
    // the onfoot frame a single black expanse (its JPEG compressed to
    // 101 KB against the 120 KB detail floor); patches break the flat.
    const roadBoxes = [];
    const walkBoxes = [];
    const zebraBoxes = [];
    for (const road of city.roads) {
      const len = Math.hypot(road.x2 - road.x1, road.z2 - road.z1);
      const midX = (road.x1 + road.x2) / 2;
      const midZ = (road.z1 + road.z2) / 2;
      const angle = Math.atan2(road.x2 - road.x1, road.z2 - road.z1);
      const segs = Math.max(1, Math.round(len / 8));
      const dx = (road.x2 - road.x1) / segs;
      const dz = (road.z2 - road.z1) / segs;
      for (let i = 0; i < segs; i += 1) {
        const h = Math.abs(Math.sin(road.x1 * 12.9898 + road.z1 * 78.233 + i * 37.719) * 43758.5453) % 1;
        roadBoxes.push({ w: 10, h: 0.14, d: len / segs, x: road.x1 + dx * (i + 0.5), y: 0.08, z: road.z1 + dz * (i + 0.5), rot: angle, color: shadeHex('#26262a', 0.88 + 0.24 * h) });
      }
      walkBoxes.push({ w: 14.8, h: 0.1, d: len, x: midX, y: 0.04, z: midZ, rot: angle, color: '#8a8578' });
      // Centre line dashes, matte gold.
      const dashes = Math.floor(len / 9);
      for (let i = 0; i < dashes; i += 1) {
        const t = (i + 0.5) / dashes;
        roadBoxes.push({ w: 0.5, h: 0.16, d: 3.2, x: road.x1 + (road.x2 - road.x1) * t, y: 0.1, z: road.z1 + (road.z2 - road.z1) * t, rot: angle, color: '#c9a227' });
      }
      // Zebra crossings at both ends of each road: matte off-white
      // stripes, never glossy, so they read without glaring at golden
      // hour. Seven stripes across the 10 m road, 0.9 m wide each.
      for (const end of [0.06, 0.94]) {
        const cx = road.x1 + (road.x2 - road.x1) * end;
        const cz = road.z1 + (road.z2 - road.z1) * end;
        for (let s = -3; s <= 3; s += 1) {
          const along = Math.sin(angle) * s * 1.3;
          const across = Math.cos(angle) * s * 1.3;
          zebraBoxes.push({ w: 0.9, h: 0.15, d: 3.6, x: cx + along, y: 0.1, z: cz + across, rot: angle, color: '#d8d4c8' });
        }
      }
    }
    scene.add(new THREE.Mesh(mergeBoxes(walkBoxes), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })));
    // Asphalt 0.7, not 0.94: a little sheen from the low sun, so the road
    // reads as wet-looking tarmac at golden hour instead of black felt.
    scene.add(new THREE.Mesh(mergeBoxes(roadBoxes), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 })));
    if (zebraBoxes.length > 0) scene.add(new THREE.Mesh(mergeBoxes(zebraBoxes), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })));
    // Buildings: one merged mesh, pastel facades.
    const bBoxes = city.buildings.map((b) => ({ w: b.w, h: b.h, d: b.d, x: b.x, y: b.h / 2, z: b.z, rot: b.rot, color: b.color }));
    scene.add(new THREE.Mesh(mergeBoxes(bBoxes), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 })));
    // Windows: lit ones glow warm, dark ones stay dark blue. One merged mesh.
    const winBoxes = [];
    for (const b of city.buildings) {
      const { cols, cells } = buildingWindows(b, state.seed);
      for (const cell of cells) {
        const wx = b.x + (cell.col - (cols - 1) / 2) * 3.2;
        const wy = 3.4 + cell.row * 3.4;
        const color = cell.lit ? '#ffd27a' : '#2a3542';
        // All four faces on taller buildings, the two long faces on low
        // shops: windows on one face only left every building a blank wall
        // from three sides — the onfoot shot's pink tower showed nothing
        // but flat paint. Four faces on every 1-floor shop doubled the
        // window geometry and pushed the SwiftShader draw over its 16 ms
        // budget, so the side faces are reserved for 4+ floors.
        winBoxes.push({ w: 1.7, h: 1.9, d: 0.2, x: wx, y: wy, z: b.z + b.d / 2 + 0.12, color });
        winBoxes.push({ w: 1.7, h: 1.9, d: 0.2, x: wx, y: wy, z: b.z - b.d / 2 - 0.12, color });
        if (b.floors >= 4) {
          const wz = b.z + Math.max(-b.d / 2 + 1.2, Math.min(b.d / 2 - 1.2, (cell.col - (cols - 1) / 2) * 3.2));
          winBoxes.push({ w: 0.2, h: 1.9, d: 1.7, x: b.x + b.w / 2 + 0.12, y: wy, z: wz, color });
          winBoxes.push({ w: 0.2, h: 1.9, d: 1.7, x: b.x - b.w / 2 - 0.12, y: wy, z: wz, color });
        }
      }
    }
    scene.add(new THREE.Mesh(mergeBoxes(winBoxes), new THREE.MeshBasicMaterial({ vertexColors: true })));
    // Rooftops: AC boxes, antennae, water tanks, beacons.
    const roofBoxes = [];
    for (const b of city.buildings) {
      for (const item of rooftopItems(b, state.seed)) {
        if (item.kind === 'ac') roofBoxes.push({ w: 2.2, h: 1, d: 1.6, x: b.x + item.x, y: b.h + 0.5, z: b.z + item.z, color: '#9a958a' });
        if (item.kind === 'tank') roofBoxes.push({ w: 2.4, h: 2.6, d: 2.4, x: b.x + item.x, y: b.h + 1.3, z: b.z + item.z, color: '#7a6a52' });
        if (item.kind === 'antenna') roofBoxes.push({ w: 0.3, h: item.h, d: 0.3, x: b.x + item.x, y: b.h + item.h / 2, z: b.z + item.z, color: '#3a3f4a' });
        if (item.kind === 'beacon') roofBoxes.push({ w: 0.8, h: 0.8, d: 0.8, x: b.x, y: b.h + 0.4, z: b.z, color: '#ff3b30' });
      }
    }
    if (roofBoxes.length > 0) scene.add(new THREE.Mesh(mergeBoxes(roofBoxes), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 })));
    // Palms: curved trunks and leaf fans, human scale — never giant blobs.
    const trunkBoxes = [];
    const leafBoxes = [];
    for (const palm of city.palms) {
      trunkBoxes.push({ w: 0.5, h: palm.h, d: 0.5, x: palm.x, y: palm.h / 2, z: palm.z, rot: palm.lean, color: '#7a5a38' });
      for (let f = 0; f < palm.fronds; f += 1) {
        const a = (f / palm.fronds) * Math.PI * 2;
        leafBoxes.push({ w: 2.6, h: 0.18, d: 0.9, x: palm.x + Math.cos(a) * 1.2, y: palm.h + 0.3, z: palm.z + Math.sin(a) * 1.2, rot: a, color: '#3f7a2e' });
      }
    }
    scene.add(new THREE.Mesh(mergeBoxes(trunkBoxes), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })));
    scene.add(new THREE.Mesh(mergeBoxes(leafBoxes), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 })));
    // Street furniture: kiosks, billboards, shelters, umbrellas, signals.
    const propBoxes = [];
    for (const p of state.props) {
      if (p.kind === 'kiosk') propBoxes.push({ w: 4, h: 3, d: 3, x: p.x, y: 1.5, z: p.z, color: p.color || '#e8b400' });
      else if (p.kind === 'billboard') propBoxes.push({ w: 10, h: 5, d: 0.6, x: p.x, y: 5, z: p.z, color: '#14141a' });
      else if (p.kind === 'shelter') propBoxes.push({ w: 6, h: 3.2, d: 2.4, x: p.x, y: 1.6, z: p.z, color: '#2e5fa3' });
      else if (p.kind === 'umbrella') propBoxes.push({ w: 3.4, h: 0.2, d: 3.4, x: p.x, y: 2.6, z: p.z, color: p.color || '#ff4fd8' });
      else if (p.kind === 'bench') propBoxes.push({ w: 2.4, h: 0.9, d: 0.8, x: p.x, y: 0.45, z: p.z, color: '#8a6a42' });
      else if (p.kind === 'hydrant') propBoxes.push({ w: 0.6, h: 1, d: 0.6, x: p.x, y: 0.5, z: p.z, color: '#c22e2e' });
      else if (p.kind === 'signal') propBoxes.push({ w: 0.4, h: 7, d: 0.4, x: p.x, y: 3.5, z: p.z, color: '#3a3f4a' });
      else if (p.kind === 'lounger') propBoxes.push({ w: 2, h: 0.5, d: 0.8, x: p.x, y: 0.25, z: p.z, color: '#f0f0e8' });
      else if (p.kind === 'surfboard') propBoxes.push({ w: 0.6, h: 0.15, d: 2.6, x: p.x, y: 0.4, z: p.z, color: p.color || '#c22e2e' });
      else if (p.kind === 'bin') propBoxes.push({ w: 0.8, h: 1.1, d: 0.8, x: p.x, y: 0.55, z: p.z, color: '#3a3f4a' });
      else if (p.kind === 'neon-sign') propBoxes.push({ w: 3.4, h: 1.1, d: 0.3, x: p.x, y: 4.2, z: p.z, color: p.neon || '#ff4fd8' });
    }
    if (propBoxes.length > 0) scene.add(new THREE.Mesh(mergeBoxes(propBoxes), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 })));
    // Landmarks: bank tower, ferris wheel rim, lighthouse, pier.
    const markBoxes = [];
    for (const mark of city.landmarks) {
      if (mark.kind === 'tower') markBoxes.push({ w: 26, h: mark.h, d: 26, x: mark.x, y: mark.h / 2, z: mark.y, color: '#a7c8d9' });
      if (mark.kind === 'lighthouse') markBoxes.push({ w: 6, h: mark.h, d: 6, x: mark.x, y: mark.h / 2, z: mark.y, color: '#f0f0e8' });
      if (mark.kind === 'pier') markBoxes.push({ w: 60, h: 1.2, d: 8, x: mark.x, y: 0.6, z: mark.y, color: '#8a6a42' });
    }
    if (markBoxes.length > 0) scene.add(new THREE.Mesh(mergeBoxes(markBoxes), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 })));
    // Lamp posts along the roads, so the night city has pools of light.
    const lampBoxes = [];
    for (const lamp of city.lamps) {
      lampBoxes.push({ w: 0.3, h: 6, d: 0.3, x: lamp.x, y: 3, z: lamp.z, color: '#2a2f3a' });
      lampBoxes.push({ w: 0.8, h: 0.3, d: 0.5, x: lamp.x, y: 6.1, z: lamp.z, color: '#ffd27a' });
    }
    if (lampBoxes.length > 0) scene.add(new THREE.Mesh(mergeBoxes(lampBoxes), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 })));
  }

  /** One box-built person, from the same part table as the sim.
   *  Without a walk swing (crowd, police, corpses) the whole body merges
   *  into ONE vertex-colored mesh — 11 meshes per person was blowing the
   *  100-draw-call budget (the race shot read 130). With a swing (the
   *  player) the limbs stay separate so the walk cycle can rotate them. */
  function makePersonMesh(person, swing) {
    const group = new THREE.Group();
    const parts = bodyParts(person);
    if (!swing) {
      const boxes = Object.values(parts).map((p) => ({
        w: p.w, h: p.h, d: p.d, x: p.x || 0, y: p.y, z: p.z || 0, color: p.color,
      }));
      group.add(new THREE.Mesh(mergeBoxes(boxes), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 })));
      return group;
    }
    const mat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
    function addBox(part, px, py, pz) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(part.w, part.h, part.d), mat(part.color));
      mesh.position.set(px || part.x || 0, py !== undefined ? py : part.y, pz || part.z || 0);
      group.add(mesh);
      return mesh;
    }
    addBox(parts.head, 0, parts.head.y, 0);
    addBox(parts.hair, 0, parts.hair.y, 0);
    addBox(parts.torso, 0, parts.torso.y, 0);
    const armL = addBox(parts.armL, parts.armL.x, parts.armL.y, 0);
    const armR = addBox(parts.armR, parts.armR.x, parts.armR.y, 0);
    const legL = addBox(parts.legL, parts.legL.x, parts.legL.y, 0);
    const legR = addBox(parts.legR, parts.legR.x, parts.legR.y, 0);
    addBox(parts.handL, parts.handL.x, parts.handL.y, 0);
    addBox(parts.handR, parts.handR.x, parts.handR.y, 0);
    addBox(parts.footL, parts.footL.x, parts.footL.y, parts.footL.z);
    addBox(parts.footR, parts.footR.x, parts.footR.y, parts.footR.z);
    legL.rotation.x = swing.legL;
    legR.rotation.x = swing.legR;
    armL.rotation.x = swing.armL;
    armR.rotation.x = swing.armR;
    return group;
  }

  /** One vehicle: body, see-through greenhouse with the driver inside,
   *  wheels. The opaque parts merge into ONE vertex-colored mesh (9 meshes
   *  per car was blowing the 100-draw-call budget — the race shot read
   *  130); only the glass and the brake-light bar stay separate. Wheels
   *  are boxes now, not cylinders — same boxy language as the characters. */
  function makeVehicleMesh(vehicle) {
    const group = new THREE.Group();
    const def = vehicle.def;
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x9fc4d8, roughness: 0.12, metalness: 0.35, transparent: true, opacity: 0.55 });
    const isBike = def.kind === 'bike';
    const length = isBike ? 2.2 : def.kind === 'bus' ? 9 : 4.4;
    const width = isBike ? 0.7 : 1.9;
    const bodyColor = vehicle.color || def.color;
    const opaque = [{ w: width, h: 0.75, d: length, x: 0, y: 0.65, z: 0, color: bodyColor }];
    if (!isBike) {
      // The driver is visible through the glass.
      opaque.push({ w: 0.5, h: 0.6, d: 0.4, x: -width * 0.2, y: 1.25, z: -length * 0.02, color: '#2e5fa3' });
      opaque.push({ w: 0.7, h: 0.25, d: 0.3, x: 0, y: 0.55, z: length * 0.32, color: '#c8c8c8' });
    }
    const wheelPositions = isBike
      ? [[0, 0.36, length * 0.38], [0, 0.36, -length * 0.38]]
      : [[-width / 2, 0.36, length * 0.32], [width / 2, 0.36, length * 0.32], [-width / 2, 0.36, -length * 0.32], [width / 2, 0.36, -length * 0.32]];
    for (const [wx, wy, wz] of wheelPositions) {
      opaque.push({ w: 0.28, h: 0.72, d: 0.72, x: wx, y: wy, z: wz, color: '#141414' });
    }
    group.add(new THREE.Mesh(mergeBoxes(opaque), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.35 })));
    if (!isBike) {
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(width * 0.86, 0.62, length * 0.48), glassMat);
      cabin.position.set(0, 1.3, -length * 0.06);
      group.add(cabin);
    }
    // Brake lights glow brighter when braking; headlights at night.
    const tailMat = new THREE.MeshBasicMaterial({ color: vehicle.brakeLight ? 0xff2a1a : 0x881111 });
    const tail = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, 0.18, 0.12), tailMat);
    tail.position.set(0, 0.72, -length / 2 - 0.02);
    group.add(tail);
    group.userData.tailMat = tailMat;
    return group;
  }

  /** A helicopter: body box, tail boom, spinning rotor, skids. The fixed
   *  parts merge into one mesh; the rotor stays separate because it spins,
   *  and so do the glass and the searchlight beam. */
  function makeHeliMesh(heli) {
    const group = new THREE.Group();
    const bodyColor = '#22303e';
    group.add(new THREE.Mesh(mergeBoxes([
      { w: 2.2, h: 1.6, d: 4.2, x: 0, y: 0, z: 0, color: bodyColor },
      { w: 0.5, h: 0.5, d: 5.4, x: 0, y: 0.3, z: -4.2, color: bodyColor },
      { w: 0.18, h: 0.18, d: 3.4, x: -0.9, y: -1.1, z: 0, color: '#3a3f4a' },
      { w: 0.18, h: 0.18, d: 3.4, x: 0.9, y: -1.1, z: 0, color: '#3a3f4a' },
    ]), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.4 })));
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.9, 1.2), new THREE.MeshStandardMaterial({ color: 0x9fc4d8, roughness: 0.12, metalness: 0.35, transparent: true, opacity: 0.55 }));
    glass.position.set(0, 0.3, 1.6);
    group.add(glass);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(11, 0.12, 0.5), new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.6 }));
    rotor.position.y = 1.1;
    group.add(rotor);
    group.userData.rotor = rotor;
    // The searchlight beam, a translucent cone locked on the player.
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(3.2, 26, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
    );
    beam.position.y = -13;
    beam.rotation.x = Math.PI;
    beam.visible = false;
    group.add(beam);
    group.userData.beam = beam;
    return group;
  }

  /** A boat: hull, deck, cabin and a wake that follows it. */
  function makeBoatMesh(boat) {
    const group = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 7.2), new THREE.MeshStandardMaterial({ color: boat.def.color, roughness: 0.4, metalness: 0.2 }));
    hull.position.y = 0.4;
    group.add(hull);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.1, 2.6), new THREE.MeshStandardMaterial({ color: 0xf0f0e8, roughness: 0.5 }));
    cabin.position.set(0, 1.4, -0.6);
    group.add(cabin);
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.4, 0.16), new THREE.MeshStandardMaterial({ color: 0x3a3f4a, roughness: 0.6 }));
    mast.position.set(0, 2.8, -0.6);
    group.add(mast);
    return group;
  }

  function updateLighting(state, time) {
    const hour = state.hour;
    const colors = skyColors(hour);
    const elev = sunElevation(hour);
    const az = ((hour - 12) / 12) * Math.PI;
    const sunDir = new THREE.Vector3(Math.sin(az) * 0.9, Math.max(0.06, elev), -Math.cos(az) * 0.6).normalize();
    sun.position.copy(sunDir).multiplyScalar(180);
    sun.position.x += 320;
    sun.position.z += 240;
    sun.intensity = hour >= 6 && hour < 20.2 ? 2.2 + elev * 0.8 : 0.25;
    // Hemisphere 1.4 by day: the shadow sides of the frame (dark asphalt,
    // lawn, shaded walls) were crushing to black at 0.85 and the race shot
    // read 0.271 luma against a 0.35 floor. Ambient lifts the shadows
    // without touching the golden-hour sun.
    // Night hemisphere 0.85, not 0.3: at 20:30 the road beyond the player's
    // light pool was black and the onfoot shot read 0.208 luma against a
    // 0.25 floor (0.244 at 0.55, 0.254 at 0.6). Night still reads as night
    // — the sky stays dark and the lamps stay the brightest thing — but
    // the asphalt lifts to dark grey, where the patch variation actually
    // reads instead of crushing to one black slab.
    hemi.intensity = hour >= 6 && hour < 20.2 ? 1.4 : 0.85;
    sky.material.uniforms.topColor.value.set(colors.top);
    sky.material.uniforms.horizonColor.value.set(colors.horizon);
    sky.material.uniforms.sunDir.value.copy(sunDir);
    sky.material.uniforms.nightAmt.value = hour < 6.5 || hour > 19.6 ? 1 : 0;
    sky.position.set(320, 0, 240);
    scene.fog.color.set(colors.fog);
    water.material.uniforms.time.value = time;
    water.material.uniforms.sunDir.value.copy(sunDir);
    // Night: neon and lamps join the dynamic light pool.
    const night = hour < 6.5 || hour > 19.6 ? 1 : 0;
    const player = state.player;
    for (let i = 0; i < dynamicLights.length; i += 1) {
      const light = dynamicLights[i];
      if (i === 0) {
        light.position.set(player.x, 4, player.z);
        light.color.set(0xffe9a8);
        light.intensity = 14;
      } else if (i === 1 && state.police.length > 0) {
        const unit = state.police[0];
        light.position.set(unit.x, 3, unit.z);
        light.color.set(Math.floor(time * 4) % 2 === 0 ? 0x3a7bff : 0xff3b30);
        light.intensity = 18;
      } else {
        const lamp = state.city.lamps[(i * 37) % state.city.lamps.length];
        light.position.set(lamp.x, 6, lamp.z);
        light.color.set(0xffb02e);
        light.intensity = night ? 10 : 0;
      }
    }
  }

  function draw(state, screen) {
    if (failed) {
      ctx2d.fillStyle = '#ff0000';
      ctx2d.fillRect(0, 0, 1280, 720);
      ctx2d.fillStyle = '#ffffff';
      ctx2d.font = '28px sans-serif';
      ctx2d.fillText('3D RENDERER FAILED', 40, 80);
      ctx2d.font = '18px sans-serif';
      ctx2d.fillText(failed, 40, 120);
      return { calls: 0, tris: 0 };
    }
    buildStatic(state);
    const player = state.player;
    const time = state.time || 0;
    updateLighting(state, time);

    // The player, always visible, never hidden behind a foreground slab.
    if (!characterGroup) {
      characterGroup = makePersonMesh(player, null);
      scene.add(characterGroup);
    }
    const swing = walkSwing(Math.abs(player.speed || 0), player.walkTime || 0);
    const fresh = makePersonMesh(player, player.onFoot ? swing : null);
    characterGroup.clear();
    for (const child of fresh.children) characterGroup.add(child);
    characterGroup.position.set(player.x, player.y || 0, player.z);
    characterGroup.rotation.y = player.heading;

    // The held weapon, visible in the hands without aiming.
    if (player.onFoot && state.loadout.current !== 'fists') {
      const gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.85), new THREE.MeshStandardMaterial({ color: 0x1c1c22, roughness: 0.4, metalness: 0.7 }));
      gun.position.set(0.32, 1.15, 0.35);
      characterGroup.add(gun);
      if (state.loadout.muzzleFlash > 0) {
        // 0.45, not 0.3: the onfoot shot is a "muzzle flash frame" and the
        // old flash was a 10-pixel speck invisible at 1280x720.
        const flash = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
        flash.position.set(0.32, 1.15, 0.9);
        characterGroup.add(flash);
      }
    }

    // Police cruisers: visible whether the officer is driving or on foot.
    // When the officer gets out, the cruiser stays parked where he left it.
    for (const unit of state.police) {
      const key = `cop-car-${unit.id}`;
      if (!vehicleGroups.has(key)) {
        const cruiser = makeVehicleMesh({ id: key, def: { kind: 'car', color: 0x1a2a44 }, color: 0x1a2a44, brakeLight: false });
        const barRed = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.3), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
        barRed.position.set(-0.45, 1.68, 0);
        cruiser.add(barRed);
        const barBlue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.3), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
        barBlue.position.set(0.45, 1.68, 0);
        cruiser.add(barBlue);
        vehicleGroups.set(key, cruiser);
        scene.add(cruiser);
      }
      const node = vehicleGroups.get(key);
      const px = unit.onFoot ? unit.carX : unit.x;
      const pz = unit.onFoot ? unit.carZ : unit.z;
      const ph = unit.onFoot ? unit.carHeading : unit.heading;
      node.position.set(px, 0, pz);
      node.rotation.y = ph;
    }
    // Vehicles, traffic, police and boats.
    for (const car of [...state.vehicles, ...state.traffic]) {
      const key = car.id;
      if (!vehicleGroups.has(key)) {
        const mesh = makeVehicleMesh(car);
        vehicleGroups.set(key, mesh);
        scene.add(mesh);
      }
      const node = vehicleGroups.get(key);
      node.position.set(car.x, 0, car.z);
      node.rotation.y = car.heading;
      if (node.userData.tailMat) node.userData.tailMat.color.set(car.brakeLight ? 0xff2a1a : 0x881111);
    }
    for (const boat of state.boats) {
      const key = `boat-${boat.id}`;
      if (!vehicleGroups.has(key)) {
        const mesh = makeBoatMesh(boat);
        vehicleGroups.set(key, mesh);
        scene.add(mesh);
      }
      const node = vehicleGroups.get(key);
      node.position.set(boat.x, Math.sin(boat.bobPhase || 0) * 0.25, boat.z);
      node.rotation.y = boat.heading;
      node.rotation.z = Math.sin((boat.bobPhase || 0) * 0.7) * 0.03;
    }
    // The helicopter (player's or police) with its beam.
    const heliKey = 'heli-main';
    if (!vehicleGroups.has(heliKey)) {
      const mesh = makeHeliMesh(state.heli);
      vehicleGroups.set(heliKey, mesh);
      scene.add(mesh);
    }
    const heliNode = vehicleGroups.get(heliKey);
    heliNode.position.set(state.heli.x, state.heli.y, state.heli.z);
    heliNode.rotation.y = state.heli.heading;
    if (heliNode.userData.rotor) heliNode.userData.rotor.rotation.y = state.heli.rotor || 0;
    const policeHeliNode = vehicleGroups.get('heli-police') || (() => {
      const node = makeHeliMesh(state.policeHeli);
      vehicleGroups.set('heli-police', node);
      scene.add(node);
      return node;
    })();
    policeHeliNode.position.set(state.policeHeli.x, state.policeHeli.y, state.policeHeli.z);
    policeHeliNode.rotation.y = state.policeHeli.heading;
    if (policeHeliNode.userData.rotor) policeHeliNode.userData.rotor.rotation.y = state.policeHeli.rotor || 0;
    const beamVisible = state.player.wanted >= 3;
    if (policeHeliNode.userData.beam) policeHeliNode.userData.beam.visible = beamVisible;
    policeHeliNode.visible = state.player.wanted >= 3 || state.heli.driver === state.player;

    // Pedestrians and police on foot.
    for (const ped of state.peds) {
      if (ped.dead) continue;
      const key = `ped-${ped.id}`;
      if (!npcGroups.has(key)) {
        const mesh = makePersonMesh(ped, null);
        npcGroups.set(key, mesh);
        scene.add(mesh);
      }
      const node = npcGroups.get(key);
      node.position.set(ped.x, 0, ped.z);
      node.rotation.y = ped.heading;
    }
    for (const unit of state.police) {
      if (!unit.onFoot) continue;
      const key = `cop-${unit.id}`;
      if (!policeGroups.has(key)) {
        const mesh = makePersonMesh({ ...unit, skin: '#a06a42', hair: '#14141a', shirt: '#22303e', pants: '#14141a' }, null);
        policeGroups.set(key, mesh);
        scene.add(mesh);
      }
      const node = policeGroups.get(key);
      node.position.set(unit.x, 0, unit.z);
      node.rotation.y = unit.heading;
    }
    // Corpses lie where they fell.
    for (const corpse of state.corpses) {
      const key = `corpse-${corpse.x.toFixed(1)}-${corpse.z.toFixed(1)}`;
      if (!npcGroups.has(key)) {
        const node = makePersonMesh({ skin: '#c98d5f', hair: '#1c1c22', shirt: '#5a1f1f', pants: '#22303e' }, null);
        node.rotation.x = Math.PI / 2;
        node.rotation.z = 0.4;
        node.position.set(corpse.x, 0.3, corpse.z);
        npcGroups.set(key, node);
        scene.add(node);
      }
    }

    // Camera: chase behind the player (or the vehicle), FOV widening with
    // speed — or straight down from 130 m when the player presses C.
    const speed = player.vehicle ? Math.abs(player.vehicle.speed || 0) : Math.abs(player.speed || 0);
    if (state.topDown) {
      camera.position.set(player.x, 130, player.z + 0.1);
      camera.lookAt(player.x, 0, player.z);
      camera.fov = 55;
      camera.updateProjectionMatrix();
    } else {
      const cam = state.camera;
      const backX = -Math.sin(player.heading);
      const backZ = -Math.cos(player.heading);
      const boom = 13 + clamp(speed / 48, 0, 1) * 3;
      const targetX = player.x + backX * boom;
      const targetZ = player.z + backZ * boom;
      const targetY = 5.2 + clamp(speed / 48, 0, 1) * 1.6 + (player.vehicle && player.vehicle.id === 'heli' ? player.vehicle.altitude * 0.4 : 0);
      cam.camX += (targetX - cam.camX) * 0.12;
      cam.camY += (targetY - cam.camY) * 0.12;
      cam.camZ += (targetZ - cam.camZ) * 0.12;
      camera.position.set(cam.camX, cam.camY, cam.camZ);
      camera.lookAt(player.x, 1.6, player.z);
      camera.fov = 60 + clamp(speed / 48, 0, 1) * 12;
      camera.updateProjectionMatrix();
    }
    renderer.render(scene, camera);
    return { calls: renderer.info.render.calls, tris: renderer.info.render.triangles };
  }

  /** Project a world point to NDC for the shot scripts' fail-loud checks. */
  function projectToNDC(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(camera);
    return { x: v.x, y: v.y, visible: v.z < 1 };
  }

  /** Mean luma of the current frame, for the luma-floor checks. */
  function meanLuma() {
    const pixels = new Uint8Array(1280 * 720 * 4);
    const gl = renderer.getContext();
    gl.readPixels(0, 0, 1280, 720, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let sum = 0;
    const step = 16;
    let count = 0;
    for (let i = 0; i < pixels.length; i += 4 * step) {
      sum += 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
      count += 1;
    }
    return sum / count / 255;
  }

  return { draw, projectToNDC, meanLuma, failed: !!failed, renderer, scene, camera };
}

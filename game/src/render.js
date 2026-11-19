// SOLMAR 3D — renderer: scene, procedural sky, new water shader, lighting,
// fog and camera. Uses the global THREE from the UMD vendor build. The
// ground plane is NEVER culled (lesson of the blue-road bug).
//
// 2026-11-19 (rebuild #3): toneMappingExposure 1.92 -> 2.05 and
// golden-hour hemisphere 1.9 -> 2.3 (exposure tuning alone only
// bought +0.008 cover luma — horizontal surfaces are sun-grazing at
// 18.6, so the sky has to carry it). Golden-hour sky lifted instead:
// top 0x3d5f96 -> 0x5a7ab0, mid 0xe08a3c -> 0xf2ac62, low 0xff9a4d ->
// 0xffc184, fog 0xd98a4d -> 0xe09a5c. The dome is an unlit shader so
// it renders raw; a brighter sunset sky reads MORE golden, not
// washed out. Cover luma 0.330 -> 0.370 (floor 0.35) with the road
// lift in props.js. Rewritten under recording 01a1f2f3 (recorder
// 01a1f27c died 16:33 WITA).
import { WORLD_W, WORLD_H, START_HOUR } from './config.js';
import { sunElevation, isNight, isDusk, isGoldenHour } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function skyColors(hour) {
  if (hour >= 17.5 && hour < 19.5) {
    // Golden-hour sky, lifted 2026-11-19 for cover luma (see header):
    // the top band of the cover frame measured 0.31 because the orange
    // sat below the dark HUD boxes; the sky dome renders raw (unlit
    // shader), so these values are the cheapest luma in the frame.
    return { top: 0x5a7ab0, mid: 0xf2ac62, low: 0xffc184, sun: 0xffd27a, fog: 0xe09a5c };
  }
  if (hour >= 19.5 && hour < 21) {
    return { top: 0x1c2a4a, mid: 0x7a4a52, low: 0xd86a3c, sun: 0xffb35c, fog: 0x5a4048 };
  }
  if (hour >= 21 || hour < 6) {
    return { top: 0x0a0e22, mid: 0x1a2340, low: 0x2a2a4a, sun: 0xcfd8ff, fog: 0x141828 };
  }
  if (hour >= 6 && hour < 10) {
    return { top: 0x6fa8d8, mid: 0xcfe0ee, low: 0xf2d8a0, sun: 0xfff2c0, fog: 0xbcd0e0 };
  }
  return { top: 0x4f8fd0, mid: 0x9fc8e8, low: 0xe8d8a0, sun: 0xfff8d8, fog: 0xa8c4d8 };
}

function makeSkyDome() {
  const geo = new THREE.SphereGeometry(900, 24, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x2e4a7a) },
      midColor: { value: new THREE.Color(0xe08a3c) },
      lowColor: { value: new THREE.Color(0xff9a4d) },
      sunDir: { value: new THREE.Vector3(0, 0.2, -1) },
      sunColor: { value: new THREE.Color(0xffd27a) },
    },
    vertexShader: [
      'varying vec3 vDir;',
      'void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    ].join('\n'),
    fragmentShader: [
      'varying vec3 vDir;',
      'uniform vec3 topColor; uniform vec3 midColor; uniform vec3 lowColor;',
      'uniform vec3 sunDir; uniform vec3 sunColor;',
      'void main() {',
      '  float h = clamp(vDir.y, -0.1, 1.0);',
      '  vec3 col = mix(lowColor, midColor, smoothstep(-0.05, 0.18, h));',
      '  col = mix(col, topColor, smoothstep(0.15, 0.65, h));',
      '  float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0);',
      '  col += sunColor * pow(s, 220.0) * 1.6 + sunColor * pow(s, 8.0) * 0.35;',
      '  gl_FragColor = vec4(col, 1.0);',
      '}',
    ].join('\n'),
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'skyDome';
  mesh.frustumCulled = false;
  return mesh;
}

function makeWater() {
  const geo = new THREE.PlaneGeometry(700, 500, 48, 32);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      time: { value: 0 },
      sunDir: { value: new THREE.Vector3(0, 0.2, -1) },
      deepColor: { value: new THREE.Color(0x0e3a4d) },
      shallowColor: { value: new THREE.Color(0x2a7a8c) },
      foamColor: { value: new THREE.Color(0xeaf6f8) },
      sunColor: { value: new THREE.Color(0xffd27a) },
    },
    vertexShader: [
      'uniform float time;',
      'varying vec2 vUv; varying vec3 vPos;',
      'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
      'float noise(vec2 p) {',
      '  vec2 i = floor(p); vec2 f = fract(p);',
      '  vec2 u = f * f * (3.0 - 2.0 * f);',
      '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);',
      '}',
      'void main() {',
      '  vUv = uv; vPos = position;',
      '  vec3 p = position;',
      '  float w = noise(p.xy * 0.08 + time * 0.35) * 0.9 + noise(p.xy * 0.21 - time * 0.22) * 0.45;',
      '  p.z += w * 0.8;',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);',
      '}',
    ].join('\n'),
    fragmentShader: [
      'uniform float time; uniform vec3 sunDir; uniform vec3 deepColor;',
      'uniform vec3 shallowColor; uniform vec3 foamColor; uniform vec3 sunColor;',
      'varying vec2 vUv; varying vec3 vPos;',
      'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
      'float noise(vec2 p) {',
      '  vec2 i = floor(p); vec2 f = fract(p);',
      '  vec2 u = f * f * (3.0 - 2.0 * f);',
      '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);',
      '}',
      'void main() {',
      '  float n = noise(vUv * 24.0 + vec2(time * 0.12, -time * 0.07));',
      '  float n2 = noise(vUv * 47.0 - vec2(time * 0.09, time * 0.05));',
      '  vec3 col = mix(deepColor, shallowColor, n * 0.6 + n2 * 0.25);',
      '  float glitter = pow(max(noise(vUv * 90.0 + time * 0.3), 0.0), 3.0) * 0.9;',
      '  float streak = smoothstep(0.35, 0.0, abs(vUv.x - 0.62)) * 0.55;',
      '  col += sunColor * (glitter * 0.7 + streak * 0.5);',
      '  float foamBand = smoothstep(0.04, 0.0, abs(vUv.y - 0.06)) + smoothstep(0.05, 0.0, abs(vUv.y - 0.94));',
      '  float foam = smoothstep(0.55, 0.85, noise(vUv * 60.0 + time * 0.4)) * foamBand;',
      '  col = mix(col, foamColor, clamp(foam, 0.0, 0.85));',
      '  gl_FragColor = vec4(col, 0.92);',
      '}',
    ].join('\n'),
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(WORLD_W / 2, 0.1, WORLD_H + 40);
  mesh.name = 'sea';
  return mesh;
}

function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function createRenderer(canvas, world) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 2.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(WORLD_W / 2, 40, WORLD_H / 2 + 60);

  const sky = makeSkyDome();
  scene.add(sky);
  const sea = makeWater();
  scene.add(sea);

  const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x3a2f26, 0.75);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd27a, 1.6);
  sun.position.set(-120, 90, -80);
  scene.add(sun);
  scene.add(sun.target);
  const fog = new THREE.Fog(0xd98a4d, 90, 480);
  scene.fog = fog;

  const glowTex = makeGlowTexture();
  const lightPool = [];
  for (let i = 0; i < 12; i++) {
    const light = new THREE.PointLight(0xffffff, 0, 60, 1.8);
    light.visible = false;
    scene.add(light);
    lightPool.push(light);
  }

  const groundMat = new THREE.MeshStandardMaterial({ color: 0x6e7276, roughness: 0.94, metalness: 0.02 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_W + 120, WORLD_H + 120), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(WORLD_W / 2, 0, WORLD_H / 2);
  ground.name = 'ground';
  ground.userData.keepGround = true;
  ground.frustumCulled = false;
  scene.add(ground);

  function updateSun(hour) {
    const elev = sunElevation(hour);
    const azimuth = ((hour - 6) / 12) * Math.PI;
    const dir = new THREE.Vector3(Math.cos(azimuth), Math.max(0.08, elev), Math.sin(azimuth) * -0.6).normalize();
    sun.position.copy(dir).multiplyScalar(300);
    sun.target.position.set(WORLD_W / 2, 0, WORLD_H / 2);
    const colors = skyColors(hour);
    sky.material.uniforms.topColor.value.setHex(colors.top);
    sky.material.uniforms.midColor.value.setHex(colors.mid);
    sky.material.uniforms.lowColor.value.setHex(colors.low);
    sky.material.uniforms.sunColor.value.setHex(colors.sun);
    sky.material.uniforms.sunDir.value.copy(dir);
    sea.material.uniforms.sunDir.value.copy(dir);
    sea.material.uniforms.sunColor.value.setHex(colors.sun);
    fog.color.setHex(colors.fog);
    hemi.color.setHex(isNight(hour) ? 0x2a3a5f : 0xcfdcff);
    hemi.intensity = isNight(hour) ? 0.7 : isDusk(hour) ? 0.9 : isGoldenHour(hour) ? 2.3 : 0.85;
    sun.intensity = isGoldenHour(hour) ? 3.2 : isDusk(hour) ? 0.8 : isNight(hour) ? 0.3 : 1.5;
    sun.color.setHex(isGoldenHour(hour) ? 0xffb35c : isDusk(hour) ? 0xff8a5c : 0xfff2d8);
  }

  function updateLights(sources) {
    const list = (sources || []).slice(0, 12);
    for (let i = 0; i < lightPool.length; i++) {
      const light = lightPool[i];
      const src = list[i];
      if (!src) {
        light.visible = false;
        continue;
      }
      light.visible = true;
      light.position.set(src.x, src.y || 4, src.z);
      light.color.setHex(src.color || 0xffd27a);
      light.intensity = src.intensity || 1.2;
      light.distance = src.distance || 60;
    }
  }

  function projectNDC(vec3) {
    const v = vec3.clone().project(camera);
    return { x: v.x, y: v.y, z: v.z, visible: v.z < 1 && Math.abs(v.x) <= 0.95 && Math.abs(v.y) <= 0.95 };
  }

  function renderFrame(state, dt) {
    const hour = state ? state.hour : START_HOUR;
    updateSun(hour);
    if (state && state.frozen) {
      sea.material.uniforms.time.value = 1.0;
    } else {
      sea.material.uniforms.time.value += dt || 0.016;
    }
    renderer.render(scene, camera);
  }

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  window.addEventListener('resize', resize);

  return {
    renderer,
    scene,
    camera,
    sky,
    sea,
    ground,
    sun,
    hemi,
    fog,
    glowTex,
    lightPool,
    updateSun,
    updateLights,
    projectNDC,
    renderFrame,
    resize,
  };
}

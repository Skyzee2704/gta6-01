// Renderer: three.js r160 UMD via global THREE. Reads sim state, never writes
// it. InstancedMesh for buildings/palms/lamps, merged static geometry for
// roads, one sun shadow map following the player, day/night keyframes,
// custom bloom (bright pass + blur + ACES composite), animated sea, rain
// drops as one InstancedMesh, adaptive resolution, top-down V view, and a
// red failLoud screen if WebGL fails.
import { PALETTE } from './config.js';
import { clamp, lerp, hash2 } from './random.js';
import { createCameraRig, updateCameraRig, cameraPosition, playerWalkPhase } from './character.js';
import { DISTRICTS } from './data.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_MAP = 'map';

function skyColors(hour) {
  // Keyframes: dawn 6, noon 12, dusk 18.5, night 22.
  const sunElev = Math.sin(((hour - 6) / 12) * Math.PI);
  if (hour >= 6 && hour < 18.5) {
    const warmth = clamp(1 - Math.abs(sunElev - 0.15) * 4, 0, 1);
    return { top: [0x6fb7e8, 0xff9a4a, warmth], horizon: [0xcfe8f5, 0xffc27a, warmth], sun: sunElev, fog: 420, ambient: 0.55 + sunElev * 0.45, sunI: 1.2 + sunElev * 1.2 };
  }
  return { top: [0x0b1026, 0x0b1026, 0], horizon: [0x1a2340, 0x1a2340, 0], sun: -0.3, fog: 300, ambient: 0.25, sunI: 0.25 };
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
  // Ground: big plane + road strips merged into one geometry.
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x6a7a4a, roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 560), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.05, 10); ground.receiveShadow = true; scene.add(ground);
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.9 });
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
  // Buildings: one InstancedMesh, colour per instance.
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const bMat = new THREE.MeshStandardMaterial({ roughness: 0.85 });
  const bMesh = new THREE.InstancedMesh(boxGeo, bMat, city.buildings.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3(), col = new THREE.Color();
  city.buildings.forEach((b, i) => {
    pos.set(b.x, b.h / 2, b.z); sc.set(b.w, b.h, b.d);
    m4.compose(pos, q, sc); bMesh.setMatrixAt(i, m4);
    col.setHex(b.color); bMesh.setColorAt(i, col);
  });
  bMesh.castShadow = true; bMesh.receiveShadow = true; scene.add(bMesh);
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
  // Palms: trunk + crown, instanced.
  const palmGeo = new THREE.CylinderGeometry(0.25, 0.4, 8, 6);
  const palmMesh = new THREE.InstancedMesh(palmGeo, new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 1 }), city.palms.length);
  city.palms.forEach((pl, i) => { pos.set(pl.x, 4, pl.z); sc.set(1, pl.h / 8, 1); m4.compose(pos, q, sc); palmMesh.setMatrixAt(i, m4); });
  scene.add(palmMesh);
  const crownGeo = new THREE.SphereGeometry(2.2, 6, 4);
  const crownMesh = new THREE.InstancedMesh(crownGeo, new THREE.MeshStandardMaterial({ color: 0x3f7a2a, roughness: 1 }), city.palms.length);
  city.palms.forEach((pl, i) => { pos.set(pl.x, pl.h + 1, pl.z); sc.set(1, 0.6, 1); m4.compose(pos, q, sc); crownMesh.setMatrixAt(i, m4); });
  scene.add(crownMesh);
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
  // Containers at the harbor.
  const contMesh = new THREE.InstancedMesh(boxGeo, new THREE.MeshStandardMaterial({ roughness: 0.7 }), Math.max(1, city.containers.length));
  city.containers.forEach((c, i) => { pos.set(c.x, 1.5, c.z); sc.set(6, 3, 2.5); m4.compose(pos, q, sc); contMesh.setMatrixAt(i, m4); col.setHex(c.color); contMesh.setColorAt(i, col); });
  scene.add(contMesh);
  // Dynamic pools: vehicles, peds, enemies, player, boats, helis, particles, rain.
  const carGeo = new THREE.BoxGeometry(1, 1, 1);
  const carMat = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.4 });
  const carMesh = new THREE.InstancedMesh(carGeo, carMat, 64);
  carMesh.castShadow = true; scene.add(carMesh);
  const cabMesh = new THREE.InstancedMesh(carGeo, new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.5 }), 64);
  scene.add(cabMesh);
  const pedMesh = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.4, 1.0, 3, 6), new THREE.MeshStandardMaterial({ roughness: 0.9 }), 48);
  scene.add(pedMesh);
  const playerMesh = new THREE.Group();
  const pBody = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.5), new THREE.MeshStandardMaterial({ color: 0xffc94d }));
  pBody.position.y = 1.1; pBody.castShadow = true; playerMesh.add(pBody);
  const pHead = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), new THREE.MeshStandardMaterial({ color: 0xd9a066 }));
  pHead.position.y = 1.95; playerMesh.add(pHead);
  const pLegL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.9, 0.32), new THREE.MeshStandardMaterial({ color: 0x2a2a3a }));
  pLegL.position.set(-0.22, 0.45, 0); playerMesh.add(pLegL);
  const pLegR = pLegL.clone(); pLegR.position.x = 0.22; playerMesh.add(pLegR);
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
  const compMat = new THREE.ShaderMaterial({ uniforms: { t: { value: sceneRT.texture }, b: { value: blurRT.texture }, strength: { value: 0.7 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }', fragmentShader: 'varying vec2 vUv; uniform sampler2D t; uniform sampler2D b; uniform float strength; void main(){ vec3 c=texture2D(t,vUv).rgb + texture2D(b,vUv).rgb*strength; float d=distance(vUv,vec2(.5)); c*=1.0-d*0.35; gl_FragColor=vec4(c,1.); }' });
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
    const pr = Math.min(window.devicePixelRatio || 1, 1.5) * api.scale;
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    sceneRT.setSize(Math.floor(w * pr), Math.floor(h * pr));
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
    const night = state.hour < 6 || state.hour >= 18.5;
    scene.background = new THREE.Color(sky.horizon[0]);
    scene.fog = new THREE.Fog(sky.horizon[0], 120, sky.fog * (state.weather.kind === 'rain' ? 0.6 : 1));
    const sunAngle = ((state.hour - 6) / 12) * Math.PI;
    sun.position.set(Math.cos(sunAngle) * 200 + state.player.x, Math.max(20, Math.sin(sunAngle) * 180), state.player.z + 60);
    sun.target.position.set(state.player.x, 0, state.player.z);
    sun.intensity = sky.sunI;
    ambient.intensity = sky.ambient;
    hemi.intensity = 0.3 + sky.sun * 0.4;
    winMesh.visible = night; lampHead.visible = true;
    lampHead.material.color.setHex(night ? 0xffe9a8 : 0x888888);
    neonMesh.visible = night || state.hour > 17.5;
    // Sea shimmer.
    sea.material.color.setHex(state.hour > 17 && state.hour < 19.5 ? 0x2a7a9a : 0x1f8fa8);
    sea.position.y = 0.1 + Math.sin(state.time * 0.8) * 0.05;
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
      ci++;
    }
    carMesh.count = ci; cabMesh.count = ci;
    carMesh.instanceMatrix.needsUpdate = true; cabMesh.instanceMatrix.needsUpdate = true;
    if (carMesh.instanceColor) carMesh.instanceColor.needsUpdate = true;
    // Peds + enemies.
    let pi = 0;
    for (const q2 of state.peds) {
      if (!q2.alive || pi >= 48) continue;
      if (Math.hypot(q2.x - state.player.x, q2.z - state.player.z) > 220) continue;
      pos.set(q2.x, 1.0, q2.z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), q2.heading);
      sc.set(1, q2.height, 1); m4.compose(pos, q, sc); pedMesh.setMatrixAt(pi, m4);
      col.setHex(q2.color); pedMesh.setColorAt(pi, col); pi++;
    }
    for (const e of state.enemies) {
      if (!e.alive || pi >= 48) continue;
      pos.set(e.x, 1.0, e.z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), e.heading);
      sc.set(1, 1.8, 1); m4.compose(pos, q, sc); pedMesh.setMatrixAt(pi, m4);
      col.setHex(0x8a1a1a); pedMesh.setColorAt(pi, col); pi++;
    }
    pedMesh.count = pi; pedMesh.instanceMatrix.needsUpdate = true;
    if (pedMesh.instanceColor) pedMesh.instanceColor.needsUpdate = true;
    // Player figure.
    const p = state.player;
    playerMesh.visible = p.onFoot;
    playerMesh.position.set(p.x, p.y, p.z);
    playerMesh.rotation.y = p.heading;
    const phase = playerWalkPhase(state, dt);
    pLegL.rotation.x = Math.sin(phase) * 0.6 * (p.speed > 0.5 ? 1 : 0);
    pLegR.rotation.x = -Math.sin(phase) * 0.6 * (p.speed > 0.5 ? 1 : 0);
    // Boats.
    const boat = state.boats.find(b => b.driver);
    boatMesh.visible = !!boat;
    if (boat) { boatMesh.position.set(boat.x, Math.sin(boat.bob) * 0.15, boat.z); boatMesh.rotation.y = boat.heading; boatMesh.rotation.z = Math.sin(boat.bob) * 0.05; }
    // Helicopters.
    const heli = state.helis.find(h => h.pilot);
    heliMesh.visible = !!heli;
    if (heli) { heliMesh.position.set(heli.x, heli.y + 1, heli.z); heliMesh.rotation.y = heli.heading; rotor.rotation.y = heli.rotor; }
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
      renderPass(brightMat, brightRT);
      blurMat.uniforms.dir.value.set(1, 0); renderPass(blurMat, blurRT);
      blurMat.uniforms.t.value = blurRT.texture; blurMat.uniforms.dir.value.set(0, 1);
      renderPass(blurMat, brightRT);
      compMat.uniforms.b.value = brightRT.texture;
      renderer.setRenderTarget(null);
      renderer.render(quadScene, quadCam);
    } else {
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    }
    api._frameMs = performance.now() - t0;
    const info = renderer.info;
    api.drawCalls = info.render.calls; api.triangles = info.render.triangles;
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

// SOLMAR 3D — vehicles: lateral + drift model, transparent greenhouse
// (seats, wheel, driver visible), brake lights, 5-spoke spinning wheels,
// front wheels steer from input (not heading), damage smoke/fire,
// wheel arch + flare, skid marks and tyre smoke.
import { VEHICLES } from './data.js';
import { mergeBoxes, vertexMaterial } from './materials.js';
import { clamp } from './random.js';

export function createVehicleState(vehicleId, x, y, heading = 0) {
  const def = VEHICLES.find((v) => v.id === vehicleId) || VEHICLES[0];
  return {
    def,
    x,
    y,
    heading,
    speed: 0,
    lateral: 0,
    steer: 0,
    gear: 1,
    condition: 100,
    braking: false,
    handbrake: false,
    drifting: false,
    skid: 0,
    smoke: 0,
    mesh: null,
    wheels: [],
  };
}

export function updateVehicle(v, input, dt) {
  const def = v.def;
  let accel = 0;
  if (input.up) accel += def.accel;
  if (input.down) {
    if (v.speed > 0.5) accel -= 28;
    else accel -= 6;
  }
  v.braking = !!input.down && v.speed > 2;
  v.handbrake = !!input.handbrake;
  const grip = v.handbrake ? 0.35 : 1;
  const steerTarget = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const steerRate = v.handbrake ? 2.6 : 1.6;
  v.steer += (steerTarget * 0.55 - v.steer) * Math.min(1, dt * steerRate * 3);
  const speedFactor = clamp(Math.abs(v.speed) / def.topSpeed, 0, 1);
  const turnRate = v.steer * (1.6 - speedFactor * 0.9) * (v.speed >= 0 ? 1 : -1);
  v.heading += turnRate * dt * Math.min(1, Math.abs(v.speed) / 4 + 0.2);
  v.speed += accel * dt;
  v.speed -= v.speed * (v.handbrake ? 0.8 : 0.12) * dt;
  const lateralBleed = v.handbrake ? 0.35 : 0.92;
  v.lateral *= Math.pow(lateralBleed, dt * 60);
  v.lateral += v.steer * Math.abs(v.speed) * 0.02 * (v.handbrake ? 2.2 : 0.4) * dt;
  if (v.handbrake && Math.abs(v.speed) > 12) v.driftLatch = true;
  if (!v.handbrake || Math.abs(v.speed) < 4) v.driftLatch = false;
  v.drifting = !!v.driftLatch;
  v.skid = v.drifting ? 1 : Math.max(0, v.skid - dt * 2);
  v.speed = clamp(v.speed, -def.topSpeed * 0.35, def.topSpeed);
  const fx = Math.sin(v.heading) * v.speed + Math.cos(v.heading) * v.lateral;
  const fy = Math.cos(v.heading) * v.speed - Math.sin(v.heading) * v.lateral;
  v.x += fx * dt;
  v.y += fy * dt;
  const clampedX = Math.max(4, Math.min(636, v.x));
  const clampedY = Math.max(4, Math.min(476, v.y));
  if (clampedX !== v.x || clampedY !== v.y) {
    v.x = clampedX;
    v.y = clampedY;
    v.speed *= 0.5;
    v.lateral = 0;
  }
  v.gear = v.speed < 1 ? 1 : v.speed < def.topSpeed * 0.25 ? 1 : v.speed < def.topSpeed * 0.5 ? 2 : v.speed < def.topSpeed * 0.75 ? 3 : 4;
  if (v.condition < 35) v.smoke = Math.min(1, v.smoke + dt * 0.3);
  else v.smoke = Math.max(0, v.smoke - dt);
  return v;
}

export function damageVehicle(v, amount) {
  v.condition = Math.max(0, v.condition - amount);
  if (v.condition <= 0) v.speed = 0;
  return v.condition;
}

export function buildVehicleMesh(def, materials, opts = {}) {
  const g = new THREE.Group();
  const paint = opts.color || def.color;
  const w = def.w || 2;
  const l = def.l || 4.4;
  if (opts.simple) {
    const parts = [
      { w, h: 0.62, d: l, y: 0.55, color: paint },
      { w: w * 0.82, h: 0.55, d: l * 0.45, y: 1.1, z: -0.2, color: 0x9fd8e8 },
      { w: 0.5, h: 0.5, d: 0.4, x: -0.45, y: 0.95, z: -0.15, color: 0x2a2a2e },
      { w: 0.5, h: 0.5, d: 0.4, x: 0.45, y: 0.95, z: -0.15, color: 0x2a2a2e },
      { w: 0.42, h: 0.55, d: 0.3, x: -0.45, y: 1.0, z: -0.1, color: opts.driverShirt || 0xc22e2e },
      { w: 0.3, h: 0.3, d: 0.28, x: -0.45, y: 1.45, z: -0.1, color: 0xe8b890 },
    ];
    for (const [ax, az] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
      parts.push({ w: 0.28, h: 0.5, d: 0.9, x: ax, y: 0.5, z: az, color: 0x141416 });
      parts.push({ w: 0.3, h: 0.76, d: 0.76, x: ax, y: 0.38, z: az, color: 0x141416 });
    }
    parts.push({ w: 1.4, h: 0.18, d: 0.08, y: 0.75, z: -l / 2 - 0.02, color: 0xc22e2e });
    parts.push({ w: 1.4, h: 0.18, d: 0.08, y: 0.75, z: l / 2 + 0.02, color: 0xfff2c0 });
    const mesh = new THREE.Mesh(mergeBoxes(parts), vertexMaterial());
    g.add(mesh);
    g.userData = { wheels: [], def, simple: true };
    return g;
  }
  const parts = [
    { w, h: 0.62, d: l, y: 0.55, color: paint },
    { w: 0.5, h: 0.5, d: 0.4, x: -0.45, y: 0.95, z: -0.15, color: 0x2a2a2e },
    { w: 0.5, h: 0.5, d: 0.4, x: 0.45, y: 0.95, z: -0.15, color: 0x2a2a2e },
    { w: 0.42, h: 0.55, d: 0.3, x: -0.45, y: 1.0, z: -0.1, color: opts.driverShirt || 0xc22e2e },
    { w: 0.3, h: 0.3, d: 0.28, x: -0.45, y: 1.45, z: -0.1, color: 0xe8b890 },
    { w: 0.1, h: 0.1, d: 0.44, x: -0.45, y: 1.05, z: 0.55, rx: 0.5, color: 0x141416 },
  ];
  for (const [ax, az] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    parts.push({ w: 0.28, h: 0.5, d: 0.9, x: ax, y: 0.5, z: az, color: 0x141416 });
  }
  const body = new THREE.Mesh(mergeBoxes(parts), vertexMaterial());
  g.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.82, 0.55, l * 0.45),
    new THREE.MeshStandardMaterial({
      color: 0x9fd8e8,
      roughness: 0.1,
      metalness: 0.4,
      transparent: true,
      opacity: 0.45,
    }),
  );
  cabin.position.set(0, 1.1, -0.2);
  g.add(cabin);
  const wheels = [];
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const [wx, wz, front] of [[-0.95, 1.45, true], [0.95, 1.45, true], [-0.95, -1.45, false], [0.95, -1.45, false]]) {
    const pivot = new THREE.Group();
    pivot.position.set(wx, 0.38, wz);
    const tire = new THREE.Mesh(wheelGeo, materials.tire);
    pivot.add(tire);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.32, 8), materials.chrome);
    hub.rotation.z = Math.PI / 2;
    pivot.add(hub);
    pivot.userData.front = front;
    pivot.userData.spin = tire;
    g.add(pivot);
    wheels.push(pivot);
  }
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xc22e2e, emissive: 0x880000, emissiveIntensity: 0.4 });
  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.18, 0.08), tailMat);
  tail.position.set(0, 0.75, -l / 2 - 0.02);
  g.add(tail);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe9a0, emissiveIntensity: 0.8 });
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.18, 0.08), headMat);
  head.position.set(0, 0.75, l / 2 + 0.02);
  g.add(head);
  let lightBar = null;
  if (opts.police) {
    lightBar = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.22, 0.4),
      new THREE.MeshBasicMaterial({ color: 0x4da6ff }),
    );
    lightBar.position.set(0, 1.55, 0.3);
    g.add(lightBar);
  }
  g.userData = { wheels, tail, head, lightBar, def };
  return g;
}

export function updateVehicleMesh(v, dt) {
  const mesh = v.mesh;
  if (!mesh) return;
  mesh.position.set(v.x, 0, v.y);
  mesh.rotation.y = v.heading;
  const ud = mesh.userData;
  if (ud.simple) return;
  for (const pivot of ud.wheels) {
    pivot.rotation.y = pivot.userData.front ? v.steer * 0.5 : 0;
    pivot.userData.spin.rotation.x += (v.speed * dt) / 0.38;
  }
  const brakeGlow = v.braking ? 2.2 : 0.4;
  if (ud.tail) ud.tail.material.emissiveIntensity = brakeGlow;
  if (v.smoke > 0.05) {
    mesh.userData.smokeLevel = v.smoke;
  }
}

export function vehicleById(id) {
  return VEHICLES.find((v) => v.id === id) || VEHICLES[0];
}

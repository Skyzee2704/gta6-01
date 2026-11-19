// SOLMAR 3D — the player on foot. Boxy but precise and human: 1.8 units
// tall, head 1/7.5 of height, every body part a clear box (head, torso,
// arms, legs, hands) — no spheres, no alien blobs. Movement is camera
// relative and NEVER mirrored: A strafes screen-left, D screen-right,
// mouse right turns the view right.
import { PLAYER, CAMERA } from './config.js';
import { clamp, lerpAngle, dist2 } from './random.js';

export function createPlayerState(spawn) {
  return {
    x: spawn.x, z: spawn.z, heading: spawn.heading,
    speed: 0, walkPhase: 0, health: PLAYER.maxHealth, armor: 0,
    onFoot: true, vehicleId: null, dead: false,
  };
}

// Camera yaw is three.js rotation.y: forward = (-sin yaw, -cos yaw) in (x,z),
// right = (cos yaw, -sin yaw). Mouse right (dx>0) turns the view right,
// so yaw decreases. A key moves along -right: screen-left. Not mirrored.
export function forwardOf(yaw) {
  return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
}
export function rightOf(yaw) {
  return { x: Math.cos(yaw), z: -Math.sin(yaw) };
}

export function stepPlayerOnFoot(state, dt, input) {
  const p = state.player;
  if (!p.onFoot || p.dead) return;
  const look = input.takeLook();
  state.camera.yaw = clamp(state.camera.yaw - look.dx * 0.0025, -Math.PI * 4, Math.PI * 4);
  state.camera.pitch = clamp(state.camera.pitch - look.dy * 0.002, -0.35, 0.45);
  const move = input.move();
  const fwd = forwardOf(state.camera.yaw);
  const right = rightOf(state.camera.yaw);
  let mx = fwd.x * move.z + right.x * move.x;
  let mz = fwd.z * move.z + right.z * move.x;
  const len = Math.hypot(mx, mz);
  if (len > 0) {
    mx /= len;
    mz /= len;
    const targetSpeed = input.run() ? PLAYER.runSpeed : PLAYER.walkSpeed;
    p.speed += (targetSpeed - p.speed) * Math.min(1, dt * 10);
    p.x += mx * p.speed * dt;
    p.z += mz * p.speed * dt;
    p.heading = lerpAngle(p.heading, Math.atan2(mx, mz), Math.min(1, dt * 12));
    p.walkPhase += dt * p.speed * 2.2;
    state.stats.distanceWalked += p.speed * dt;
  } else {
    p.speed += (0 - p.speed) * Math.min(1, dt * 8);
  }
  // Stay on the island and out of building footprints.
  const r = Math.hypot(p.x, p.z);
  if (r > 228) {
    p.x *= 228 / r;
    p.z *= 228 / r;
  }
  pushOutOfBuildings(state, p, 1.0);
}

export function pushOutOfBuildings(state, obj, radius) {
  for (const b of state.city.buildings) {
    const hw = b.w / 2 + radius;
    const hd = b.d / 2 + radius;
    if (Math.abs(obj.x - b.x) < hw && Math.abs(obj.z - b.z) < hd) {
      const dx = obj.x - b.x;
      const dz = obj.z - b.z;
      const px = hw - Math.abs(dx);
      const pz = hd - Math.abs(dz);
      if (px < pz) obj.x = b.x + (dx >= 0 ? hw : -hw);
      else obj.z = b.z + (dz >= 0 ? hd : -hd);
    }
  }
  for (const lm of state.city.landmarks) {
    if (lm.kind === 'pad' || lm.kind === 'wheel') continue;
    const hw = lm.w / 2 + radius;
    const hd = lm.d / 2 + radius;
    if (Math.abs(obj.x - lm.x) < hw && Math.abs(obj.z - lm.z) < hd) {
      const dx = obj.x - lm.x;
      const dz = obj.z - lm.z;
      const px = hw - Math.abs(dx);
      const pz = hd - Math.abs(dz);
      if (px < pz) obj.x = lm.x + (dx >= 0 ? hw : -hw);
      else obj.z = lm.z + (dz >= 0 ? hd : -hd);
    }
  }
}

// Chase camera: boom behind the player (or the car), FOV widens with
// speed, swing lags heading changes. keepClear walks the camera out
// until no building sits between camera and player — the spawn camera
// never ends up inside a building.
export function computeChaseCamera(state) {
  const cam = state.camera;
  const focus = state.player.onFoot
    ? { x: state.player.x, y: 1.6, z: state.player.z }
    : vehicleFocus(state);
  const speed = state.player.onFoot ? state.player.speed : currentVehicleSpeed(state);
  const boom = CAMERA.chaseBoomMin + (CAMERA.chaseBoomMax - CAMERA.chaseBoomMin) * clamp(speed / 50, 0, 1);
  const fwd = forwardOf(cam.yaw);
  // Swing: the camera trails the heading instead of snapping to it.
  const targetYaw = state.player.onFoot ? state.player.heading : vehicleHeading(state);
  cam.swing = lerpAngle(cam.swing ?? targetYaw, targetYaw, 0.06);
  const back = { x: -Math.sin(cam.swing), z: -Math.cos(cam.swing) };
  let pos = {
    x: focus.x + back.x * boom,
    y: focus.y + 4.2 + speed * 0.02,
    z: focus.z + back.z * boom,
  };
  // keepClear: step from the focus toward the wanted position; stop at
  // the first clear point instead of ending up inside a wall.
  const steps = 24;
  let clear = { ...pos };
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const cand = {
      x: focus.x + (pos.x - focus.x) * t,
      y: focus.y + (pos.y - focus.y) * t,
      z: focus.z + (pos.z - focus.z) * t,
    };
    if (!pointInBuilding(state, cand.x, cand.z, 1.2)) {
      clear = cand;
      break;
    }
    clear = cand;
  }
  const fov = CAMERA.fovSlow + (CAMERA.fovFast - CAMERA.fovSlow) * clamp(speed / 55, 0, 1);
  return { pos: clear, lookAt: focus, fov };
}

function vehicleFocus(state) {
  const v = state.vehicles.find((x) => x.id === state.player.vehicleId);
  if (!v) return { x: state.player.x, y: 1.6, z: state.player.z };
  return { x: v.x, y: 1.8, z: v.z };
}
function currentVehicleSpeed(state) {
  const v = state.vehicles.find((x) => x.id === state.player.vehicleId);
  return v ? Math.abs(v.speed) : 0;
}
function vehicleHeading(state) {
  const v = state.vehicles.find((x) => x.id === state.player.vehicleId);
  return v ? v.heading : state.player.heading;
}

export function pointInBuilding(state, x, z, radius) {
  for (const b of state.city.buildings) {
    if (Math.abs(x - b.x) < b.w / 2 + radius && Math.abs(z - b.z) < b.d / 2 + radius) return true;
  }
  for (const lm of state.city.landmarks) {
    if (lm.kind === 'pad' || lm.kind === 'wheel') continue;
    if (Math.abs(x - lm.x) < lm.w / 2 + radius && Math.abs(z - lm.z) < lm.d / 2 + radius) return true;
  }
  return false;
}

// Body proportions for the renderer: every part a box, head exactly
// 1/7.5 of the 1.8-unit height. One source of truth — render.js builds
// the player and the peds from these numbers. Continuous, no gaps:
// legs [0, 0.86], torso [0.86, 1.56], head [1.56, 1.80].
export function bodyParts() {
  const head = PLAYER.heightUnits * PLAYER.headRatio; // 0.24
  return {
    head: { w: head, h: head, d: head, y: PLAYER.heightUnits - head / 2 },
    hair: { w: 0.26, h: 0.08, d: 0.26, y: 1.80 },
    torso: { w: 0.52, h: 0.70, d: 0.30, y: 1.21 },
    armL: { w: 0.13, h: 0.72, d: 0.16, x: -0.33, y: 1.20 },
    armR: { w: 0.13, h: 0.72, d: 0.16, x: 0.33, y: 1.20 },
    legL: { w: 0.20, h: 0.86, d: 0.24, x: -0.13, y: 0.43 },
    legR: { w: 0.20, h: 0.86, d: 0.24, x: 0.13, y: 0.43 },
    handL: { w: 0.12, h: 0.14, d: 0.14, x: -0.33, y: 0.78 },
    handR: { w: 0.12, h: 0.14, d: 0.14, x: 0.33, y: 0.78 },
  };
}

export function distanceToPlayer(state, x, z) {
  return Math.sqrt(dist2(x, z, state.player.x, state.player.z));
}

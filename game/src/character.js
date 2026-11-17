// Third-person character: walk/run/jump animation, chase camera with drift
// swing + speed FOV + keepClear boom raycast, over-the-shoulder aim offset.
import { clamp, lerp, angleLerp } from './random.js';
import { CAMERA } from './config.js';
import { buildingAt } from './city.js';

export function createCameraRig() {
  return { yaw: 0, pitch: 0.32, dist: CAMERA.boom, fov: 60, shake: 0, topDown: false, orbit: 0 };
}
export function updateCameraRig(rig, state, dt, input) {
  const p = state.player;
  rig.yaw += (input.mouseDX || 0) * 0.003;
  rig.pitch = clamp(rig.pitch + (input.mouseDY || 0) * 0.002, 0.05, 1.1);
  if (input.wheel) rig.dist = clamp(rig.dist + input.wheel * 0.5, 6, 18);
  const speed = p.speed || 0;
  const driving = !p.onFoot;
  const targetFov = driving ? clamp(58 + speed * 0.5, 58, 74) : 60;
  rig.fov = lerp(rig.fov, targetFov, dt * 3);
  const targetDist = driving ? CAMERA.driveBoom + speed * 0.08 : CAMERA.boom;
  rig.dist = lerp(rig.dist, targetDist, dt * 2);
  if (rig.shake > 0) rig.shake = Math.max(0, rig.shake - dt * 3);
  // Player heading follows camera yaw when moving on foot.
  if (p.onFoot && (input.forward || input.back || input.left || input.right)) {
    p.heading = rig.yaw;
  }
}
export function cameraPosition(rig, state, city) {
  const p = state.player;
  if (rig.topDown) return { x: p.x, y: 160, z: p.z + 0.1, lookX: p.x, lookY: 0, lookZ: p.z };
  const drift = p.onFoot ? 0 : Math.sin(p.heading - rig.yaw) * 0.6;
  const yaw = rig.yaw + drift * 0.3;
  const dist = rig.dist;
  const height = p.onFoot ? CAMERA.height : CAMERA.driveHeight;
  let cx = p.x - Math.sin(yaw) * dist;
  let cz = p.z - Math.cos(yaw) * dist;
  let cy = p.y + height;
  // keepClear: shorten the boom if a building blocks the view.
  for (let t = 1; t > 0.2; t -= 0.1) {
    const tx = p.x - Math.sin(yaw) * dist * t, tz = p.z - Math.cos(yaw) * dist * t;
    if (buildingAt(city, tx, tz)) { cx = p.x - Math.sin(yaw) * dist * (t - 0.1); cz = p.z - Math.cos(yaw) * dist * (t - 0.1); break; }
  }
  const shake = rig.shake;
  if (shake > 0) { cx += (Math.random() - 0.5) * shake; cy += (Math.random() - 0.5) * shake; }
  const aimOff = p.aiming ? 1.2 : 0;
  return { x: cx + Math.cos(yaw) * aimOff, y: cy, z: cz - Math.sin(yaw) * aimOff, lookX: p.x, lookY: p.y + 1.6, lookZ: p.z };
}
export function playerWalkPhase(state, dt) {
  const p = state.player;
  p._phase = (p._phase || 0) + dt * (p.speed || 0) * 1.6;
  return p._phase;
}

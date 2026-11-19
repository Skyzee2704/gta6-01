// SOLMAR 3D — aircraft. The police helicopter circles the player from
// 4 stars with a rendered searchlight beam locked on them. One flyable
// helicopter sits on the Harbor helipad: climb in, lift with Space,
// steer with A/D, land it anywhere flat.
import { clamp } from './random.js';

export function createAircraft(state) {
  state.heli = {
    x: -60, z: -165, y: 0, heading: 0, speed: 0, vertical: 0,
    flying: false, rotor: 0, parked: true,
  };
}

export function stepAircraft(state, dt, input) {
  const h = state.heli;
  h.rotor += dt * (h.flying ? 22 : 2);
  if (!h.flying) return;
  const move = input.move();
  h.heading += move.x * dt * 1.4; // same sign as cars/boats: D = right. (Was * -1: the heli steered mirrored.)
  const fwd = move.z;
  h.speed = clamp(h.speed + fwd * 14 * dt - h.speed * 0.4 * dt, -10, 26);
  h.x += Math.sin(h.heading) * h.speed * dt;
  h.z += Math.cos(h.heading) * h.speed * dt;
  const wantY = input.handbrake() ? h.y : (move.z !== 0 ? h.y : h.y);
  // Space (handbrake key) climbs, S descends when hovering.
  if (input.handbrake()) h.vertical = 9;
  else if (move.z < 0) h.vertical = -6;
  else h.vertical *= 0.92;
  h.y = clamp(h.y + h.vertical * dt, 0, 90);
  state.player.x = h.x;
  state.player.z = h.z;
  state.player.heading = h.heading;
  state.camera.yaw = h.heading + Math.PI;
  const r = Math.hypot(h.x, h.z);
  if (r > 300) {
    h.x *= 300 / r;
    h.z *= 300 / r;
  }
  void wantY;
}

export function tryEnterHeli(state) {
  const h = state.heli;
  const p = state.player;
  if (h.flying) {
    h.flying = false;
    h.parked = true;
    h.y = 0;
    h.vertical = 0;
    h.speed = 0;
    p.onFoot = true;
    p.x = h.x + 3;
    p.z = h.z + 3;
    return true;
  }
  const d = Math.hypot(p.x - h.x, p.z - h.z);
  if (d < 5 && p.onFoot) {
    h.flying = true;
    h.parked = false;
    p.onFoot = false;
    p.vehicleId = 'heli';
    state.notices.push({ text: 'Helicopter — Space climbs, S descends, A/D steers.', ttl: 4 });
    return true;
  }
  return false;
}

// The police heli beam: a cone from the heli to the ground spot under
// the player. The renderer draws it; this returns its geometry.
export function heliBeam(state) {
  const heli = state.police.heli;
  if (!heli) return null;
  return {
    from: { x: heli.x, y: heli.y, z: heli.z },
    to: { x: state.player.x, y: 0, z: state.player.z },
  };
}

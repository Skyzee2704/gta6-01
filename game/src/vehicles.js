// SOLMAR 3D — vehicles: driving, stealing, damage. The driving model
// splits velocity into forward and lateral parts: grip bleeds the lateral
// away, the handbrake cuts grip so the tail steps out, and skidding lays
// tyre smoke and skid marks. Cars are boxes with a see-through greenhouse
// (seats, wheel and driver visible), brake lights that brighten, and
// front wheels that steer with the input.
import { VEHICLES } from './data.js';
import { clamp, lerpAngle, dist2 } from './random.js';
import { pushOutOfBuildings } from './character.js';

export function vehicleSpec(typeId) {
  return VEHICLES.find((v) => v.id === typeId) || VEHICLES[1];
}

let nextVehicleId = 1;

export function spawnVehicle(state, typeId, x, z, heading, color) {
  const spec = vehicleSpec(typeId);
  const v = {
    id: nextVehicleId++, type: typeId, name: spec.name, kind: spec.kind,
    x, z, heading, speed: 0, steer: 0, color: color ?? spec.colors[0],
    damage: 0, driver: null, parked: false, brakeLight: false,
    skid: 0, smoke: 0, honk: 0,
  };
  state.vehicles.push(v);
  return v;
}

export function stepPlayerVehicle(state, dt, input) {
  const p = state.player;
  if (p.onFoot || p.vehicleId === null) return;
  const v = state.vehicles.find((x) => x.id === p.vehicleId);
  if (!v) { p.onFoot = true; p.vehicleId = null; return; }
  const spec = vehicleSpec(v.type);
  const move = input.move();
  const throttle = move.z; // W = +1 forward, S = -1 reverse/brake
  const steerInput = move.x; // D = +1 right, A = -1 left
  const handbrake = input.handbrake();
  // Steering follows speed: no steer at a standstill, less at top speed.
  const steerTarget = steerInput * 0.55 * clamp(Math.abs(v.speed) / 8, 0, 1) * (v.speed < -0.5 ? -1 : 1);
  v.steer += (steerTarget - v.steer) * Math.min(1, dt * 8);
  v.heading += v.steer * (v.speed / spec.topSpeed) * dt * 2.4;
  // Forward accel, drag, and reverse.
  if (throttle > 0) v.speed += spec.accel * dt;
  else if (throttle < 0) v.speed -= (v.speed > 0.5 ? spec.accel * 1.4 : spec.accel * 0.6) * dt;
  v.speed -= v.speed * 0.35 * dt;
  if (handbrake) v.speed -= v.speed * 1.6 * dt;
  v.speed = clamp(v.speed, -14, spec.topSpeed);
  // Lateral grip: split velocity, bleed the sideways part away.
  const fx = Math.sin(v.heading);
  const fz = Math.cos(v.heading);
  let vx = fx * v.speed;
  let vz = fz * v.speed;
  const grip = handbrake ? spec.grip * 0.25 : spec.grip;
  const latX = -fz;
  const latZ = fx;
  const latV = vx * latX + vz * latZ;
  const bleed = clamp(grip * dt * 6, 0, 1);
  vx -= latX * latV * bleed;
  vz -= latZ * latV * bleed;
  v.speed = vx * fx + vz * fz;
  v.skid = clamp(Math.abs(latV) / 12, 0, 1);
  if (v.skid > 0.4) v.smoke = Math.min(1, v.smoke + dt * 2);
  else v.smoke = Math.max(0, v.smoke - dt);
  v.x += vx * dt;
  v.z += vz * dt;
  v.brakeLight = throttle < 0 || handbrake;
  // Island edge + buildings push the car back, with damage on hard hits.
  const r = Math.hypot(v.x, v.z);
  if (r > 226) {
    v.x *= 226 / r;
    v.z *= 226 / r;
    if (Math.abs(v.speed) > 12) damageVehicle(state, v, 8);
    v.speed *= 0.4;
  }
  const before = { x: v.x, z: v.z };
  pushOutOfBuildings(state, v, 1.6);
  if ((before.x !== v.x || before.z !== v.z) && Math.abs(v.speed) > 10) damageVehicle(state, v, 6);
  if (Math.abs(v.speed) > 10) damageVehicle(state, v, 0);
  p.x = v.x;
  p.z = v.z;
  p.heading = v.heading;
  state.stats.distanceDriven += Math.abs(v.speed) * dt;
  state.camera.yaw = lerpAngle(state.camera.yaw, v.heading + Math.PI, Math.min(1, dt * 1.2));
  // Car versus pedestrian: a moving car that hits a ped kills the ped
  // and raises wanted; hitting the player hurts and knocks them back.
  checkVehicleImpacts(state, v);
}

export function damageVehicle(state, v, amount) {
  if (amount <= 0) return;
  v.damage = Math.min(100, v.damage + amount);
  if (v.damage > 60) v.smoke = 1;
  if (v.damage >= 100) {
    v.speed = 0;
    state.notices.push({ text: `${v.name} is wrecked.`, ttl: 3 });
  }
}

function checkVehicleImpacts(state, v) {
  if (Math.abs(v.speed) < 3) return;
  for (const ped of state.peds) {
    if (ped.dead) continue;
    if (dist2(v.x, v.z, ped.x, ped.z) < 2.2 * 2.2) {
      ped.dead = true;
      ped.deathTime = state.time.elapsed;
      state.stats.kills += 1;
      raiseWantedLocal(state, 1, 'Pedestrian run over');
    }
  }
  // Another car hitting the player on foot is handled by world step.
}

export function raiseWantedLocal(state, amount, reason) {
  if (state.missions.active !== null) return; // missions set wanted themselves
  state.player.wanted = Math.min(5, state.player.wanted + amount);
  if (amount > 0) state.notices.push({ text: `Wanted level ${state.player.wanted} — ${reason}`, ttl: 3 });
}

export function enterNearestVehicle(state) {
  const p = state.player;
  if (!p.onFoot) {
    // Get out.
    const v = state.vehicles.find((x) => x.id === p.vehicleId);
    if (v) {
      p.x = v.x + Math.sin(v.heading + Math.PI / 2) * 2.4;
      p.z = v.z + Math.cos(v.heading + Math.PI / 2) * 2.4;
      v.driver = null;
    }
    p.onFoot = true;
    p.vehicleId = null;
    return true;
  }
  let best = null;
  let bestD = 4.5 * 4.5;
  for (const v of state.vehicles) {
    if (v.kind === 'bus' && v.driver) continue;
    const d = dist2(p.x, p.z, v.x, v.z);
    if (d < bestD) { bestD = d; best = v; }
  }
  if (!best) return false;
  p.onFoot = false;
  p.vehicleId = best.id;
  best.driver = 'player';
  best.parked = false;
  if (best.driver === 'player' && !best.stolen) {
    best.stolen = true;
    state.stats.carsStolen += 1;
    if (best.kind !== 'bus') raiseWantedLocal(state, 1, 'Grand theft auto');
  }
  return true;
}

// Vehicle shell for the renderer: boxes only. The cabin glass is a
// separate transparent box so seats, wheel and driver show through.
export function vehicleBoxes(spec, color) {
  const isBike = spec.kind === 'bike';
  const isBus = spec.kind === 'bus';
  const len = isBike ? 2.2 : isBus ? 9.0 : spec.body === 'limo' ? 6.4 : spec.body === 'pickup' ? 5.0 : 4.6;
  const wid = isBike ? 0.7 : isBus ? 2.6 : 2.0;
  const h = isBike ? 0.9 : isBus ? 2.9 : 1.35;
  const boxes = [
    { part: 'body', x: 0, y: h / 2 + 0.35, z: 0, w: wid, h, d: len, color },
    { part: 'cabin', x: 0, y: h + 0.55, z: isBus ? 0 : -0.2, w: wid * 0.86, h: 0.62, d: len * (isBus ? 0.92 : 0.5), color: 0x9fd8e8, glass: true },
  ];
  if (!isBike) {
    boxes.push({ part: 'wheel-fl', x: -wid / 2, y: 0.35, z: len / 2 - 0.9, w: 0.22, h: 0.7, d: 0.7, color: 0x14141a });
    boxes.push({ part: 'wheel-fr', x: wid / 2, y: 0.35, z: len / 2 - 0.9, w: 0.22, h: 0.7, d: 0.7, color: 0x14141a });
    boxes.push({ part: 'wheel-rl', x: -wid / 2, y: 0.35, z: -len / 2 + 0.9, w: 0.22, h: 0.7, d: 0.7, color: 0x14141a });
    boxes.push({ part: 'wheel-rr', x: wid / 2, y: 0.35, z: -len / 2 + 0.9, w: 0.22, h: 0.7, d: 0.7, color: 0x14141a });
    boxes.push({ part: 'light-l', x: -wid / 2 + 0.2, y: 0.75, z: len / 2, w: 0.3, h: 0.14, d: 0.08, color: 0xfff2b0, emissive: true });
    boxes.push({ part: 'light-r', x: wid / 2 - 0.2, y: 0.75, z: len / 2, w: 0.3, h: 0.14, d: 0.08, color: 0xfff2b0, emissive: true });
  } else {
    // The one sphere Sky allows: a bike headlight.
    boxes.push({ part: 'headlight', x: 0, y: 0.8, z: len / 2, w: 0.16, h: 0.16, d: 0.1, color: 0xfff2b0, emissive: true, sphere: true });
    boxes.push({ part: 'wheel-f', x: 0, y: 0.32, z: len / 2 - 0.5, w: 0.14, h: 0.64, d: 0.64, color: 0x14141a });
    boxes.push({ part: 'wheel-r', x: 0, y: 0.32, z: -len / 2 + 0.5, w: 0.14, h: 0.64, d: 0.64, color: 0x14141a });
  }
  return { boxes, len, wid };
}

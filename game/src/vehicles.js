// Vehicles: driving physics and the fleet. Steering is never mirrored:
// positive steer always turns the vehicle to its right, on the road, on a
// boat and in the air. The model splits velocity into forward and lateral
// parts, so drifting, grip bleed and handbrake slides fall out naturally.
import { VEHICLE } from './config.js';
import { vehicleById } from './data.js';
import { clamp, wrapAngle } from './random.js';

export function createVehicle(defId, x, z, heading) {
  const def = vehicleById(defId);
  return {
    id: defId, def, x, z, y: 0, heading, speed: 0, steer: 0,
    vx: 0, vz: 0, health: 100, color: def.color, parked: true,
    driver: null, damage: 0, skid: 0, brakeLight: false, wheelAngle: 0,
  };
}

/**
 * One driving step. input.steer: -1 left (A), +1 right (D). input.throttle
 * 0..1, input.brake 0..1, input.handbrake true while held.
 */
export function stepVehicle(vehicle, input, dt) {
  const def = vehicle.def;
  const targetSteer = clamp(input.steer, -1, 1) * VEHICLE.maxSteer;
  vehicle.steer += clamp(targetSteer - vehicle.steer, -VEHICLE.steerSpeed * dt, VEHICLE.steerSpeed * dt);
  vehicle.wheelAngle = vehicle.steer;
  const grip = input.handbrake ? 0.32 : def.grip;
  const forward = { x: Math.sin(vehicle.heading), z: Math.cos(vehicle.heading) };
  const right = { x: Math.cos(vehicle.heading), z: -Math.sin(vehicle.heading) };
  const vForward = vehicle.vx * forward.x + vehicle.vz * forward.z;
  const vLateral = vehicle.vx * right.x + vehicle.vz * right.z;
  let nextForward = vForward + (input.throttle * def.accel - input.brake * 22) * dt;
  if (input.brake > 0 && vForward > 0 && input.throttle === 0) nextForward = Math.max(0, nextForward - 8 * dt);
  nextForward = clamp(nextForward, -8, def.topSpeed);
  // Lateral velocity bleeds away by grip; a handbrake lets the tail step out.
  const nextLateral = vLateral * Math.max(0, 1 - grip * 8 * dt);
  vehicle.skid = Math.abs(nextLateral) > 3.5 ? 1 : Math.max(0, vehicle.skid - dt * 2);
  const turnRate = (nextForward / Math.max(6, def.topSpeed)) * vehicle.steer * (input.handbrake ? 1.5 : 1) * 2.4;
  // D is right: steer +1 decreases the heading, same as on foot. See character.js.
  vehicle.heading = wrapAngle(vehicle.heading - turnRate * dt * Math.sign(nextForward || 1));
  vehicle.vx = forward.x * nextForward + right.x * nextLateral;
  vehicle.vz = forward.z * nextForward + right.z * nextLateral;
  vehicle.x += vehicle.vx * dt;
  vehicle.z += vehicle.vz * dt;
  vehicle.speed = Math.abs(nextForward);
  vehicle.brakeLight = input.brake > 0 || input.throttle === 0;
  return vehicle;
}

/** Damage a vehicle; at 0 health it smokes, catches fire and stops. */
export function damageVehicle(vehicle, amount) {
  vehicle.health = Math.max(0, vehicle.health - amount);
  vehicle.damage = 100 - vehicle.health;
  return vehicle.health <= 0;
}

/** The nearest driveable vehicle within reach, or null. */
export function nearestVehicle(vehicles, x, z, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const v of vehicles) {
    const d = Math.hypot(v.x - x, v.z - z);
    if (d < bestD) { bestD = d; best = v; }
  }
  return best;
}

/** Steal a parked car: the driver gets in, the car is theirs, wanted rises. */
export function enterVehicle(player, vehicle) {
  player.onFoot = false;
  player.vehicle = vehicle;
  vehicle.driver = player;
  vehicle.parked = false;
  return vehicle;
}

export function exitVehicle(player) {
  const vehicle = player.vehicle;
  if (vehicle) {
    vehicle.driver = null;
    player.x = vehicle.x + Math.sin(vehicle.heading + Math.PI / 2) * 2.2;
    player.z = vehicle.z + Math.cos(vehicle.heading + Math.PI / 2) * 2.2;
  }
  player.vehicle = null;
  player.onFoot = true;
  player.speed = 0;
  return vehicle;
}

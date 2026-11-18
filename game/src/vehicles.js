// vehicles.js — cars. Arcade physics: accelerate, steer, brake, reverse,
// handbrake drift. Entering a parked car you do not own is theft (witnessed
// heat when a ped is watching). Damage makes smoke; enough damage explodes.

import { VEHICLES, CAR_MODELS } from './data.js';
import { dist2, clamp, wrapAngle } from './random.js';
import { CAR, WORLD } from './config.js';
import { addWantedHeat } from './weapons.js';
import { buildingAt, onRoad } from './city.js';

// Spawn the vehicle fleet: parked cars from the city plus moving traffic.
export function createVehicles(city, rng) {
  const vehicles = [];
  let id = 0;
  for (const pk of city.parked) {
    vehicles.push({
      id: id++,
      model: pk.model,
      x: pk.x,
      z: pk.z,
      heading: pk.heading,
      speed: 0,
      parked: true,
      driver: null,
      health: 100,
      smoke: 0,
      steer: 0,
      color: vehicleColor(pk.model, rng),
    });
  }
  // Traffic cars, spread across the road grid.
  for (let i = 0; i < 14; i++) {
    const node = city.nodes[rng.int(0, city.nodes.length - 1)];
    vehicles.push({
      id: id++,
      model: rng.pick(CAR_MODELS),
      x: node.x + rng.range(-4, 4),
      z: node.z + rng.range(-4, 4),
      heading: rng.range(0, Math.PI * 2),
      speed: rng.range(8, 16),
      parked: false,
      driver: 'traffic',
      health: 100,
      smoke: 0,
      steer: 0,
      color: vehicleColor('sedan', rng),
      route: null,
      routeIdx: 0,
    });
  }
  return vehicles;
}

function vehicleColor(model, rng) {
  const def = VEHICLES.find((v) => v.model === model);
  if (def) return def.color;
  return rng.pick(['#b8452e', '#2e6da4', '#3f7a4a', '#c9a227', '#8a8a8a']);
}

// The nearest vehicle to a point (any kind, parked or moving).
export function nearestVehicle(state, x, z) {
  let best = null;
  let bd = Infinity;
  for (const v of state.vehicles) {
    const d = dist2(v.x, v.z, x, z);
    if (d < bd) { bd = d; best = v; }
  }
  return best;
}

// The nearest drivable parked car to a point.
export function nearestParkedCar(state, x, z, maxDist = 7) {
  let best = null;
  let bd = maxDist * maxDist;
  for (const v of state.vehicles) {
    if (!v.parked) continue;
    if (!CAR_MODELS.includes(v.model)) continue;
    const d = dist2(v.x, v.z, x, z);
    if (d < bd) { bd = d; best = v; }
  }
  return best;
}

// Player gets in the nearest car/boat/heli. Returns the vehicle or null.
// Stealing a parked car with a ped watching raises wanted heat.
export function enterVehicle(state, city) {
  const p = state.player;
  if (!p.onFoot) return null;
  const car = nearestParkedCar(state, p.x, p.z, 7);
  if (car) {
    const witnessed = state.peds.some((ped) => !ped.down && dist2(ped.x, ped.z, car.x, car.z) < 26 * 26);
    if (car.model === 'bus') {
      if (state.notices) state.notices.push("Bus locked. Can't steal it.");
      return null;
    }
    car.parked = false;
    car.driver = 'player';
    p.onFoot = false;
    p.vehicleId = car.id;
    p.speed = 0;
    if (witnessed) {
      addWantedHeat(state, 1.2);
      if (state.notices) state.notices.push('Witnessed! The cops are coming.');
    }
    state.stats.stolen = (state.stats.stolen || 0) + 1;
    return car;
  }
  return null;
}

// Player gets out of the current vehicle.
export function exitVehicle(state) {
  const p = state.player;
  if (p.onFoot) return;
  const v = state.vehicles.find((q) => q.id === p.vehicleId);
  if (v) {
    v.driver = null;
    v.speed = 0;
    v.parked = true;
    // Step out to the side so the player is not inside the car.
    p.x = v.x + Math.cos(v.heading) * 3;
    p.z = v.z - Math.sin(v.heading) * 3;
  }
  p.onFoot = true;
  p.vehicleId = -1;
  p.speed = 0;
}

// Arcade driving for one vehicle for one step. `grip` is 1 normally,
// 0.85 in rain. Returns nothing; mutates the vehicle.
export function driveVehicle(v, input, dt, city, grip = 1) {
  const def = VEHICLES.find((q) => q.model === v.model) || VEHICLES[0];
  const top = def.top;
  if (input.forward) v.speed += def.accel * dt;
  if (input.back) {
    if (v.speed > 0.5) v.speed -= CAR.brake * dt;
    else v.speed -= CAR.reverseAccel * dt;
  }
  if (!input.forward && !input.back) {
    // Coast down.
    v.speed -= Math.sign(v.speed) * 6 * dt;
    if (Math.abs(v.speed) < 0.2) v.speed = 0;
  }
  const maxF = input.handbrake ? top * 0.7 : top;
  v.speed = clamp(v.speed, -CAR.reverseTop, maxF);
  // Steering: sharper at low speed, looser at high speed.
  const steerAmount = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const speedK = clamp(Math.abs(v.speed) / top, 0, 1);
  const turn = steerAmount * CAR.turnRate * (0.5 + 0.5 * (1 - speedK)) * grip;
  v.steer = steerAmount;
  if (Math.abs(v.speed) > 0.1) {
    v.heading += turn * dt * Math.sign(v.speed);
  }
  // Handbrake breaks grip: the tail steps out (extra yaw, speed bleed).
  if (input.handbrake && Math.abs(v.speed) > 8) {
    v.heading += steerAmount * 0.9 * dt * Math.sign(v.speed);
    v.speed *= 1 - 0.6 * dt;
  }
  const nx = v.x + Math.sin(v.heading) * v.speed * dt;
  const nz = v.z + Math.cos(v.heading) * v.speed * dt;
  // Building collision: slide along the wall instead of stopping dead.
  const hit = buildingAt(city, nx, nz);
  if (hit) {
    // Try moving on x only, then z only (axis slide).
    if (!buildingAt(city, nx, v.z)) {
      v.x = nx;
    } else if (!buildingAt(city, v.x, nz)) {
      v.z = nz;
    } else {
      v.speed *= 0.4;
    }
  } else {
    v.x = nx;
    v.z = nz;
  }
  v.x = clamp(v.x, WORLD.minX + 4, WORLD.maxX - 4);
  v.z = clamp(v.z, WORLD.minZ + 4, WORLD.maxZ - 4);
  // Damage smoke grows as health falls.
  v.smoke = v.health < 55 ? clamp((55 - v.health) / 55, 0, 1) : 0;
  if (v.health <= 0 && !v.exploded) {
    v.exploded = true;
  }
}

// Damage a vehicle. At 0 health it explodes (handled by world.js).
export function damageVehicle(v, amount) {
  v.health = Math.max(0, v.health - amount);
  return v.health <= 0;
}

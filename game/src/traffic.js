// traffic.js — traffic AI. Cars follow the road graph, keep their lane,
// brake for pedestrians ahead and for slow cars, and panic (speed up,
// swerve) when the player causes chaos nearby.

import { dist2, clamp } from './random.js';
import { findPath } from './city.js';

// Give a traffic car a route: a random road-graph path to follow.
export function assignRoute(car, city, rng) {
  const target = city.nodes[rng.int(0, city.nodes.length - 1)];
  const path = findPath(city, car.x, car.z, target.x, target.z);
  car.route = path.length > 1 ? path : [{ x: target.x, z: target.z }];
  car.routeIdx = 0;
}

// Is there a pedestrian in front of this car within `ahead` units?
function pedAhead(state, car, ahead) {
  const fx = Math.sin(car.heading);
  const fz = Math.cos(car.heading);
  for (const ped of state.peds) {
    if (ped.down) continue;
    const dx = ped.x - car.x;
    const dz = ped.z - car.z;
    const along = dx * fx + dz * fz;
    if (along < 0 || along > ahead) continue;
    const side = Math.abs(dx * fz - dz * fx);
    if (side < 4) return ped;
  }
  return null;
}

// Is there a slow car ahead?
function carAhead(state, car, ahead) {
  const fx = Math.sin(car.heading);
  const fz = Math.cos(car.heading);
  for (const other of state.vehicles) {
    if (other.id === car.id || other.parked) continue;
    const dx = other.x - car.x;
    const dz = other.z - car.z;
    const along = dx * fx + dz * fz;
    if (along < 0 || along > ahead) continue;
    const side = Math.abs(dx * fz - dz * fx);
    if (side < 3.5) return other;
  }
  return null;
}

// Advance all traffic cars one step. 'vulture' cars (the fleeing car in
// job 4) follow their route the same way, a little faster.
export function updateTraffic(state, city, dt, rng) {
  for (const car of state.vehicles) {
    if (car.driver !== 'traffic' && car.driver !== 'vulture') continue;
    if (!car.route || car.routeIdx >= car.route.length) {
      assignRoute(car, city, rng);
      continue;
    }
    const wp = car.route[car.routeIdx];
    const dx = wp.x - car.x;
    const dz = wp.z - car.z;
    const d = Math.hypot(dx, dz);
    if (d < 8) {
      car.routeIdx += 1;
      continue;
    }
    const want = Math.atan2(dx, dz);
    let dh = want - car.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    // Steer toward the waypoint.
    car.heading += clamp(dh, -1.6 * dt, 1.6 * dt);
    // Brake for peds and slow cars ahead.
    const ped = pedAhead(state, car, 14);
    const ahead = carAhead(state, car, 16);
    let targetSpeed = car.driver === 'vulture' ? 26 : 13;
    if (ped) targetSpeed = 0;
    else if (ahead) targetSpeed = Math.min(targetSpeed, Math.abs(ahead.speed || 0));
    // Panic: the player is ramming or shooting nearby.
    const playerNear = Math.sqrt(dist2(car.x, car.z, state.player.x, state.player.z)) < 12;
    if (playerNear && state.wanted.level > 0) targetSpeed = 20;
    const accel = targetSpeed > Math.abs(car.speed) ? 10 : 22;
    if (Math.abs(car.speed) < targetSpeed) car.speed += accel * dt;
    else car.speed -= accel * dt;
    car.speed = clamp(car.speed, 0, 22);
    car.x += Math.sin(car.heading) * car.speed * dt;
    car.z += Math.cos(car.heading) * car.speed * dt;
    car.x = clamp(car.x, -315, 315);
    car.z = clamp(car.z, -235, 235);
  }
}

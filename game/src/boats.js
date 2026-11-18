// boats.js — the marina boats. Two boats wait in the water off the pier;
// board one with E, drive it with W/S, and hop out the same way. Boats
// bob on the swell and leave a wake.

import { dist2, clamp } from './random.js';
import { WORLD } from './config.js';
import { MARINA_BOATS } from './city.js';

// Spawn the boats from the city's marina spots.
export function createBoats(city) {
  return city.boats.map((b, i) => ({
    id: i,
    x: b.x,
    z: b.z,
    heading: 0,
    speed: 0,
    bob: 0,
    wake: 0,
  }));
}

// The nearest boat to a point (or null when there is none).
export function nearestBoat(state, x, z) {
  let best = null;
  let bd = Infinity;
  for (const b of state.boats) {
    const d = dist2(b.x, b.z, x, z);
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}

// Board the nearest boat (within 6 units). Returns the boat or null.
export function enterBoat(state) {
  const p = state.player;
  if (!p.onFoot) return null;
  const b = nearestBoat(state, p.x, p.z);
  if (!b || dist2(b.x, b.z, p.x, p.z) > 36) return null;
  p.onFoot = false;
  p.boatId = b.id;
  p.speed = 0;
  return b;
}

// Step off the boat onto the nearest shore.
export function exitBoat(state) {
  const p = state.player;
  if (p.boatId < 0) return;
  const b = state.boats.find((q) => q.id === p.boatId);
  if (b) {
    p.x = b.x;
    p.z = Math.min(b.z, WORLD.seaZ - 2);
  }
  p.onFoot = true;
  p.boatId = -1;
  p.speed = 0;
}

// Advance the boats one step. The boarded boat answers the input.
export function updateBoats(state, dt, input) {
  const p = state.player;
  for (const b of state.boats) {
    b.bob = Math.sin(state.time * 1.4 + b.id * 2.1) * 0.25;
    if (p.boatId === b.id) {
      if (input.forward) b.speed += 9 * dt;
      if (input.back) b.speed -= 7 * dt;
      if (!input.forward && !input.back) b.speed -= Math.sign(b.speed) * 4 * dt;
      b.speed = clamp(b.speed, -6, 20);
      if (input.left) b.heading -= 1.1 * dt;
      if (input.right) b.heading += 1.1 * dt;
      b.x += Math.sin(b.heading) * b.speed * dt;
      b.z += Math.cos(b.heading) * b.speed * dt;
      b.x = clamp(b.x, WORLD.minX + 4, WORLD.maxX - 4);
      b.z = clamp(b.z, WORLD.minZ + 4, WORLD.maxZ + 60);
      b.wake = Math.min(1, b.wake + Math.abs(b.speed) * dt * 0.1);
      p.x = b.x;
      p.z = b.z;
      p.heading = b.heading;
      p.speed = b.speed;
    } else {
      b.speed *= 1 - 0.5 * dt;
      b.wake = Math.max(0, b.wake - dt * 0.2);
    }
  }
}

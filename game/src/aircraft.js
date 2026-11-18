// aircraft.js — the player helicopter. One heli sits on the Harbor
// helipad; board it with E, climb with Space (jump), and fly with WASD.
// It is an arcade heli: it rises, tilts into motion, and lands soft.
// Hitting a building forces an emergency landing.

import { dist2, clamp } from './random.js';
import { WORLD } from './config.js';
import { HELIPAD } from './city.js';
import { buildingAt } from './city.js';

// Spawn the heli on its pad.
export function createHelis(city) {
  return [{
    id: 0,
    x: city.helipad.x,
    z: city.helipad.z,
    y: 0,
    heading: 0,
    speed: 0,
    rotor: 0,
    beam: 0,
  }];
}

// The heli at a pad near (x, z) — the Harbor helipad. Returns the heli
// record, or null when the pad is far away.
export function heliAtPad(state, x, z) {
  const h = state.helis[0];
  if (!h) return null;
  if (dist2(h.x, h.z, x, z) > 20 * 20) return null;
  return h;
}

// Board the heli (within 8 units of the pad). Returns the heli or null.
export function enterHeli(state) {
  const p = state.player;
  if (!p.onFoot) return null;
  const h = heliAtPad(state, p.x, p.z);
  if (!h) return null;
  p.onFoot = false;
  p.heliId = h.id;
  p.speed = 0;
  return h;
}

// Step out of the heli.
export function exitHeli(state) {
  const p = state.player;
  if (p.heliId < 0) return;
  const h = state.helis.find((q) => q.id === p.heliId);
  if (h) {
    p.x = h.x + 4;
    p.z = h.z;
    h.y = 0;
  }
  p.onFoot = true;
  p.heliId = -1;
  p.speed = 0;
}

// Advance the helis one step. The boarded heli answers the input.
export function updateHelis(state, dt, input) {
  const p = state.player;
  for (const h of state.helis) {
    h.rotor += dt * (p.heliId === h.id ? 22 : 4);
    if (p.heliId === h.id) {
      // Climb with Space (jump), sink without it.
      if (input.jump) h.y += 14 * dt;
      else if (h.y > 0) h.y -= 6 * dt;
      h.y = clamp(h.y, 0, 90);
      // Fly: forward accelerates, steering turns.
      if (input.forward) h.speed += 12 * dt;
      if (input.back) h.speed -= 10 * dt;
      if (!input.forward && !input.back) h.speed -= Math.sign(h.speed) * 5 * dt;
      h.speed = clamp(h.speed, -8, 30);
      if (input.left) h.heading -= 1.4 * dt;
      if (input.right) h.heading += 1.4 * dt;
      h.x += Math.sin(h.heading) * h.speed * dt;
      h.z += Math.cos(h.heading) * h.speed * dt;
      h.x = clamp(h.x, WORLD.minX + 4, WORLD.maxX - 4);
      h.z = clamp(h.z, WORLD.minZ + 4, WORLD.maxZ - 4);
      p.x = h.x;
      p.z = h.z;
      p.heading = h.heading;
      p.speed = h.speed;
      // Building strike: emergency landing.
      if (h.y > 2 && buildingAt(state.city, h.x, h.z)) {
        h.y = 0;
        h.speed = 0;
        if (state.notices) state.notices.push('Helicopter hit a building! Emergency landing.');
      }
      // Searchlight beam at wanted 4+.
      h.beam = state.wanted.level >= 4 ? 1 : 0;
    }
  }
}

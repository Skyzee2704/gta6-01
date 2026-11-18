// Player helicopter: arcade flight, not a simulation. Space up, C down,
// W/S pitch forward/back, A/D yaw, Shift boost. Ceiling 120 units, above
// the tallest tower (~62). Land only on flat ground or the 2 helipads.
import { clamp } from './random.js';
import { buildingAt } from './city.js';

// Flight ceiling in world units: above the tallest tower (~62) so the heli
// can clear every rooftop, low enough that the city stays readable below.
const CEILING = 120;

export function updateAircraft(state, city, dt, input, rng) {
  const p = state.player;
  for (const h of state.helis) {
    h.rotor += dt * (h.pilot ? 30 : 2);
    if (!h.pilot) continue;
    if (input.jump) h.vy = Math.min(12, h.vy + 14 * dt);
    else if (input.handbrake) h.vy = Math.max(-10, h.vy - 12 * dt);
    else h.vy *= (1 - 1.5 * dt);
    const boost = input.run ? 1.5 : 1;
    if (input.forward) h.speed = Math.min(40 * boost, h.speed + 12 * dt);
    else if (input.back) h.speed = Math.max(-10, h.speed - 10 * dt);
    else h.speed *= (1 - 0.8 * dt);
    const yaw = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    h.heading += yaw * 1.6 * dt;
    h.x += Math.sin(h.heading) * h.speed * dt;
    h.z += Math.cos(h.heading) * h.speed * dt;
    h.y = clamp(h.y + h.vy * dt, 0, CEILING);
    const b = buildingAt(city, h.x, h.z);
    if (b && h.y < b.h && !h.roof) {
      h.y = Math.max(h.y, 0); h.vy = 0; h.speed *= 0.5;
      state.notices.push('Helikopter menabrak gedung! Mendarat darurat.');
      h.pilot = false; p.heliId = -1; p.onFoot = true; p.x = h.x; p.z = h.z; p.y = 0;
      continue;
    }
    if (h.y === 0 && Math.abs(h.vy) < 2) { /* landed softly */ }
    p.x = h.x; p.z = h.z; p.y = h.y; p.heading = h.heading; p.speed = Math.abs(h.speed);
    if (input.enterVehicle && h.y === 0) { h.pilot = false; p.heliId = -1; p.onFoot = true; p.y = 0; }
  }
}
export function heliAtPad(state, x, z) {
  return state.helis.find(h => Math.hypot(h.x - x, h.z - z) < 16);
}

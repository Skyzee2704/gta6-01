// Boats: motorboat + speedboat on the southern sea. Arcade water physics —
// gentle sinusoidal bobbing, slow turning, wake particles. Board at the dock.
import { dist2 } from './random.js';

export function updateBoats(state, city, dt, input, rng) {
  const p = state.player;
  for (const b of state.boats) {
    b.bob += dt * 1.2;
    if (!b.driver) continue;
    const top = b.model === 'speedboat' ? 28 : 22;
    if (input.forward) b.speed = Math.min(top, b.speed + 8 * dt);
    else if (input.back) b.speed = Math.max(-6, b.speed - 6 * dt);
    else b.speed *= (1 - 0.5 * dt);
    const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    b.heading += steer * 0.9 * dt * (b.speed >= 0 ? 1 : -1);
    const nx = b.x + Math.sin(b.heading) * b.speed * dt;
    const nz = b.z + Math.cos(b.heading) * b.speed * dt;
    // Shore is a wall: boats cannot climb onto land.
    if (nz < 242) { b.speed *= 0.4; } else { b.x = nx; b.z = nz; }
    if (b.x < -318) b.x = -318; if (b.x > 318) b.x = 318;
    if (b.z > 300) b.z = 300;
    p.x = b.x; p.z = b.z; p.heading = b.heading; p.speed = Math.abs(b.speed);
    if (Math.abs(b.speed) > 4 && rng() < 0.3) {
      state.particles.push({ active: true, x: b.x - Math.sin(b.heading) * 3, y: 0.2, z: b.z - Math.cos(b.heading) * 3, vx: 0, vy: 0.5, vz: 0, kind: 'wake', life: 0.8, max: 0.8 });
    }
    if (input.enterVehicle) { b.driver = false; p.boatId = -1; p.onFoot = true; p.z = 238; }
  }
}
export function nearestBoat(state, x, z) {
  let best = null, bd = 256;
  for (const b of state.boats) { const d = dist2(b.x, b.z, x, z); if (d < bd) { bd = d; best = b; } }
  return best;
}

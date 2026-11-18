// Pedestrians: walk sidewalks, cross at zebra crossings, flee or cower when
// shots ring out, and call the police when they witness a crime.
import { PED_MAX } from './config.js';
import { dist2 } from './random.js';

export function updatePeds(state, city, dt, rng) {
  const p = state.player;
  const alive = state.peds.filter(q => q.alive);
  if (alive.length < PED_MAX && rng() < 0.2) {
    const node = city.nodes[Math.floor(rng() * city.nodes.length)];
    state.peds.push({
      alive: true, x: node.x + (rng() - 0.5) * 20, z: node.z + (rng() - 0.5) * 20,
      heading: rng() * Math.PI * 2, speed: 1 + rng(), color: Math.floor(rng() * 0xffffff),
      height: 1.6 + rng() * 0.3, panic: 0, cower: false, target: null, deadTimer: 0,
    });
  }
  const scared = state._shotFired || state._explosion;
  for (const q of state.peds) {
    if (!q.alive) { q.deadTimer += dt; continue; }
    const d = Math.hypot(q.x - p.x, q.z - p.z);
    if (scared && d < 60) { q.panic = 3; if (rng() < 0.2) q.cower = true; }
    if (q.panic > 0) {
      q.panic -= dt;
      const away = Math.atan2(q.x - p.x, q.z - p.z);
      q.heading = away;
      q.x += Math.sin(away) * 4 * dt; q.z += Math.cos(away) * 4 * dt;
      continue;
    }
    if (q.cower) { if (rng() < dt * 0.2) q.cower = false; continue; }
    if (!q.target || Math.hypot(q.target.x - q.x, q.target.z - q.z) < 3) {
      const node = city.nodes[Math.floor(rng() * city.nodes.length)];
      q.target = { x: node.x + (rng() - 0.5) * 8, z: node.z + (rng() - 0.5) * 8 };
    }
    const dx = q.target.x - q.x, dz = q.target.z - q.z;
    const len = Math.hypot(dx, dz) || 1;
    q.heading = Math.atan2(dx, dz);
    q.x += (dx / len) * q.speed * dt; q.z += (dz / len) * q.speed * dt;
    // Witnessed crime: call police after a short delay.
    if (state.wanted.level > 0 && d < 300 && !q.called) { q.called = true; }
  }
  // Corpses linger 25 s (the renderer draws a lying body + blood decal)
  // before cleanup, so a kill stays visible long enough to read.
  const CORPSE_KEEP = 25;
  state.peds = state.peds.filter(q => q.alive || q.deadTimer < CORPSE_KEEP);
}
export function killPed(state, ped) {
  ped.alive = false; ped.deadTimer = 0;
  state.mission.stats.kills += 1;
}

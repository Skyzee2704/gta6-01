// Enemy combat AI: approach, fire in bursts with distance-based accuracy,
// strafe while shooting, back off when too close, take cover to reload or
// when HP drops under 35, then peek again. Turn rate is capped.
import { dist2 } from './random.js';

export function spawnEnemy(state, x, z, hp) {
  const e = { alive: true, x, z, heading: 0, hp: hp ?? 100, state: 'approach', burst: 0, burstLeft: 0, cooldown: 0, coverX: x, coverZ: z, strafeDir: 1 };
  state.enemies.push(e);
  return e;
}
export function updateEnemies(state, city, dt, rng) {
  const p = state.player;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const dx = p.x - e.x, dz = p.z - e.z;
    const d = Math.hypot(dx, dz) || 1;
    const wantHeading = Math.atan2(dx, dz);
    let dh = wantHeading - e.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    e.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, dh));
    e.cooldown -= dt;
    if (e.hp < 35 && e.state !== 'cover') { e.state = 'cover'; e.coverX = e.x - dx * 0.5; e.coverZ = e.z - dz * 0.5; }
    if (e.state === 'cover') {
      const cdx = e.coverX - e.x, cdz = e.coverZ - e.z, cd = Math.hypot(cdx, cdz);
      if (cd > 2) { e.x += (cdx / cd) * 4 * dt; e.z += (cdz / cd) * 4 * dt; }
      else if (e.cooldown <= 0) { e.state = 'approach'; e.cooldown = 1.5; }
      continue;
    }
    if (d < 7) { e.state = 'retreat'; }
    else if (d > 12 && d < 70) { e.state = 'shoot'; }
    else { e.state = 'approach'; }
    if (e.state === 'approach') { e.x += Math.sin(e.heading) * 3.5 * dt; e.z += Math.cos(e.heading) * 3.5 * dt; }
    else if (e.state === 'retreat') { e.x -= Math.sin(e.heading) * 3 * dt; e.z -= Math.cos(e.heading) * 3 * dt; }
    else if (e.state === 'shoot') {
      // Strafe sideways while firing.
      e.x += Math.cos(e.heading) * e.strafeDir * 1.5 * dt;
      e.z -= Math.sin(e.heading) * e.strafeDir * 1.5 * dt;
      if (rng() < dt * 0.5) e.strafeDir *= -1;
      if (e.burstLeft <= 0 && e.cooldown <= 0) { e.burstLeft = 3 + Math.floor(rng() * 5); e.cooldown = 0.4 + rng() * 0.8; }
      if (e.burstLeft > 0 && e.cooldown <= 0) {
        e.burstLeft -= 1; e.cooldown = 0.12;
        const accuracy = Math.max(0.08, 0.55 - d * 0.006 - (p.speed > 3 ? 0.15 : 0));
        if (rng() < accuracy) {
          let dmg = 8;
          if (p.armor > 0) { const ab = Math.min(p.armor, dmg * 0.65); p.armor -= ab; dmg -= ab; }
          p.health = Math.max(0, p.health - dmg);
          state.particles.push({ active: true, x: p.x, y: 1.2, z: p.z, vx: 0, vy: 0, vz: 0, kind: 'spark', life: 0.3, max: 0.3 });
        }
        state._shotFired = true;
      }
    }
  }
  state.enemies = state.enemies.filter(e => e.alive || e.hp > -100);
}

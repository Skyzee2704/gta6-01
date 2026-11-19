// SOLMAR 3D — combat resolution. Hitscan shots from the player's weapon
// against Vultures, foot police and civilians; enemy return fire; hit
// markers and red chevrons over the target; corpses that lie for 25 s
// with a blood pool, then clean up. Damage goes to armor first, then
// health. Killing a civilian raises wanted.
import { clamp, dist2 } from './random.js';
import { weaponSpec } from './weapons.js';
import { raiseWanted } from './police.js';

export function createCombat(state) {
  state.combat = {
    tracers: [],
    hitMarker: 0,
    hitMarkerTimer: 0,
    lastShotAt: -100,
    lastShotX: 0,
    lastShotZ: 0,
    target: null,
  };
  state.enemies = [];
}

export function damagePlayer(state, amount) {
  const p = state.player;
  if (p.dead) return;
  let left = amount;
  if (p.armor > 0) {
    const absorbed = Math.min(p.armor, left);
    p.armor -= absorbed;
    left -= absorbed;
  }
  p.health -= left;
  if (p.health <= 0) {
    p.health = 0;
    p.dead = true;
    state.notices.push({ text: 'You are down. The city moves on without you.', ttl: 5 });
  }
}

// Fire the held weapon along the camera aim. Returns the thing hit, if any.
export function resolvePlayerShot(state) {
  const p = state.player;
  const spec = weaponSpec(state.weapons.current);
  const yaw = state.camera.yaw;
  // Aim from the camera: forward is (-sin yaw, -cos yaw).
  const dx = -Math.sin(yaw);
  const dz = -Math.cos(yaw);
  const ox = p.x;
  const oz = p.z;
  const spread = state.weapons.spread;
  const ax = dx + (state.rng.next() - 0.5) * spread * 2;
  const az = dz + (state.rng.next() - 0.5) * spread * 2;
  let best = null;
  let bestT = spec.range;
  const consider = (tx, tz, obj, kind) => {
    const rx = tx - ox;
    const rz = tz - oz;
    const t = rx * ax + rz * az;
    if (t < 1 || t > bestT) return;
    const px = ox + ax * t;
    const pz = oz + az * t;
    const perp = Math.hypot(tx - px, tz - pz);
    if (perp < 1.6) {
      bestT = t;
      best = { obj, kind, t };
    }
  };
  for (const e of state.enemies) if (!e.dead) consider(e.x, e.z, e, 'enemy');
  for (const u of state.police.units) {
    if (u.kind === 'foot') consider(u.x, u.z, u, 'police');
  }
  for (const ped of state.peds) if (!ped.dead) consider(ped.x, ped.z, ped, 'ped');
  const endX = ox + ax * (best ? bestT : spec.range);
  const endZ = oz + az * (best ? bestT : spec.range);
  state.combat.tracers.push({ x1: ox, y1: 1.45, z1: oz, x2: endX, y2: 1.2, z2: endZ, ttl: 0.09, color: 0xffe9a0 });
  if (best) {
    state.stats.shotsHit += 1;
    state.combat.hitMarker = 1;
    state.combat.hitMarkerTimer = 0.25;
    state.combat.target = best.obj;
    applyDamage(state, best);
  }
  return best;
}

function applyDamage(state, hit) {
  const spec = weaponSpec(state.weapons.current);
  const dmg = spec.damage;
  if (hit.kind === 'enemy') {
    hit.obj.health -= dmg;
    if (hit.obj.health <= 0 && !hit.obj.dead) {
      hit.obj.dead = true;
      hit.obj.deathTime = state.time.elapsed;
      state.stats.kills += 1;
      state.notices.push({ text: 'Vulture down.', ttl: 2 });
    }
  } else if (hit.kind === 'police') {
    // Shooting a cop is a 2-star crime, and they shoot back.
    raiseWanted(state, 2, 'Officer down');
    hit.obj.state = 'SHOOTING';
    hit.obj.burstTimer = 0.2;
  } else if (hit.kind === 'ped') {
    hit.obj.dead = true;
    hit.obj.deathTime = state.time.elapsed;
    state.stats.kills += 1;
    raiseWanted(state, 2, 'Civilian shot');
  }
}

export function spawnVultures(state, count, cx, cz) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    state.enemies.push({
      id: 3000 + i, kind: 'vulture', name: `Vulture ${i + 1}`,
      x: cx + Math.cos(a) * 14, z: cz + Math.sin(a) * 14,
      heading: 0, health: 70, dead: false, burstTimer: 1 + i * 0.4,
      speed: 3.2, shirt: 0x1a1a1a, pants: 0x2a2a2a, skin: 0xc98f66,
      walkPhase: 0, deathTime: 0,
    });
  }
}

export function stepCombat(state, dt) {
  const c = state.combat;
  if (c.hitMarkerTimer > 0) {
    c.hitMarkerTimer -= dt;
    if (c.hitMarkerTimer <= 0) c.hitMarker = 0;
  }
  c.tracers = c.tracers.filter((t) => (t.ttl -= dt) > 0);
  // Vultures advance on the player and shoot in bursts.
  const p = state.player;
  for (const e of state.enemies) {
    if (e.dead) continue;
    const d = Math.hypot(e.x - p.x, e.z - p.z);
    if (d > 26) {
      e.heading = Math.atan2(p.x - e.x, p.z - e.z);
      e.x += Math.sin(e.heading) * e.speed * dt;
      e.z += Math.cos(e.heading) * e.speed * dt;
      e.walkPhase += dt * e.speed * 2.2;
    } else if (d > 6) {
      e.heading = Math.atan2(p.x - e.x, p.z - e.z);
      e.burstTimer -= dt;
      if (e.burstTimer <= 0) {
        e.burstTimer = 1.8;
        damagePlayer(state, 7);
        c.tracers.push({ x1: e.x, y1: 1.4, z1: e.z, x2: p.x, y2: 1.2, z2: p.z, ttl: 0.12, color: 0xff5040 });
      }
    }
  }
  // Clean corpses older than 25 s.
  state.enemies = state.enemies.filter((e) => !e.dead || state.time.elapsed - (e.deathTime || 0) < 25);
}

export function clampHealth(p) {
  p.health = clamp(p.health, 0, 100);
  p.armor = clamp(p.armor, 0, 100);
}

export function nearestEnemy(state, x, z, maxDist) {
  let best = null;
  let bestD = maxDist * maxDist;
  for (const e of state.enemies) {
    if (e.dead) continue;
    const d = dist2(x, z, e.x, e.z);
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}

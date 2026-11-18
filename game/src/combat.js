// combat.js — enemy AI. Vultures take cover, fire in bursts, and strafe.
// They are dumb on purpose: they walk toward the player, stop at range,
// and shoot. The player outplays them with movement, not with clever AI.

import { dist2, clamp, wrapAngle } from './random.js';
import { COMBAT } from './config.js';

// Spawn `count` enemies around a point. Returns the enemy records.
export function spawnEnemies(state, x, z, count, rng) {
  const made = [];
  for (let i = 0; i < count; i++) {
    const e = {
      id: state.nextEnemyId++,
      x: x + rng.range(-8, 8),
      z: z + rng.range(-8, 8),
      heading: rng.range(0, Math.PI * 2),
      health: COMBAT.enemyHealth,
      alive: true,
      speed: 4.5,
      burst: 0,
      burstTimer: rng.range(0.5, 1.5),
      shootCooldown: 0,
      strafeDir: rng.chance(0.5) ? 1 : -1,
      strafeT: 0,
      flashT: 0,
    };
    state.enemies.push(e);
    made.push(e);
  }
  return made;
}

// Advance all enemies one step.
export function updateEnemies(state, city, dt, rng) {
  const p = state.player;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    if (e.flashT > 0) e.flashT -= dt;
    const dx = p.x - e.x;
    const dz = p.z - e.z;
    const d = Math.sqrt(dx * dx + dz * dz) || 0.001;
    const want = Math.atan2(dx, dz);
    e.heading = want;
    // Walk toward the player until in range, then strafe and shoot.
    if (d > 26) {
      e.x += Math.sin(e.heading) * e.speed * dt;
      e.z += Math.cos(e.heading) * e.speed * dt;
    } else {
      e.strafeT -= dt;
      if (e.strafeT <= 0) {
        e.strafeDir *= -1;
        e.strafeT = rng.range(0.8, 1.6);
      }
      const sx = Math.cos(e.heading) * e.strafeDir;
      const sz = -Math.sin(e.heading) * e.strafeDir;
      e.x += sx * 2.2 * dt;
      e.z += sz * 2.2 * dt;
    }
    // Burst fire: 3-5 shots, then a pause.
    e.shootCooldown -= dt;
    if (d < 45 && e.shootCooldown <= 0) {
      if (e.burst <= 0) {
        e.burst = 3 + Math.floor(rng.float() * 3);
        e.burstTimer = 0.4;
      }
      e.burstTimer -= dt;
      if (e.burstTimer <= 0 && e.burst > 0) {
        e.burst -= 1;
        e.burstTimer = 0.16;
        shootAtPlayer(state, e, rng);
        if (e.burst <= 0) e.shootCooldown = rng.range(0.9, 1.6);
      }
    }
    // Keep enemies inside the island.
    e.x = clamp(e.x, -315, 315);
    e.z = clamp(e.z, -235, 235);
  }
}

// One enemy shot at the player. Hit chance falls with distance.
function shootAtPlayer(state, e, rng) {
  const p = state.player;
  const d = Math.sqrt(dist2(e.x, e.z, p.x, p.z));
  const hitChance = clamp(0.5 - d * 0.008, 0.08, 0.5);
  state.shotFx = { fromX: e.x, fromZ: e.z, toX: p.x, toZ: p.z, t: 0.08 };
  if (rng.float() < hitChance) {
    damagePlayer(state, 5);
  }
}

// Hurt the player (armor absorbs first). Returns true when the player dies.
export function damagePlayer(state, amount) {
  const p = state.player;
  if (p.armor > 0) {
    const absorbed = Math.min(p.armor, amount);
    p.armor -= absorbed;
    amount -= absorbed;
  }
  p.health -= amount;
  if (p.health <= 0) {
    p.health = 0;
    return true;
  }
  return false;
}

// How many enemies are still alive.
export function aliveEnemies(state) {
  return state.enemies.filter((e) => e.alive).length;
}

// Clear dead enemies from the list (corpses stay in state.corpses).
export function pruneEnemies(state) {
  state.enemies = state.enemies.filter((e) => e.alive);
}

// npc.js — pedestrians. They stroll the sidewalks, cross at corners,
// flee when the player is violent or wanted, and call the police when
// they witness a crime. A ped who is run over goes down.

import { dist2, clamp } from './random.js';
import { COMBAT } from './config.js';
import { ROAD_XS, ROAD_ZS } from './config.js';

// Spawn `count` peds near roads.
export function createPeds(city, rng, count) {
  const peds = [];
  for (let i = 0; i < count; i++) {
    const rx = rng.pick(ROAD_XS);
    const rz = rng.pick(ROAD_ZS);
    const alongX = rng.chance(0.5);
    peds.push({
      id: i,
      x: alongX ? rx + rng.range(-70, 70) : rx + rng.pick([-1, 1]) * 10,
      z: alongX ? rz + rng.pick([-1, 1]) * 10 : rz + rng.range(-70, 70),
      heading: rng.range(0, Math.PI * 2),
      speed: rng.range(1.2, 2.2),
      health: COMBAT.pedHealth,
      down: false,
      downT: 0,
      fleeing: false,
      targetX: 0,
      targetZ: 0,
      walkT: rng.range(0, 4),
      shirt: rng.pick(['#c0392b', '#2980b9', '#f5c518', '#3fae5a', '#8e44ad', '#e67e22']),
      skin: rng.pick(['#e8b98a', '#c98a5a', '#8a5a3a', '#f0c8a0']),
    });
  }
  return peds;
}

// Advance all peds one step.
export function updatePeds(state, city, dt, rng) {
  const p = state.player;
  for (const ped of state.peds) {
    if (ped.down) {
      ped.downT += dt;
      continue;
    }
    const dPlayer = Math.sqrt(dist2(ped.x, ped.z, p.x, p.z));
    // Flee when the player is violent nearby or wanted.
    const danger = state.wanted.level > 0 && dPlayer < 30;
    const playerCar = !p.onFoot && dPlayer < 10;
    if ((danger || playerCar) && !ped.fleeing) {
      ped.fleeing = true;
      const away = Math.atan2(ped.x - p.x, ped.z - p.z);
      ped.targetX = ped.x + Math.sin(away) * 60;
      ped.targetZ = ped.z + Math.cos(away) * 60;
    }
    if (ped.fleeing) {
      const dx = ped.targetX - ped.x;
      const dz = ped.targetZ - ped.z;
      const d = Math.hypot(dx, dz);
      if (d < 4) {
        ped.fleeing = false;
      } else {
        ped.heading = Math.atan2(dx, dz);
        ped.x += Math.sin(ped.heading) * 5.5 * dt;
        ped.z += Math.cos(ped.heading) * 5.5 * dt;
      }
    } else {
      // Stroll: walk straight, turn at random intervals, stay on land.
      ped.walkT -= dt;
      if (ped.walkT <= 0) {
        ped.heading = rng.range(0, Math.PI * 2);
        ped.walkT = rng.range(3, 8);
      }
      ped.x += Math.sin(ped.heading) * ped.speed * dt;
      ped.z += Math.cos(ped.heading) * ped.speed * dt;
    }
    ped.x = clamp(ped.x, -315, 315);
    ped.z = clamp(ped.z, -235, 235);
  }
}

// A ped witnesses a crime at (x, z) when they are close and upright.
// Returns the witness (or null).
export function witnessAt(state, x, z, radius = 26) {
  for (const ped of state.peds) {
    if (ped.down) continue;
    if (dist2(ped.x, ped.z, x, z) < radius * radius) return ped;
  }
  return null;
}

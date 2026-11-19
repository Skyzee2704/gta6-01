// Pedestrians: the crowd that makes the city feel inhabited. They spawn in
// a ring around the player, out of sight, and despawn when they fall far
// behind — never popping in front of the camera. Each one is a box-built
// person at 1:7.5, with varied clothes and a walk cycle, and each one has
// a health bar: a car that hits them hurts them, and the law notices.
import { PLAYER } from './config.js';
import { createRandom, floatBetween, pick, dist2d } from './random.js';
import { MATERIALS } from './materials.js';

export function createPed(id, x, z, random) {
  return {
    id, x, z, heading: random() * Math.PI * 2,
    speed: floatBetween(random, 1.1, 2.1), health: 100, dead: false,
    skin: pick(random, MATERIALS.skinTones), hair: pick(random, MATERIALS.hairColors),
    shirt: pick(random, MATERIALS.shirtColors), pants: pick(random, MATERIALS.pantsColors),
    scale: floatBetween(random, 0.94, 1.06), walkTime: random() * 6,
    targetX: x, targetZ: z, waitTimer: 0, fleeing: false,
    knockback: 0, knockX: 0, knockZ: 0,
  };
}

/** Keep the crowd ring full around the player, spawning out of sight.
 *  The ring is 55–100 m out: far enough that nobody pops into view,
 *  close enough that the street never looks empty. */
export function maintainCrowd(peds, player, city, random, target) {
  const want = target || 14;
  // Despawn the far ones first.
  for (let i = peds.length - 1; i >= 0; i -= 1) {
    if (dist2d(peds[i].x, peds[i].z, player.x, player.z) > 120) peds.splice(i, 1);
  }
  let guard = 0;
  while (peds.length < want && guard < 40) {
    guard += 1;
    const angle = random() * Math.PI * 2;
    const dist = 55 + random() * 45;
    const x = player.x + Math.cos(angle) * dist;
    const z = player.z + Math.sin(angle) * dist;
    if (Math.abs(x - 320) > 300 || Math.abs(z - 240) > 225) continue;
    peds.push(createPed(peds.length, x, z, random));
  }
  return peds;
}

/** One crowd step: stroll, wait at corners, flee from gunfire. A ped with
 *  knockback slides along it until it bleeds off — that slide is what a
 *  car hit looks like from the sidewalk. */
export function stepPeds(peds, player, dt, gunfireAt, random) {
  for (const ped of peds) {
    if (ped.dead) continue;
    ped.walkTime += dt;
    if (ped.knockback > 0) {
      ped.x += ped.knockX * ped.knockback * dt;
      ped.z += ped.knockZ * ped.knockback * dt;
      ped.knockback = Math.max(0, ped.knockback - dt * 12);
      continue;
    }
    if (gunfireAt && dist2d(ped.x, ped.z, gunfireAt.x, gunfireAt.z) < 26) ped.fleeing = true;
    if (ped.fleeing) {
      const away = Math.atan2(ped.x - player.x, ped.z - player.z);
      ped.x += Math.sin(away) * 5.5 * dt;
      ped.z += Math.cos(away) * 5.5 * dt;
      ped.heading = away;
      continue;
    }
    if (ped.waitTimer > 0) {
      ped.waitTimer -= dt;
      continue;
    }
    const d = dist2d(ped.x, ped.z, ped.targetX, ped.targetZ);
    if (d < 1.5) {
      // Seeded, never Math.random(): the shot gate requires two renders of
      // the same staging to be byte-identical, and an unseeded wander
      // target moves a pedestrian between the two captures.
      ped.targetX = ped.x + (random() - 0.5) * 60;
      ped.targetZ = ped.z + (random() - 0.5) * 60;
      ped.waitTimer = 1 + random() * 4;
      continue;
    }
    ped.heading = Math.atan2(ped.targetX - ped.x, ped.targetZ - ped.z);
    ped.x += Math.sin(ped.heading) * ped.speed * dt;
    ped.z += Math.cos(ped.heading) * ped.speed * dt;
  }
  return peds;
}

/** A pedestrian's walk swing, same shape as the player's. */
export function pedSwing(ped) {
  const phase = ped.walkTime * 7;
  return { legL: Math.sin(phase) * 0.4, legR: -Math.sin(phase) * 0.4 };
}

/** How many pedestrians are alive right now. */
export function pedCount(peds) {
  return peds.filter((p) => !p.dead).length;
}

/** A seeded crowd for a fresh world, so the first frame already has
 *  people in it instead of an empty street filling in. */
export function seedCrowd(player, seed, count) {
  const random = createRandom(seed);
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const angle = random() * Math.PI * 2;
    const dist = 20 + random() * 60;
    peds.push(createPed(i, player.x + Math.cos(angle) * dist, player.z + Math.sin(angle) * dist, random));
  }
  return peds;
}

// SOLMAR 3D — pedestrians. They walk the sidewalks, wear varied clothes,
// and live in a population ring around the player. A gunshot or a speeding
// car makes them flee; a car that hits one kills them and raises wanted.
// Every ped is a boxy human at 1:7.5, never a blob.
import { clamp, dist2 } from './random.js';

const SHIRTS = [0xd85a4a, 0x4a7ad8, 0x5ad88a, 0xe8c94c, 0x9a5ad8, 0xe8e0d0, 0x3a3a3a, 0xd88a4a];
const PANTS = [0x2a3a4a, 0x4a4a4a, 0x5a3a2a, 0x2a4a3a];
const SKINS = [0xe8b98a, 0xc98f66, 0x8a5a3a, 0xf2c9a8];

export function createPeds(state) {
  state.peds = [];
  state.pedTimer = 0;
}

function sidewalkPoint(state, rng) {
  const road = rng.pick(state.city.roads);
  const pts = road.points;
  const i = rng.int(0, pts.length - 2);
  const t = rng.next();
  const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t;
  const z = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t;
  // Offset to the sidewalk, perpendicular to the road.
  const dx = pts[i + 1][0] - pts[i][0];
  const dz = pts[i + 1][1] - pts[i][1];
  const len = Math.hypot(dx, dz) || 1;
  const side = rng.chance(0.5) ? 1 : -1;
  return { x: x + (-dz / len) * 9.5 * side, z: z + (dx / len) * 9.5 * side, heading: Math.atan2(dx, dz) + (side > 0 ? 0 : Math.PI) };
}

export function stepPeds(state, dt) {
  const rng = state.rng;
  const p = state.player;
  state.pedTimer -= dt;
  if (state.pedTimer <= 0) {
    state.pedTimer = 0.6;
    const alive = state.peds.filter((x) => !x.dead && dist2(x.x, x.z, p.x, p.z) < 130 * 130);
    // Corpses linger 25 s, then are cleaned up.
    const fresh = state.peds.filter((x) => x.dead && state.time.elapsed - (x.deathTime || 0) < 25);
    state.peds = alive.concat(fresh);
    while (alive.length < 12) {
      for (let tries = 0; tries < 5 && alive.length < 12; tries++) {
        const spot = sidewalkPoint(state, rng);
        if (dist2(spot.x, spot.z, p.x, p.z) < 40 * 40) continue;
        if (dist2(spot.x, spot.z, p.x, p.z) > 130 * 130) continue;
        const ped = {
          id: 2000 + alive.length + Math.floor(rng.next() * 9000),
          x: spot.x, z: spot.z, heading: spot.heading,
          speed: rng.range(0.9, 1.5), shirt: rng.pick(SHIRTS), pants: rng.pick(PANTS),
          skin: rng.pick(SKINS), walkPhase: rng.range(0, 6), dead: false, fleeing: false,
          kind: 'civilian',
        };
        alive.push(ped);
        state.peds.push(ped);
      }
      break;
    }
  }
  for (const ped of state.peds) {
    if (ped.dead) continue;
    // Flee gunfire and speeding cars.
    ped.fleeing = false;
    if (state.combat.lastShotAt && state.time.elapsed - state.combat.lastShotAt < 2) {
      if (dist2(ped.x, ped.z, state.combat.lastShotX, state.combat.lastShotZ) < 25 * 25) ped.fleeing = true;
    }
    const speed = ped.fleeing ? 3.4 : ped.speed;
    ped.x += Math.sin(ped.heading) * speed * dt;
    ped.z += Math.cos(ped.heading) * speed * dt;
    ped.walkPhase += dt * speed * 2.4;
    // Wander: small heading drift, turn around at the island edge.
    ped.heading += (rng.next() - 0.5) * dt * 0.4;
    const r = Math.hypot(ped.x, ped.z);
    if (r > 225) ped.heading = Math.atan2(-ped.x, -ped.z);
    // Keep peds out of buildings.
    for (const b of state.city.buildings) {
      if (Math.abs(ped.x - b.x) < b.w / 2 + 0.8 && Math.abs(ped.z - b.z) < b.d / 2 + 0.8) {
        ped.heading += Math.PI / 2;
        ped.x += Math.sin(ped.heading) * speed * dt * 2;
        ped.z += Math.cos(ped.heading) * speed * dt * 2;
        break;
      }
    }
  }
}

export function nearestPed(state, x, z, maxDist) {
  let best = null;
  let bestD = maxDist * maxDist;
  for (const ped of state.peds) {
    if (ped.dead) continue;
    const d = dist2(x, z, ped.x, ped.z);
    if (d < bestD) { bestD = d; best = ped; }
  }
  return best;
}

export function countPedsInFrame(state) {
  return state.peds.filter((x) => !x.dead).length;
}

export function clampPedSpeed(ped, max) {
  ped.speed = clamp(ped.speed, 0.5, max);
}

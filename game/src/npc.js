// SOLMAR 3D — NPCs: pedestrians with walk cycles, barks, schedules,
// and the Vultures gang (hostile). Population ring around the player:
// spawn out of view, despawn far behind — no pop-in.
import { createRng } from './random.js';
import { randomPedestrian } from './character.js';
import { isOnRoad, districtAtPoint } from './city.js';

export const BARKS = [
  'Nice ride!',
  'Watch where you drive!',
  'Solmar nights, huh?',
  'The Vultures run this block.',
  'You hear about the race?',
  'Golden hour on the Marina...',
  'PCPD is everywhere tonight.',
  'I saw Kane at the docks.',
];

export function createNpcManager(seed = 1) {
  return {
    rng: createRng(seed * 29 + 3),
    peds: [],
    vultures: [],
    nextId: 1,
    spawnTimer: 0,
  };
}

export function spawnPedestrian(mgr, city, nearX, nearY) {
  const rng = mgr.rng;
  const angle = rng.range(0, Math.PI * 2);
  const dist = rng.range(35, 70);
  let x = nearX + Math.cos(angle) * dist;
  let y = nearY + Math.sin(angle) * dist;
  x = Math.max(8, Math.min(632, x));
  y = Math.max(8, Math.min(472, y));
  const ped = {
    id: 'ped' + mgr.nextId++,
    x,
    y,
    heading: rng.range(0, Math.PI * 2),
    speed: rng.range(0.8, 1.6),
    health: 100,
    look: randomPedestrian(rng.int(1, 99999)),
    bark: rng.pick(BARKS),
    barkT: rng.range(2, 12),
    state: 'walk',
    district: districtAtPoint(x, y).id,
  };
  mgr.peds.push(ped);
  return ped;
}

export function spawnVulture(mgr, x, y, name) {
  const v = {
    id: 'vulture' + mgr.nextId++,
    name: name || 'Vulture',
    x,
    y,
    heading: 0,
    speed: 0,
    health: 100,
    state: 'guard',
    weapon: 'smg',
    aggro: 0,
    look: { skin: 0xc89068, shirt: 0x8e1e1e, pants: 0x1a1a1a, hair: 0x1a1a1a },
  };
  mgr.vultures.push(v);
  return v;
}

export function updateNpcs(mgr, player, dt, city) {
  mgr.spawnTimer -= dt;
  const want = 14;
  if (mgr.peds.length < want && mgr.spawnTimer <= 0) {
    mgr.spawnTimer = 1.2;
    spawnPedestrian(mgr, city, player.x, player.y);
  }
  for (const p of mgr.peds) {
    p.barkT -= dt;
    if (p.barkT <= 0) {
      p.barkT = mgr.rng.range(8, 20);
      p.bark = mgr.rng.pick(BARKS);
    }
    if (p.state === 'walk') {
      p.x += Math.cos(p.heading) * p.speed * dt;
      p.y += Math.sin(p.heading) * p.speed * dt;
      if (mgr.rng.chance(dt * 0.05)) {
        p.heading += mgr.rng.range(-0.8, 0.8);
      }
      if (isOnRoad(p.x, p.y) && mgr.rng.chance(dt * 0.3)) {
        p.heading += Math.PI / 2;
      }
    }
    if (p.x < 6 || p.x > 634 || p.y < 6 || p.y > 474) {
      p.heading += Math.PI;
      p.x = Math.max(8, Math.min(632, p.x));
      p.y = Math.max(8, Math.min(472, p.y));
    }
  }
  const px = player.x;
  const py = player.y;
  mgr.peds = mgr.peds.filter((p) => {
    const dx = p.x - px;
    const dy = p.y - py;
    return dx * dx + dy * dy < 110 * 110;
  });
  for (const v of mgr.vultures) {
    const dx = px - v.x;
    const dy = py - v.y;
    const d = Math.hypot(dx, dy);
    if (d < 30) {
      v.aggro = Math.min(1, v.aggro + dt * 0.5);
      v.state = 'chase';
      v.heading = Math.atan2(dy, dx);
      v.x += Math.cos(v.heading) * 2.2 * dt;
      v.y += Math.sin(v.heading) * 2.2 * dt;
    } else {
      v.aggro = Math.max(0, v.aggro - dt * 0.2);
      if (v.aggro <= 0) v.state = 'guard';
    }
  }
  mgr.vultures = mgr.vultures.filter((v) => v.health > 0);
  return mgr;
}

export function nearestPed(mgr, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const p of mgr.peds) {
    const dx = p.x - x;
    const dy = p.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

export function vulturesDown(mgr, total) {
  const dead = total - mgr.vultures.length;
  return { down: Math.max(0, dead), total, remaining: mgr.vultures.length };
}

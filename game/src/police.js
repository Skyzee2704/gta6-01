// SOLMAR 3D — police: pursuit, ramming, roadblock, spotlight heli,
// searching, on-foot cops. FAR spawn via the road graph (never a 60-unit
// teleport pop-in). Response list data for the HUD. Cops shoot at wanted
// >= 2, never during missions. Cruiser parked when its cop is on foot.
import { createRng } from './random.js';
import { nearestNode, findPath } from './city.js';

export const POLICE_STATES = ['PURSUIT', 'RAMMING', 'ROADBLOCK', 'SPOTLIGHT', 'SEARCHING', 'ON FOOT'];

export function createPolice(seed = 1) {
  return {
    rng: createRng(seed * 53 + 7),
    units: [],
    heli: null,
    nextId: 12,
    spawnTimer: 0,
    searchZone: null,
    heat: 0,
  };
}

export function wantedForHeat(heat) {
  if (heat <= 0) return 0;
  if (heat < 25) return 1;
  if (heat < 55) return 2;
  if (heat < 85) return 3;
  if (heat < 130) return 4;
  return 5;
}

export function spawnUnit(police, city, player, kind) {
  const rng = police.rng;
  let farNode = city.nodes[rng.int(0, city.nodes.length - 1)];
  let farD = -1;
  for (let i = 0; i < 8; i++) {
    const cand = city.nodes[rng.int(0, city.nodes.length - 1)];
    const d = Math.hypot(cand.x - player.x, cand.y - player.y);
    if (d > farD) {
      farD = d;
      farNode = cand;
    }
  }
  const unit = {
    id: 'PCPD-' + police.nextId++,
    kind: kind || 'cruiser',
    x: farNode.x,
    y: farNode.y,
    heading: 0,
    speed: 0,
    state: 'PURSUIT',
    node: farNode.id,
    path: null,
    pathIdx: 0,
    siren: true,
    lightBar: true,
    onFoot: false,
    shootT: 0,
  };
  police.units.push(unit);
  return unit;
}

export function spawnHeli(police, player) {
  const heli = {
    id: 'PCPD-AIR1',
    kind: 'heli',
    x: player.x + 40,
    y: player.y - 40,
    z: 55,
    heading: 0,
    speed: 18,
    state: 'SPOTLIGHT',
    beamOn: true,
    beamTarget: { x: player.x, y: player.y },
    rotor: 0,
  };
  police.heli = heli;
  return heli;
}

export function updatePolice(police, city, player, world, dt) {
  const wanted = world.wanted;
  const want = wanted === 0 ? 0 : wanted === 1 ? 1 : wanted === 2 ? 2 : wanted === 3 ? 3 : wanted === 4 ? 4 : 5;
  police.spawnTimer -= dt;
  if (police.units.length < want && police.spawnTimer <= 0) {
    police.spawnTimer = 2.5;
    spawnUnit(police, city, player, 'cruiser');
  }
  if (wanted >= 3 && !police.heli) {
    spawnHeli(police, player);
  }
  if (wanted < 3) police.heli = null;
  for (const u of police.units) {
    const dx = player.x - u.x;
    const dy = player.y - u.y;
    const dist = Math.hypot(dx, dy);
    if (u.state === 'ROADBLOCK') {
      u.speed = 0;
      continue;
    }
    if (!u.path || u.pathIdx >= u.path.length) {
      const from = nearestNode(city, u.x, u.y);
      const dest = nearestNode(city, player.x, player.y);
      u.path = findPath(city, from.id, dest.id) || [from.id, dest.id];
      u.pathIdx = 0;
    }
    const nextNode = city.nodes[u.path[u.pathIdx]];
    if (nextNode) {
      const ndx = nextNode.x - u.x;
      const ndy = nextNode.y - u.y;
      const nd = Math.hypot(ndx, ndy);
      const wantHeading = Math.atan2(ndx, ndy);
      let dh = wantHeading - u.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      u.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, dh));
      if (nd < 5) u.pathIdx++;
    }
    const topSpeed = u.state === 'RAMMING' ? 26 : 22;
    u.speed += (topSpeed - u.speed) * Math.min(1, dt * 0.9);
    u.x += Math.sin(u.heading) * u.speed * dt;
    u.y += Math.cos(u.heading) * u.speed * dt;
    if (dist < 12 && u.state === 'PURSUIT') {
      u.state = 'RAMMING';
    } else if (dist > 30 && u.state === 'RAMMING') {
      u.state = 'PURSUIT';
    }
    if (wanted >= 4 && dist > 60 && police.rng.chance(dt * 0.05)) {
      u.state = 'ROADBLOCK';
    }
    if (wanted >= 2 && !world.missionActive) {
      u.shootT -= dt;
      if (u.shootT <= 0 && dist < 40) {
        u.shootT = 1.1;
        u.lastShot = { hit: police.rng.chance(0.12), damage: 6 };
      }
    }
  }
  if (police.heli) {
    const h = police.heli;
    h.rotor += dt * 30;
    const dx = player.x - h.x;
    const dy = player.y - h.y;
    const d = Math.hypot(dx, dy);
    h.heading = Math.atan2(dx, dy);
    if (d > 12) {
      h.x += Math.sin(h.heading) * h.speed * dt;
      h.y += Math.cos(h.heading) * h.speed * dt;
    }
    h.beamTarget = { x: player.x, y: player.y };
    h.state = 'SPOTLIGHT';
  }
  if (wanted === 0) {
    police.units = [];
    police.heli = null;
    police.searchZone = null;
  } else if (world.heat < 10) {
    police.searchZone = { x: player.x, y: player.y, r: 45 };
    for (const u of police.units) u.state = 'SEARCHING';
  } else {
    police.searchZone = null;
  }
  return police;
}

export function responseList(police, player) {
  const list = [];
  for (const u of police.units) {
    const dist = Math.round(Math.hypot(player.x - u.x, player.y - u.y));
    list.push({ callSign: u.id, distance: dist, state: u.state, kind: u.kind });
  }
  if (police.heli) {
    const h = police.heli;
    const dist = Math.round(Math.hypot(player.x - h.x, player.y - h.y));
    list.push({ callSign: h.id, distance: dist, state: h.state, kind: 'heli' });
  }
  return list.slice(0, 5);
}

export function roadblockAt(police, city, player) {
  const blockers = police.units.filter((u) => u.state === 'ROADBLOCK');
  if (blockers.length === 0) return null;
  const u = blockers[0];
  return { x: u.x, y: u.y, heading: u.heading, unit: u.id };
}

// SOLMAR 3D — police and the wanted system. Wanted escalates: 1 star
// brings foot officers who arrest, 2+ brings cruisers and foot officers
// who STOP AND SHOOT in bursts, 4 brings the helicopter, 5 brings
// roadblocks. Police NEVER shoot during a story mission. Officers spawn
// far away on the road graph and drive in — never a teleport pop-in.
// The response list the HUD shows comes from these real units.
import { POLICE } from './config.js';
import { clamp, dist2 } from './random.js';
import { findRoute } from './traffic.js';
import { damagePlayer } from './combat.js';

const CALLSIGNS = ['PCPD-12', 'PCPD-07', 'PCPD-21', 'PCPD-33', 'PCPD-08', 'PCPD-19', 'PCPD-44', 'PCPD-02'];
let nextUnitId = 1;

export function createPolice(state) {
  state.police = { units: [], heli: null, searchZone: null, lastSeen: { x: 0, z: 0 }, hiddenTimer: 0 };
}

export function raiseWanted(state, amount, reason) {
  const p = state.player;
  const before = p.wanted;
  p.wanted = clamp(p.wanted + amount, 0, POLICE.maxStars);
  if (p.wanted > before) {
    state.police.lastSeen = { x: p.x, z: p.z };
    state.police.hiddenTimer = 0;
    state.notices.push({ text: `Wanted level ${p.wanted}${reason ? ' — ' + reason : ''}`, ttl: 3 });
  }
}

function spawnUnit(state, kind) {
  const rng = state.rng;
  const p = state.player;
  // Spawn on a road 70–110 units away, out of sight, on the graph.
  let x = p.x;
  let z = p.z;
  for (let tries = 0; tries < 8; tries++) {
    const road = rng.pick(state.city.roads);
    const pts = road.points;
    const i = rng.int(0, pts.length - 2);
    const t = rng.next();
    x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t;
    z = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t;
    const d = Math.hypot(x - p.x, z - p.z);
    if (d > 70 && d < 120) break;
  }
  const unit = {
    id: nextUnitId++, kind, callsign: CALLSIGNS[(nextUnitId - 1) % CALLSIGNS.length],
    x, z, heading: 0, speed: 0, state: kind === 'foot' ? 'ON FOOT' : 'PURSUIT',
    node: 0, route: null, routeIdx: 0, burstTimer: rng.range(0.5, 2), shotsInBurst: 0,
    siren: true, lightBar: true,
  };
  state.police.units.push(unit);
  return unit;
}

function wantedUnitCount(wanted) {
  if (wanted <= 0) return 0;
  if (wanted === 1) return 2;
  if (wanted === 2) return 3;
  if (wanted === 3) return 4;
  return 5;
}

export function stepPolice(state, dt) {
  const pol = state.police;
  const p = state.player;
  const wanted = p.wanted;
  // Unit count follows wanted; units leave when wanted clears.
  const want = wantedUnitCount(wanted);
  while (pol.units.length < want) {
    const kind = wanted === 1 ? 'foot' : (pol.units.length % 3 === 2 ? 'foot' : 'cruiser');
    spawnUnit(state, kind);
  }
  if (wanted === 0) {
    pol.units.length = 0;
    pol.heli = null;
    pol.searchZone = null;
    return;
  }
  // Helicopter from 4 stars: circles overhead, beam locked on the player.
  if (wanted >= 4 && !pol.heli) {
    pol.heli = { x: p.x + 30, z: p.z, y: 42, angle: 0, beam: true };
  }
  if (wanted < 4) pol.heli = null;
  if (pol.heli) {
    pol.heli.angle += dt * 0.5;
    pol.heli.x = p.x + Math.cos(pol.heli.angle) * 32;
    pol.heli.z = p.z + Math.sin(pol.heli.angle) * 32;
    pol.heli.y = 42;
  }
  // Hidden timer: if no unit is close, wanted decays.
  let nearest = Infinity;
  for (const u of pol.units) nearest = Math.min(nearest, Math.hypot(u.x - p.x, u.z - p.z));
  if (nearest > 60) {
    pol.hiddenTimer += dt;
    if (pol.hiddenTimer > 20) {
      p.wanted = Math.max(0, p.wanted - 1);
      pol.hiddenTimer = 0;
      if (p.wanted === 0) state.notices.push({ text: 'You lost them. Wanted clear.', ttl: 3 });
      else state.notices.push({ text: `Heat dropping — wanted level ${p.wanted}.`, ttl: 3 });
    }
    if (!pol.searchZone) pol.searchZone = { x: pol.lastSeen.x, z: pol.lastSeen.z, r: POLICE.searchRadius };
  } else {
    pol.hiddenTimer = 0;
    pol.searchZone = null;
    pol.lastSeen = { x: p.x, z: p.z };
  }
  // Drive / run each unit toward the player along the road graph.
  for (const u of pol.units) {
    const d = Math.hypot(u.x - p.x, u.z - p.z);
    if (u.kind === 'cruiser') {
      if (!u.route || u.routeIdx >= u.route.length) {
        const from = nearestNodeId(state, u.x, u.z);
        const to = nearestNodeId(state, p.x, p.z);
        u.route = findRoute(state.city, from, to);
        u.routeIdx = 0;
      }
      const target = state.city.nodes[u.route[u.routeIdx]];
      if (target) {
        const dx = target.x - u.x;
        const dz = target.z - u.z;
        const td = Math.hypot(dx, dz);
        if (td < 5) u.routeIdx += 1;
        else {
          const wantHeading = Math.atan2(dx, dz);
          let dh = wantHeading - u.heading;
          while (dh > Math.PI) dh -= Math.PI * 2;
          while (dh < -Math.PI) dh += Math.PI * 2;
          u.heading += clamp(dh, -dt * 2.2, dt * 2.2);
          const top = wanted >= 3 ? 34 : 28;
          u.speed += (top - u.speed) * Math.min(1, dt * 1.5);
          u.x += Math.sin(u.heading) * u.speed * dt;
          u.z += Math.cos(u.heading) * u.speed * dt;
          u.state = d < 14 ? 'RAMMING' : 'PURSUIT';
        }
      }
      // Ramming contact: shove the player's car, or knock the player down.
      if (d < 3.4) {
        if (!p.onFoot) {
          const v = state.vehicles.find((x) => x.id === p.vehicleId);
          if (v) {
            v.speed *= 0.6;
            v.x += (v.x - u.x) * 0.1;
            v.z += (v.z - u.z) * 0.1;
          }
        } else {
          damagePlayer(state, 12);
          p.x += (p.x - u.x) * 0.35;
          p.z += (p.z - u.z) * 0.35;
        }
        u.speed *= 0.5;
      }
    } else {
      // Foot officer: run at the player; at wanted >= 2 stop at range
      // and shoot bursts. Never during a mission. Wanted 1 = arrest only.
      const inMission = state.missions.active !== null;
      if (wanted >= POLICE.shootWantedMin && !inMission && d < 42 && d > 6) {
        u.state = 'SHOOTING';
        u.burstTimer -= dt;
        if (u.burstTimer <= 0) {
          u.burstTimer = 1.6;
          u.shotsInBurst = 3;
        }
        if (u.shotsInBurst > 0) {
          u.shotsInBurst -= 1;
          u.burstTimer = Math.max(u.burstTimer, 0.14);
          damagePlayer(state, 5);
          state.combat.tracers.push({ x1: u.x, y1: 1.4, z1: u.z, x2: p.x, y2: 1.2, z2: p.z, ttl: 0.12, color: 0xff5040 });
        }
      } else if (d > 3) {
        u.state = 'ON FOOT';
        const wantHeading = Math.atan2(p.x - u.x, p.z - u.z);
        let dh = wantHeading - u.heading;
        while (dh > Math.PI) dh -= Math.PI * 2;
        while (dh < -Math.PI) dh += Math.PI * 2;
        u.heading += clamp(dh, -dt * 4, dt * 4);
        u.speed = 6.2;
        u.x += Math.sin(u.heading) * u.speed * dt;
        u.z += Math.cos(u.heading) * u.speed * dt;
        if (wanted === 1 && d < 2.2) {
          // Arrest: wanted clears, player pays a fine, mission-free.
          p.wanted = 0;
          state.player.cash = Math.max(0, state.player.cash - 200);
          state.notices.push({ text: 'Busted — $200 fine. The PCPD lets you walk.', ttl: 4 });
          pol.units.length = 0;
        }
      }
    }
  }
  // Roadblock at 5 stars: two cruisers park across the road ahead.
  if (wanted >= 5 && !pol.roadblock) {
    pol.roadblock = { x: p.x + 40, z: p.z, heading: p.heading };
  }
  if (wanted < 5) pol.roadblock = null;
}

function nearestNodeId(state, x, z) {
  let best = 0;
  let bestD = Infinity;
  for (const n of state.city.nodes) {
    const d = dist2(x, z, n.x, n.z);
    if (d < bestD) { bestD = d; best = n.id; }
  }
  return best;
}

// The HUD response list: real units, real distances, real states.
export function policeResponse(state) {
  const p = state.player;
  const list = state.police.units.map((u) => ({
    callsign: u.callsign,
    dist: Math.round(Math.hypot(u.x - p.x, u.z - p.z)),
    state: u.state,
    kind: u.kind,
  }));
  list.sort((a, b) => a.dist - b.dist);
  if (state.police.heli) {
    list.unshift({ callsign: 'AIR-1', dist: Math.round(Math.hypot(state.police.heli.x - p.x, state.police.heli.z - p.z)), state: 'SPOTLIGHT', kind: 'heli' });
  }
  return list.slice(0, POLICE.responseUnitsMax);
}

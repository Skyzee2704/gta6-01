// SOLMAR 3D — traffic. Cars drive the road graph, brake for what is
// ahead, and live in a population ring around the player: they spawn out
// of sight and despawn far behind, so nothing ever pops in before the
// player's eyes. Traffic is varied — sedans, taxis, pickups, vans, buses.
import { VEHICLES } from './data.js';
import { clamp, dist2 } from './random.js';
import { pushOutOfBuildings } from './character.js';
import { damagePlayer } from './combat.js';
import { raiseWanted } from './police.js';

const TRAFFIC_TYPES = ['solmar', 'taxi', 'pickup', 'van', 'solmar', 'muscle', 'bus', 'taxi'];

export function createTraffic(state) {
  state.traffic = [];
  state.trafficTimer = 0;
}

function randomRoadPoint(state, rng) {
  const road = rng.pick(state.city.roads);
  const pts = road.points;
  const i = rng.int(0, pts.length - 2);
  const t = rng.next();
  return {
    x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t,
    z: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t,
    heading: Math.atan2(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]),
  };
}

function nearestNode(state, x, z) {
  let best = 0;
  let bestD = Infinity;
  for (const n of state.city.nodes) {
    const d = dist2(x, z, n.x, n.z);
    if (d < bestD) { bestD = d; best = n.id; }
  }
  return best;
}

// Breadth-first route over the road graph, from one node to another.
export function findRoute(city, fromId, toId) {
  if (fromId === toId) return [fromId];
  const prev = new Map([[fromId, null]]);
  const queue = [fromId];
  while (queue.length) {
    const cur = queue.shift();
    if (cur === toId) break;
    for (const [a, b] of city.edges) {
      const nxt = a === cur ? b : b === cur ? a : null;
      if (nxt !== null && !prev.has(nxt)) {
        prev.set(nxt, cur);
        queue.push(nxt);
      }
    }
  }
  if (!prev.has(toId)) return [fromId];
  const path = [];
  let cur = toId;
  while (cur !== null) {
    path.unshift(cur);
    cur = prev.get(cur);
  }
  return path;
}

export function stepTraffic(state, dt) {
  const rng = state.rng;
  const p = state.player;
  // Keep the ring full: spawn out of sight, despawn far behind.
  state.trafficTimer -= dt;
  if (state.trafficTimer <= 0) {
    state.trafficTimer = 0.5;
    const near = state.traffic.filter((t) => dist2(t.x, t.z, p.x, p.z) < 140 * 140);
    state.traffic = near;
    if (near.length < 9) {
      for (let tries = 0; tries < 6 && state.traffic.length < 9; tries++) {
        const spot = randomRoadPoint(state, rng);
        if (dist2(spot.x, spot.z, p.x, p.z) < 55 * 55) continue; // never in sight
        if (dist2(spot.x, spot.z, p.x, p.z) > 150 * 150) continue;
        const type = rng.pick(TRAFFIC_TYPES);
        const spec = VEHICLES.find((v) => v.id === type);
        const car = {
          id: 1000 + state.traffic.length + Math.floor(rng.next() * 9000),
          type, name: spec.name, kind: spec.kind,
          x: spot.x, z: spot.z, heading: spot.heading,
          speed: rng.range(8, 16), color: rng.pick(spec.colors),
          node: nearestNode(state, spot.x, spot.z), route: null, routeIdx: 0,
          brake: false, driver: 'traffic',
        };
        state.traffic.push(car);
      }
    }
  }
  for (const car of state.traffic) {
    // Pick a destination node and follow the graph to it.
    if (!car.route || car.routeIdx >= car.route.length) {
      const dest = rng.int(0, state.city.nodes.length - 1);
      car.route = findRoute(state.city, car.node, dest);
      car.routeIdx = 0;
    }
    const target = state.city.nodes[car.route[car.routeIdx]];
    if (!target) continue;
    const dx = target.x - car.x;
    const dz = target.z - car.z;
    const d = Math.hypot(dx, dz);
    if (d < 4) {
      car.node = target.id;
      car.routeIdx += 1;
      continue;
    }
    // Brake for anything ahead: another car, a ped, the player.
    let blocked = false;
    for (const other of state.traffic) {
      if (other === car) continue;
      const od = dist2(car.x, car.z, other.x, other.z);
      if (od < 7 * 7) { blocked = true; break; }
    }
    if (!blocked) {
      for (const ped of state.peds) {
        if (ped.dead) continue;
        if (dist2(car.x, car.z, ped.x, ped.z) < 6 * 6) { blocked = true; break; }
      }
    }
    if (!blocked && dist2(car.x, car.z, p.x, p.z) < 6 * 6) blocked = true;
    car.brake = blocked;
    const targetSpeed = blocked ? 0 : 13;
    car.speed += (targetSpeed - car.speed) * Math.min(1, dt * (blocked ? 6 : 1.2));
    const wantHeading = Math.atan2(dx, dz);
    let dh = wantHeading - car.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    car.heading += clamp(dh, -dt * 1.6, dt * 1.6);
    car.x += Math.sin(car.heading) * car.speed * dt;
    car.z += Math.cos(car.heading) * car.speed * dt;
    pushOutOfBuildings(state, car, 1.4);
    // A moving car that reaches a character hits them — never a
    // ghost-through. The brake above stops most approaches, but a
    // character stepping into the road can still be struck: the player
    // takes damage and is knocked back, a ped dies and wanted rises.
    // One hit per car per second so a pinned player is not insta-killed.
    if (Math.abs(car.speed) >= 3 && state.time.elapsed - (car.lastHitAt || -99) > 1) {
      if (p.onFoot && !p.dead && dist2(car.x, car.z, p.x, p.z) < 2.2 * 2.2) {
        damagePlayer(state, 10);
        const d = Math.hypot(p.x - car.x, p.z - car.z) || 1;
        p.x += ((p.x - car.x) / d) * 6;
        p.z += ((p.z - car.z) / d) * 6;
        car.lastHitAt = state.time.elapsed;
        car.speed *= 0.3;
      } else {
        for (const ped of state.peds) {
          if (ped.dead) continue;
          if (dist2(car.x, car.z, ped.x, ped.z) < 2.2 * 2.2) {
            ped.dead = true;
            ped.deathTime = state.time.elapsed;
            state.stats.kills += 1;
            if (state.missions.active === null) raiseWanted(state, 1, 'Pedestrian run over');
            car.lastHitAt = state.time.elapsed;
            car.speed *= 0.3;
            break;
          }
        }
      }
    }
  }
}

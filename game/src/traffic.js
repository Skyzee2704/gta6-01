// Traffic AI: cars follow the road graph, stop at red lights, yield at
// intersections, honk when blocked over 4 seconds, panic when shots ring out.
import { TRAFFIC_MAX } from './config.js';
import { findPath } from './city.js';
import { spawnTrafficCar } from './vehicles.js';
import { dist2 } from './random.js';

const SPEEDS = { highway: 14, avenue: 12, boulevard: 10, street: 9, lane: 7 };
export function lightState(city, light, time) {
  const cycle = (time + light.phase) % 12;
  return cycle < 6 ? 'green' : cycle < 7.5 ? 'yellow' : 'red';
}
export function updateTraffic(state, city, dt, rng) {
  const p = state.player;
  // Spawn ring around the player.
  const traffic = state.vehicles.filter(v => v.driver === 'traffic');
  if (traffic.length < TRAFFIC_MAX && state.vehicles.length < 70 && rng() < 0.3) {
    const v = spawnTrafficCar(state, city, rng);
    const node = city.nodes[Math.floor(rng() * city.nodes.length)];
    v.x = node.x + (rng() - 0.5) * 6; v.z = node.z + (rng() - 0.5) * 6;
    v.heading = rng() * Math.PI * 2;
    v.path = findPath(city, v.x, v.z, city.nodes[Math.floor(rng() * city.nodes.length)].x, city.nodes[Math.floor(rng() * city.nodes.length)].z);
    v.pathI = 0; v.temper = 0.85 + rng() * 0.27; v.blocked = 0; v.panic = 0;
    state.vehicles.push(v);
  }
  for (const v of state.vehicles) {
    if (v.driver !== 'traffic') continue;
    if (!v.path || v.pathI >= v.path.length) {
      v.path = findPath(city, v.x, v.z, city.nodes[Math.floor(rng() * city.nodes.length)].x, city.nodes[Math.floor(rng() * city.nodes.length)].z);
      v.pathI = 0;
    }
    const target = v.path[v.pathI];
    const dx = target.x - v.x, dz = target.z - v.z;
    const d = Math.hypot(dx, dz);
    if (d < 6) { v.pathI += 1; continue; }
    const wantHeading = Math.atan2(dx, dz);
    let dh = wantHeading - v.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    v.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, dh));
    // Red light: stop before the intersection.
    let stop = false;
    for (const light of city.trafficLights) {
      if (dist2(light.x, light.z, v.x, v.z) < 400 && lightState(city, light, state.time) === 'red' && d < 30) { stop = true; break; }
    }
    // Blocked by the player or another car ahead.
    let blocked = false;
    for (const o of state.vehicles) {
      if (o === v) continue;
      const aheadX = v.x + Math.sin(v.heading) * 8, aheadZ = v.z + Math.cos(v.heading) * 8;
      if (dist2(o.x, o.z, aheadX, aheadZ) < 25) { blocked = true; break; }
    }
    const pd = Math.hypot(p.x - v.x, p.z - v.z);
    if (pd < 10 && !p.onFoot) blocked = true;
    // Brake for pedestrians in the path ahead (player on foot or any alive
    // ped within 5 units of the point 8 units ahead of the car).
    if (!blocked) {
      const aheadX = v.x + Math.sin(v.heading) * 8, aheadZ = v.z + Math.cos(v.heading) * 8;
      if (p.onFoot && dist2(p.x, p.z, aheadX, aheadZ) < 25) blocked = true;
      else for (const q of state.peds) {
        if (q.alive && dist2(q.x, q.z, aheadX, aheadZ) < 25) { blocked = true; break; }
      }
    }
    if (blocked) v.blocked += dt; else v.blocked = 0;
    if (v.blocked > 4 && !v.honked) { v.honked = true; state.notices.push('Honk! Traffic jam ahead of you.'); }
    if (!blocked) v.honked = false;
    const cruise = (SPEEDS.avenue + (v.temper - 1) * 4) * (v.panic > 0 ? 1.35 : 1);
    if (stop || blocked) v.speed = Math.max(0, v.speed - 20 * dt);
    else v.speed = Math.min(cruise, v.speed + 8 * dt);
    v.x += Math.sin(v.heading) * v.speed * dt;
    v.z += Math.cos(v.heading) * v.speed * dt;
    if (v.panic > 0) v.panic -= dt;
    // Despawn far behind the player.
    if (pd > 420) { v.driver = null; v.parked = true; v.speed = 0; }
  }
  // Shots panic nearby traffic.
  if (state._shotFired) {
    for (const v of state.vehicles) if (v.driver === 'traffic' && dist2(v.x, v.z, p.x, p.z) < 2500) v.panic = 3;
    state._shotFired = false;
  }
}

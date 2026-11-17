// Wanted + police: witnessed-only heat, search zone, escape meter, cruiser
// pursuit with lead targeting, roadblocks at 3+, NPC heli + searchlight at
// 4+, foot arrest at 1 star (catch, don't shoot), BUSTED at close range.
import { COP_MAX } from './config.js';
import { findPath } from './city.js';
import { createVehicleState } from './vehicles.js';
import { dist2, clamp } from './random.js';

export function updatePolice(state, city, dt, rng) {
  const p = state.player;
  const w = state.wanted;
  const wantCops = w.level === 0 ? 0 : Math.min(COP_MAX, w.level + 1);
  // Spawn cruisers near the player.
  if (state.cops.length < wantCops && rng() < 0.1) {
    const a = rng() * Math.PI * 2;
    const v = createVehicleState(state.vehicles.length, 'cruiser', p.x + Math.sin(a) * 60, p.z + Math.cos(a) * 60, a, 0xffffff, false);
    v.driver = 'police'; v.siren = true;
    state.vehicles.push(v);
    state.cops.push({ x: v.x, z: v.z, vehicleId: v.id, onFoot: false, arrest: 0, path: null, pathI: 0 });
  }
  for (const c of state.cops) {
    const v = state.vehicles.find(q => q.id === c.vehicleId);
    if (!v) continue;
    const d = Math.hypot(p.x - v.x, p.z - v.z);
    if (w.level === 0) { v.driver = null; v.siren = false; continue; }
    // Lead target: aim ahead of the player when visible.
    const lead = 0.4;
    const tx = p.x + Math.sin(p.heading) * (p.speed || 0) * lead;
    const tz = p.z + Math.cos(p.heading) * (p.speed || 0) * lead;
    const wantHeading = Math.atan2(tx - v.x, tz - v.z);
    let dh = wantHeading - v.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    v.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, dh));
    const speed = Math.min(24, 18 + w.level);
    v.speed = Math.min(speed, v.speed + 10 * dt);
    v.x += Math.sin(v.heading) * v.speed * dt;
    v.z += Math.cos(v.heading) * v.speed * dt;
    c.x = v.x; c.z = v.z;
    // Ram the player car.
    if (d < 6 && !p.onFoot) { v.speed *= 0.5; const pv = state.vehicles.find(q => q.id === p.vehicleId); if (pv) pv.hp -= 2; }
    // Foot cop gets out close to a walking player at low wanted.
    if (p.onFoot && d < 30 && w.level <= 2 && !c.onFoot) { c.onFoot = true; v.driver = null; v.speed = 0; }
    if (c.onFoot) {
      const dx = p.x - c.x, dz = p.z - c.z, dd = Math.hypot(dx, dz) || 1;
      c.x += (dx / dd) * 5 * dt; c.z += (dz / dd) * 5 * dt;
      if (dd < 3 && p.speed < 2) {
        c.arrest += dt;
        if (c.arrest > 1.6) {
          p.busted = true;
          state.money = Math.max(0, state.money - 500);
          delete state.weapons.owned.smg; delete state.weapons.owned.rifle; delete state.weapons.owned.shotgun; delete state.weapons.owned.sniper; delete state.weapons.owned.molotov;
          state.weapons.current = 'pistol';
          p.x = -180; p.z = 60; p.busted = false; p.onFoot = true; p.vehicleId = -1;
          w.heat = 0; w.level = 0;
          state.notices.push('BUSTED. Jaminan $500, senjata disita (kecuali pistol).');
        }
      } else c.arrest = 0;
    }
    // Searchlight lock: at 4+ the heli keeps the player spotted inside its cone.
    if (w.level >= 4) {
      const inCone = d < 200;
      if (inCone) { w.spotted = true; w.escape = 0; w.searchX = p.x; w.searchZ = p.z; }
    }
  }
  // Remove cops when wanted is gone.
  if (w.level === 0) {
    for (const c of state.cops) { const v = state.vehicles.find(q => q.id === c.vehicleId); if (v) { v.driver = null; v.siren = false; } }
    state.cops = [];
  }
  // Roadblocks at 3+: two cruisers parked across the road ahead (visual + physical).
  if (w.level >= 3 && !state._roadblock && rng() < 0.02) {
    state._roadblock = true;
    const a = p.heading;
    for (let i = 0; i < 2; i++) {
      const v = createVehicleState(state.vehicles.length, 'cruiser', p.x + Math.sin(a) * 40 + (i - 0.5) * 8, p.z + Math.cos(a) * 40, a + Math.PI / 2, 0xffffff, false);
      v.driver = 'police'; v.siren = true; state.vehicles.push(v);
      state.cops.push({ x: v.x, z: v.z, vehicleId: v.id, onFoot: false, arrest: 0 });
    }
  }
  if (w.level < 3) state._roadblock = false;
}
export function heliSearchlightLag(state, dt) {
  // The NPC heli searchlight trails the player with a visible lag.
  const s = state._searchlight || (state._searchlight = { x: state.player.x, z: state.player.z });
  s.x += (state.player.x - s.x) * Math.min(1, dt * 2);
  s.z += (state.player.z - s.z) * Math.min(1, dt * 2);
  return s;
}

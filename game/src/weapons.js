// Weapons: 7 distinct guns + melee + molotov. Shooting is a raycast in the
// x-z plane against peds, enemies and vehicles. Tracer + muzzle flash are
// particles the renderer draws; damage, recoil and ammo live here.
import { WEAPONS } from './data.js';
import { dist2, clamp } from './random.js';
import { killPed } from './npc.js';

export function weaponDef(id) { return WEAPONS.find(w => w.id === id); }
export function buyWeapon(state, id) {
  const def = weaponDef(id);
  if (!def) return false;
  if (state.weapons.owned[id]) return buyAmmo(state, id);
  if (state.money < def.price) { state.notices.push(`Uang tidak cukup untuk ${def.name} ($${def.price}).`); return false; }
  if (state.respectLevel < def.respect) { state.notices.push(`${def.name} butuh Respect level ${def.respect}.`); return false; }
  state.money -= def.price;
  state.weapons.owned[id] = { mag: def.mag, reserve: def.reserve };
  state.notices.push(`${def.name} dibeli!`);
  return true;
}
export function buyAmmo(state, id) {
  const def = weaponDef(id);
  if (!def || !state.weapons.owned[id] || def.ammoPrice === 0) return false;
  if (state.money < def.ammoPrice) return false;
  state.money -= def.ammoPrice;
  state.weapons.owned[id].reserve += def.mag * 2;
  return true;
}
export function reloadWeapon(state) {
  const cur = state.weapons.owned[state.weapons.current];
  const def = weaponDef(state.weapons.current);
  if (!cur || !def || def.mag === 0) return;
  const need = def.mag - cur.mag;
  const take = Math.min(need, cur.reserve);
  cur.mag += take; cur.reserve -= take;
}
// Fire once. Returns true when a shot left the barrel.
export function fireWeapon(state, city, rng) {
  const p = state.player;
  const cur = state.weapons.owned[state.weapons.current];
  const def = weaponDef(state.weapons.current);
  if (!cur || !def) return false;
  if (state._fireCooldown > 0) return false;
  if (def.mag > 0 && cur.mag <= 0) { reloadWeapon(state); return false; }
  if (def.mag > 0) cur.mag -= 1;
  state._fireCooldown = def.rate;
  state.mission.stats.shots += 1;
  state._shotFired = true;
  state._muzzle = { x: p.x, z: p.z, t: 0.08 };
  const pellets = def.pellets || 1;
  const silent = !!def.silent;
  for (let i = 0; i < pellets; i++) {
    const spread = (rng() - 0.5) * def.spread * 4;
    const ang = p.heading + spread;
    const dx = Math.sin(ang), dz = Math.cos(ang);
    let best = null, bd = def.range * def.range;
    for (const e of state.enemies) {
      if (!e.alive) continue;
      const ex = e.x - p.x, ez = e.z - p.z;
      const along = ex * dx + ez * dz;
      if (along < 0 || along > def.range) continue;
      const perp = Math.abs(ex * dz - ez * dx);
      if (perp < 2 && along * along < bd) { bd = along * along; best = { kind: 'enemy', obj: e, d: along }; }
    }
    for (const q of state.peds) {
      if (!q.alive) continue;
      const ex = q.x - p.x, ez = q.z - p.z;
      const along = ex * dx + ez * dz;
      if (along < 0 || along > def.range) continue;
      const perp = Math.abs(ex * dz - ez * dx);
      if (perp < 1.5 && along * along < bd) { bd = along * along; best = { kind: 'ped', obj: q, d: along }; }
    }
    for (const v of state.vehicles) {
      if (v.driver === 'player') continue;
      const ex = v.x - p.x, ez = v.z - p.z;
      const along = ex * dx + ez * dz;
      if (along < 0 || along > def.range) continue;
      const perp = Math.abs(ex * dz - ez * dx);
      if (perp < 2.5 && along * along < bd) { bd = along * along; best = { kind: 'vehicle', obj: v, d: along }; }
    }
    if (best) {
      state.mission.stats.hits += 1;
      if (best.kind === 'enemy') { best.obj.hp -= def.damage; if (best.obj.hp <= 0) { best.obj.alive = false; state.mission.stats.kills += 1; } }
      else if (best.kind === 'ped') { killPed(state, best.obj); if (!silent) addCrimeHeat(state, 'kill'); }
      else if (best.kind === 'vehicle') { best.obj.hp -= def.damage; if (best.obj.driver === 'police') addCrimeHeat(state, 'shootCopCar'); }
    }
  }
  if (def.thrown) {
    state.particles.push({ active: true, x: p.x, y: 1, z: p.z, vx: Math.sin(p.heading) * 14, vy: 4, vz: Math.cos(p.heading) * 14, kind: 'fire', life: 4, max: 4 });
  }
  if (!silent) addCrimeHeat(state, 'gunshot');
  if (state._fireCooldownTick) state._fireCooldownTick = 0;
  return true;
}
export function addCrimeHeat(state, crimeId) {
  // Witnessed-only: heat rises only when a ped or cop can see the player.
  const p = state.player;
  let witness = false;
  for (const q of state.peds) if (q.alive && dist2(q.x, q.z, p.x, p.z) < 90000) witness = true;
  for (const c of state.cops) if (dist2(c.x, c.z, p.x, p.z) < 270400) witness = true;
  if (!witness) return;
  const crime = { gunshot: 0.15, kill: 0.75, shootCopCar: 0.2 }[crimeId] ?? 0.15;
  state.wanted.heat = clamp(state.wanted.heat + crime, 0, 5.99);
  state.wanted.level = Math.min(5, Math.floor(state.wanted.heat));
  state.wanted.spotted = true; state.wanted.escape = 0;
  state.wanted.searchX = p.x; state.wanted.searchZ = p.z;
  state.wanted.searchR = 240 + state.wanted.level * 85;
}
export function tickFireCooldown(state, dt) {
  if (state._fireCooldown > 0) state._fireCooldown -= dt;
  if (state._muzzle) { state._muzzle.t -= dt; if (state._muzzle.t <= 0) state._muzzle = null; }
}

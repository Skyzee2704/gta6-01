// weapons.js — shooting. Raycast-free: a shot hits the nearest living
// target inside the weapon's range and inside a cone in front of the
// player (or the driver's aim when in a car). Damage, ammo, reload and
// drive-by SMG live here. Pure sim: no sound, no meshes.

import { WEAPONS } from './data.js';
import { dist2, clamp } from './random.js';

// The currently equipped weapon definition.
export function currentWeapon(state) {
  return WEAPONS.find((w) => w.id === state.weapons.current) || WEAPONS[0];
}

// Switch to a weapon the player owns. Returns true when it changed.
export function selectWeapon(state, weaponId) {
  if (!state.weapons.owned[weaponId]) return false;
  state.weapons.current = weaponId;
  state.weapons.reloadT = 0;
  return true;
}

// Cycle to the next owned weapon.
export function nextWeapon(state) {
  const owned = WEAPONS.filter((w) => state.weapons.owned[w.id]);
  if (owned.length < 2) return;
  const i = owned.findIndex((w) => w.id === state.weapons.current);
  state.weapons.current = owned[(i + 1) % owned.length].id;
}

// Start a reload (takes a moment; the weapon cannot fire while reloading).
export function reloadWeapon(state) {
  const w = currentWeapon(state);
  if (w.melee || w.thrown) return false;
  if (state.weapons.ammo[w.id] >= w.mag) return false;
  state.weapons.reloadT = w.id === 'sniper' ? 2.2 : 1.4;
  return true;
}

// All living shootable things in the world: enemies, cops, peds.
function targets(state) {
  const list = [];
  for (const e of state.enemies) if (e.alive) list.push({ kind: 'enemy', ref: e });
  for (const c of state.cops) if (!c.down) list.push({ kind: 'cop', ref: c });
  for (const p of state.peds) if (!p.down) list.push({ kind: 'ped', ref: p });
  return list;
}

// Fire the current weapon once. Returns the hit (or null).
// `city` is accepted for API compatibility with the tests; the shot
// itself needs only the state and the RNG.
export function fireWeapon(state, city, rng) {
  const w = currentWeapon(state);
  const p = state.player;
  if (state.weapons.reloadT > 0) return null;
  if (w.melee) {
    return meleeSwing(state, rng);
  }
  if (w.thrown) {
    return throwMolotov(state, rng);
  }
  if (state.weapons.ammo[w.id] <= 0) {
    reloadWeapon(state);
    return null;
  }
  state.weapons.ammo[w.id] -= 1;
  state.weapons.lastShotAt = state.time;
  // Muzzle flash particle + a short tracer record for the renderer.
  spawnShotFx(state, p.x, p.z, p.heading, w);
  // Find the nearest target in range and inside the aim cone.
  const range = w.range;
  const cosCone = Math.cos(0.35);
  const fx = Math.sin(p.heading);
  const fz = Math.cos(p.heading);
  let best = null;
  let bestD = Infinity;
  for (const t of targets(state)) {
    const dx = t.ref.x - p.x;
    const dz = t.ref.z - p.z;
    const d2 = dx * dx + dz * dz;
    if (d2 > range * range || d2 < 0.01) continue;
    const d = Math.sqrt(d2);
    const dot = (dx * fx + dz * fz) / d;
    if (dot < cosCone) continue;
    if (d < bestD) { bestD = d; best = t; }
  }
  if (!best) {
    state.stats.shotsFired = (state.stats.shotsFired || 0) + 1;
    return null;
  }
  const hit = applyDamage(state, best, w.damage, rng);
  state.stats.shotsFired = (state.stats.shotsFired || 0) + 1;
  if (hit) state.stats.shotsHit = (state.stats.shotsHit || 0) + 1;
  return hit;
}

// Melee swing: hits the nearest living thing within arm's reach.
function meleeSwing(state, rng) {
  const p = state.player;
  let best = null;
  let bestD = Infinity;
  for (const t of targets(state)) {
    const d = Math.sqrt(dist2(t.ref.x, t.ref.z, p.x, p.z));
    if (d < 2.5 && d < bestD) { bestD = d; best = t; }
  }
  if (!best) return null;
  return applyDamage(state, best, 22, rng);
}

// Molotov: arcs to the aim point and leaves a fire patch.
function throwMolotov(state, rng) {
  const p = state.player;
  const tx = p.x + Math.sin(p.heading) * 14;
  const tz = p.z + Math.cos(p.heading) * 14;
  state.particles.push({
    active: true, kind: 'fire', x: tx, z: tz, y: 0,
    vx: 0, vz: 0, life: 6, maxLife: 6,
  });
  for (const t of targets(state)) {
    if (dist2(t.ref.x, t.ref.z, tx, tz) < 36) applyDamage(state, t, 35, rng);
  }
  state.stats.shotsFired = (state.stats.shotsFired || 0) + 1;
  return { kind: 'molotov', x: tx, z: tz };
}

// Damage a target. Returns a hit record, or null when it survives.
// Killing a cop or a ped raises wanted heat (witnessed crime).
function applyDamage(state, target, damage, rng) {
  const ref = target.ref;
  const health = ref.health ?? 60;
  ref.health = health - damage;
  ref.flashT = 0.12;
  if (ref.health > 0) {
    return { kind: target.kind, ref, killed: false, damage };
  }
  if (target.kind === 'enemy') {
    ref.alive = false;
    state.stats.kills = (state.stats.kills || 0) + 1;
    state.corpses.push({ x: ref.x, z: ref.z, heading: ref.heading || 0, t: 0 });
  } else if (target.kind === 'cop') {
    ref.down = true;
    ref.downT = 0;
    addWantedHeat(state, 1.0);
  } else {
    ref.down = true;
    ref.downT = 0;
    addWantedHeat(state, 1.0);
  }
  return { kind: target.kind, ref, killed: true, damage };
}

// Raise wanted heat (clamped to the 0-5 scale).
export function addWantedHeat(state, amount) {
  state.wanted.heat = clamp(state.wanted.heat + amount, 0, 5);
  state.wanted.level = Math.min(5, Math.floor(state.wanted.heat + 0.01));
  if (state.wanted.level > 0) {
    state.wanted.spotted = true;
    state.wanted.searchX = state.player.x;
    state.wanted.searchZ = state.player.z;
    state.wanted.searchR = 500;
  }
}

// A muzzle-flash particle and a tracer record for the renderer.
function spawnShotFx(state, x, z, heading, weapon) {
  state.particles.push({
    active: true, kind: 'muzzle', x: x + Math.sin(heading) * 1.2, z: z + Math.cos(heading) * 1.2, y: 1.3,
    vx: 0, vz: 0, life: 0.08, maxLife: 0.08,
  });
  state.tracer = { x, z, heading, range: weapon.range, t: 0.06 };
}

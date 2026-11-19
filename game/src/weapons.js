// SOLMAR 3D — weapons. Seven weapons, five in the HUD bar (Pistol, SMG,
// Rifle, Shotgun, Sniper — no Fists in the bar) plus two throwables.
// The held weapon is ALWAYS visible in the player's hands — no right
// click needed to see it — and the HUD shows its name, picture and ammo.
// The VK-47 is the AK47-style rifle: 30 in the mag, 90 in reserve.
import { WEAPONS } from './data.js';
import { clamp } from './random.js';

export function weaponSpec(id) {
  return WEAPONS.find((w) => w.id === id) || WEAPONS[0];
}

export function createWeapons(state) {
  state.weapons = {
    current: 'vk47',
    ammo: {
      pistol: { mag: 12, reserve: 120 },
      smg: { mag: 32, reserve: 160 },
      vk47: { mag: 30, reserve: 90 },
      shotgun: { mag: 6, reserve: 36 },
      sniper: { mag: 5, reserve: 25 },
      grenade: { mag: 1, reserve: 8 },
      molotov: { mag: 1, reserve: 6 },
    },
    owned: ['pistol', 'smg', 'vk47', 'shotgun', 'sniper'],
    cooldown: 0,
    reloadTimer: 0,
    muzzleFlash: 0,
    spread: 0,
  };
}

export function switchWeapon(state, dir) {
  const slots = ['pistol', 'smg', 'vk47', 'shotgun', 'sniper'];
  const owned = slots.filter((id) => state.weapons.owned.includes(id));
  if (owned.length === 0) return;
  let idx = owned.indexOf(state.weapons.current);
  if (idx < 0) idx = 0;
  idx = (idx + dir + owned.length) % owned.length;
  state.weapons.current = owned[idx];
  state.weapons.reloadTimer = 0;
}

export function buyWeapon(state, id) {
  const spec = weaponSpec(id);
  if (state.weapons.owned.includes(id)) {
    // Top up ammo instead.
    const cost = Math.round(spec.price * 0.2);
    if (state.player.cash < cost) return false;
    state.player.cash -= cost;
    const a = state.weapons.ammo[id];
    a.reserve = Math.min(spec.reserve, a.reserve + spec.mag * 2);
    return true;
  }
  if (state.player.cash < spec.price) return false;
  state.player.cash -= spec.price;
  state.weapons.owned.push(id);
  return true;
}

// Returns true when a shot actually left the barrel.
export function fireWeapon(state) {
  const w = state.weapons;
  if (w.cooldown > 0 || w.reloadTimer > 0) return false;
  const spec = weaponSpec(w.current);
  const a = w.ammo[w.current];
  if (a.mag <= 0) {
    startReload(state);
    return false;
  }
  a.mag -= 1;
  w.cooldown = spec.fireRate;
  w.muzzleFlash = 0.07;
  w.spread = Math.min(0.06, w.spread + 0.008);
  state.stats.shotsFired += 1;
  state.combat.lastShotAt = state.time.elapsed;
  state.combat.lastShotX = state.player.x;
  state.combat.lastShotZ = state.player.z;
  return true;
}

export function startReload(state) {
  const w = state.weapons;
  const spec = weaponSpec(w.current);
  const a = w.ammo[w.current];
  if (w.reloadTimer > 0 || a.reserve <= 0 || a.mag >= spec.mag) return;
  w.reloadTimer = spec.id === 'shotgun' ? 1.6 : spec.id === 'sniper' ? 1.8 : 1.1;
}

export function stepWeapons(state, dt) {
  const w = state.weapons;
  if (w.cooldown > 0) w.cooldown -= dt;
  if (w.muzzleFlash > 0) w.muzzleFlash -= dt;
  w.spread = Math.max(0, w.spread - dt * 0.05);
  if (w.reloadTimer > 0) {
    w.reloadTimer -= dt;
    if (w.reloadTimer <= 0) {
      const spec = weaponSpec(w.current);
      const a = w.ammo[w.current];
      const need = spec.mag - a.mag;
      const take = Math.min(need, a.reserve);
      a.mag += take;
      a.reserve -= take;
    }
  }
}

// Weapon silhouette for the HUD picture: boxes in the weapon's shape,
// drawn on a small canvas by hud.js from this description.
export function weaponShape(id) {
  const shapes = {
    pistol: { parts: [[0, 0, 26, 7], [4, 7, 6, 12], [20, 2, 8, 4]], color: '#2a2a30' },
    smg: { parts: [[0, 0, 34, 6], [6, 6, 6, 10], [26, 1, 12, 4], [12, -5, 8, 5]], color: '#3a3a44' },
    vk47: { parts: [[0, 0, 52, 6], [10, 6, 6, 12], [34, 6, 4, 10], [44, 1, 10, 3], [6, -4, 10, 4]], color: '#6a4a2a' },
    shotgun: { parts: [[0, 0, 46, 7], [8, 7, 6, 10], [30, 1, 16, 4], [4, -3, 12, 3]], color: '#4a2a2a' },
    sniper: { parts: [[0, 0, 58, 5], [12, 5, 6, 10], [26, -4, 14, 4], [44, 1, 12, 3], [8, -3, 8, 3]], color: '#2a3a2a' },
    grenade: { parts: [[14, 0, 16, 18], [18, -6, 8, 6]], color: '#3a5a3a' },
    molotov: { parts: [[16, 0, 12, 22], [18, -8, 8, 8]], color: '#2a5a3a' },
  };
  return shapes[id] || shapes.pistol;
}

export function clampAmmo(a, spec) {
  a.mag = clamp(a.mag, 0, spec.mag);
  a.reserve = clamp(a.reserve, 0, spec.reserve);
}

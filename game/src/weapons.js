// SOLMAR 3D — weapons: 7 weapons (data.js field names: slot is a NUMBER
// 0-4, fireRate shots/sec, magazine rounds, reserve spare rounds),
// damage, ammo, range, recoil, muzzle flash data, and the 5-slot HUD
// mapping (Pistol / SMG / Rifle / Shotgun / Sniper — no Fists slot).
// Revolver shares slot 0, carbine shares slot 2.
import { WEAPONS } from './data.js';

export const HUD_SLOTS = ['Pistol', 'SMG', 'Rifle', 'Shotgun', 'Sniper'];

export const SPREAD = {
  pistol: 0.15,
  revolver: 0.1,
  smg: 0.25,
  vk47: 0.12,
  carbine: 0.12,
  shotgun: 0.5,
  sniper: 0.05,
};

export function weaponById(id) {
  return WEAPONS.find((w) => w.id === id) || WEAPONS[0];
}

export function slotForWeapon(weaponId) {
  const w = weaponById(weaponId);
  return HUD_SLOTS[w.slot] || HUD_SLOTS[0];
}

export function spreadFor(weaponId) {
  return SPREAD[weaponId] != null ? SPREAD[weaponId] : 0.15;
}

export function createWeaponState(weaponId, ammo, reserve) {
  const def = weaponById(weaponId);
  return {
    def,
    ammo: ammo != null ? ammo : def.magazine,
    reserve: reserve != null ? reserve : def.reserve,
    cooldown: 0,
    reloading: false,
    reloadT: 0,
  };
}

export function updateWeapon(w, dt) {
  if (w.cooldown > 0) w.cooldown -= dt;
  if (w.reloading) {
    w.reloadT -= dt;
    if (w.reloadT <= 0) {
      const need = w.def.magazine - w.ammo;
      const take = Math.min(need, w.reserve);
      w.ammo += take;
      w.reserve -= take;
      w.reloading = false;
    }
  }
  return w;
}

export function canFire(w) {
  return !w.reloading && w.cooldown <= 0 && w.ammo > 0;
}

export function fireWeapon(w, target) {
  if (!canFire(w)) return null;
  w.ammo -= 1;
  w.cooldown = 1 / w.def.fireRate;
  const spread = spreadFor(w.def.id);
  const hitChance = target ? Math.max(0.25, 1 - target.distance / w.def.range) : 1;
  return {
    weapon: w.def.id,
    damage: w.def.damage,
    spread,
    hitChance,
    muzzle: true,
    ammoLeft: w.ammo,
    reserve: w.reserve,
  };
}

export function startReload(w) {
  if (w.reloading || w.ammo >= w.def.magazine || w.reserve <= 0) return false;
  w.reloading = true;
  w.reloadT = 1.4;
  return true;
}

export function applyDamage(target, damage) {
  target.health = Math.max(0, (target.health || 100) - damage);
  return target.health;
}

export function muzzleFlashData() {
  return {
    size: 0.6,
    color: 0xffd27a,
    life: 0.08,
    light: 2.5,
  };
}

export function weaponPrice(id) {
  return weaponById(id).price;
}

export function ownedSlots(ownedIds) {
  const slots = HUD_SLOTS.map((name) => ({ name, weapon: null, locked: true }));
  for (const id of ownedIds || []) {
    const w = weaponById(id);
    const idx = typeof w.slot === 'number' ? w.slot : HUD_SLOTS.indexOf(w.slot);
    if (idx >= 0 && idx < slots.length && !slots[idx].weapon) {
      slots[idx] = { name: HUD_SLOTS[idx], weapon: w, locked: false };
    }
  }
  return slots;
}

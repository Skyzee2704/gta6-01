// Weapons: the seven guns and blades, their ammo, and the firing rules.
// The held weapon is always visible in the player's hands — never only
// when aiming — and the HUD shows its picture, name and ammo. The renderer
// draws the weapon from the same loadout, so what the HUD promises is
// what the hands hold.
import { WEAPONS, weaponById } from './data.js';

export { WEAPONS, weaponById };

/** The five HUD slots, in bar order. Fists and the bat are not in the bar. */
export const HUD_SLOTS = ['pistol', 'smg', 'rifle', 'shotgun', 'sniper'];

/** A fresh loadout: fists plus the pistol the story starts you with. */
export function freshLoadout() {
  return {
    owned: ['fists', 'pistol'],
    current: 'pistol',
    ammo: { pistol: [12, 60], smg: [0, 0], rifle: [0, 0], shotgun: [0, 0], sniper: [0, 0] },
    cooldown: 0, muzzleFlash: 0,
  };
}

/** Buy a weapon (or its ammo) if the player can afford it. Returns the
 *  sale result and the cash left, so the caller never guesses. Buying a
 *  weapon you already own tops up its reserve instead, for a third of
 *  the price — the gun shop is not a trap. */
export function buyWeapon(loadout, weaponId, cash) {
  const def = weaponById(weaponId);
  if (loadout.owned.includes(weaponId)) {
    const topUp = Math.floor(def.price / 3);
    if (cash < topUp) return { ok: false, cash };
    loadout.ammo[weaponId][1] += def.reserve;
    return { ok: true, cash: cash - topUp };
  }
  if (cash < def.price) return { ok: false, cash };
  loadout.owned.push(weaponId);
  loadout.ammo[weaponId] = [def.mag, def.reserve];
  return { ok: true, cash: cash - def.price };
}

/** Switch to the next owned weapon in the HUD bar, wrapping around. */
export function cycleWeapon(loadout, dir) {
  const owned = HUD_SLOTS.filter((id) => loadout.owned.includes(id));
  if (owned.length === 0) return loadout.current;
  let i = owned.indexOf(loadout.current);
  if (i === -1) i = 0;
  i = (i + dir + owned.length) % owned.length;
  loadout.current = owned[i];
  return loadout.current;
}

/** Switch straight to a named weapon, if it is owned. */
export function selectWeapon(loadout, weaponId) {
  if (!loadout.owned.includes(weaponId)) return loadout.current;
  loadout.current = weaponId;
  return loadout.current;
}

/**
 * Fire once. Returns the shots fired (pellets for the shotgun) or 0 when
 * the trigger is dry. Ammo is spent from the magazine; an empty magazine
 * starts a reload instead of clicking forever.
 */
export function fireWeapon(loadout, dt) {
  if (loadout.cooldown > 0) {
    loadout.cooldown -= dt;
    return 0;
  }
  const def = weaponById(loadout.current);
  if (def.mag === 0) {
    // Melee: a swing, no ammo, no flash.
    loadout.cooldown = 1 / def.rate;
    loadout.muzzleFlash = 0;
    return 1;
  }
  const mag = loadout.ammo[loadout.current];
  if (!mag || mag[0] <= 0) {
    reloadWeapon(loadout);
    return 0;
  }
  mag[0] -= 1;
  loadout.cooldown = 1 / def.rate;
  loadout.muzzleFlash = 0.09;
  return def.pellets || 1;
}

/** Move reserve ammo into the magazine, up to a full mag. */
export function reloadWeapon(loadout) {
  const def = weaponById(loadout.current);
  if (def.mag === 0) return;
  const mag = loadout.ammo[loadout.current];
  if (!mag) return;
  const need = def.mag - mag[0];
  const take = Math.min(need, mag[1]);
  mag[0] += take;
  mag[1] -= take;
  loadout.cooldown = Math.max(loadout.cooldown, 0.7);
}

/** Ammo text for the HUD: "30/90", or "—" for melee. */
export function ammoText(loadout) {
  const def = weaponById(loadout.current);
  if (def.mag === 0) return '—';
  const mag = loadout.ammo[loadout.current];
  if (!mag) return '0/0';
  return `${mag[0]}/${mag[1]}`;
}

/** Damage at a distance: full inside half range, falling off to half at
 *  max range, so a pistol is not a sniper and a sniper earns its price. */
export function damageAtRange(weaponId, distance) {
  const def = weaponById(weaponId);
  if (distance <= def.range / 2) return def.damage;
  const fall = 1 - (distance - def.range / 2) / def.range;
  return Math.max(def.damage * 0.5, def.damage * fall);
}

/** True when the current weapon can fire right now (off cooldown, with
 *  a round in the magazine or a fist to swing). */
export function canFire(loadout) {
  if (loadout.cooldown > 0) return false;
  const def = weaponById(loadout.current);
  if (def.mag === 0) return true;
  const mag = loadout.ammo[loadout.current];
  return !!mag && mag[0] > 0;
}

// Weapons: the seven guns and blades, their ammo, and the firing rules.
// The held weapon is always visible in the player's hands — never only
// when aiming — and the HUD shows its picture, name and ammo.
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

/** Buy a weapon (or its ammo) if the player can afford it. Returns true on sale. */
export function buyWeapon(loadout, weaponId, cash) {
  const def = weaponById(weaponId);
  if (loadout.owned.includes(weaponId)) {
    // Already owned: top up reserve ammo for a third of the price.
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

/** Switch to the next owned weapon in the HUD bar. */
export function cycleWeapon(loadout, dir) {
  const owned = HUD_SLOTS.filter((id) => loadout.owned.includes(id));
  if (owned.length === 0) return loadout.current;
  let i = owned.indexOf(loadout.current);
  if (i === -1) i = 0;
  i = (i + dir + owned.length) % owned.length;
  loadout.current = owned[i];
  return loadout.current;
}

/**
 * Fire once. Returns the shots fired (pellets for the shotgun) or 0 when
 * the trigger is dry. Ammo is spent from the magazine; reload on empty.
 */
export function fireWeapon(loadout, dt) {
  if (loadout.cooldown > 0) {
    loadout.cooldown -= dt;
    return 0;
  }
  const def = weaponById(loadout.current);
  if (def.mag === 0) {
    // Melee: a swing, no ammo.
    loadout.cooldown = 1 / def.rate;
    loadout.muzzleFlash = 0;
    return 1;
  }
  const mag = loadout.ammo[loadout.current];
  if (mag[0] <= 0) {
    reloadWeapon(loadout);
    return 0;
  }
  mag[0] -= 1;
  loadout.cooldown = 1 / def.rate;
  loadout.muzzleFlash = 0.09;
  return def.pellets || 1;
}

/** Move reserve ammo into the magazine. */
export function reloadWeapon(loadout) {
  const def = weaponById(loadout.current);
  if (def.mag === 0) return;
  const mag = loadout.ammo[loadout.current];
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
  return `${mag[0]}/${mag[1]}`;
}

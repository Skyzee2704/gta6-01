// economy.js — money, respect, unlocks, fines.
// Respect is the progression spine: earn it from jobs, fares, races
// and tapes, and it unlocks weapons and the penthouse. Money pays for
// guns, ammo, paint, and bail.

import { RESPECT_RANKS, WEAPONS } from './data.js';

// Respect needed to reach each level (level 0 is free).
export const RESPECT_THRESHOLDS = [0, 300, 800, 1600, 3000];

// Fresh economy state.
export function createEconomy() {
  return { money: 250, respect: 0, respectLevel: 0 };
}

// The rank name for a respect level.
export function respectRank(level) {
  return RESPECT_RANKS[Math.min(level, RESPECT_RANKS.length - 1)];
}

// Add money (can be negative for purchases; never drops below 0).
export function addMoney(state, amount) {
  state.money = Math.max(0, state.money + amount);
  return state.money;
}

// Add respect and recompute the level. Returns true when the level rose.
export function addRespect(state, amount) {
  state.respect += amount;
  let level = 0;
  for (let i = 0; i < RESPECT_THRESHOLDS.length; i++) {
    if (state.respect >= RESPECT_THRESHOLDS[i]) level = i;
  }
  const rose = level > state.respectLevel;
  state.respectLevel = level;
  if (rose && state.notices) {
    state.notices.push(`Respect up to level ${level} (${respectRank(level)})! New unlock available.`);
  }
  return rose;
}

// Can the player afford this weapon, and do they meet its respect level?
export function canBuyWeapon(state, weaponId) {
  const w = WEAPONS.find((q) => q.id === weaponId);
  if (!w) return { ok: false, reason: 'No such weapon.' };
  if (state.weapons.owned[weaponId]) return { ok: false, reason: 'Already owned.' };
  if (state.money < w.price) return { ok: false, reason: `Not enough cash for ${w.name} ($${w.price}).` };
  if (state.respectLevel < w.respect) return { ok: false, reason: `${w.name} needs Respect level ${w.respect}.` };
  return { ok: true, weapon: w };
}

// Buy a weapon: deduct cash, mark owned, fill its magazine.
export function buyWeapon(state, weaponId) {
  const check = canBuyWeapon(state, weaponId);
  if (!check.ok) {
    if (state.notices) state.notices.push(check.reason);
    return false;
  }
  addMoney(state, -check.weapon.price);
  state.weapons.owned[weaponId] = true;
  state.weapons.ammo[weaponId] = check.weapon.mag;
  if (state.notices) state.notices.push(`${check.weapon.name} bought!`);
  return true;
}

// Progress toward 100% completion (jobs + tapes + races + property).
export function completionPercent(state) {
  const jobs = state.mission.done.filter(Boolean).length;
  const jobPart = (jobs / 6) * 55;
  const tapePart = (state.tapesFound / 20) * 20;
  const racePart = (Object.keys(state.race.best).length / 3) * 15;
  const propPart = state.properties.penthouse ? 10 : 0;
  return Math.min(100, Math.round(jobPart + tapePart + racePart + propPart));
}

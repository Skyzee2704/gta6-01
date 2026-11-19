// SOLMAR 3D — money, respect, prices and payouts. All amounts come from
// data.js tables; this module only moves them. Never lets cash go negative.
import { PRICES, RESPECT_TIERS, WEAPONS, missionById, weaponById, respectTierFor } from './data.js';

export { respectTierFor };

export function tierName(respect) {
  return respectTierFor(respect).name;
}

export function nextTier(respect) {
  for (const tier of RESPECT_TIERS) {
    if (respect < tier.min) return tier;
  }
  return null;
}

export function progressToNextTier(respect) {
  const current = respectTierFor(respect);
  const next = nextTier(respect);
  if (!next) return 1;
  return Math.min(1, Math.max(0, (respect - current.min) / (next.min - current.min)));
}

export function addCash(state, amount) {
  state.cash = Math.max(0, state.cash + amount);
  return state.cash;
}

export function canAfford(state, amount) {
  return state.cash >= amount;
}

export function spendCash(state, amount) {
  if (state.cash < amount) return false;
  state.cash -= amount;
  return true;
}

export function awardMissionPayout(state, missionId) {
  const mission = missionById(missionId);
  if (!mission) return 0;
  addCash(state, mission.payout);
  state.respect = Math.max(0, state.respect + 120 + mission.index * 80);
  return mission.payout;
}

export function buyWeapon(state, weaponId) {
  const weapon = weaponById(weaponId);
  if (!weapon) return { ok: false, reason: 'unknown weapon' };
  if (state.owned.weapons.includes(weaponId)) return { ok: false, reason: 'already owned' };
  if (!spendCash(state, weapon.price)) return { ok: false, reason: 'not enough cash' };
  state.owned.weapons.push(weaponId);
  state.ammo[weaponId] = (state.ammo[weaponId] || 0) + weapon.reserve;
  return { ok: true, price: weapon.price };
}

export function buyAmmo(state, weaponId, boxes = 1) {
  const weapon = weaponById(weaponId);
  if (!weapon) return { ok: false, reason: 'unknown weapon' };
  const cost = PRICES.ammoBox * boxes;
  if (!spendCash(state, cost)) return { ok: false, reason: 'not enough cash' };
  state.ammo[weaponId] = (state.ammo[weaponId] || 0) + weapon.magazine * boxes;
  return { ok: true, price: cost };
}

export function buyRespray(state) {
  if (!spendCash(state, PRICES.respray)) return { ok: false, reason: 'not enough cash' };
  return { ok: true, price: PRICES.respray };
}

export function buyProperty(state, propertyId) {
  const property = PRICES[propertyId];
  if (property == null) return { ok: false, reason: 'unknown property' };
  if (state.owned.properties.includes(propertyId)) return { ok: false, reason: 'already owned' };
  if (!spendCash(state, property)) return { ok: false, reason: 'not enough cash' };
  state.owned.properties.push(propertyId);
  return { ok: true, price: property };
}

export function penthouseIncomeTick(state) {
  if (!state.owned.properties.includes('penthouse')) return 0;
  const income = PRICES.penthouseIncome;
  addCash(state, income);
  return income;
}

export function taxiFare(distanceMeters) {
  return Math.max(15, Math.round(distanceMeters * PRICES.taxiFarePerMeter));
}

export function racePayout(won) {
  return won ? PRICES.raceWin : 0;
}

export function weaponPrice(weaponId) {
  const weapon = WEAPONS.find((w) => w.id === weaponId);
  return weapon ? weapon.price : 0;
}

export function totalWealth(state) {
  let wealth = state.cash;
  for (const id of state.owned.weapons) wealth += weaponPrice(id);
  for (const id of state.owned.properties) wealth += PRICES[id] || 0;
  return wealth;
}

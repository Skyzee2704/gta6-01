// Money, respect and property. Cash comes from missions, taxi fares and
// the penthouse income; respect is a named rank that grows with every job.
import { ECONOMY } from './config.js';
import { respectName } from './data.js';

export { respectName };

export function createEconomy() {
  return { cash: ECONOMY.startCash, respect: 0, penthouse: false, garage: false, day: 1, earned: 0, spent: 0 };
}

/** Pay out a mission: cash plus respect, both recorded. */
export function payMission(economy, payout, respect) {
  economy.cash += payout;
  economy.respect += respect;
  economy.earned += payout;
  return economy;
}

/** Spend cash when the player can afford it. Returns true on sale. */
export function spend(economy, amount) {
  if (economy.cash < amount) return false;
  economy.cash -= amount;
  economy.spent += amount;
  return true;
}

/** A taxi fare: base plus distance, paid on drop-off. */
export function taxiFare(distanceMetres) {
  return Math.round(ECONOMY.taxiFareBase + distanceMetres * ECONOMY.taxiFarePerMetre);
}

/** Penthouse income, paid once per in-game day. */
export function dailyIncome(economy) {
  if (!economy.penthouse) return 0;
  economy.cash += ECONOMY.penthouseIncomePerDay;
  economy.earned += ECONOMY.penthouseIncomePerDay;
  return ECONOMY.penthouseIncomePerDay;
}

/** Buy the penthouse: the big purchase that also pays a daily income. */
export function buyPenthouse(economy) {
  if (economy.penthouse) return false;
  if (!spend(economy, ECONOMY.penthousePrice)) return false;
  economy.penthouse = true;
  return true;
}

/** Buy the garage: room for the cars the player keeps. */
export function buyGarage(economy) {
  if (economy.garage) return false;
  if (!spend(economy, ECONOMY.garagePrice)) return false;
  economy.garage = true;
  return true;
}

/** The player's current respect rank, in plain English. */
export function rank(economy) {
  return respectName(economy.respect);
}

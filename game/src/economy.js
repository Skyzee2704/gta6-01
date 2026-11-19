// SOLMAR 3D — money, respect and prices. The economy is a table plus a
// few pure functions: no system invents a payout, a price or a title.
import { MISSIONS, PRICES, respectTitleFor } from './data.js';

export { respectTitleFor, PRICES };

export function missionPayout(missionId) {
  const m = MISSIONS.find((x) => x.id === missionId);
  return m ? m.payout : 0;
}

export function missionRespect(missionId) {
  const m = MISSIONS.find((x) => x.id === missionId);
  return m ? m.respect : 0;
}

// A taxi fare: base plus distance, in dollars.
export function taxiFare(distanceUnits) {
  return Math.round(PRICES.taxiFareBase + distanceUnits * PRICES.taxiFarePerUnit);
}

// Penthouse pays once a day while owned.
export function penthouseIncome(daysOwned) {
  return daysOwned > 0 ? PRICES.penthouseIncomePerDay : 0;
}

// Percentage of the game complete: missions + tapes + races + property.
export function completionPercent(state) {
  const missionPart = (state.missions.completed.length / MISSIONS.length) * 55;
  const tapePart = (state.postcardsFound.size / 20) * 20;
  const racePart = (state.racesWon / 3) * 15;
  const propPart = state.penthouseOwned ? 10 : 0;
  return Math.min(100, Math.round(missionPart + tapePart + racePart + propPart));
}

// Lifetime stats the pause screen shows, kept on the save.
export function emptyStats() {
  return {
    distanceDriven: 0, distanceWalked: 0, carsStolen: 0, pursuitsEscaped: 0,
    racesWon: 0, taxiFares: 0, kills: 0, shotsFired: 0, shotsHit: 0,
    missionsDone: 0, timePlayedSeconds: 0,
  };
}

export function addCash(state, amount, reason) {
  state.player.cash += amount;
  state.notices.push({ text: `${amount >= 0 ? '+' : ''}$${amount} — ${reason}`, ttl: 4 });
  if (state.player.cash < 0) state.player.cash = 0;
}

export function addRespect(state, amount) {
  state.player.respect += amount;
  state.player.respectTitle = respectTitleFor(state.player.respect);
}

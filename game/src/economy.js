// Economy: money, respect, unlocks, fines and income. Every system pays,
// fines or rewards — nothing is free of consequence.
import { ECONOMY, RESPECT_LEVELS } from './config.js';
import { respectLevel } from './data.js';

export function addMoney(state, n) { state.money = Math.max(0, state.money + n); }
export function addRespect(state, n) {
  const before = state.respectLevel;
  state.respect += n;
  state.respectLevel = respectLevel(state.respect);
  if (state.respectLevel > before) state.notices.push(`Respect naik ke level ${state.respectLevel}! Unlock baru terbuka.`);
  return state.respectLevel;
}
export function hospitalBill(state) {
  const fee = Math.min(ECONOMY.hospitalMax, Math.max(ECONOMY.hospitalMin, ECONOMY.hospitalFee + Math.floor(state.money * ECONOMY.hospitalPct)));
  state.money = Math.max(0, state.money - fee);
  return fee;
}
export function bailCost(state) { state.money = Math.max(0, state.money - ECONOMY.bailFee); return ECONOMY.bailFee; }
export function resprayCost(state) {
  const cost = ECONOMY.resprayBase + state.wanted.level * ECONOMY.resprayPerLevel;
  if (state.money < cost) return 0;
  state.money -= cost; state.wanted.heat = 0; state.wanted.level = 0;
  return cost;
}
export function buyMeal(state) {
  if (state.money < ECONOMY.mealPrice) return false;
  state.money -= ECONOMY.mealPrice;
  state.player.health = 100;
  state.notices.push('Makan di Rosas Diner. Health penuh.');
  return true;
}
export function buyPenthouse(state) {
  if (state.penthouseOwned || state.money < ECONOMY.penthousePrice) return false;
  state.money -= ECONOMY.penthousePrice; state.penthouseOwned = true;
  return true;
}
export function taxiFare(distance, timeLeft) {
  return Math.round(50 + distance * 0.25 + timeLeft * 5);
}
export function respectThreshold(level) { return RESPECT_LEVELS[level] ?? 0; }

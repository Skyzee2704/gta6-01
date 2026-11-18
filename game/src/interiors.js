// Two walk-in interiors: Rosas Diner (Old Solmar) and Harbor Arms gun shop
// (Harbor Docks). Each is a small separate scene with a fade transition at
// the door. Inside: an NPC keeper, interactions (eat = heal, buy = weapons).
import { WEAPONS } from './data.js';
import { buyWeapon, buyAmmo } from './weapons.js';
import { buyMeal } from './economy.js';

export const INTERIORS = {
  diner: {
    name: 'Rosas Diner', keeper: 'rosa', keeperLine: 'Rosa: "Sit down, Milo. Eat first, then work."',
    menu: [{ id: 'meal', name: 'Rosa\'s Lunch', price: 25, desc: 'Full health' }],
    tables: 4, customers: 3,
  },
  gunshop: {
    name: 'Harbor Arms', keeper: 'mags', keeperLine: 'Keeper: "Good guns, honest prices. You\'ve bought here before, right?"',
    menu: WEAPONS.map(w => ({ id: w.id, name: w.name, price: w.price, desc: `Damage ${w.damage} · Respect ${w.respect}` })),
    tables: 0, customers: 1,
  },
};
export function interiorAt(state, city) {
  return state.interior;
}
export function interactInterior(state, action) {
  const room = INTERIORS[state.interior];
  if (!room) return false;
  if (state.interior === 'diner' && action === 'meal') return buyMeal(state);
  if (state.interior === 'gunshop') {
    if (action.startsWith('ammo:')) return buyAmmo(state, action.slice(5));
    return buyWeapon(state, action);
  }
  return false;
}
export function leaveInterior(state) { state.interior = null; }
export function interiorKeeperLine(state) {
  const room = INTERIORS[state.interior];
  return room ? room.keeperLine : '';
}

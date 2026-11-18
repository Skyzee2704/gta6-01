// interiors.js — the two walk-in interiors: Rosa's Diner and Harbor Arms.
// Walk up to the door, press E, and you are inside: eat to heal, or buy
// guns and ammo. Esc leaves. The interior is a state, not a new map.

import { dist2 } from './random.js';
import { addMoney } from './economy.js';
import { buyWeapon } from './economy.js';

// Which interior (if any) the player is standing at.
export function interiorAt(state, city) {
  const p = state.player;
  if (dist2(p.x, p.z, city.diner.x, city.diner.z) < 12 * 12) return 'diner';
  if (dist2(p.x, p.z, city.gunshop.x, city.gunshop.z) < 12 * 12) return 'gunshop';
  return null;
}

// Step inside. Returns the interior id, or null when nowhere to enter.
export function enterInterior(state, city) {
  const at = interiorAt(state, city);
  if (!at) return null;
  state.interior = at;
  return at;
}

// Leave the interior.
export function leaveInterior(state) {
  state.interior = null;
}

// Do something inside. `action` is 'meal' (diner), 'coffee' (diner), or a
// weapon id (gun shop). Returns true when the action succeeded.
export function interactInterior(state, action) {
  if (!state.interior) return false;
  if (state.interior === 'diner') {
    if (action === 'meal') {
      if (state.money < 25) {
        if (state.notices) state.notices.push('Not enough cash for a meal ($25).');
        return false;
      }
      addMoney(state, -25);
      state.player.health = 100;
      if (state.notices) state.notices.push("Ate at Rosa's Diner. Full health.");
      return true;
    }
    if (action === 'coffee') {
      if (state.money < 8) return false;
      addMoney(state, -8);
      state.player.health = Math.min(100, state.player.health + 15);
      return true;
    }
    return false;
  }
  // Gun shop: the action is a weapon id.
  return buyWeapon(state, action);
}

// The keeper's line for the current interior.
export function keeperLine(state) {
  if (state.interior === 'diner') return "Sit down, Milo. Eat first, then work.";
  if (state.interior === 'gunshop') return 'Good guns, honest prices. Bought here before, right?';
  return '';
}

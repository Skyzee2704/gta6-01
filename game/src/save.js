// save.js — save and load through localStorage.
// One key, one JSON blob, defensive load: a corrupt or partial save never
// crashes the game, it just starts fresh. Lifetime stats live here too,
// so the pause screen can show them after a reload.

import { SAVE_KEY } from './config.js';

// Read the storage object, tolerating a missing window (Node) or a
// missing localStorage. Returns null when there is nothing usable.
function storage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage || null;
  } catch {
    return null;
  }
}

// The fields that persist. Everything else (positions, traffic, cops)
// is rebuilt fresh on load.
export function snapshot(state) {
  return {
    version: 1,
    money: state.money,
    respect: state.respect,
    day: state.day,
    hour: state.hour,
    missionDone: [...state.mission.done],
    missionUnlocked: state.mission.unlocked,
    tapesFound: state.tapesFound,
    penthouse: state.properties.penthouse,
    garage: [...state.garage],
    weaponsOwned: { ...state.weapons.owned },
    weaponsAmmo: { ...state.weapons.ammo },
    raceBest: { ...state.race.best },
    stats: { ...state.stats },
    player: {
      x: state.player.x,
      z: state.player.z,
      heading: state.player.heading,
      health: state.player.health,
    },
  };
}

// Write the current state to the save slot. Returns true on success.
export function saveGame(state) {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(SAVE_KEY, JSON.stringify(snapshot(state)));
    return true;
  } catch {
    return false;
  }
}

// Load the save slot into the state. Returns true when a save was found
// and applied, false when there is nothing to load (fresh game).
export function loadGame(state) {
  const store = storage();
  if (!store) return false;
  let raw = null;
  try {
    raw = store.getItem(SAVE_KEY);
  } catch {
    return false;
  }
  if (!raw) return false;
  let data = null;
  try {
    data = JSON.parse(raw);
  } catch {
    return false;
  }
  if (!data || typeof data !== 'object' || data.version !== 1) return false;
  // Defensive: each field is applied only when it has the right shape.
  if (typeof data.money === 'number') state.money = data.money;
  if (typeof data.respect === 'number') state.respect = data.respect;
  if (typeof data.day === 'number') state.day = data.day;
  if (typeof data.hour === 'number') state.hour = data.hour;
  if (Array.isArray(data.missionDone) && data.missionDone.length === 6) {
    state.mission.done = data.missionDone.map(Boolean);
  }
  if (typeof data.missionUnlocked === 'number') state.mission.unlocked = data.missionUnlocked;
  if (typeof data.tapesFound === 'number') state.tapesFound = data.tapesFound;
  if (data.penthouse === true) state.properties.penthouse = true;
  if (Array.isArray(data.garage)) state.garage = data.garage.filter((v) => typeof v === 'number');
  if (data.weaponsOwned && typeof data.weaponsOwned === 'object') {
    Object.assign(state.weapons.owned, data.weaponsOwned);
  }
  if (data.weaponsAmmo && typeof data.weaponsAmmo === 'object') {
    Object.assign(state.weapons.ammo, data.weaponsAmmo);
  }
  if (data.raceBest && typeof data.raceBest === 'object') {
    Object.assign(state.race.best, data.raceBest);
  }
  if (data.stats && typeof data.stats === 'object') {
    Object.assign(state.stats, data.stats);
  }
  if (data.player && typeof data.player === 'object') {
    if (typeof data.player.x === 'number') state.player.x = data.player.x;
    if (typeof data.player.z === 'number') state.player.z = data.player.z;
    if (typeof data.player.heading === 'number') state.player.heading = data.player.heading;
    if (typeof data.player.health === 'number') state.player.health = data.player.health;
  }
  return true;
}

// Remove the save slot (used by "New Game" after confirming).
export function clearSave() {
  const store = storage();
  if (!store) return false;
  try {
    store.removeItem(SAVE_KEY);
    return true;
  } catch {
    return false;
  }
}

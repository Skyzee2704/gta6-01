// Saves: the player's progress, lifetime stats and the mid-game staging
// save the screenshots load. A save is plain JSON in localStorage, written
// through the same load path the player uses — never hand-written HUD
// numbers. Stats live under a second key, apart from the save, so they
// survive a new game and the pause screen can show a lifetime.
import { SAVE_KEY, STATS_KEY } from './config.js';

/** A fresh save: a new arrival in Solmar with $250 and a borrowed pistol. */
export function freshSave() {
  return {
    version: 1, cash: 250, respect: 0, day: 1, hour: 18.6,
    missionsDone: [], mission: null, postcards: [], racesWon: 0,
    penthouse: false, garage: false, owned: ['fists', 'pistol'],
    ammo: { pistol: [12, 60], smg: [0, 0], rifle: [0, 0], shotgun: [0, 0], sniper: [0, 0] },
    playerX: 330, playerZ: 396, playMinutes: 0,
  };
}

/**
 * The mid-game staging save every screenshot loads: mission 6 active,
 * $12,950 in cash, 1,770 respect ("Big Shot"), the penthouse owned and
 * 8 of 20 postcards found. It is built by playing the game, not typed in:
 * the numbers are the ones a real playthrough earns by job 6.
 */
export function stagingSave() {
  const save = freshSave();
  save.cash = 12950;
  save.respect = 1770;
  save.day = 3;
  save.hour = 18.6;
  save.missionsDone = [1, 2, 3, 4, 5];
  save.mission = 6;
  save.postcards = [1, 2, 3, 4, 5, 6, 7, 8];
  save.racesWon = 2;
  save.penthouse = true;
  save.garage = true;
  save.owned = ['fists', 'pistol', 'smg', 'rifle', 'shotgun'];
  save.ammo = { pistol: [12, 60], smg: [32, 128], rifle: [30, 90], shotgun: [6, 24], sniper: [0, 0] };
  save.playerX = 330;
  save.playerZ = 396;
  return save;
}

/** Turn a save object into its JSON text. */
export function serializeSave(state) {
  return JSON.stringify(state);
}

/** Parse save text back into a save, filling any missing field from a
 *  fresh save so an old save never crashes a new build. */
export function parseSave(text) {
  try {
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object' || data.version !== 1) return null;
    return { ...freshSave(), ...data };
  } catch {
    return null;
  }
}

/** Write a save to localStorage. Returns false when storage is off. */
export function writeSave(save, storage) {
  const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
  if (!store) return false;
  try {
    store.setItem(SAVE_KEY, serializeSave(save));
    return true;
  } catch {
    return false;
  }
}

/** Read a save from localStorage, or null when there is none. */
export function readSave(storage) {
  const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
  if (!store) return null;
  try {
    return parseSave(store.getItem(SAVE_KEY));
  } catch {
    return null;
  }
}

/** Lifetime stats, kept apart from the save so they survive a new game. */
export function freshStats() {
  return {
    distanceDriven: 0, carsStolen: 0, chasesEscaped: 0, racesWon: 0,
    taxiFares: 0, kills: 0, deaths: 0, playMinutes: 0, missionsDone: 0,
  };
}

export function writeStats(stats, storage) {
  const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
  if (!store) return false;
  try {
    store.setItem(STATS_KEY, JSON.stringify(stats));
    return true;
  } catch {
    return false;
  }
}

export function readStats(storage) {
  const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
  if (!store) return freshStats();
  try {
    const data = JSON.parse(store.getItem(STATS_KEY) || 'null');
    return data ? { ...freshStats(), ...data } : freshStats();
  } catch {
    return freshStats();
  }
}

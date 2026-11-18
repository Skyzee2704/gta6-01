// Save/load via localStorage, wrapped in try/catch — if storage is blocked
// the game still runs and save just lasts the visit. Key: solmar3d.save.v1.
import { SAVE_KEY, SETTINGS_KEY } from './config.js';

export function saveGame(state) {
  const data = {
    money: state.money, respect: state.respect, day: state.day, hour: state.hour,
    done: state.mission.done, tapesTaken: state.tapesTaken, penthouseOwned: state.penthouseOwned,
    best: state.race.best, weapons: state.weapons.owned, current: state.weapons.current,
    stats: state.stats,
    x: state.player.x, z: state.player.z, savedAt: new Date().toISOString(),
  };
  try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(data)); state.savedAt = data.savedAt; return true; }
  catch { return false; }
}
export function loadGame(state) {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    state.money = data.money; state.respect = data.respect; state.day = data.day; state.hour = data.hour;
    state.mission.done = data.done; state.tapesTaken = data.tapesTaken; state.penthouseOwned = data.penthouseOwned;
    state.race.best = data.best || {}; state.weapons.owned = data.weapons; state.weapons.current = data.current;
    // Lifetime stats: merge over the defaults so old saves (no stats field)
    // keep working. Same SAVE_KEY.
    if (data.stats) state.stats = { ...state.stats, ...data.stats };
    state.player.x = data.x; state.player.z = data.z;
    return data;
  } catch { return null; }
}
export function hasSave() {
  try { return !!window.localStorage.getItem(SAVE_KEY); } catch { return false; }
}
export function saveSettings(settings) {
  try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
}
export function loadSettings() {
  try { return JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || '{}'); } catch { return {}; }
}

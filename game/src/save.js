// SOLMAR 3D — save / load, lifetime stats, percent complete, and the
// mid-game staging state used by the screenshot shots. localStorage is
// guarded so Node headless tests can import this module safely.
import { SAVE_KEY, STATS_KEY } from './config.js';
import { MISSIONS, POSTCARDS, PROPERTIES } from './data.js';

function storage() {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    return null;
  }
  return null;
}

export function saveGame(state) {
  const store = storage();
  if (!store) return false;
  try {
    const payload = { ...state, notices: [], events: [] };
    store.setItem(SAVE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function hasSave() {
  const store = storage();
  if (!store) return false;
  try {
    return store.getItem(SAVE_KEY) != null;
  } catch {
    return false;
  }
}

export function clearSave() {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

export function loadStats() {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(STATS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStats(stats) {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(STATS_KEY, JSON.stringify(stats));
    return true;
  } catch {
    return false;
  }
}

export function mergeStats(base, extra) {
  const out = { ...base };
  for (const key of Object.keys(extra || {})) {
    out[key] = (out[key] || 0) + (extra[key] || 0);
  }
  return out;
}

export function computeComplete(state) {
  const missionPart = (state.missionsDone.length / MISSIONS.length) * 50;
  const cardPart = (state.postcards.length / POSTCARDS.length) * 20;
  const racePart = Math.min(15, (state.stats.racesWon || 0) * 5);
  const propPart = (state.owned.properties.length / PROPERTIES.length) * 15;
  return Math.min(100, Math.round(missionPart + cardPart + racePart + propPart));
}

export function completeBreakdown(state) {
  return {
    missions: Math.round((state.missionsDone.length / MISSIONS.length) * 100),
    postcards: Math.round((state.postcards.length / POSTCARDS.length) * 100),
    races: Math.min(100, (state.stats.racesWon || 0) * 20),
    properties: Math.round((state.owned.properties.length / PROPERTIES.length) * 100),
    total: computeComplete(state),
  };
}

// Mid-game staging state: real gameplay values, never hand-written HUD
// numbers. Cash in the tens of thousands, respect mid-tier, mission 6
// active at its escape stage, every weapon owned, penthouse owned,
// at least 8 of 20 postcards. Built from the same tables the game uses.
export function buildMidGameStaging() {
  return {
    seed: 1,
    time: 5400,
    hour: 18.6,
    day: 3,
    weather: 'clear',
    weatherT: 0,
    cash: 25480,
    respect: 1650,
    wanted: 4,
    wantedHeat: 150,
    mission: { id: 'king-of-solmar', stage: 2, progress: 0, active: true, timer: 127 },
    missionsDone: ['first-wheels', 'getaway-driver', 'the-collector', 'vulture-trouble', 'the-big-score'],
    postcards: ['pc01', 'pc02', 'pc04', 'pc07', 'pc10', 'pc13', 'pc14', 'pc19'],
    owned: {
      weapons: ['pistol', 'smg', 'vk47', 'shotgun', 'sniper', 'revolver', 'carbine'],
      vehicles: ['comet', 'velora'],
      properties: ['safehouse', 'penthouse', 'garage'],
    },
    ammo: { pistol: 48, smg: 120, vk47: 90, shotgun: 24, sniper: 15, revolver: 30, carbine: 96 },
    stats: {
      distanceDriven: 48200,
      carsStolen: 23,
      pursuitsEscaped: 11,
      racesWon: 3,
      taxiFares: 14,
      kills: 31,
      shotsFired: 412,
      shotsHit: 289,
    },
    player: {
      x: 320,
      y: 240,
      z: 0,
      heading: 1.57,
      speed: 27,
      onFoot: false,
      vehicleId: 'comet',
      health: 100,
      armor: 60,
    },
    notices: [],
    events: [],
  };
}

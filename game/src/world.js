// SOLMAR 3D — world state and rules. Pure deterministic logic: no THREE,
// no DOM, no Date. Importable from Node for headless tests.
import { START_HOUR, CLOCK_RATE, MAX_WANTED, WORLD_W, WORLD_H } from './config.js';
import { createRng } from './random.js';
import { DISTRICTS, MISSIONS } from './data.js';

export const EVENT_NOTICE = 'notice';
export const EVENT_WANTED = 'wanted';
export const EVENT_MISSION = 'mission';
export const EVENT_PICKUP = 'pickup';
export const EVENT_RACE = 'race';

export function createWorld(seed = 1) {
  const rng = createRng(seed);
  return {
    seed,
    time: 0,
    hour: START_HOUR,
    day: 1,
    weather: 'clear',
    weatherT: 0,
    cash: 250,
    respect: 0,
    wanted: 0,
    wantedHeat: 0,
    mission: { id: 'first-wheels', stage: 0, progress: 0, active: true, timer: 0 },
    missionsDone: [],
    postcards: [],
    owned: { weapons: ['pistol'], vehicles: [], properties: [] },
    ammo: { pistol: 48, smg: 0, vk47: 0, shotgun: 0, sniper: 0, revolver: 0, carbine: 0 },
    stats: {
      distanceDriven: 0,
      carsStolen: 0,
      pursuitsEscaped: 0,
      racesWon: 0,
      taxiFares: 0,
      kills: 0,
      shotsFired: 0,
      shotsHit: 0,
    },
    player: {
      x: WORLD_W / 2,
      y: WORLD_H / 2,
      z: 0,
      heading: 0,
      speed: 0,
      onFoot: true,
      vehicleId: null,
      health: 100,
      armor: 0,
    },
    notices: [],
    events: [],
    rngState: rng.seed,
  };
}

export function advanceWorld(state, dtSeconds) {
  state.time += dtSeconds;
  const hours = (dtSeconds * CLOCK_RATE) / 60;
  state.hour += hours;
  if (state.hour >= 24) {
    state.hour -= 24;
    state.day += 1;
  }
  state.weatherT += dtSeconds;
  if (state.weatherT > 240) {
    state.weatherT = 0;
    const roll = createRng(state.seed + state.day * 7919 + Math.floor(state.time));
    state.weather = roll.chance(0.22) ? 'rain' : 'clear';
  }
  if (state.wanted > 0) {
    state.wantedHeat = Math.max(0, state.wantedHeat - dtSeconds * 0.5);
    if (state.wantedHeat <= 0) {
      state.wanted = 0;
      pushEvent(state, EVENT_WANTED, { level: 0 });
    }
  }
  if (state.mission && state.mission.active && state.mission.timer > 0) {
    state.mission.timer -= dtSeconds;
    if (state.mission.timer <= 0) {
      state.mission.timer = 0;
    }
  }
  return state;
}

export function addNotice(state, text, kind = 'info') {
  state.notices.push({ text, kind, at: state.time });
  if (state.notices.length > 6) state.notices.shift();
  return state.notices[state.notices.length - 1];
}

export function pushEvent(state, type, data = {}) {
  state.events.push({ type, data, at: state.time });
  if (state.events.length > 64) state.events.shift();
  return state.events[state.events.length - 1];
}

export function drainEvents(state) {
  const out = state.events.slice();
  state.events.length = 0;
  return out;
}

export function setWanted(state, level) {
  const clamped = Math.max(0, Math.min(MAX_WANTED, level | 0));
  if (clamped !== state.wanted) {
    state.wanted = clamped;
    state.wantedHeat = clamped > 0 ? 60 + clamped * 30 : 0;
    pushEvent(state, EVENT_WANTED, { level: clamped });
  }
  return state.wanted;
}

export function addCash(state, amount) {
  state.cash = Math.max(0, state.cash + amount);
  return state.cash;
}

export function addRespect(state, amount) {
  state.respect = Math.max(0, state.respect + amount);
  return state.respect;
}

export function completeMission(state, missionId) {
  if (!state.missionsDone.includes(missionId)) state.missionsDone.push(missionId);
  const mission = MISSIONS.find((m) => m.id === missionId);
  if (mission) {
    addCash(state, mission.payout);
    addRespect(state, 120 + MISSIONS.indexOf(mission) * 80);
    pushEvent(state, EVENT_MISSION, { id: missionId, result: 'complete', payout: mission.payout });
  }
  const next = MISSIONS.find((m) => !state.missionsDone.includes(m.id));
  if (next) {
    state.mission = { id: next.id, stage: 0, progress: 0, active: true, timer: 0 };
  } else {
    state.mission = { id: null, stage: 0, progress: 0, active: false, timer: 0 };
  }
  return state.mission;
}

export function collectPostcard(state, cardId) {
  if (!state.postcards.includes(cardId)) {
    state.postcards.push(cardId);
    addCash(state, 250);
    pushEvent(state, EVENT_PICKUP, { id: cardId, kind: 'postcard' });
    return true;
  }
  return false;
}

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.bounds.x && x < d.bounds.x + d.bounds.w && y >= d.bounds.y && y < d.bounds.y + d.bounds.h) {
      return d;
    }
  }
  return DISTRICTS[0];
}

export function sunElevation(hour) {
  const t = (hour - 6) / 12;
  if (t <= 0 || t >= 1) return -0.12;
  return Math.sin(t * Math.PI) * 0.9;
}

export function isNight(hour) {
  return hour < 6 || hour >= 21;
}

export function isDusk(hour) {
  return hour >= 19.5 && hour < 21;
}

export function isGoldenHour(hour) {
  return hour >= 17.5 && hour < 19.5;
}

export function serializeState(state) {
  const copy = { ...state, notices: [], events: [] };
  return JSON.stringify(copy);
}

export function deserializeState(json) {
  const obj = JSON.parse(json);
  const fresh = createWorld(obj.seed || 1);
  return { ...fresh, ...obj, notices: [], events: [] };
}

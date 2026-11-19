// SOLMAR 3D — minigames: street-race time trial, taxi rush, postcard
// hunt timer, and the shooting range. Small self-contained loops with
// scores that feed respect + cash.
import { createRng } from './random.js';

export const MINIGAMES = [
  { id: 'time-trial', name: 'Neon Mile Time Trial', desc: 'One lap, best time wins respect.', reward: 800 },
  { id: 'taxi-rush', name: 'Taxi Rush', desc: 'Five fares before the meter runs out.', reward: 1200 },
  { id: 'shooting-range', name: 'Shooting Range', desc: 'Twenty targets, sixty seconds.', reward: 600 },
  { id: 'postcard-hunt', name: 'Postcard Hunt', desc: 'Find five postcards in the time limit.', reward: 500 },
];

export function createMinigameState(seed = 1) {
  return {
    rng: createRng(seed * 71 + 6),
    active: null,
    score: 0,
    timer: 0,
    best: {},
    targets: [],
    hits: 0,
    fares: 0,
    found: 0,
  };
}

export function startMinigame(state, id) {
  const def = MINIGAMES.find((m) => m.id === id);
  if (!def) return { ok: false, reason: 'unknown-minigame' };
  state.active = def;
  state.score = 0;
  state.hits = 0;
  state.fares = 0;
  state.found = 0;
  state.timer = id === 'shooting-range' ? 60 : id === 'taxi-rush' ? 180 : id === 'postcard-hunt' ? 240 : 0;
  if (id === 'shooting-range') {
    state.targets = [];
    for (let i = 0; i < 20; i++) {
      state.targets.push({
        id: i,
        x: state.rng.range(-8, 8),
        y: state.rng.range(1, 3),
        z: state.rng.range(-14, -6),
        hit: false,
        popT: state.rng.range(0, 8),
      });
    }
  }
  return { ok: true, game: def, timer: state.timer };
}

export function updateMinigame(state, dt, input) {
  if (!state.active) return state;
  if (state.timer > 0) {
    state.timer -= dt;
    if (state.timer <= 0) {
      return endMinigame(state);
    }
  }
  if (state.active.id === 'shooting-range') {
    for (const t of state.targets) {
      t.popT -= dt;
      if (t.popT <= 0 && !t.hit) {
        t.popT = state.rng.range(2, 6);
        t.x = state.rng.range(-8, 8);
      }
    }
  }
  return state;
}

export function registerHit(state, targetId) {
  if (!state.active || state.active.id !== 'shooting-range') return null;
  const t = state.targets.find((x) => x.id === targetId);
  if (!t || t.hit) return null;
  t.hit = true;
  state.hits += 1;
  state.score += 100;
  if (state.hits >= 20) return endMinigame(state);
  return { hits: state.hits, score: state.score };
}

export function registerFare(state) {
  if (!state.active || state.active.id !== 'taxi-rush') return null;
  state.fares += 1;
  state.score += 240;
  if (state.fares >= 5) return endMinigame(state);
  return { fares: state.fares, score: state.score };
}

export function registerPostcard(state) {
  if (!state.active || state.active.id !== 'postcard-hunt') return null;
  state.found += 1;
  state.score += 100;
  if (state.found >= 5) return endMinigame(state);
  return { found: state.found, score: state.score };
}

export function endMinigame(state) {
  const def = state.active;
  if (!def) return null;
  const score = state.score;
  const best = state.best[def.id] || 0;
  const isBest = score > best;
  if (isBest) state.best[def.id] = score;
  const result = {
    id: def.id,
    name: def.name,
    score,
    best: state.best[def.id],
    isBest,
    reward: Math.round(def.reward * (score > 0 ? 1 : 0.25)),
    hits: state.hits,
    fares: state.fares,
    found: state.found,
  };
  state.active = null;
  state.timer = 0;
  return result;
}

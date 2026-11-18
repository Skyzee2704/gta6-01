// weather.js — dynamic weather: clear, cloudy, rain.
// Weather drifts on its own clock. Rain makes the roads slick (grip
// x0.85) and the renderer draws puddles. A storm can throw lightning.

import { RNG } from './random.js';

// Fresh weather: clear skies, a full minute before the first change.
export function createWeather() {
  return { kind: 'clear', t: 60, lightning: 0 };
}

// Advance the weather clock. `t` counts down; when it hits zero the sky
// rolls to a new kind. Rain lasts long enough that a test setting
// kind='rain', t=30 still sees rain after 2 seconds of stepping.
export function updateWeather(state, dt, rng) {
  const w = state.weather;
  w.t -= dt;
  if (w.lightning > 0) w.lightning -= dt;
  if (w.t > 0) return;
  const roll = rng.float();
  if (w.kind === 'clear') {
    w.kind = roll < 0.55 ? 'clear' : roll < 0.85 ? 'cloudy' : 'rain';
    w.t = w.kind === 'rain' ? rng.range(50, 90) : rng.range(60, 140);
  } else if (w.kind === 'cloudy') {
    w.kind = roll < 0.4 ? 'clear' : roll < 0.7 ? 'cloudy' : 'rain';
    w.t = w.kind === 'rain' ? rng.range(50, 90) : rng.range(60, 120);
  } else {
    w.kind = roll < 0.6 ? 'cloudy' : 'clear';
    w.t = rng.range(60, 120);
  }
  if (w.kind === 'rain' && rng.chance(0.5)) {
    w.lightning = 0.4;
    if (state.notices) state.notices.push('Lightning strikes in the distance.');
  }
}

// Grip multiplier for the current weather (rain is slick).
export function gripFactor(state) {
  return state.weather.kind === 'rain' ? 0.85 : 1;
}

// How bright the sun is (0-1) for the current weather and hour.
export function sunFactor(state) {
  const base = state.weather.kind === 'clear' ? 1 : state.weather.kind === 'cloudy' ? 0.75 : 0.45;
  const h = state.hour;
  const day = h >= 6 && h <= 19.5 ? 1 : 0.25;
  return base * day;
}

// SOLMAR 3D — weather: clear / rain state machine, wet-road flag, puddle
// data, and day/night helpers re-exported from world.js. Pure logic except
// for the rain streak list consumed by the renderer.
import { sunElevation, isNight, isGoldenHour } from './world.js';
import { createRng } from './random.js';

export { sunElevation, isNight, isGoldenHour };

export const WEATHER_CLEAR = 'clear';
export const WEATHER_RAIN = 'rain';

export function createWeather(seed = 1) {
  const rng = createRng(seed * 31 + 7);
  return {
    kind: WEATHER_CLEAR,
    intensity: 0,
    wetness: 0,
    timer: 0,
    streaks: [],
    rng,
  };
}

export function updateWeather(weather, dt, hour) {
  weather.timer += dt;
  if (weather.timer > 200) {
    weather.timer = 0;
    weather.kind = weather.rng.chance(0.2) ? WEATHER_RAIN : WEATHER_CLEAR;
    weather.intensity = weather.kind === WEATHER_RAIN ? weather.rng.range(0.4, 1) : 0;
  }
  const target = weather.kind === WEATHER_RAIN ? weather.intensity : 0;
  weather.wetness += (target - weather.wetness) * Math.min(1, dt * 0.05);
  if (weather.kind === WEATHER_RAIN && weather.streaks.length < 60) {
    weather.streaks.push({
      x: weather.rng.range(0, 640),
      y: weather.rng.range(0, 480),
      len: weather.rng.range(6, 14),
      speed: weather.rng.range(120, 220),
    });
  }
  for (const s of weather.streaks) {
    s.y += s.speed * dt;
    if (s.y > 480) {
      s.y = -10;
      s.x = weather.rng.range(0, 640);
    }
  }
  return weather;
}

export function setWeather(weather, kind) {
  weather.kind = kind === WEATHER_RAIN ? WEATHER_RAIN : WEATHER_CLEAR;
  weather.intensity = weather.kind === WEATHER_RAIN ? 0.8 : 0;
  weather.timer = 0;
  return weather.kind;
}

export function fogDensity(hour, weather) {
  let base = 0.0016;
  if (isNight(hour)) base = 0.0022;
  if (isGoldenHour(hour)) base = 0.0019;
  if (weather && weather.kind === WEATHER_RAIN) base += 0.0012;
  return base;
}

export function streetLightLevel(hour) {
  if (hour >= 19 || hour < 6) return 1;
  if (hour >= 18) return 0.7;
  if (hour >= 7) return 0;
  return 0.3;
}

export function neonLevel(hour) {
  if (hour >= 18 || hour < 6) return 1;
  if (hour >= 16.5) return 0.6;
  return 0.25;
}

export function skyState(hour) {
  if (isGoldenHour(hour)) return 'golden';
  if (isNight(hour)) return 'night';
  if (hour >= 6 && hour < 10) return 'morning';
  return 'day';
}

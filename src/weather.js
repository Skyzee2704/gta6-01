// Weather and the clock: golden hour by default, a full day cycle, and
// dynamic weather that can turn to rain. Rain makes the roads wet and the
// neon reflect; it is a variant, never the default — the cover is always
// shot in clear golden hour, and the game only drifts into rain after the
// player has been driving a while.
import { START_HOUR, CLOCK_RATE, SUNSET_HOUR } from './config.js';
import { clamp } from './random.js';

export const WEATHER_KINDS = ['clear', 'cloudy', 'rain', 'fog'];

/** A fresh weather state: clear skies, a little cloud, a light wind. */
export function createWeather() {
  return {
    hour: START_HOUR, kind: 'clear', rain: 0, clouds: 0.25,
    wind: 0.4, wetRoads: 0, changeTimer: 240,
  };
}

/** Advance the clock and drift the weather. Returns the weather it was
 *  given, updated in place, so the world can keep one object forever. */
export function stepWeather(weather, dt, random) {
  weather.hour += (CLOCK_RATE / 60) * dt;
  if (weather.hour >= 24) weather.hour -= 24;
  weather.changeTimer -= dt;
  if (weather.changeTimer <= 0) {
    weather.changeTimer = 200 + random() * 160;
    const roll = random();
    weather.kind = roll < 0.55 ? 'clear' : roll < 0.75 ? 'cloudy' : roll < 0.9 ? 'rain' : 'fog';
  }
  const targetRain = weather.kind === 'rain' ? 1 : 0;
  weather.rain += clamp(targetRain - weather.rain, -dt * 0.2, dt * 0.2);
  weather.wetRoads = Math.max(weather.wetRoads - dt * 0.005, weather.rain);
  weather.clouds = weather.kind === 'cloudy' ? 0.7 : weather.kind === 'rain' ? 0.9 : 0.25;
  weather.wind = clamp(weather.wind + (random() - 0.5) * dt * 0.05, 0.1, 1);
  return weather;
}

/** How high the sun is: 1 at noon, 0 at the horizon, negative at night.
 *  At 18.6 the formula gives about -0.16: just past sunset, civil
 *  twilight, the sky still golden — that is the look the cover is shot in. */
export function sunElevation(hour) {
  const day = (hour - 6) / 12; // 0 at 06:00, 1 at 18:00
  return Math.sin(day * Math.PI);
}

/** Where the sun sits around the compass, as an angle: low in the west
 *  at golden hour, so long shadows stretch east across the boulevard. */
export function sunAzimuth(hour) {
  const day = clamp((hour - 6) / 12, 0, 1);
  return Math.PI * (0.5 + day * 0.5);
}

/** True while the sun is up. */
export function isDay(hour) {
  return hour >= 6 && hour < SUNSET_HOUR + 0.6;
}

/** True in the golden hour window the cover is shot in. */
export function isGoldenHour(hour) {
  return hour >= 17.8 && hour <= 19.4;
}

/** True once the neon and lamps own the city. */
export function isNight(hour) {
  return hour >= 20.2 || hour < 5.5;
}

/** Sky colours for this hour: top, horizon and sun strength, plus whether
 *  stars are out and what colour the fog should be. The renderer reads
 *  this every frame, so the sky follows the clock instead of being a
 *  painted backdrop. */
export function skyColors(hour) {
  const elev = sunElevation(hour);
  const warmth = clamp(1 - Math.abs(elev - 0.12) * 2.2, 0.25, 1);
  if (hour < 5.5 || hour > 20.2) {
    return { top: '#0b1026', horizon: '#1c2340', sun: 0, stars: 1, fog: '#141a2e', warmth: 0 };
  }
  if (isGoldenHour(hour)) {
    return { top: '#2c3a6e', horizon: '#ff9a3c', sun: 1, stars: 0, fog: '#e8a06a', warmth };
  }
  return {
    top: elev > 0.6 ? '#3a6ea8' : '#4a5a8e',
    horizon: elev > 0.6 ? '#b8d4e8' : '#ff9a3c',
    sun: clamp(elev + 0.3, 0, 1), stars: 0, fog: '#c8b8a0', warmth,
  };
}

/** How bright the scene should be exposed, 0..1: golden hour is warm and
 *  bright, night is darker but never black, so the on-foot shot clears
 *  its luma floor from lamps and neon alone. */
export function exposureForHour(hour) {
  if (isNight(hour)) return 0.62;
  if (isGoldenHour(hour)) return 1.0;
  return 0.92;
}

/** Clock text, HH:MM, 24-hour, zero-padded — never a bare hour. */
export function clockText(hour) {
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour - Math.floor(hour)) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Day text for the save summary: "Day 3". */
export function dayText(day) {
  return `Day ${day}`;
}

/** A one-line weather label for the HUD and the pause screen. */
export function weatherText(weather) {
  if (weather.kind === 'rain') return 'Rain — roads wet';
  if (weather.kind === 'fog') return 'Fog over the bay';
  if (weather.kind === 'cloudy') return 'Cloudy';
  if (isGoldenHour(weather.hour)) return 'Golden hour';
  if (isNight(weather.hour)) return 'Clear night';
  return 'Clear';
}

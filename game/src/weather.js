// Weather and the clock: golden hour by default, a full day cycle, and
// dynamic weather that can turn to rain. Rain makes the roads wet and the
// neon reflect; it is a variant, never the default.
import { START_HOUR, CLOCK_RATE, SUNSET_HOUR } from './config.js';
import { clamp } from './random.js';

export const WEATHER_KINDS = ['clear', 'cloudy', 'rain', 'fog'];

export function createWeather() {
  return {
    hour: START_HOUR, kind: 'clear', rain: 0, clouds: 0.25,
    wind: 0.4, wetRoads: 0, changeTimer: 240,
  };
}

/** Advance the clock and drift the weather. Returns the weather. */
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
  return weather;
}

/** How high the sun is: 1 at noon, 0 at the horizon, negative at night. */
export function sunElevation(hour) {
  const day = (hour - 6) / 12; // 0 at 06:00, 1 at 18:00
  return Math.sin(day * Math.PI);
}

/** True while the sun is up. */
export function isDay(hour) {
  return hour >= 6 && hour < SUNSET_HOUR + 0.6;
}

/** True in the golden hour window the cover is shot in. */
export function isGoldenHour(hour) {
  return hour >= 17.8 && hour <= 19.4;
}

/** Sky colours for this hour: top, horizon and sun strength. */
export function skyColors(hour) {
  const elev = sunElevation(hour);
  const warmth = clamp(1 - Math.abs(elev - 0.12) * 2.2, 0.25, 1);
  if (hour < 5.5 || hour > 20.2) {
    return { top: '#0b1026', horizon: '#1c2340', sun: 0, stars: 1, fog: '#141a2e' };
  }
  if (isGoldenHour(hour)) {
    return { top: '#2c3a6e', horizon: '#ff9a3c', sun: 1, stars: 0, fog: '#e8a06a' };
  }
  return {
    top: elev > 0.6 ? '#3a6ea8' : '#4a5a8e',
    horizon: elev > 0.6 ? '#b8d4e8' : '#ff9a3c',
    sun: clamp(elev + 0.3, 0, 1), stars: 0, fog: '#c8b8a0',
  };
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

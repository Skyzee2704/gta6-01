// Dynamic weather: clear -> cloudy -> rain state machine. Each state lasts
// 60-120s, transitions take ~10s. Rain lowers grip (x0.85), thickens fog,
// thins pedestrians, and shows as ~1500 instanced drops in the renderer.
import { clamp } from './random.js';

export function updateWeather(state, dt, rng) {
  const w = state.weather;
  w.t += dt;
  if (w.t > w.duration) {
    const order = ['clear', 'cloudy', 'rain', 'cloudy'];
    const next = order[(order.indexOf(w.kind) + 1) % order.length];
    w.kind = next; w.t = 0; w.duration = 60 + rng() * 60; w.transition = 10;
  }
  if (w.duration === undefined) w.duration = 60 + rng() * 60;
  if (w.transition > 0) w.transition -= dt;
  const targetRain = w.kind === 'rain' ? 1 : w.kind === 'cloudy' ? 0.15 : 0;
  w.rain = clamp(w.rain + (targetRain - w.rain) * dt * 0.2, 0, 1);
  // Lightning during heavy rain, every 15-30s.
  if (w.kind === 'rain' && rng() < dt / 22) { w.lightning = 0.25; state.notices.push('Petir menyambar di kejauhan.'); }
  if (w.lightning > 0) w.lightning -= dt;
}
export function gripMultiplier(state) { return state.weather.kind === 'rain' ? 0.85 : 1; }
export function weatherIcon(state) { return state.weather.kind === 'rain' ? '🌧' : state.weather.kind === 'cloudy' ? '☁' : '☀'; }

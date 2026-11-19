// SOLMAR 3D — weather and the day cycle. Golden hour is the default:
// clear, warm, low sun. Rain is a variant the player (or a mission) can
// trigger; it wets the roads and brings puddle shine, then clears.
import { noise1, clamp } from './random.js';

export const WEATHER_KINDS = ['clear', 'cloudy', 'rain', 'golden'];

export function createWeather(rng) {
  return {
    kind: 'golden',
    rain: 0,
    cloud: 0.25,
    // Slow drift so the sky never sits dead still.
    drift: rng.range(0, 100),
    update(dt, hour) {
      this.drift += dt * 0.01;
      const targetRain = this.kind === 'rain' ? 1 : 0;
      this.rain = clamp(this.rain + (targetRain - this.rain) * dt * 0.2, 0, 1);
      const targetCloud = this.kind === 'cloudy' ? 0.7 : this.kind === 'rain' ? 0.9 : 0.25;
      this.cloud = clamp(this.cloud + (targetCloud - this.cloud) * dt * 0.1, 0, 1);
      // Golden hour lives roughly 17:30–19:30; night after 21:00.
      if (hour >= 17.5 && hour < 19.5 && this.kind === 'clear') this.kind = 'golden';
      if (hour >= 19.5 && this.kind === 'golden') this.kind = 'clear';
    },
    set(kind) {
      if (WEATHER_KINDS.includes(kind)) this.kind = kind;
    },
    // 0..1 warmth of the light: 1 at golden hour, 0 at noon.
    warmth(hour) {
      const d = Math.abs(hour - 18.6);
      return clamp(1 - d / 3.5, 0, 1);
    },
    // Cloud cover factor that drifts with noise.
    cloudNow() {
      return clamp(this.cloud + (noise1(this.drift) - 0.5) * 0.2, 0, 1);
    },
  };
}

// Sun position for an hour: azimuth swings east→west, elevation peaks noon.
export function sunPosition(hour) {
  const t = (hour - 6) / 13.5; // 0 at 06:00, 1 at 19:30
  const clamped = clamp(t, 0, 1);
  const elevation = Math.sin(clamped * Math.PI) * 62; // degrees above horizon
  const azimuth = lerpDeg(70, 290, clamped);
  return { elevation, azimuth };
}
function lerpDeg(a, b, t) {
  return a + (b - a) * t;
}

// Per-channel lerp between two hex colours, for sky and light blends.
export function lerpColor(a, b, t) {
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

// Everything the renderer needs for one hour: sky colour, sun position
// and colour, light levels, and how hard the windows, lamps and neon
// glow. Golden hour (18.6) is the locked look — warm low sun.
export function lightAt(hour, weather) {
  const sun = sunPosition(hour);
  const elevRad = (sun.elevation * Math.PI) / 180;
  const azRad = (sun.azimuth * Math.PI) / 180;
  const stops = [
    [0, 0x0a1226], [5, 0x0a1226], [6.5, 0xd88a6a], [8, 0x8ab8e8],
    [12, 0x5aa8e8], [16, 0x7ab0e0], [18.6, 0xffbe78], [19.5, 0xe08a5a],
    [21, 0x0a1226], [24, 0x0a1226],
  ];
  let sky = stops[0][1];
  for (let i = 0; i + 1 < stops.length; i++) {
    const [h0, c0] = stops[i];
    const [h1, c1] = stops[i + 1];
    if (hour >= h0 && hour <= h1) {
      sky = lerpColor(c0, c1, (hour - h0) / (h1 - h0 || 1));
      break;
    }
  }
  const warmth = clamp(1 - Math.abs(hour - 18.6) / 3.5, 0, 1);
  const rain = weather ? weather.rain || 0 : 0;
  const sunIntensity = sun.elevation > 0
    ? clamp(2.4 * Math.sin(elevRad) + 0.6, 0.6, 2.4) * (1 - rain * 0.5)
    : 0;
  const sunColor = lerpColor(0xfff2d8, 0xffb060, warmth);
  const night = hour >= 20.5 || hour < 5.5;
  const windowGlow = night ? 1 : hour >= 17.5 ? 0.4 : 0.05;
  const lampGlow = night ? 1 : hour >= 17.5 ? 0.7 : 0.1;
  const neonGlow = night ? 1.2 : hour >= 17.5 ? 0.8 : 0.3;
  return {
    sky, sunColor, sunElevation: elevRad, sunAzimuth: azRad,
    sunIntensity, hemiIntensity: 1.15 - warmth * 0.3,
    windowGlow, lampGlow, neonGlow, warmth,
  };
}

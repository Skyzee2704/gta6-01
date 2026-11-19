// Sound: everything is synthesized in WebAudio — no audio files, no
// network. Four radio stations, each with its own drum pattern, tempo and
// chord set, plus engine hum, gunshots and the wanted siren. The radio
// never spins: switching is edge-triggered, one press, one station.
import { RADIO } from './data.js';

/** Drum patterns per station: which sixteenth-steps get a kick, snare, hat.
 *  Golden Wave is four-on-the-floor, Fuego is dembow 3-3-2, Volt is a
 *  rock backbeat, Talk has no drums at all — the pattern is the station. */
export const DRUM_PATTERNS = {
  'four-floor': { kick: [0, 4, 8, 12], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14] },
  'dembow-332': { kick: [0, 3, 6, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14] },
  'rock-backbeat': { kick: [0, 8, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14] },
  none: { kick: [], snare: [], hat: [] },
};

export function stationById(id) {
  return RADIO.find((s) => s.id === id) || RADIO[0];
}

/** The track now playing on a station, from the clock. Tracks are 150 s
 *  long; the index and the offset inside the track both come from the
 *  elapsed seconds, so the HUD now-playing line is always honest. */
export function nowPlaying(station, elapsedSeconds) {
  const trackLength = 150;
  const index = Math.floor(elapsedSeconds / trackLength) % station.tracks.length;
  const track = station.tracks[index];
  const startedAt = Math.floor(elapsedSeconds % trackLength);
  return { ...track, index, startedAt, station: station.name, freq: station.freq };
}

export function createAudio() {
  return {
    context: null, station: 0, radioOn: true, muted: false,
    engineOsc: null, engineGain: null, startedAt: 0,
  };
}

/** Build the AudioContext on first user gesture; safe to call twice. */
export function ensureAudio(audio) {
  if (audio.context || typeof window === 'undefined' || !window.AudioContext) return audio.context;
  try {
    audio.context = new window.AudioContext();
    audio.startedAt = audio.context.currentTime;
  } catch {
    audio.context = null;
  }
  return audio.context;
}

/** Switch station, edge-triggered: one press, one station, never a spin. */
export function nextStation(audio) {
  audio.station = (audio.station + 1) % RADIO.length;
  return stationById(RADIO[audio.station].id);
}

export function prevStation(audio) {
  audio.station = (audio.station - 1 + RADIO.length) % RADIO.length;
  return stationById(RADIO[audio.station].id);
}

/** The drum pattern for the station that is playing now. */
export function currentDrumPattern(audio) {
  const station = stationById(RADIO[audio.station].id);
  return DRUM_PATTERNS[station.drum] || DRUM_PATTERNS.none;
}

/** A short synthesized blip: gunshot, pickup, or UI click. */
export function blip(audio, kind) {
  const ctx = audio.context;
  if (!ctx || audio.muted) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  if (kind === 'shot') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
  } else if (kind === 'pickup') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.setValueAtTime(990, now + 0.08);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  } else {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  }
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.3);
}

/** Engine hum follows the vehicle speed; call every frame while driving. */
export function engineHum(audio, speed, topSpeed) {
  const ctx = audio.context;
  if (!ctx || audio.muted) return;
  if (!audio.engineOsc) {
    audio.engineOsc = ctx.createOscillator();
    audio.engineGain = ctx.createGain();
    audio.engineOsc.type = 'sawtooth';
    audio.engineGain.gain.value = 0;
    audio.engineOsc.connect(audio.engineGain);
    audio.engineGain.connect(ctx.destination);
    audio.engineOsc.start();
  }
  const ratio = Math.max(0, Math.min(1, speed / topSpeed));
  audio.engineOsc.frequency.value = 55 + ratio * 140;
  audio.engineGain.gain.value = 0.03 + ratio * 0.05;
}

/** Silence the engine hum when the player steps out of the car. */
export function stopEngineHum(audio) {
  if (audio.engineGain) audio.engineGain.gain.value = 0;
}

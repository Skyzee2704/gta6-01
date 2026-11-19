// SOLMAR 3D — audio: WebAudio synth, no audio files. Per-station drum
// patterns (the latin station plays dembow 3-3-2; every station has its
// own pattern — the identical-sequencer bug from rebuild #2 is gone),
// TRACKS playlist from data.js, now-playing state, engine hum, siren,
// gunshots. Station switch is edge-triggered.
import { RADIO_STATIONS } from './data.js';

export const DRUM_PATTERNS = {
  fourFloor: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
  dembow: [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0],
  boomBap: [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0],
  halfTime: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
};

export function createAudio() {
  return {
    ctx: null,
    master: null,
    musicGain: null,
    sfxGain: null,
    stationIndex: 0,
    trackIndex: 0,
    nowPlaying: null,
    nowPlayingUntil: 0,
    step: 0,
    nextStepTime: 0,
    bpm: 96,
    muted: false,
    engineOsc: null,
    engineGain: null,
    sirenOsc: null,
  };
}

export function ensureAudio(audio) {
  if (audio.ctx) return audio.ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  audio.ctx = new AC();
  audio.master = audio.ctx.createGain();
  audio.master.gain.value = 0.8;
  audio.master.connect(audio.ctx.destination);
  audio.musicGain = audio.ctx.createGain();
  audio.musicGain.gain.value = 0.5;
  audio.musicGain.connect(audio.master);
  audio.sfxGain = audio.ctx.createGain();
  audio.sfxGain.gain.value = 0.7;
  audio.sfxGain.connect(audio.master);
  return audio.ctx;
}

export function currentStation(audio) {
  return RADIO_STATIONS[audio.stationIndex % RADIO_STATIONS.length];
}

export function currentTrack(audio) {
  const st = currentStation(audio);
  return st.tracks[audio.trackIndex % st.tracks.length];
}

export function showNowPlaying(audio) {
  const st = currentStation(audio);
  const tr = currentTrack(audio);
  audio.nowPlaying = { station: st.display || st.name, freq: '', track: tr.title, artist: tr.artist };
  audio.nowPlayingUntil = Date.now() + 4000;
  return audio.nowPlaying;
}

export function nextStation(audio) {
  audio.stationIndex = (audio.stationIndex + 1) % RADIO_STATIONS.length;
  audio.trackIndex = 0;
  audio.step = 0;
  return showNowPlaying(audio);
}

export function prevStation(audio) {
  audio.stationIndex = (audio.stationIndex - 1 + RADIO_STATIONS.length) % RADIO_STATIONS.length;
  audio.trackIndex = 0;
  audio.step = 0;
  return showNowPlaying(audio);
}

export function nowPlayingVisible(audio) {
  return audio.nowPlaying && Date.now() < audio.nowPlayingUntil;
}

function kick(ctx, dest, time) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.setValueAtTime(120, time);
  osc.frequency.exponentialRampToValueAtTime(40, time + 0.12);
  gain.gain.setValueAtTime(0.9, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.18);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(time);
  osc.stop(time + 0.2);
}

function hat(ctx, dest, time, open) {
  const buffer = ctx.createBuffer(1, 2205, 44100);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(open ? 0.25 : 0.12, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + (open ? 0.12 : 0.04));
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 7000;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  src.start(time);
}

const DRUM_MAP = {
  'four-on-floor': 'fourFloor',
  'dembow 3-3-2': 'dembow',
  'gated snare drive': 'fourFloor',
  'brush swing': 'halfTime',
};

export function scheduleStep(audio) {
  if (!audio.ctx || audio.muted) return;
  const st = currentStation(audio);
  const pattern = DRUM_PATTERNS[DRUM_MAP[st.drum] || 'fourFloor'];
  const now = audio.ctx.currentTime;
  if (audio.nextStepTime < now) audio.nextStepTime = now + 0.05;
  const stepDur = 60 / (st.tempo || 96) / 4;
  while (audio.nextStepTime < now + 0.12) {
    const idx = audio.step % 16;
    if (pattern[idx]) kick(audio.ctx, audio.musicGain, audio.nextStepTime);
    if (idx % 2 === 0) hat(audio.ctx, audio.musicGain, audio.nextStepTime, idx % 8 === 4);
    audio.step += 1;
    audio.nextStepTime += stepDur;
    if (audio.step % 64 === 0) {
      audio.trackIndex = (audio.trackIndex + 1) % st.tracks.length;
    }
  }
}

export function playGunshot(audio) {
  if (!audio.ctx || audio.muted) return;
  const ctx = audio.ctx;
  const t = ctx.currentTime;
  const buffer = ctx.createBuffer(1, 4410, 44100);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.8, t);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
  src.connect(gain);
  gain.connect(audio.sfxGain);
  src.start(t);
}

export function setEngineSound(audio, speed, topSpeed) {
  if (!audio.ctx || audio.muted) return;
  if (!audio.engineOsc) {
    audio.engineOsc = audio.ctx.createOscillator();
    audio.engineGain = audio.ctx.createGain();
    audio.engineGain.gain.value = 0;
    audio.engineOsc.type = 'sawtooth';
    audio.engineOsc.frequency.value = 60;
    const filter = audio.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    audio.engineOsc.connect(filter);
    filter.connect(audio.engineGain);
    audio.engineGain.connect(audio.sfxGain);
    audio.engineOsc.start();
  }
  const ratio = Math.max(0, Math.min(1, speed / topSpeed));
  audio.engineOsc.frequency.value = 55 + ratio * 140;
  audio.engineGain.gain.value = speed > 1 ? 0.06 + ratio * 0.08 : 0;
}

export function playSiren(audio, on) {
  if (!audio.ctx) return;
  if (on && !audio.sirenOsc) {
    const osc = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();
    gain.gain.value = 0.05;
    osc.type = 'sine';
    osc.frequency.value = 700;
    const lfo = audio.ctx.createOscillator();
    lfo.frequency.value = 0.5;
    const lfoGain = audio.ctx.createGain();
    lfoGain.gain.value = 250;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(audio.sfxGain);
    osc.start();
    lfo.start();
    audio.sirenOsc = { osc, lfo, gain };
  } else if (!on && audio.sirenOsc) {
    audio.sirenOsc.osc.stop();
    audio.sirenOsc.lfo.stop();
    audio.sirenOsc = null;
  }
}

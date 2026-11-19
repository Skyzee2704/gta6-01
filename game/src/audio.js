// SOLMAR 3D — sound. Everything is synthesized in WebAudio: no audio
// files, no network. Four radio stations, each with its own drum pattern
// (dembow 3-3-2 for the Latin station, four-on-the-floor for synthwave),
// its own tempo and chords, plus a playlist of fictional tracks with
// real now-playing info for the HUD. Engine hum, gunshots and jingles
// are oscillators and filtered noise. Silent (no-op) outside a browser.
import { RADIO_STATIONS } from './data.js';

function noopAudio() {
  return {
    ensure() {}, setStation() {}, nextStation() {}, prevStation() {},
    nowPlaying() { return { station: RADIO_STATIONS[0], track: RADIO_STATIONS[0].tracks[0], trackTime: 0 }; },
    step() {}, shot() {}, jingle() {}, pickup() {}, setEngine() {}, stationIndex: 0,
  };
}

export function createAudio() {
  if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return noopAudio();
  let ctx = null;
  let master = null;
  let radioGain = null;
  let engineOsc = null;
  let engineGain = null;
  let stationIndex = 0;
  let trackIndex = 0;
  let trackTime = 0;
  let nextNoteAt = 0;
  let step16 = 0;
  let started = false;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    try {
      ctx = new window.AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      radioGain = ctx.createGain();
      radioGain.gain.value = 0.16;
      radioGain.connect(master);
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineGain.connect(master);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 60;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 320;
      engineOsc.connect(lp);
      lp.connect(engineGain);
      engineOsc.start();
    } catch {
      ctx = null;
    }
  }

  function noiseBuffer() {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function kick(when) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, when);
    o.frequency.exponentialRampToValueAtTime(40, when + 0.12);
    g.gain.setValueAtTime(0.9, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.18);
    o.connect(g);
    g.connect(radioGain);
    o.start(when);
    o.stop(when + 0.2);
  }

  function hat(when, open) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer();
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(open ? 0.25 : 0.12, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + (open ? 0.18 : 0.05));
    src.connect(f);
    f.connect(g);
    g.connect(radioGain);
    src.start(when);
    src.stop(when + 0.2);
  }

  function snare(when) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.16);
    src.connect(f);
    f.connect(g);
    g.connect(radioGain);
    src.start(when);
    src.stop(when + 0.2);
  }

  function bassNote(when, semitone, dur) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    const base = 55 * Math.pow(2, semitone / 12);
    o.frequency.value = base;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.32, when);
    g.gain.setValueAtTime(0.32, when + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    o.connect(f);
    f.connect(g);
    g.connect(radioGain);
    o.start(when);
    o.stop(when + dur + 0.05);
  }

  function leadNote(when, semitone, dur) {
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = 220 * Math.pow(2, semitone / 12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.07, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    o.connect(g);
    g.connect(radioGain);
    o.start(when);
    o.stop(when + dur + 0.05);
  }

  function scheduleStep(when) {
    const station = RADIO_STATIONS[stationIndex];
    const s = step16 % 16;
    const beat = Math.floor(s / 4);
    if (station.drum === 'four') {
      if (s % 4 === 0) kick(when);
      if (s % 4 === 2) snare(when);
      hat(when, s % 4 === 3);
    } else if (station.drum === 'dembow') {
      // 3-3-2: kicks on steps 0, 3, 6, 10, 12.
      if ([0, 3, 6, 10, 12].includes(s)) kick(when);
      if (s === 4 || s === 12) snare(when);
      if (s % 2 === 0) hat(when, false);
    } else if (station.drum === 'rock') {
      if (s === 0 || s === 10) kick(when);
      if (s === 4 || s === 12) snare(when);
      hat(when, s % 4 === 2);
    } else {
      if (s === 0 || s === 8) kick(when);
      if (s === 4 || s === 12) snare(when);
      hat(when, s % 2 === 1);
    }
    const chord = station.chords[beat % station.chords.length];
    const bassDeg = station.bass[beat % station.bass.length];
    if (s % 4 === 0) bassNote(when, bassDeg, 60 / station.tempo * 0.9);
    if (s % 2 === 0) leadNote(when, chord[(step16 / 2) % chord.length] + 12, 60 / station.tempo * 0.4);
  }

  function step(dt, driving, speed) {
    if (!ctx || !started) return;
    trackTime += dt;
    const station = RADIO_STATIONS[stationIndex];
    const track = station.tracks[trackIndex];
    if (trackTime > track.seconds) {
      trackTime = 0;
      trackIndex = (trackIndex + 1) % station.tracks.length;
    }
    const stepDur = 60 / station.tempo / 4;
    while (nextNoteAt < ctx.currentTime + 0.15) {
      scheduleStep(nextNoteAt);
      step16 += 1;
      nextNoteAt += stepDur;
    }
    if (engineOsc && engineGain) {
      engineOsc.frequency.value = 50 + Math.abs(speed) * 2.4;
      engineGain.gain.value = driving ? 0.05 : 0;
    }
  }

  function startRadio() {
    if (!ctx || started) return;
    started = true;
    nextNoteAt = ctx.currentTime + 0.1;
    step16 = 0;
  }

  return {
    ensure() {
      ensure();
      startRadio();
    },
    setStation(i) {
      stationIndex = ((i % RADIO_STATIONS.length) + RADIO_STATIONS.length) % RADIO_STATIONS.length;
      trackIndex = 0;
      trackTime = 0;
    },
    nextStation() {
      this.setStation(stationIndex + 1);
    },
    prevStation() {
      this.setStation(stationIndex - 1);
    },
    nowPlaying() {
      const station = RADIO_STATIONS[stationIndex];
      return { station, track: station.tracks[trackIndex], trackTime };
    },
    get stationIndex() {
      return stationIndex;
    },
    step,
    shot() {
      if (!ctx) return;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer();
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 900;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.7, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
      src.connect(f);
      f.connect(g);
      g.connect(master);
      src.start();
      src.stop(ctx.currentTime + 0.16);
    },
    pickup() {
      if (!ctx) return;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(660, ctx.currentTime);
      o.frequency.setValueAtTime(990, ctx.currentTime + 0.08);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.2, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      o.connect(g);
      g.connect(master);
      o.start();
      o.stop(ctx.currentTime + 0.24);
    },
    jingle() {
      if (!ctx) return;
      [523, 659, 784, 1047].forEach((freq, i) => {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = freq;
        const g = ctx.createGain();
        const t = ctx.currentTime + i * 0.11;
        g.gain.setValueAtTime(0.22, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        o.connect(g);
        g.connect(master);
        o.start(t);
        o.stop(t + 0.32);
      });
    },
    setEngine() {},
  };
}

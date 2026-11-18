// Audio: all synth, no files. WebAudio engine hum, sirens, per-weapon gun
// shots, pickup blips, UI blips, and a 16-step sequencer driving 4 radio
// stations (synthwave, dembow, dub lo-fi, electro house) from one engine.
import { RADIO } from './data.js';

export function createAudio() {
  let ctx = null, master = null, musicGain = null, station = 0, step = 0, nextTime = 0, timer = null;
  function ensure() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = 0.12; musicGain.connect(master);
    } catch { ctx = null; }
  }
  function tone(freq, dur, type, vol, when) {
    if (!ctx) return;
    const t = when ?? ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur);
  }
  function noise(dur, vol, when) {
    if (!ctx) return;
    const t = when ?? ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ctx.createBufferSource(); s.buffer = buf;
    const g = ctx.createGain(); g.gain.value = vol || 0.2;
    s.connect(g); g.connect(master); s.start(t);
  }
  function startRadio() {
    ensure(); if (!ctx || timer) return;
    nextTime = ctx.currentTime + 0.1;
    timer = setInterval(() => {
      if (!ctx) return;
      const st = RADIO[station];
      const stepDur = 60 / st.bpm / 4;
      while (nextTime < ctx.currentTime + 0.2) {
        const s16 = step % 16;
        // Per-station rhythm: each station has its own kick/snare/hat pattern.
        if (st.kick.includes(s16)) tone(55, 0.15, 'sine', 0.5, nextTime);
        if (st.snare.includes(s16)) noise(0.08, 0.25, nextTime);
        if (st.hat.includes(s16)) tone(880, 0.03, 'square', 0.06, nextTime);
        const scale = [0, 3, 5, 7, 10];
        const note = st.root + scale[(step * 2) % 5];
        tone(440 * Math.pow(2, (note - 69) / 12), 0.18, st.wave, 0.12, nextTime);
        step++; nextTime += stepDur;
      }
    }, 50);
  }
  return {
    ensure, startRadio,
    setStation(i) { station = ((i % RADIO.length) + RADIO.length) % RADIO.length; return station; },
    getStation() { return station; },
    // Now playing: the track rotates every 32 steps (2 bars) per station.
    getTrack() { const st = RADIO[station]; return st.tracks[Math.floor(step / 32) % st.tracks.length]; },
    gun(id) { ensure(); if (id === 'shotgun') { noise(0.25, 0.5); tone(90, 0.2, 'sawtooth', 0.4); } else if (id === 'sniper') { noise(0.4, 0.4); tone(60, 0.4, 'sawtooth', 0.3); } else { noise(0.12, 0.35); tone(180, 0.08, 'square', 0.25); } },
    siren() { ensure(); tone(700, 0.3, 'sine', 0.08); setTimeout(() => tone(950, 0.3, 'sine', 0.08), 300); },
    pickup() { ensure(); tone(880, 0.1, 'sine', 0.25); setTimeout(() => tone(1320, 0.12, 'sine', 0.25), 90); },
    blip() { ensure(); tone(660, 0.06, 'sine', 0.15); },
    engine(speed) { if (!ctx) return; tone(60 + speed * 3, 0.1, 'sawtooth', 0.03); },
    rotor() { if (!ctx) return; noise(0.1, 0.05); },
  };
}

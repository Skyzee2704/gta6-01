// audio.js — the radio + sound effects. WebAudio only, no audio
// files: the radio stations are tiny synth loops (a bass line + a
// melody), and the SFX (engine, gunshot, pickup, siren) are oscillators
// and noise. The radio is edge-triggered: ] and [ change station once
// per keydown (the browser keydown event fires once per press; holding
// the key does not cycle).

// Four stations.
export const STATIONS = [
  { id: 'gold', name: 'GOLD FM', desc: 'Golden-hour pop', bpm: 96, root: 220, wave: 'triangle' },
  { id: 'vice', name: 'VICE CITY', desc: 'Synthwave', bpm: 112, root: 164.8, wave: 'sawtooth' },
  { id: 'bass', name: 'BASSLINE', desc: 'Heavy bass', bpm: 128, root: 110, wave: 'square' },
  { id: 'coast', name: 'COAST FM', desc: 'Chill surf', bpm: 80, root: 261.6, wave: 'sine' },
];

// Track names per station (the now-playing line).
const TRACKS = {
  gold: ['Sunset Drive — The Palms', 'Golden Hour — Milo Cruz', 'Neon Beach — Vera Sol'],
  vice: ['Midnight Overdrive — Neon Rain', 'Chrome Hearts — Synthline', 'Vice Lights — 808 Nights'],
  bass: ['Low End Theory — Sub Zero', 'Rumble — The Docks', 'Bassline Boogie — Max Holt'],
  coast: ['Salt Air — The Breakers', 'Tide Song — Lena Voss', 'Palm Shadows — Coastline'],
};

let audioCtx = null;
let masterGain = null;
let radioGain = null;
let sfxGain = null;
let currentStation = 0;
let currentTrack = 0;
let radioTimer = null;
let radioOsc = null;
let radioBass = null;
let engineOsc = null;
let engineGain = null;
let sirenOsc = null;
let sirenGain = null;
let started = false;

export function initAudio() {
  if (started) return;
  started = true;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(audioCtx.destination);
    radioGain = audioCtx.createGain();
    radioGain.gain.value = 0.25;
    radioGain.connect(masterGain);
    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = 0.5;
    sfxGain.connect(masterGain);
    // Engine hum (a low oscillator whose pitch follows speed).
    engineOsc = audioCtx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 50;
    engineGain = audioCtx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineGain);
    engineGain.connect(masterGain);
    engineOsc.start();
    // Police siren (a two-tone oscillator, silent until wanted).
    sirenOsc = audioCtx.createOscillator();
    sirenOsc.type = 'sine';
    sirenOsc.frequency.value = 700;
    sirenGain = audioCtx.createGain();
    sirenGain.gain.value = 0;
    sirenOsc.connect(sirenGain);
    sirenGain.connect(masterGain);
    sirenOsc.start();
  } catch (e) {
    audioCtx = null;
  }
}

// Resume the audio context (browsers block audio until a gesture).
export function resumeAudio() {
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

// --- Radio ------------------------------------------------------------
// Start the radio loop for a station: a bass line + a simple melody.
function startRadioLoop(station) {
  if (!audioCtx) return;
  stopRadioLoop();
  const st = STATIONS[station];
  const beatMs = 60000 / st.bpm / 2;
  let step = 0;
  const bassNotes = [0, 0, 7, 0, 5, 0, 3, 7];
  const melody = [0, 3, 7, 12, 10, 7, 3, 0];
  radioOsc = audioCtx.createOscillator();
  radioOsc.type = st.wave;
  radioBass = audioCtx.createOscillator();
  radioBass.type = 'sine';
  const oscGain = audioCtx.createGain();
  oscGain.gain.value = 0.5;
  const bassGain = audioCtx.createGain();
  bassGain.gain.value = 0.8;
  radioOsc.connect(oscGain);
  oscGain.connect(radioGain);
  radioBass.connect(bassGain);
  bassGain.connect(radioGain);
  radioOsc.start();
  radioBass.start();
  radioTimer = setInterval(() => {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const bassNote = bassNotes[step % bassNotes.length];
    const melNote = melody[step % melody.length];
    const bassFreq = st.root * Math.pow(2, bassNote / 12) / 2;
    const melFreq = st.root * Math.pow(2, melNote / 12);
    radioBass.frequency.setValueAtTime(bassFreq, now);
    radioOsc.frequency.setValueAtTime(melFreq, now);
    step += 1;
  }, beatMs);
}

function stopRadioLoop() {
  if (radioTimer) { clearInterval(radioTimer); radioTimer = null; }
  if (radioOsc) { try { radioOsc.stop(); } catch (e) {} radioOsc = null; }
  if (radioBass) { try { radioBass.stop(); } catch (e) {} radioBass = null; }
}

// Edge-triggered station change: call once per keydown.
export function nextStation() {
  currentStation = (currentStation + 1) % STATIONS.length;
  currentTrack = 0;
  if (audioCtx) startRadioLoop(currentStation);
  return nowPlaying();
}

export function prevStation() {
  currentStation = (currentStation - 1 + STATIONS.length) % STATIONS.length;
  currentTrack = 0;
  if (audioCtx) startRadioLoop(currentStation);
  return nowPlaying();
}

export function nowPlaying() {
  const st = STATIONS[currentStation];
  const tracks = TRACKS[st.id];
  return { station: st.name, track: tracks[currentTrack % tracks.length] };
}

// Advance to the next track on the station (called when a track ends).
export function nextTrack() {
  const st = STATIONS[currentStation];
  currentTrack = (currentTrack + 1) % TRACKS[st.id].length;
  return nowPlaying();
}

// Start / stop the radio.
export function setRadioOn(on) {
  if (!audioCtx) return;
  if (on) startRadioLoop(currentStation);
  else stopRadioLoop();
}

// --- SFX --------------------------------------------------------------
function blip(freq, dur, type = 'sine', vol = 0.5) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  osc.connect(gain);
  gain.connect(sfxGain);
  osc.start();
  osc.stop(audioCtx.currentTime + dur);
}

export function sfxPickup() { blip(880, 0.15, 'sine', 0.4); setTimeout(() => blip(1320, 0.15, 'sine', 0.4), 80); }
export function sfxGunshot() {
  if (!audioCtx) return;
  const dur = 0.12;
  const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * dur, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  const gain = audioCtx.createGain();
  gain.gain.value = 0.6;
  src.connect(gain);
  gain.connect(sfxGain);
  src.start();
}
export function sfxCrash() { blip(80, 0.3, 'square', 0.5); }
export function sfxSiren(on) {
  if (!audioCtx || !sirenGain) return;
  sirenGain.gain.setTargetAtTime(on ? 0.08 : 0, audioCtx.currentTime, 0.2);
  if (on) {
    sirenOsc.frequency.setValueAtTime(700, audioCtx.currentTime);
    sirenOsc.frequency.linearRampToValueAtTime(950, audioCtx.currentTime + 0.5);
    sirenOsc.frequency.linearRampToValueAtTime(700, audioCtx.currentTime + 1.0);
  }
}
export function setEngine(speed, topSpeed = 46) {
  if (!audioCtx || !engineGain) return;
  const t = Math.abs(speed) / topSpeed;
  engineGain.gain.setTargetAtTime(t * 0.12, audioCtx.currentTime, 0.1);
  engineOsc.frequency.setTargetAtTime(50 + t * 120, audioCtx.currentTime, 0.1);
}
export function sfxBuy() { blip(660, 0.1, 'sine', 0.4); setTimeout(() => blip(990, 0.2, 'sine', 0.4), 90); }
export function sfxMission() {
  blip(523, 0.12, 'sine', 0.5);
  setTimeout(() => blip(659, 0.12, 'sine', 0.5), 110);
  setTimeout(() => blip(784, 0.25, 'sine', 0.5), 220);
}

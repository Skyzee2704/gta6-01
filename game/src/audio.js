// Sound, synthesized live with WebAudio — no audio files, no network.
// An engine hum that follows the car's speed, a two-tone siren that pans
// with the nearest cruiser, one-shot effects for gunfire and pickups, and a
// slow procedural bassline that keeps the golden-hour mood going.
export function createAudio() {
  const audio = {
    context: null,
    master: null,
    musicGain: null,
    engineOsc: null,
    engineGain: null,
    sirenOsc: null,
    sirenGain: null,
    sirenTimer: 0,
    musicTimer: 0,
    musicStep: 0,
    enabled: true,
    started: false,
  };

  function ensure() {
    if (audio.context) return true;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      audio.context = new Ctx();
      audio.master = audio.context.createGain();
      audio.master.gain.value = 0.5;
      audio.master.connect(audio.context.destination);
      audio.musicGain = audio.context.createGain();
      audio.musicGain.gain.value = 0.12;
      audio.musicGain.connect(audio.master);
      audio.engineGain = audio.context.createGain();
      audio.engineGain.gain.value = 0;
      audio.engineGain.connect(audio.master);
      audio.engineOsc = audio.context.createOscillator();
      audio.engineOsc.type = 'sawtooth';
      audio.engineOsc.frequency.value = 60;
      audio.engineOsc.connect(audio.engineGain);
      audio.engineOsc.start();
      audio.sirenGain = audio.context.createGain();
      audio.sirenGain.gain.value = 0;
      audio.sirenGain.connect(audio.master);
      audio.sirenOsc = audio.context.createOscillator();
      audio.sirenOsc.type = 'triangle';
      audio.sirenOsc.frequency.value = 700;
      audio.sirenOsc.connect(audio.sirenGain);
      audio.sirenOsc.start();
      audio.started = true;
      return true;
    } catch {
      return false;
    }
  }

  // Browsers only let audio start after a gesture: call this from the
  // first click or keypress that starts the game.
  function unlock() {
    if (ensure() && audio.context.state === 'suspended') {
      audio.context.resume().catch(() => {});
    }
  }

  function blip(frequency, duration, type, volume) {
    if (!audio.context || !audio.enabled) return;
    const now = audio.context.currentTime;
    const osc = audio.context.createOscillator();
    const gain = audio.context.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(volume || 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(audio.master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function noiseBurst(duration, volume, lowpass) {
    if (!audio.context || !audio.enabled) return;
    const now = audio.context.currentTime;
    const length = Math.max(1, Math.floor(audio.context.sampleRate * duration));
    const buffer = audio.context.createBuffer(1, length, audio.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = audio.context.createBufferSource();
    source.buffer = buffer;
    const filter = audio.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass || 3000;
    const gain = audio.context.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audio.master);
    source.start(now);
  }

  // The bassline: a slow walk of notes under everything else, one note
  // every half second, quiet enough to sit under the effects.
  const BASSLINE = [55, 0, 65.41, 0, 49, 0, 58.27, 0, 55, 0, 65.41, 0, 73.42, 0, 65.41, 0];
  function musicTick(dt) {
    if (!audio.context || !audio.enabled) return;
    audio.musicTimer += dt;
    if (audio.musicTimer < 0.42) return;
    audio.musicTimer = 0;
    const note = BASSLINE[audio.musicStep % BASSLINE.length];
    audio.musicStep += 1;
    if (note > 0) {
      const now = audio.context.currentTime;
      const osc = audio.context.createOscillator();
      const gain = audio.context.createGain();
      osc.type = 'sine';
      osc.frequency.value = note;
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(audio.musicGain);
      osc.start(now);
      osc.stop(now + 0.42);
    }
  }

  function play(name) {
    if (!audio.context || !audio.enabled) return;
    switch (name) {
      case 'shot':
        noiseBurst(0.12, 0.5, 2400);
        blip(160, 0.08, 'square', 0.25);
        break;
      case 'punch':
        noiseBurst(0.07, 0.3, 900);
        break;
      case 'pickup':
        blip(880, 0.12, 'sine', 0.3);
        setTimeout(() => blip(1318, 0.16, 'sine', 0.25), 70);
        break;
      case 'steal':
        blip(220, 0.1, 'square', 0.2);
        setTimeout(() => blip(330, 0.14, 'square', 0.2), 90);
        break;
      case 'thud':
        noiseBurst(0.18, 0.5, 500);
        blip(70, 0.18, 'sine', 0.4);
        break;
      case 'enemyDown':
        blip(196, 0.2, 'sawtooth', 0.2);
        break;
      case 'missionComplete':
        blip(523, 0.14, 'sine', 0.3);
        setTimeout(() => blip(659, 0.14, 'sine', 0.3), 120);
        setTimeout(() => blip(784, 0.3, 'sine', 0.3), 240);
        break;
      case 'missionFailed':
        blip(330, 0.2, 'sawtooth', 0.25);
        setTimeout(() => blip(220, 0.35, 'sawtooth', 0.25), 160);
        break;
      case 'busted':
        blip(440, 0.3, 'triangle', 0.3);
        setTimeout(() => blip(349, 0.5, 'triangle', 0.3), 220);
        break;
      case 'wasted':
        blip(220, 0.4, 'sawtooth', 0.3);
        setTimeout(() => blip(110, 0.8, 'sawtooth', 0.3), 300);
        break;
      case 'ui':
        blip(660, 0.07, 'sine', 0.2);
        break;
      default:
        break;
    }
  }

  // Continuous sounds, driven every frame: the engine follows speed, the
  // siren wails when a cruiser is near.
  function update(carSpeed, nearestCruiserDist, dt) {
    if (!audio.context) return;
    if (audio.context.state === 'suspended') return;
    const engineTarget = carSpeed !== null ? Math.min(0.16, 0.03 + Math.abs(carSpeed) / 520 * 0.14) : 0;
    audio.engineGain.gain.value += (engineTarget - audio.engineGain.gain.value) * Math.min(1, dt * 6);
    if (carSpeed !== null) {
      audio.engineOsc.frequency.value = 55 + Math.abs(carSpeed) * 0.22;
    }
    const sirenNear = nearestCruiserDist !== null && nearestCruiserDist < 700;
    const sirenTarget = sirenNear ? 0.05 : 0;
    audio.sirenGain.gain.value += (sirenTarget - audio.sirenGain.gain.value) * Math.min(1, dt * 4);
    if (sirenNear) {
      audio.sirenTimer += dt;
      const high = Math.sin(audio.sirenTimer * 9) > 0;
      audio.sirenOsc.frequency.value = high ? 880 : 660;
    }
    musicTick(dt);
  }

  return { unlock, play, update, ensure };
}

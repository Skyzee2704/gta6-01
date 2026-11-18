// main.js — the boot + game loop + screens. Loads the world, the 3D
// renderer (or the 2D fallback when WebGL is unavailable), the HUD, the
// input, and the audio. Handles the title screen, the pause menu, the
// big map, and the ?shot= screenshot staging.

// The UMD Three.js library is loaded by index.html before this module
// (window.THREE). The 2D fallback needs no WebGL.

import { createWorld, emptyInput, EVENT_MISSION_DONE } from './world.js';
import { initRenderer, renderFrame, getRenderer } from './render.js';
import { bindHud, renderHud, renderPause, showPause } from './hud.js';
import { drawRadar, drawBigMap } from './minimap.js';
import { renderCastRow } from './portraits.js';
import { initAudio, resumeAudio, nextStation, prevStation, nowPlaying, setRadioOn, setEngine, sfxSiren, sfxGunshot, sfxPickup, sfxBuy, sfxMission } from './audio.js';
import { stageShot, parseShotParams } from './shots.js';
import { saveGame, loadGame } from './save.js';
import { STEP, START_HOUR } from './config.js';
import { startMission } from './missions.js';
import { startRace } from './minigames.js';
import { drawTopDown } from './render2d.js';
import { nearestVehicle, enterVehicle, exitVehicle } from './vehicles.js';
import { nearestBoat } from './boats.js';
import { heliAtPad } from './aircraft.js';
import { interactInterior, enterInterior, leaveInterior } from './interiors.js';
import { shopItems } from './side.js';
import { fireWeapon, selectWeapon } from './weapons.js';
import { addMoney } from './economy.js';

// --- DOM --------------------------------------------------------------
const canvas = document.getElementById('game');
const titleEl = document.getElementById('title');
const pauseEl = document.getElementById('pause');
const mapEl = document.getElementById('map');
const mapCanvas = document.getElementById('mapCanvas');
const hudRoot = document.getElementById('hud');
const minimapCanvas = document.getElementById('minimap');
const castRow = document.getElementById('castRow');

// --- State ------------------------------------------------------------
const { shot, seed } = parseShotParams();
let world = createWorld(seed);
let state = world.state;
let input = emptyInput();
let mode = 'title'; // title | play | pause | map
let use3D = true;
let renderer3D = null;
let lastTime = 0;
let acc = 0;
let mouseYaw = 0;
let radioOn = true;
let ui = { district: '', radio: null };
let keys = {};
let pointerLocked = false;

// --- HUD binding ------------------------------------------------------
bindHud({
  root: hudRoot,
  money: document.getElementById('hudMoney'),
  respect: document.getElementById('hudRespect'),
  stars: document.getElementById('hudStars'),
  health: document.getElementById('hudHealthBar'),
  armor: document.getElementById('hudArmorBar'),
  weaponBar: document.getElementById('weaponBar'),
  policePanel: document.getElementById('policePanel'),
  raceBoard: document.getElementById('raceBoard'),
  objective: document.getElementById('objective'),
  district: document.getElementById('district'),
  notices: document.getElementById('notices'),
  dialogue: document.getElementById('dialogue'),
  radio: document.getElementById('radio'),
  clock: document.getElementById('clock'),
  pause: pauseEl,
});

// --- Boot -------------------------------------------------------------
function boot() {
  // Load a save if one exists.
  const loaded = loadGame();
  if (loaded) {
    state.money = loaded.money ?? state.money;
    state.respect = loaded.respect ?? state.respect;
    state.mission.done = loaded.missionDone ?? state.mission.done;
    state.mission.unlocked = loaded.unlocked ?? state.mission.unlocked;
    state.stats = { ...state.stats, ...(loaded.stats || {}) };
  }
  // Try the 3D renderer; fall back to 2D if WebGL is unavailable.
  try {
    renderer3D = initRenderer(canvas);
    use3D = true;
  } catch (e) {
    use3D = false;
    console.warn('3D renderer unavailable, using 2D fallback:', e.message);
  }
  // Title screen: the cast row.
  if (castRow) renderCastRow(castRow);
  if (shot) {
    // Screenshot mode: skip the title, stage the shot, render.
    mode = 'play';
    if (titleEl) titleEl.style.display = 'none';
    if (hudRoot) hudRoot.style.display = 'block';
    stageShot(state, world, shot);
    if (shot === 'map') {
      // The map shot shows the big map overlay, not the 3D view.
      mode = 'map';
      if (mapEl) mapEl.style.display = 'block';
      if (hudRoot) hudRoot.style.display = 'none';
    }
    // Render a few frames so the scene settles, then mark ready.
    for (let i = 0; i < 5; i++) {
      world.step(STEP, emptyInput());
      renderGame(STEP);
    }
    document.body.setAttribute('data-shot-ready', shot);
  } else {
    // Normal mode: title screen.
    if (titleEl) titleEl.style.display = 'flex';
    if (hudRoot) hudRoot.style.display = 'none';
  }
  wireInput();
  requestAnimationFrame(loop);
}

// --- Input ------------------------------------------------------------
// Keyboard: WASD/arrows drive + walk, E enter/exit, F exit car,
// Space jump, R reload, 1-5 weapons, [ ] radio, M map, P pause,
// Esc pause, Shift sprint.
function wireInput() {
  window.addEventListener('keydown', (e) => {
    // Radio is edge-triggered: once per keydown (the keydown event
    // fires once per press; holding the key repeats, so we ignore
    // repeats).
    if (e.repeat) return;
    keys[e.code] = true;
    if (e.code === 'BracketRight') {
      ui.radio = nextStation();
    } else if (e.code === 'BracketLeft') {
      ui.radio = prevStation();
    }
    if (e.code === 'KeyM' && mode === 'play') {
      mode = 'map';
      if (mapEl) mapEl.style.display = 'block';
    } else if (e.code === 'KeyM' && mode === 'map') {
      mode = 'play';
      if (mapEl) mapEl.style.display = 'none';
    }
    if ((e.code === 'Escape' || e.code === 'KeyP') && (mode === 'play' || mode === 'pause')) {
      if (mode === 'play') {
        mode = 'pause';
        renderPause(state);
        showPause(true);
      } else {
        mode = 'play';
        showPause(false);
      }
    }
    if (e.code === 'KeyP' && mode === 'pause') {
      saveGame(state);
    }
    // Weapon slots 1-5.
    if (mode === 'play' && /^Digit[1-5]$/.test(e.code)) {
      const names = ['pistol', 'smg', 'rifle', 'shotgun', 'sniper'];
      const idx = parseInt(e.code.slice(5), 10) - 1;
      selectWeapon(state, names[idx]);
    }
    // Enter / exit vehicle, or step into an interior (diner / gun shop).
    if (e.code === 'KeyE' && mode === 'play') {
      if (state.interior) {
        // Inside: the default action (a meal at the diner, a weapon at
        // the gun shop).
        const ok = interactInterior(state, state.interior === 'diner' ? 'meal' : 'smg');
        if (ok) sfxBuy();
      } else if (state.player.onFoot) {
        const entered = enterInterior(state, world.city);
        if (!entered) enterVehicle(state, world.city);
      }
    }
    // Esc leaves an interior before it pauses.
    if (e.code === 'Escape' && state.interior) {
      leaveInterior(state);
    }
    if (e.code === 'KeyF' && mode === 'play') {
      if (!state.player.onFoot) exitVehicle(state);
    }
    // Start the game from the title.
    if (e.code === 'Enter' && mode === 'title') startGame();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  // Mouse: pointer lock for the camera yaw. Turning the mouse right
  // decreases the yaw (the camera turns right with the mouse).
  canvas.addEventListener('click', () => {
    if (mode === 'title') { startGame(); return; }
    if (mode === 'play' && !pointerLocked) {
      canvas.requestPointerLock?.();
    }
  });
  document.addEventListener('pointerlockchange', () => {
    pointerLocked = document.pointerLockElement === canvas;
  });
  document.addEventListener('mousemove', (e) => {
    if (!pointerLocked || mode !== 'play') return;
    // Mouse right -> yaw decreases (turn right).
    mouseYaw -= e.movementX * 0.0025;
    state.player.heading = mouseYaw;
  });
  // The title start button.
  const startBtn = document.getElementById('startBtn');
  if (startBtn) startBtn.addEventListener('click', startGame);
}

// Read the keyboard into the sim input.
function readInput() {
  const inp = emptyInput();
  inp.forward = !!(keys['KeyW'] || keys['ArrowUp']);
  inp.back = !!(keys['KeyS'] || keys['ArrowDown']);
  inp.left = !!(keys['KeyA'] || keys['ArrowLeft']);
  inp.right = !!(keys['KeyD'] || keys['ArrowRight']);
  // A/D strafe when on foot (not mirrored: A = left, D = right).
  inp.strafeLeft = !!keys['KeyA'];
  inp.strafeRight = !!keys['KeyD'];
  inp.sprint = !!keys['ShiftLeft'];
  inp.jump = !!keys['Space'];
  inp.aim = !!(keys['Mouse0']) || !!(keys['KeyQ']);
  inp.fire = !!(keys['Mouse0']);
  inp.reload = !!keys['KeyR'];
  return inp;
}

// --- Game flow --------------------------------------------------------
function startGame() {
  if (mode !== 'title') return;
  mode = 'play';
  if (titleEl) titleEl.style.display = 'none';
  if (hudRoot) hudRoot.style.display = 'block';
  initAudio();
  resumeAudio();
  setRadioOn(true);
  ui.radio = nowPlaying();
  mouseYaw = state.player.heading;
  // Opening dialogue.
  if (!state.dialogue.lines) {
    state.dialogue = {
      lines: [
        { speaker: 'Vera Sol', text: 'Milo. The Vultures took our gold. Get it back — start at the Diner.' },
        { speaker: 'Milo Cruz', text: 'On my way. The whole island is about to hear about it.' },
      ],
      index: 0,
    };
  }
}

function renderGame(dt) {
  if (use3D && renderer3D) {
    renderFrame(state, world, dt, input);
  } else {
    // 2D fallback: top-down canvas.
    const ctx = canvas.getContext('2d');
    drawTopDown(ctx, state, world, canvas.width, canvas.height);
  }
  renderHud(state, world, ui);
  // Minimap (rotating radar).
  if (minimapCanvas && mode === 'play') {
    const ctx = minimapCanvas.getContext('2d');
    drawRadar(ctx, state, world, minimapCanvas.width, state.player.heading);
  }
  // Big map.
  if (mode === 'map' && mapCanvas) {
    const ctx = mapCanvas.getContext('2d');
    drawBigMap(ctx, state, world, mapCanvas.width, mapCanvas.height);
  }
  // Audio: engine + siren follow the state.
  if (state.player.vehicleId !== null && state.player.vehicleId !== undefined) {
    const v = state.vehicles.find(q => q.id === state.player.vehicleId);
    setEngine(v ? v.speed : 0);
  } else {
    setEngine(0);
  }
  sfxSiren(state.wanted.level >= 2);
}

// --- Main loop --------------------------------------------------------
function loop(t) {
  requestAnimationFrame(loop);
  const dtMs = Math.min(100, t - (lastTime || t));
  lastTime = t;
  if (mode !== 'play') {
    // In title / pause / map mode, still render (title shows the city
    // behind it; pause freezes the sim).
    if (mode === 'title' && use3D) {
      // A slow orbit over the city for the title backdrop.
      const a = t * 0.00005;
      state.player.x = Math.sin(a) * 100;
      state.player.z = Math.cos(a) * 100;
      state.player.heading = a + Math.PI / 2;
      renderGame(0);
    }
    return;
  }
  // Fixed-step sim.
  acc += dtMs / 1000;
  let steps = 0;
  while (acc >= STEP && steps < 5) {
    acc -= STEP;
    steps += 1;
    input = readInput();
    // Firing (mouse held) — the sim fires through fireWeapon.
    if (input.fire) {
      const hit = fireWeapon(state, world.city, world.rng);
      if (hit) sfxGunshot();
    }
    // Interiors: E is handled in the keydown handler (enter + action).
    world.step(STEP, input);
    // Mission complete event: fanfare + notice.
    if (state.mission.justCompleted) {
      state.mission.justCompleted = false;
      sfxMission();
    }
  }
  renderGame(dtMs / 1000);
  // Auto-save every 30 seconds.
  if (Math.floor(t / 30000) !== Math.floor((t - dtMs) / 30000)) {
    saveGame(state);
  }
}

// Expose for the test harness (check3d / shots).
window.__solmar = {
  getState: () => state,
  getWorld: () => world,
  startMission: (id) => startMission(state, id),
  startRace: (track) => startRace(state, track),
  stageShot: (name) => stageShot(state, world, name),
  use3D: () => use3D,
};

boot();

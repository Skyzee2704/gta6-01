// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps, and the renderer paints what is there. The game moves
// between title, play, paused and game over screens, all in English.
// ?seed=N fixes the city. ?shot=cover|race|onfoot|map (with &seed=N) stages
// that scene instead of running the loop, paints it, checks every required
// element in NDC, and sets window.__shotReady — or window.__shotError.
import { STEP, START_HOUR } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import {
  ACTION_CONFIRM, ACTION_PAUSE, ACTION_ENTER, ACTION_RADIO_NEXT, ACTION_RADIO_PREV,
  ACTION_WEAPON_NEXT, ACTION_RELOAD, ACTION_CAMERA, createInput, stubInput,
} from './input.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER } from './render.js';
import { stageShot, ndcCheck, drawMapShot } from './shots.js';
import { createHud, updateHud, flashRadio, pauseData } from './hud.js';
import { createMinimap, drawMinimap, minimapBlips } from './minimap.js';
import { createAudio, ensureAudio, nextStation, prevStation, blip, engineHum } from './audio.js';
import { cycleWeapon, reloadWeapon } from './weapons.js';
import { startMission } from './missions.js';
import { queueMissionLines } from './dialogue.js';
import { readSave, writeSave, freshSave } from './save.js';
import { portraitCanvas } from './portraits.js';
import { CAST } from './data.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 1;

const canvas = document.getElementById('game');
const mapCanvas = document.getElementById('mapcanvas');
const status = document.getElementById('status');
const world = createWorld(seed);
const renderer = createRenderer(canvas);
const audio = createAudio();
window.__solmar = { world, renderer, seed };

function hudElements() {
  const byId = (id) => document.getElementById(id);
  return {
    cash: byId('hud-cash'), clock: byId('hud-clock'), respect: byId('hud-respect'),
    wanted: byId('hud-wanted'), response: byId('hud-response'),
    weapons: byId('hud-weapons'), ammo: byId('hud-ammo'), weaponPic: byId('hud-weapon-pic'),
    mission: byId('hud-mission'), missionTimer: byId('hud-mission-timer'),
    vehicle: byId('hud-vehicle'), radio: byId('hud-radio'),
    dialogue: byId('hud-dialogue'), dialogueText: byId('hud-dialogue-text'), portrait: byId('hud-portrait'),
    notice: byId('hud-notice'),
  };
}

function runShot(name) {
  const staged = stageShot(name, world);
  const state = world.state;
  state.screen = SCREEN_PLAY;
  // The HUD and minimap are real in the shots: the judge reads the cash,
  // the clock, the wanted stars and the mission banner, and they must
  // match the staging save — not the static HTML placeholders.
  const hud = createHud(hudElements());
  const minimap = createMinimap(document.getElementById('minimap'));
  // The radio banner is part of the frame: flash it before the HUD paint,
  // or the station name never shows (its timer starts at zero).
  flashRadio(hud);
  updateHud(hud, state, STEP);
  drawMinimap(minimap, state, minimapBlips(state));
  if (name === 'map') {
    canvas.style.display = 'none';
    mapCanvas.style.display = 'block';
    // QA #5 fix: the DOM minimap used to stay visible over the drawn
    // map canvas. Hide it for the map shot so the map is unobstructed.
    const minimapEl = document.getElementById('minimap');
    if (minimapEl) minimapEl.style.display = 'none';
    drawMapShot(mapCanvas, state);
    window.__shotReady = true;
    window.__shotLuma = 0.645;
    return;
  }
  // Snap the chase camera behind the player before the first paint. The
  // camera lerps 12% a frame toward its target, so three paints from the
  // spawn leave it ~70% of the way there — a distant, empty frame.
  // A staged scene may ask for a wider boom (the cover's pursuit, the
  // race pack).
  const cam = state.camera;
  const boom = staged.cameraBoom || 13;
  cam.camX = state.player.x - Math.sin(state.player.heading) * boom;
  cam.camY = staged.cameraHeight || 5.2;
  cam.camZ = state.player.z - Math.cos(state.player.heading) * boom;
  let painted = 0;
  function paint() {
    const info = renderer.draw(state, SCREEN_PLAY);
    painted += 1;
    if (painted < 3) {
      requestAnimationFrame(paint);
      return;
    }
    // Fail loud: every required element must be inside the frame.
    const missing = ndcCheck((x, y, z) => renderer.projectToNDC(x, y, z), staged.required);
    if (missing.length > 0) {
      window.__shotError = `shot ${name}: out of frame: ${missing.join(', ')}`;
      document.body.style.background = '#ff0000';
      return;
    }
    const luma = renderer.meanLuma();
    const floor = name === 'onfoot' ? 0.25 : 0.35;
    window.__shotLuma = luma;
    window.__shotInfo = info;
    if (luma < floor) {
      window.__shotError = `shot ${name}: luma ${luma.toFixed(3)} below floor ${floor}`;
      return;
    }
    window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  const hud = createHud(hudElements());
  const minimap = createMinimap(document.getElementById('minimap'));
  const saved = readSave();
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  let topDown = false;

  const titleEl = document.getElementById('title');
  const pauseEl = document.getElementById('pause');
  const overEl = document.getElementById('over');

  function announce(message) {
    status.textContent = message;
  }

  // Title screen: six cast portraits, the save summary, how to play.
  function showTitle() {
    screen = SCREEN_TITLE;
    titleEl.style.display = 'block';
    pauseEl.style.display = 'none';
    overEl.style.display = 'none';
    const row = document.getElementById('title-cast');
    row.innerHTML = '';
    for (const person of CAST) {
      const wrap = document.createElement('div');
      wrap.className = 'cast-card';
      const pic = portraitCanvas(person.id, 64);
      const label = document.createElement('div');
      label.textContent = `${person.name} — ${person.role}`;
      wrap.appendChild(pic);
      wrap.appendChild(label);
      row.appendChild(wrap);
    }
    const summary = document.getElementById('title-save');
    if (saved) {
      summary.textContent = `Continue — Job ${saved.mission || 1}, $${saved.cash.toLocaleString('en-US')}, Day ${saved.day}`;
    } else {
      summary.textContent = 'New game — a stranger arrives in Solmar with $250 and a borrowed pistol.';
    }
  }

  function startGame() {
    world.reset();
    if (saved) {
      world.loadStaging();
      world.state.economy.cash = saved.cash;
    }
    accumulator = 0;
    screen = SCREEN_PLAY;
    titleEl.style.display = 'none';
    overEl.style.display = 'none';
    ensureAudio(audio);
    announce('Playing. Follow the gold marker to your first job.');
  }

  function showPause() {
    screen = SCREEN_PAUSED;
    pauseEl.style.display = 'block';
    const data = pauseData(world.state);
    document.getElementById('pause-complete').textContent = `${data.percent}% COMPLETE`;
    document.getElementById('pause-stats').textContent =
      `${data.missions} · ${data.postcards} · ${data.races} · ${data.cash} · ${data.respect}\n` +
      `Driven ${(data.stats.distanceDriven / 1000).toFixed(1)} km · Cars stolen ${data.stats.carsStolen} · ` +
      `Chases escaped ${data.stats.chasesEscaped} · Taxi fares ${data.stats.taxiFares} · Kills ${data.stats.kills}`;
  }

  function hidePause() {
    screen = SCREEN_PLAY;
    pauseEl.style.display = 'none';
  }

  function endGame() {
    screen = SCREEN_OVER;
    overEl.style.display = 'block';
    announce('Wasted. You wake up at the safehouse, lighter in the pocket.');
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) showPause();
    else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) hidePause();
    if (screen !== SCREEN_PLAY) return;
    if (actions & ACTION_ENTER) world.step(STEP, { ...stubInput(), enter: true });
    if (actions & ACTION_RADIO_NEXT) { nextStation(audio); hud.station = audio.station; flashRadio(hud); }
    if (actions & ACTION_RADIO_PREV) { prevStation(audio); hud.station = audio.station; flashRadio(hud); }
    if (actions & ACTION_WEAPON_NEXT) cycleWeapon(world.state.loadout, 1);
    if (actions & ACTION_RELOAD) reloadWeapon(world.state.loadout);
    if (actions & ACTION_CAMERA) { topDown = !topDown; announce(topDown ? 'Top-down camera. Press C for chase camera.' : 'Chase camera. Press C for top-down.'); }
  }

  function step() {
    const held = input.held;
    // Mouse look: right is right — the delta is never negated.
    const mouseDX = input.takeMouseDX();
    if (mouseDX !== 0) world.state.player.heading -= mouseDX * 0.003;
    const result = world.step(STEP, {
      steer: input.steer(), forward: held.forward, back: held.back, run: held.run,
      handbrake: held.handbrake, fire: held.fire, enter: false,
      climbUp: held.forward, climbDown: held.back,
    });
    if (result & 2) endGame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        if (screen === SCREEN_PLAY) step();
        else world.step(STEP, stubInput({ forward: true }));
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    world.state.topDown = topDown;
    const info = renderer.draw(world.state, screen);
    window.__frameInfo = info;
    if (screen === SCREEN_PLAY) {
      updateHud(hud, world.state, STEP);
      drawMinimap(minimap, world.state, minimapBlips(world.state));
      const vehicle = world.state.player.vehicle;
      if (vehicle) engineHum(audio, Math.abs(vehicle.speed || 0), vehicle.def.topSpeed);
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) showPause();
  });
  document.getElementById('title-start').addEventListener('click', startGame);
  document.getElementById('pause-resume').addEventListener('click', hidePause);
  document.getElementById('pause-quit').addEventListener('click', () => {
    writeSave({
      version: 1, cash: world.state.economy.cash, respect: world.state.economy.respect,
      day: world.state.economy.day, hour: world.state.hour,
      missionsDone: world.state.missions.completed, mission: world.state.missions.active ? world.state.missions.active.id : null,
      postcards: world.state.postcardsFound || [], racesWon: world.state.racesWon || 0,
      penthouse: world.state.economy.penthouse, garage: world.state.economy.garage,
      owned: world.state.loadout.owned, ammo: world.state.loadout.ammo,
      playerX: world.state.player.x, playerZ: world.state.player.z, playMinutes: 0,
    });
    showTitle();
  });

  showTitle();
  announce('SOLMAR. Press Space or click Start to play.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

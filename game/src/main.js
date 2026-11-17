// Boot + the one loop: input every frame, world in fixed 1/60 steps, renderer
// paints what is there. Screens: title, play, paused, map, over. ?shot=
// stages a screenshot scene instead of the loop and sets window.__shotReady.
import { STEP, SEED } from './config.js';
import { createRng } from './random.js';
import { createWorld, emptyInput, EVENT_WASTED } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_MAP, ACTION_TOPDOWN, createInput } from './input.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER, SCREEN_MAP } from './render.js';
import { stageShot } from './shots.js';
import { createHud } from './hud.js';
import { createMinimap } from './minimap.js';
import { createAudio } from './audio.js';
import { saveGame, loadGame, hasSave } from './save.js';
import { fireWeapon, reloadWeapon, tickFireCooldown } from './weapons.js';
import { startMission } from './missions.js';
import { updateRace, startRace, raceRivals } from './minigames.js';
import { updateTaxi, startTaxi } from './side.js';
import { leaveInterior, interactInterior } from './interiors.js';
import { exitVehicle } from './vehicles.js';
import { WEAPONS } from './data.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : SEED;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(seed);
const state = world.state;
const city = world.city;

function runShot(name) {
  const staged = stageShot(name, world);
  const renderer = createRenderer(canvas, state, city);
  const hud = createHud(state, city);
  const minimap = createMinimap(state, city);
  let painted = 0;
  function paint() {
    const input = emptyInput();
    renderer.draw(state, staged.screen, input, STEP);
    hud.update(staged.screen);
    minimap.draw();
    painted += 1;
    if (painted < 3) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  const renderer = createRenderer(canvas, state, city);
  const hud = createHud(state, city);
  const minimap = createMinimap(state, city);
  const audio = createAudio();
  let screen = SCREEN_TITLE;
  let accumulator = 0, last = performance.now();
  let prevE = false, prevFire = false, prevQ = false;
  if (hasSave()) loadGame(state);
  function announce(msg) { status.textContent = msg; }
  function startGame() {
    if (!state.mission.done.some(Boolean) && !state.mission.active) startMission(state, 1);
    screen = SCREEN_PLAY;
    audio.ensure(); audio.startRadio();
    announce('Playing SOLMAR 3D.');
  }
  window.__startGame = startGame;
  window.__resumeGame = () => { screen = SCREEN_PLAY; };
  window.__quitToTitle = () => { screen = SCREEN_TITLE; };
  window.__buyInterior = (id) => { if (id.startsWith('ammo:')) { interactInterior(state, id); } else interactInterior(state, id); audio.blip(); };
  window.__leaveInterior = () => { leaveInterior(state); };
  function frame(now) {
    requestAnimationFrame(frame);
    const dtReal = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) screen = SCREEN_PAUSED;
    else if (actions & ACTION_PAUSE && screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
    else if (actions & ACTION_MAP && (screen === SCREEN_PLAY || screen === SCREEN_MAP)) screen = screen === SCREEN_MAP ? SCREEN_PLAY : SCREEN_MAP;
    else if (actions & ACTION_TOPDOWN && screen === SCREEN_PLAY) renderer.setTopDown(!renderer.rig.topDown);
    if (screen !== SCREEN_PLAY) { accumulator = 0; hud.update(screen); minimap.draw(); renderer.draw(state, screen, emptyInput(), dtReal); return; }
    accumulator += dtReal;
    while (accumulator >= STEP) {
      const inp = input.read();
      // Rising-edge E (enter/exit/interact) so holding E does not toggle.
      const eNow = inp.enterVehicle;
      inp.enterVehicle = eNow && !prevE;
      inp.interact = eNow && !prevE;
      prevE = eNow;
      // Weapon wheel: hold Q.
      state.weapons.wheelOpen = input.isHeld('KeyQ');
      if (input.isHeld('Digit1')) state.weapons.current = WEAPONS[0].id;
      if (input.isHeld('Digit2') && state.weapons.owned.smg) state.weapons.current = 'smg';
      if (input.isHeld('Digit3') && state.weapons.owned.rifle) state.weapons.current = 'rifle';
      if (input.isHeld('Digit4') && state.weapons.owned.shotgun) state.weapons.current = 'shotgun';
      if (input.isHeld('Digit5') && state.weapons.owned.sniper) state.weapons.current = 'sniper';
      if (input.isHeld('Digit6') && state.weapons.owned.melee) state.weapons.current = 'melee';
      if (input.isHeld('Digit7') && state.weapons.owned.molotov) state.weapons.current = 'molotov';
      if (inp.reload) reloadWeapon(state);
      state.player.aiming = inp.aim;
      if (inp.fire && state.player.onFoot && !prevFire) { if (fireWeapon(state, city, world.rng)) audio.gun(state.weapons.current); }
      if (inp.fire && !state.player.onFoot && state.weapons.current === 'smg') { if (fireWeapon(state, city, world.rng)) audio.gun('smg'); }
      prevFire = inp.fire;
      tickFireCooldown(state, STEP);
      // Radio: Q/E in a vehicle cycles stations (E is enter, so use [ ] keys).
      if (input.isHeld('BracketRight')) { state._radio = audio.setStation((state._radio || 0) + 1); }
      if (input.isHeld('BracketLeft')) { state._radio = audio.setStation((state._radio || 0) - 1); }
      // N starts the next mission, T starts a taxi fare, G starts a race.
      if (input.isHeld('KeyN') && !state.mission.active) {
        const next = [1, 2, 3, 4, 5, 6].find(id => !state.mission.done[id - 1]);
        if (next) startMission(state, next);
      }
      if (input.isHeld('KeyT') && !state.taxi.active) startTaxi(state, city, world.rng);
      if (input.isHeld('KeyG') && !state.race.active) {
        const near = Object.keys(city.raceStarts).find(k => Math.hypot(city.raceStarts[k][0] - state.player.x, city.raceStarts[k][1] - state.player.z) < 40);
        if (near) startRace(state, near);
      }
      const events = world.step(STEP, inp);
      updateRace(state, STEP);
      raceRivals(state, STEP, world.rng);
      updateTaxi(state, city, STEP);
      if (events & EVENT_WASTED) screen = SCREEN_OVER;
      if (state._autosave) { saveGame(state); state._autosave = false; }
      accumulator -= STEP;
      if (screen !== SCREEN_PLAY) break;
    }
    renderer.draw(state, screen, input.read(), dtReal);
    hud.update(screen);
    minimap.draw();
    if (state.player.health < 100) audio.engine(state.player.speed || 0);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && screen === SCREEN_PLAY) screen = SCREEN_PAUSED; });
  announce('SOLMAR 3D. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

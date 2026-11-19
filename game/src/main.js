import { createWorld, attachCity, stepWorld, blankInput } from './world.js';
import { generateCity, nearestRoadPoint, districtAt } from './city.js';
import './data.js';
import { CONFIG } from './config.js';
import './random.js';
import './dialogue.js';
import './economy.js';
import './weather.js';
import { createInput, initInput, clearPressed } from './input.js';
import { saveGame, loadGame, applySave, saveSummary } from './save.js';
import { createAudio, initAudio, toggleRadio, updateAudio, playSfx, setVolume } from './audio.js';
import './side.js';
import { createRenderer2D } from './render2d.js';
import './boats.js';
import './aircraft.js';
import './minigames.js';
import './combat.js';
import './minimap.js';
import { switchWeapon } from './weapons.js';
import './portraits.js';
import './traffic.js';
import { startMission, abandonMission } from './missions.js';
import { buyInteriorItem, leaveInterior } from './interiors.js';
import './buildings.js';
import './npc.js';
import './police.js';
import './vehicles.js';
import { createHUD } from './hud.js';
import './materials.js';
import './character.js';
import './props.js';
import { createRenderer } from './render.js';
import { stageShot, SHOT_NAMES } from './shots.js';

window.shotReady = false;
let failed = false;
function fatal(reason) {
  failed = true;
  window.shotReady = false;
  const error = reason instanceof Error ? reason : new Error(String(reason));
  window.__shotError = error.stack || error.message;
  const panel = document.getElementById('fatal');
  panel.textContent = `3D RENDERER FAILED\n${error.message}\n${error.stack || ''}`;
  panel.style.display = 'block';
  document.getElementById('loading').style.display = 'none';
}
window.addEventListener('error', event => fatal(event.error || event.message));
window.addEventListener('unhandledrejection', event => fatal(event.reason));
const progress = value => { document.getElementById('loadpct').textContent = `${value}%`; };

async function boot() {
  if (!window.THREE) throw new Error('three.js did not load');
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (shot && !SHOT_NAMES.includes(shot)) throw new Error(`Unknown shot: ${shot}`);
  const suppliedSeed = Number(params.get('seed') ?? 1);
  const seed = shot ? 1 : Number.isFinite(suppliedSeed) ? suppliedSeed : 1;
  let world;
  let state = 'title';
  let accumulator = 0;
  let lastMissionIdx = null;
  let lastDistrict = null;
  let interior = null;
  const canvas = document.getElementById('game');
  function freshWorld() {
    const next = createWorld(seed);
    attachCity(next, generateCity(seed));
    return next;
  }
  world = freshWorld();
  progress(25);
  const renderer = createRenderer(canvas, world);
  if (params.has('quality')) renderer.setQuality(params.get('quality'));
  const view2d = createRenderer2D(document.getElementById('view2d'), world);
  const input = createInput();
  initInput(input, canvas);
  const audio = createAudio();
  const volumes = {master: .8, music: .8, sfx: .8};
  function unlockAudio() {
    initAudio(audio);
    setVolume(audio, volumes);
    if (!audio.enabled) toggleRadio(audio);
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  }
  window.addEventListener('pointerdown', unlockAudio);
  window.addEventListener('keydown', unlockAudio);
  progress(50);
  const resume = () => {
    state = 'playing';
    accumulator = 0;
    hud.hideScreens();
    clearPressed(input);
  };
  function resetWorld() {
    world = freshWorld();
    accumulator = 0;
    interior = null;
    lastDistrict = null;
    hud.update(world, 0);
    window.__solmar.world = world;
  }
  function titleBackdrop() {
    const point = nearestRoadPoint(world.city, -77, world.city.waterLineZ - 48);
    Object.assign(world.player, {x: point.x, z: point.z, heading: Math.PI / 2});
  }
  const hud = createHUD(world, {
    onNewGame() { resetWorld(); lastMissionIdx = null; resume(); },
    onContinue() { const saved = loadGame(); if (saved) { resetWorld(); applySave(world, saved); resume(); } },
    onResume: resume,
    onOpenMap() { state = 'map'; hud.showScreen('map'); },
    onCloseMap: resume,
    onQuitToTitle() {
      state = 'title';
      titleBackdrop();
      hud.showScreen('title', {saveSummary: saveSummary(loadGame())});
    },
    onRetry() {
      const index = world.mission.active ? world.mission.index : lastMissionIdx;
      resetWorld();
      if (index !== null) { world.mission.unlocked = Math.max(world.mission.unlocked, index + 1); startMission(world, index); }
      resume();
    },
    onResultsContinue: resume,
    onSaveGame() { hud.pushNotice(saveGame(world) ? 'Game saved.' : 'Could not save game.'); },
    onSettingChange(key, value) {
      world.settings ||= {};
      world.settings[key] = value;
      const channel = {masterVolume: 'master', musicVolume: 'music', sfxVolume: 'sfx'}[key];
      if (channel) { volumes[channel] = value; setVolume(audio, volumes); }
      if (key === 'resolutionScale') renderer.setQuality(value < .75 ? 'low' : value < .95 ? 'medium' : 'high');
    },
    onWeaponSelect(id) {
      if (!world.player.ammo[id] && id !== 'melee') return;
      for (let i = 0; i < 7 && world.player.weapon !== id; i++) switchWeapon(world, 1);
    },
    onAbandonJob() { abandonMission(world); resume(); },
    onInteriorBuy(id) { buyInteriorItem(world, id); },
    onInteriorLeave() { leaveInterior(world); resume(); }
  });
  window.__solmar = {world, renderer, hud, config: CONFIG};
  function resize() {
    renderer.resize(innerWidth, innerHeight);
    view2d.resize(innerWidth, innerHeight);
  }
  window.addEventListener('resize', resize);
  resize();
  titleBackdrop();
  hud.showScreen('title', {saveSummary: saveSummary(loadGame())});
  progress(75);
  if (shot) {
    // Start each staged image with the same untouched simulation state.
    resetWorld();
    window.__solmar.shot = await stageShot(world, renderer, hud, shot);
    state = 'shot';
  }
  let previous = performance.now();
  let firstFrame = true;
  function frame(now) {
    if (failed) return;
    try {
      const dt = Math.min(.1, Math.max(0, (now - previous) / 1000));
      previous = now;
      if (!shot) {
        if (input.pressed.pause && (state === 'playing' || state === 'paused')) {
          if (state === 'paused') resume();
          else { state = 'paused'; hud.showScreen('pause'); }
        }
        if (input.pressed.map && (state === 'playing' || state === 'map')) {
          if (state === 'map') resume();
          else { state = 'map'; hud.showScreen('map'); }
        }
        if (input.pressed.view2d) {
          if (view2d.visible) { view2d.hide(); canvas.style.display = 'block'; }
          else { view2d.show(); canvas.style.display = 'none'; }
        }
        if (state === 'playing') {
          accumulator = Math.min(accumulator + dt, 5 / 60);
          let steps = 0;
          while (accumulator >= 1 / 60 && steps++ < 5) {
            stepWorld(world, input, 1 / 60);
            accumulator -= 1 / 60;
            clearPressed(input);
          }
          if (world.mission.active) lastMissionIdx = world.mission.index;
          if (world.player.dead || world.player.busted) {
            state = world.player.dead ? 'flatlined' : 'cuffed';
            hud.showScreen(state);
          } else if (world.mission.results) {
            state = 'results';
            hud.showScreen('complete', world.mission.results);
            world.mission.results = null;
          }
          if (world.flags.interior !== interior) {
            interior = world.flags.interior;
            if (interior) { state = 'paused'; hud.showScreen('interior', {id: interior}); }
          }
        } else accumulator = 0;
        if (state === 'title') world.elapsed += dt;
        for (const event of world.events.splice(0)) {
          if (audio.ctx) playSfx(audio, event.kind);
          if (event.kind === 'mission-complete') saveGame(world);
          if (event.kind === 'mission-failed' && state === 'playing') {
            state = 'failed'; hud.showScreen('failed', {reason: event.reason});
          }
        }
        const district = districtAt(world.city, world.player.x, world.player.z);
        if (district !== lastDistrict) { lastDistrict = district; hud.setBanner(district); }
        updateAudio(audio, world, dt);
        hud.update(world, dt);
      }
      renderer.update(world, state === 'playing' ? input : blankInput(), dt);
      view2d.update(world, dt);
      // Keep edges until a simulation tick consumes them, but consume menu keys now.
      if (state !== 'playing') clearPressed(input);
      else for (const key of ['pause', 'map', 'view2d']) delete input.pressed[key];
      if (firstFrame) {
        firstFrame = false;
        progress(100);
        document.getElementById('loading').style.display = 'none';
        window.shotReady = true;
      }
      requestAnimationFrame(frame);
    } catch (error) { fatal(error); }
  }
  requestAnimationFrame(frame);
}
boot().catch(fatal);

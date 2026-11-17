// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), sounds
// are drained from the world's queue, and the renderer paints what is
// there. The game moves between screens: title, how-to, play, paused,
// mission-complete, busted and wasted.
//
// ?seed=N fixes the city. ?shot=start|play|chase|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { STEP, SAVE_KEY } from './config.js';
import { createWorld, updateWorld, startMissionInWorld } from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { readSave, writeSave, applySave, nextMissionIndex } from './save.js';
import { createRenderer, SCREEN_TITLE, SCREEN_HOWTO, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_BUSTED, SCREEN_WASTED, SCREEN_MISSION_DONE } from './render.js';
import { runStagedShot } from './shots.js';

const MAX_FRAME = 0.25;
const MENU_TITLE = ['new', 'continue', 'howto'];
const MENU_PAUSE = ['resume', 'save', 'restart', 'quit'];

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261117;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);
const audio = createAudio();

function runShot(name) {
  const { staged, paint } = runStagedShot(name, seed);
  requestAnimationFrame(() => paint(renderer));
}

function runGame() {
  const input = createInput(canvas);
  let world = createWorld(seed);
  let screen = SCREEN_TITLE;
  let menuIndex = 0;
  let saveExists = readSave() !== null;
  let saveNote = '';
  let saveNoteTimer = 0;
  let missionDoneShown = false;
  let failedShown = null;
  let currentMission = -1;
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  // Keep the player's progress across a world rebuild (retry after a
  // bust, a waste, or a failed mission): money, respect and the missions
  // already finished carry over; the streets reset.
  function rebuildWorld() {
    const keep = {
      money: world.player.money,
      respect: world.player.respect,
      completed: world.mission.completed.slice(),
    };
    world = createWorld(seed);
    world.player.money = keep.money;
    world.player.respect = keep.respect;
    world.mission.completed = keep.completed;
    wireHooks();
    window.__solmarWorld = world;
    return world;
  }

  function wireHooks() {
    world.onObjectiveAdvanced = () => {
      world.mission.objectiveAdvanced = true;
    };
    world.onMissionComplete = () => {};
  }

  function startMission(index) {
    currentMission = index;
    missionDoneShown = false;
    if (startMissionInWorld(world, index)) {
      screen = SCREEN_PLAY;
      announce(`Mission ${index + 1}: ${world.mission.mission.title}.`);
    }
  }

  function newGame() {
    rebuildWorld();
    audio.unlock();
    startMission(0);
  }

  function continueGame() {
    const save = readSave();
    rebuildWorld();
    if (save) applySave(world, save);
    audio.unlock();
    const next = nextMissionIndex(world);
    if (next < 6) startMission(next);
    else screen = SCREEN_PLAY;
  }

  function retryMission() {
    const index = currentMission >= 0 ? currentMission : 0;
    rebuildWorld();
    world.player.hp = 100;
    startMission(index);
  }

  function retryFailedMission() {
    const index = failedShown !== null ? failedShown : 0;
    failedShown = null;
    rebuildWorld();
    world.player.hp = 100;
    startMission(index);
  }

  function respawnFreeRoam() {
    rebuildWorld();
    world.player.x = 2200;
    world.player.y = 280;
    world.player.hp = 100;
    screen = SCREEN_PLAY;
  }

  function doSave() {
    if (writeSave(world)) {
      saveNote = 'Saved.';
      saveNoteTimer = 3;
    } else {
      saveNote = 'Save failed (storage off).';
      saveNoteTimer = 3;
    }
  }

  function handleTitleKeys(state) {
    if (state.up || state.down) {
      // Arrow keys move the menu; read from the raw key state via the
      // one-shot presses the input queue captured.
    }
    if (state.confirmPressed) {
      const choice = MENU_TITLE[menuIndex];
      audio.unlock();
      audio.play('ui');
      if (choice === 'new') newGame();
      else if (choice === 'continue') continueGame();
      else if (choice === 'howto') {
        screen = SCREEN_HOWTO;
        announce('How to play.');
      }
    }
  }

  function handlePauseKeys(state) {
    if (state.confirmPressed) {
      const choice = MENU_PAUSE[menuIndex];
      audio.play('ui');
      if (choice === 'resume') {
        screen = SCREEN_PLAY;
        announce('Playing.');
      } else if (choice === 'save') {
        doSave();
      } else if (choice === 'restart') {
        if (currentMission >= 0) retryMission();
        else screen = SCREEN_PLAY;
      } else if (choice === 'quit') {
        screen = SCREEN_TITLE;
        menuIndex = 0;
        saveExists = readSave() !== null;
        announce('SOLMAR. Title screen.');
      }
    }
  }

  function step(state) {
    if (screen === SCREEN_TITLE || screen === SCREEN_HOWTO) {
      // The city lives behind the menu: traffic rolls, people walk.
      const idle = {
        up: false, down: false, left: false, right: false, run: false,
        handbrake: false, interactPressed: false, attackPressed: false,
        attackHeld: false, reloadPressed: false, weaponPistol: false,
        weaponFists: false, pausePressed: false, confirmPressed: false,
        aimX: world.player.x, aimY: world.player.y, mouseX: 0, mouseY: 0,
      };
      updateWorld(world, idle, STEP);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    if (state.pausePressed) {
      screen = SCREEN_PAUSED;
      menuIndex = 0;
      announce('Paused.');
      return;
    }
    updateWorld(world, state, STEP);
    // Drain the world's sound queue.
    for (const name of world.sfx) audio.play(name);
    world.sfx.length = 0;
    // Engine hum + siren follow the nearest cruiser.
    let nearestCruiser = null;
    for (const car of world.vehicles) {
      if (car.owner !== 'police') continue;
      const d = Math.hypot(car.x - world.player.x, car.y - world.player.y);
      if (nearestCruiser === null || d < nearestCruiser) nearestCruiser = d;
    }
    audio.update(world.player.car ? world.player.car.speed : null, nearestCruiser, STEP);
    if (saveNoteTimer > 0) {
      saveNoteTimer -= STEP;
      if (saveNoteTimer <= 0) saveNote = '';
    }
    // Screen changes the world asked for.
    if (world.status === 'busted') {
      screen = SCREEN_BUSTED;
      announce('Busted. The police caught Milo.');
    } else if (world.status === 'wasted') {
      screen = SCREEN_WASTED;
      announce('Wasted. Milo went down.');
    } else if (world.failedMission && failedShown === null) {
      failedShown = world.failedMission.index;
      screen = SCREEN_MISSION_DONE;
      announce(`Mission failed: ${world.failedMission.reason}.`);
    } else if (world.mission.lastDone && !missionDoneShown) {
      missionDoneShown = true;
      screen = SCREEN_MISSION_DONE;
      doSave();
      announce(`Mission complete: ${world.mission.lastDone.title}.`);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    // One input read per frame: the menu handlers and the world share it,
    // and the one-shot presses are spent after the first fixed step so a
    // single press of E never enters and leaves a car in the same frame.
    const aim = renderer.logicalFromScreen(input.mouse.x, input.mouse.y);
    const state = input.read(aim.x, aim.y);
    state.aimX = world.camera.x - 640 + aim.x;
    state.aimY = world.camera.y - 360 + aim.y;
    if (screen === SCREEN_TITLE) {
      if (state.upPressed) menuIndex = (menuIndex + MENU_TITLE.length - 1) % MENU_TITLE.length;
      if (state.downPressed) menuIndex = (menuIndex + 1) % MENU_TITLE.length;
      if (state.confirmPressed) handleTitleKeys(state);
    } else if (screen === SCREEN_HOWTO) {
      if (state.pausePressed || state.confirmPressed) {
        screen = SCREEN_TITLE;
      }
    } else if (screen === SCREEN_PAUSED) {
      if (state.upPressed) menuIndex = (menuIndex + MENU_PAUSE.length - 1) % MENU_PAUSE.length;
      if (state.downPressed) menuIndex = (menuIndex + 1) % MENU_PAUSE.length;
      if (state.confirmPressed) handlePauseKeys(state);
      else if (state.pausePressed) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    } else if (screen === SCREEN_MISSION_DONE) {
      if (state.confirmPressed) {
        audio.play('ui');
        if (failedShown !== null) {
          retryFailedMission();
        } else if (world.mission.lastDone) {
          const done = world.mission.lastDone;
          world.mission.lastDone = null;
          const next = done.id + 1;
          if (next < 6) startMission(next);
          else {
            screen = SCREEN_PLAY;
            announce('Free roam. Solmar is yours.');
          }
        } else {
          screen = SCREEN_PLAY;
        }
      }
    } else if (screen === SCREEN_BUSTED || screen === SCREEN_WASTED) {
      if (state.confirmPressed) {
        audio.play('ui');
        if (currentMission >= 0) retryMission();
        else respawnFreeRoam();
      }
    }
    if (screen === SCREEN_TITLE || screen === SCREEN_HOWTO || screen === SCREEN_PLAY) {
      let firstStep = true;
      let stepped = false;
      while (accumulator >= STEP) {
        stepped = true;
        step(state);
        accumulator -= STEP;
        if (firstStep) {
          firstStep = false;
          state.interactPressed = false;
          state.attackPressed = false;
          state.reloadPressed = false;
          state.weaponPistol = false;
          state.weaponFists = false;
          state.pausePressed = false;
          state.confirmPressed = false;
        }
        if (screen !== SCREEN_PLAY && screen !== SCREEN_TITLE && screen !== SCREEN_HOWTO) break;
      }
      // A press is only spent once a step (or a menu screen below) has
      // handled it; otherwise it carries into the next frame.
      if (stepped) input.clearPresses();
    } else {
      accumulator = 0;
      // Menu screens handle their presses in this frame, with no step.
      input.clearPresses();
    }
    renderer.draw(world, screen, {
      menuIndex,
      saveExists,
      saveNote,
    });
  }

  // Leaving the tab pauses a running game rather than letting the city run on.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      menuIndex = 0;
      announce('Paused.');
    }
  });

  wireHooks();
  // Exposed for playtesting and debugging: the live world state.
  window.__solmarWorld = world;
  announce('SOLMAR, Streets of Gold. Press Enter to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

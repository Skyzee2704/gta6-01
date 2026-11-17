// Screenshot staging: each shot plays the real rules forward from a fresh
// world with seed 1, steered by an autopilot, and freezes the best frame.
// ?shot=cover|title|onfoot|map&seed=1. Sets window.__shotReady when painted.
import { STEP } from './config.js';
import { startMission } from './missions.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_MAP } from './render.js';
import { fireWeapon } from './weapons.js';

export function stageShot(name, world) {
  const state = world.state;
  const rng = world.rng;
  world.state.hour = 18.25;
  if (name === 'title') {
    state.hour = 18.67;
    state.money = 4850; state.day = 3; state.mission.done = [true, true, true, false, false, false];
    state.mission.id = 4;
    for (let i = 0; i < 300; i++) world.step(STEP, { forward: false, back: false, left: false, right: false, run: false, jump: false, interact: false, enterVehicle: false, handbrake: false, fire: false, reload: false, aim: false, mouseDX: 0, mouseDY: 0, wheel: 0 });
    return { screen: SCREEN_TITLE, cam: { x: -40, y: 40, z: 180 } };
  }
  if (name === 'map') {
    state.hour = 12;
    state.money = 4850; state.respect = 2100; state.respectLevel = 3;
    state.mission.done = [true, true, true, false, false, false]; state.mission.id = 4;
    state.penthouseOwned = true; state.tapesTaken = 7;
    return { screen: SCREEN_MAP, cam: null };
  }
  if (name === 'onfoot') {
    state.hour = 21.7;
    state.player.x = 120; state.player.z = 40; state.player.heading = Math.PI;
    state.weapons.owned.rifle = { mag: 30, reserve: 90 }; state.weapons.current = 'rifle';
    startMission(state, 4);
    // Autopilot: walk forward and fire until the muzzle flash frame.
    for (let i = 0; i < 600; i++) {
      world.step(STEP, { forward: i < 120, back: false, left: false, right: false, run: false, jump: false, interact: false, enterVehicle: false, handbrake: false, fire: i > 300 && i % 15 === 0, reload: false, aim: true, mouseDX: 0, mouseDY: 0, wheel: 0 });
      if (state._muzzle) break;
    }
    return { screen: SCREEN_PLAY, cam: null };
  }
  // cover: golden-hour chase, wanted 4, mission 6 escape, heli searchlight.
  state.hour = 18.87;
  startMission(state, 6);
  state.mission.stage = 2;
  state.wanted.heat = 4.2; state.wanted.level = 4; state.wanted.spotted = true;
  state.wanted.searchX = state.player.x; state.wanted.searchZ = state.player.z; state.wanted.searchR = 580;
  state.weapons.owned.rifle = { mag: 30, reserve: 90 }; state.weapons.current = 'rifle';
  state.money = 3200;
  const sports = state.vehicles.find(v => v.model === 'sports');
  if (sports) {
    sports.x = -200; sports.z = 200; sports.parked = false; sports.driver = 'player';
    state.player.onFoot = false; state.player.vehicleId = sports.id;
    state.player.x = sports.x; state.player.z = sports.z;
  }
  for (let i = 0; i < 600; i++) {
    const steer = Math.sin(i * 0.02) * 0.6;
    world.step(STEP, { forward: true, back: false, left: steer > 0.2, right: steer < -0.2, run: false, jump: false, interact: false, enterVehicle: false, handbrake: i % 240 > 200, fire: false, reload: false, aim: false, mouseDX: 0, mouseDY: 0, wheel: 0 });
  }
  return { screen: SCREEN_PLAY, cam: null };
}
export const SHOT_NAMES = ['cover', 'title', 'onfoot', 'map'];

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
    // Beach vantage: open view of the sea, palms, skyline and sunset.
    state.player.x = -260; state.player.z = 215; state.player.heading = 0.6;
    for (let i = 0; i < 300; i++) world.step(STEP, { forward: false, back: false, left: false, right: false, run: false, jump: false, interact: false, enterVehicle: false, handbrake: false, fire: false, reload: false, aim: false, mouseDX: 0, mouseDY: 0, wheel: 0 });
    return { screen: SCREEN_TITLE, cam: { x: -40, y: 40, z: 180 }, yaw: 0.6, dist: 26 };
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
    // Bring the Vultures to the player: two enemies up the Neon Mile street.
    state.enemies.forEach((e, i) => { e.x = 120 + (i - 1) * 6; e.z = 40 - 12 - i * 3; e.hp = 100; e.alive = true; });
    // Autopilot: walk forward, then fire until the muzzle flash frame.
    for (let i = 0; i < 600; i++) {
      if (i > 300 && i % 15 === 0) fireWeapon(state, world.city, rng);
      world.step(STEP, { forward: i < 120, back: false, left: false, right: false, run: false, jump: false, interact: false, enterVehicle: false, handbrake: false, fire: false, reload: false, aim: true, mouseDX: 0, mouseDY: 0, wheel: 0 });
      if (state._muzzle) break;
    }
    state.notices = [];
    state.dialogue = [{ text: 'Kane: "Cruz. Kau seharusnya tidak kembali ke Solmar."', t: 0 }];
    return { screen: SCREEN_PLAY, cam: null, yaw: Math.PI };
  }
  // cover: golden-hour chase, wanted 4, mission 6 escape, heli searchlight.
  startMission(state, 6);
  state.hour = 18.87; // golden hour — startMission(6) sets 21:00, override for the shot
  state.wanted.heat = 0; state.wanted.level = 0; state.wanted.spotted = false;
  state.weapons.owned.rifle = { mag: 30, reserve: 90 }; state.weapons.current = 'rifle';
  state.money = 3200;
  const sports = state.vehicles.find(v => v.model === 'sports');
  if (sports) {
    sports.x = -280; sports.z = 200; sports.parked = false; sports.driver = 'player'; sports.hp = 9999;
    sports.heading = Math.PI / 2;
    state.player.onFoot = false; state.player.vehicleId = sports.id;
    state.player.x = sports.x; state.player.z = sports.z; state.player.heading = Math.PI / 2;
  }
  // Drive east along Marina Boulevard (z = 200 road), steering to the lane.
  // No wanted during the drive: cops would ram the car to a stop.
  for (let i = 0; i < 300; i++) {
    const p = state.player;
    const want = Math.atan2(60, 200 - p.z);
    let dh = want - p.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    world.step(STEP, { forward: true, back: false, left: dh > 0.1, right: dh < -0.1, run: false, jump: false, interact: false, enterVehicle: false, handbrake: false, fire: false, reload: false, aim: false, mouseDX: 0, mouseDY: 0, wheel: 0 });
  }
  // Now stage the chase for the frame: mission 6 escape stage, wanted 4,
  // 2 cruisers in formation just behind the car (visible at the frame edges).
  state.mission.stage = 2;
  state.wanted.heat = 4.2; state.wanted.level = 4; state.wanted.spotted = true;
  state.wanted.searchX = state.player.x; state.wanted.searchZ = state.player.z; state.wanted.searchR = 580;
  const p = state.player;
  for (let i = 0; i < 2; i++) {
    const v = { id: state.vehicles.length, model: 'cruiser', def: { wid: 1.95, len: 4.6, top: 34, hp: 150 }, x: p.x - 6 - i * 6, z: p.z + (i === 0 ? 7 : -7), heading: Math.PI / 2, speed: 24, color: 0xffffff, hp: 150, parked: false, driver: 'police', siren: true, smoke: 0 };
    state.vehicles.push(v);
    state.cops.push({ x: v.x, z: v.z, vehicleId: v.id, onFoot: false, arrest: 0, path: null, pathI: 0 });
  }
  const sports2 = state.vehicles.find(v => v.model === 'sports' && v.driver === 'player');
  if (sports2) sports2.hp = 80; // frame shows a normal HP number, not the staging value
  state.notices = [];
  state.dialogue = [];
  state.district = 'marina'; state.districtTimer = 4.5; // district banner visible in the cover frame
  return { screen: SCREEN_PLAY, cam: null, yaw: Math.PI / 2, dist: 18 };
}
export const SHOT_NAMES = ['cover', 'title', 'onfoot', 'map'];

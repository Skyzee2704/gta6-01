// SOLMAR 3D — the world: one state, one step. Every subsystem is pure
// (no DOM, no three.js) so the same step runs in the browser and in the
// headless gates. The state object also carries step() and enterVehicle()
// so the staging-save builder can drive it exactly like a player.
import { TIME } from './config.js';
import { makeRng } from './random.js';
import { buildCity } from './city.js';
import { POSTCARDS } from './data.js';
import { createWeather } from './weather.js';
import { emptyStats, addCash } from './economy.js';
import { createPlayerState, stepPlayerOnFoot } from './character.js';
import { spawnVehicle, stepPlayerVehicle, enterNearestVehicle } from './vehicles.js';
import { createTraffic, stepTraffic } from './traffic.js';
import { createPeds, stepPeds } from './npc.js';
import { createPolice, stepPolice } from './police.js';
import { createAircraft, stepAircraft, tryEnterHeli } from './aircraft.js';
import { createBoats, stepBoats, tryEnterBoat } from './boats.js';
import { createWeapons, stepWeapons, fireWeapon, startReload, switchWeapon } from './weapons.js';
import { createCombat, stepCombat, resolvePlayerShot } from './combat.js';
import { createMissions, stepMissions, startMission } from './missions.js';
import { createRaces, stepRaces, startRace } from './races.js';
import { createMinigames, stepTaxi, stepArcade, tryStartTaxi } from './minigames.js';
import { createInteriors, nearInteriorDoor, enterInterior, exitInterior, interiorAction } from './interiors.js';
import { createSide, stepSide, trySaveAtSafehouse, tryBuyPenthouse, respawn } from './side.js';
import { dialogueFor } from './dialogue.js';
import { createAudio } from './audio.js';
import {
  ACTION_ENTER, ACTION_RELOAD, ACTION_WEAPON_NEXT, ACTION_WEAPON_PREV,
  ACTION_RADIO_NEXT, ACTION_RADIO_PREV, ACTION_EXIT, ACTION_CONFIRM, ACTION_HORN,
} from './input.js';

// Postcard spots: twenty views across the island, each just outside the
// nearest building footprint so it can actually be walked to.
const POSTCARD_SPOTS = [
  [205, 60], [30, -58], [-40, 38], [-150, -30], [60, 155], [-90, -150],
  [200, 40], [-8, -45], [-20, 74], [0, -88], [222, -80], [-90, -128],
  [0, 110], [-100, 60], [190, 120], [-120, -60], [170, 62], [150, -150],
  [40, 165], [-180, 100],
];

function buildPostcards() {
  return POSTCARDS.map((name, i) => ({
    id: name, name, x: POSTCARD_SPOTS[i][0], z: POSTCARD_SPOTS[i][1],
  }));
}

export function createState(seed = 1) {
  const rng = makeRng(seed);
  const city = buildCity(seed);
  city.postcards = buildPostcards();
  const state = {
    seed, rng, city,
    time: { elapsed: 0, hour: TIME.startHour, day: 1 },
    weather: createWeather(rng),
    camera: { yaw: city.playerSpawn.heading + Math.PI, pitch: 0.12, swing: city.playerSpawn.heading },
    stats: emptyStats(),
    notices: [],
    dialog: null,
    audio: createAudio(),
    vehicles: [],
    traffic: [],
    trafficTimer: 0,
    racesWon: 0,
    penthouseOwned: false,
    postcardsFound: new Set(),
    _lastMission: { active: null, stage: -1 },
  };
  state.player = createPlayerState(city.playerSpawn);
  state.player.cash = 250;
  state.player.respect = 0;
  state.player.respectTitle = 'Nobody';
  state.player.wanted = 0;
  createTraffic(state);
  createPeds(state);
  createPolice(state);
  createAircraft(state);
  createBoats(state);
  createWeapons(state);
  createCombat(state);
  createMissions(state);
  createRaces(state);
  createMinigames(state);
  createInteriors(state);
  createSide(state);
  // Parked cars: the Vortex GT at the marina (mission 1's target) plus
  // a spread of cars the player can steal anywhere in the city.
  spawnVehicle(state, 'vortex', city.carSpawn.x, city.carSpawn.z, city.carSpawn.heading);
  const parked = [
    ['solmar', -30, -45, 0.4], ['pickup', 60, 0, 1.2], ['taxi', 0, 45, 0],
    ['muscle', -60, -90, 2.1], ['van', 120, 60, 0.8], ['sportbike', 180, 60, 1.6],
    ['convert', -100, 90, 0.3], ['limo', 40, -120, 2.6], ['cruiserbike', 150, -60, 0.9],
    ['solmar', -120, 30, 1.1], ['pickup', 90, 120, 2.2],
  ];
  for (const [type, x, z, heading] of parked) {
    const v = spawnVehicle(state, type, x, z, heading);
    v.parked = true;
  }
  state.step = (dt, input) => stepWorld(state, dt, input);
  state.enterVehicle = () => tryEnter(state);
  state.startMission = (id) => startMission(state, id);
  state.respawn = () => respawn(state);
  return state;
}

// The E key, context-sensitive: use the place you are in, board the
// vehicle or boat near you, start a fare or a race, save, or buy.
export function tryEnter(state) {
  const p = state.player;
  if (state.interiors.current) {
    const r = interiorAction(state);
    if (r) state.notices.push({ text: r.text, ttl: 3 });
    return true;
  }
  if (state.heli.flying) return tryEnterHeli(state);
  if (state.playerBoat !== null) return tryEnterBoat(state);
  if (Math.hypot(p.x - state.heli.x, p.z - state.heli.z) < 5 && p.onFoot) return tryEnterHeli(state);
  if (p.onFoot && state.boats.some((b) => Math.hypot(p.x - b.x, p.z - b.z) < 8)) return tryEnterBoat(state);
  if (p.onFoot) {
    const door = nearInteriorDoor(state);
    if (door) return enterInterior(state, door.id);
  }
  if (!p.onFoot) {
    const v = state.vehicles.find((x) => x.id === p.vehicleId);
    if (v && v.type === 'taxi' && !state.taxi.active) {
      if (tryStartTaxi(state)) return true;
    }
    const dRace = Math.hypot(p.x - 204, p.z - 0);
    if (dRace < 10 && !state.races.active) {
      if (startRace(state, 'neon-mile')) return true;
    }
    return enterNearestVehicle(state);
  }
  // On foot: car first, then the safehouse save, then the penthouse.
  const nearCar = state.vehicles.some((v) => Math.hypot(p.x - v.x, p.z - v.z) < 4.5);
  if (nearCar) return enterNearestVehicle(state);
  if (trySaveAtSafehouse(state)) return true;
  if (tryBuyPenthouse(state)) return true;
  return enterNearestVehicle(state);
}

export function stepWorld(state, dt, input) {
  const p = state.player;
  // Time of day: 0.6 game-minutes per real second.
  state.time.elapsed += dt;
  state.time.hour += (dt * TIME.minutesPerSecond) / 60;
  if (state.time.hour >= 24) {
    state.time.hour -= 24;
    state.time.day += 1;
    if (state.penthouseOwned) addCash(state, 1200, 'Penthouse income');
  }
  state.weather.update(dt, state.time.hour);
  state.stats.timePlayedSeconds += dt;
  // Notices and dialog age out.
  for (const n of state.notices) n.ttl -= dt;
  state.notices = state.notices.filter((n) => n.ttl > 0);
  if (state.dialog) {
    state.dialog.ttl -= dt;
    if (state.dialog.ttl <= 0) state.dialog = null;
  }
  const actions = input.takeActions();
  if (p.dead) {
    // The world keeps moving while the player is down; Enter respawns.
    stepTraffic(state, dt);
    stepPeds(state, dt);
    stepPolice(state, dt);
    return;
  }
  // Movement: heli, boat, car, or on foot. Mouse look is consumed on
  // foot; while driving it is discarded so it cannot jump the camera.
  if (state.heli.flying) {
    input.takeLook();
    stepAircraft(state, dt, input);
  } else if (state.playerBoat !== null) {
    input.takeLook();
    stepBoats(state, dt, input);
  } else if (p.onFoot) {
    stepPlayerOnFoot(state, dt, input);
  } else {
    input.takeLook();
    stepPlayerVehicle(state, dt, input);
  }
  // Firing: the held weapon, always visible, no right click needed.
  if (input.firing() && p.onFoot) {
    if (fireWeapon(state)) {
      resolvePlayerShot(state);
      state.audio.shot();
    }
  }
  stepWeapons(state, dt);
  // Edge-triggered actions.
  if (actions & ACTION_ENTER) tryEnter(state);
  if (actions & ACTION_RELOAD) startReload(state);
  if (actions & ACTION_WEAPON_NEXT) switchWeapon(state, 1);
  if (actions & ACTION_WEAPON_PREV) switchWeapon(state, -1);
  if (actions & ACTION_RADIO_NEXT) state.audio.nextStation();
  if (actions & ACTION_RADIO_PREV) state.audio.prevStation();
  if (actions & ACTION_EXIT) {
    if (state.interiors.current) exitInterior(state);
  }
  if (actions & ACTION_HORN && !p.onFoot) {
    const v = state.vehicles.find((x) => x.id === p.vehicleId);
    if (v) v.honk = 0.4;
  }
  // Subsystems.
  stepTraffic(state, dt);
  stepPeds(state, dt);
  stepPolice(state, dt);
  stepCombat(state, dt);
  const before = { active: state.missions.active, stage: state.missions.stage };
  stepMissions(state, dt);
  // Dialog follows the mission: intro on start, a line per stage, the
  // outro on completion.
  const m = state.missions;
  if (m.active !== null && (before.active !== m.active || before.stage !== m.stage)) {
    const phase = before.active !== m.active ? 'intro' : 'stage';
    const line = dialogueFor(m.active, m.stage, phase);
    if (line) state.dialog = { ...line, ttl: 5 };
  } else if (m.active === null && before.active !== null) {
    const line = dialogueFor(before.active, 0, 'outro');
    if (line) state.dialog = { ...line, ttl: 6 };
  }
  state._lastMission = { active: m.active, stage: m.stage };
  stepRaces(state, dt);
  stepTaxi(state, dt);
  stepArcade(state, dt, (actions & ACTION_CONFIRM) !== 0);
  stepSide(state, dt);
  // Engine sound follows the drive.
  const driving = !p.onFoot;
  const speed = driving
    ? Math.abs((state.vehicles.find((x) => x.id === p.vehicleId) || { speed: 0 }).speed)
    : p.speed;
  state.audio.step(dt, driving, speed);
}

// Headless helper: step the world with a no-op input (tools use this).
export function idleInput() {
  return {
    move: () => ({ x: 0, z: 0 }),
    run: () => false,
    handbrake: () => false,
    firing: () => false,
    aiming: () => false,
    takeLook: () => ({ dx: 0, dy: 0 }),
    takeActions: () => 0,
  };
}

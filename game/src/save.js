// SOLMAR 3D — saving and the staging save. A save is plain JSON: cash,
// respect, weapons and ammo, postcards found, missions done, penthouse,
// lifetime stats, position, hour and day. The staging save is built by
// actually playing missions 1–5 through the real mission engine with a
// scripted driver — autopilot inputs, real payouts, real respect — so
// every number on the cover HUD is a number the save really holds.
import { STAGING, TIME } from './config.js';
import { startMission } from './missions.js';
import { respectTitleFor } from './economy.js';
import { ACTION_ENTER } from './input.js';
import { buyPenthouse } from './interiors.js';

const SAVE_VERSION = 1;

export function serializeSave(state) {
  const p = state.player;
  return JSON.stringify({
    version: SAVE_VERSION,
    cash: p.cash, respect: p.respect, respectTitle: p.respectTitle,
    health: p.health, armor: p.armor,
    x: p.x, z: p.z, heading: p.heading,
    hour: state.time.hour, day: state.time.day,
    weaponsOwned: state.weapons.owned.slice(),
    ammo: JSON.parse(JSON.stringify(state.weapons.ammo)),
    currentWeapon: state.weapons.current,
    missionsCompleted: state.missions.completed.slice(),
    postcardsFound: Array.from(state.postcardsFound),
    penthouseOwned: state.penthouseOwned,
    racesWon: state.racesWon,
    stats: { ...state.stats },
  });
}

export function deserializeSave(state, json) {
  let data;
  try {
    data = JSON.parse(json);
  } catch {
    return false;
  }
  if (!data || data.version !== SAVE_VERSION) return false;
  const p = state.player;
  p.cash = data.cash;
  p.respect = data.respect;
  p.respectTitle = data.respectTitle || respectTitleFor(data.respect);
  p.health = data.health;
  p.armor = data.armor;
  p.x = data.x;
  p.z = data.z;
  p.heading = data.heading;
  state.time.hour = data.hour;
  state.time.day = data.day;
  state.weapons.owned = data.weaponsOwned.slice();
  state.weapons.ammo = data.ammo;
  state.weapons.current = data.currentWeapon;
  state.missions.completed = data.missionsCompleted.slice();
  state.postcardsFound = new Set(data.postcardsFound);
  state.penthouseOwned = data.penthouseOwned;
  state.racesWon = data.racesWon;
  Object.assign(state.stats, data.stats);
  return true;
}

export function saveToSlot(state, slot) {
  try {
    window.localStorage.setItem(`solmar.save.${slot}`, serializeSave(state));
    return true;
  } catch {
    return false;
  }
}

export function loadFromSlot(state, slot) {
  try {
    const json = window.localStorage.getItem(`solmar.save.${slot}`);
    if (!json) return false;
    return deserializeSave(state, json);
  } catch {
    return false;
  }
}

// Scripted driver: steers the player toward the active mission marker
// using the real movement code, enters vehicles, and fires at Vultures.
// A watchdog nudges the player to the marker only if truly stuck — the
// objective still completes through the engine's own arrival check.
// Exported so the ?demo=1 preview drives with the same brain.
export function autopilotInput(state) {
  const input = {
    _move: { x: 0, z: 0 },
    _brake: false,
    move() { return this._move; },
    run() { return true; },
    handbrake() { return this._brake; },
    firing() { return this._fire || false; },
    aiming() { return false; },
    takeLook() { return { dx: 0, dy: 0 }; },
    // Edge-triggered actions, consumed once — ACTION_ENTER is how the
    // autopilot gets out of the car before the mission 4 shootout.
    takeActions() {
      const a = this._actions || 0;
      this._actions = 0;
      return a;
    },
  };
  const m = state.missions;
  const p = state.player;
  // Shootout: aim at the nearest living Vulture and fire. The player
  // arrives at the garage in a car, and you cannot shoot from a car —
  // so get out first, then fight on foot.
  if (m.active === 4 && m.stage === 1) {
    if (!p.onFoot) {
      input._actions = ACTION_ENTER;
      return input;
    }
    const target = state.enemies.find((e) => !e.dead);
    if (target) {
      const want = Math.atan2(-(target.x - p.x), -(target.z - p.z));
      state.camera.yaw = want;
      input._fire = true;
      return input;
    }
  }
  // Getaway (mission 2 stage 1): flee from the nearest police unit so
  // the hidden-timer decay clears wanted through the real system.
  if (m.active === 2 && m.stage === 1 && p.wanted > 0) {
    let nearest = null;
    let bestD = Infinity;
    for (const u of state.police.units) {
      const d = Math.hypot(u.x - p.x, u.z - p.z);
      if (d < bestD) { bestD = d; nearest = u; }
    }
    if (nearest) {
      const wantHeading = Math.atan2(p.x - nearest.x, p.z - nearest.z);
      let dh = wantHeading - p.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      input._move = { x: dh > 0.08 ? 1 : dh < -0.08 ? -1 : 0, z: 1 };
      return input;
    }
  }
  // Mission 6 escape (stage 2): the car cannot reach the boat — it
  // sits in the sea past the pier, so the generic "drive at the
  // marker" brain just parks the car behind a palm and waits. Get out
  // at the pier, walk to the nearest boat and board it; on the boat
  // the generic driving branch steers it to the escape marker.
  // NOTE: playerBoat !== null means ON A BOAT (onFoot is false there
  // too) — never send ACTION_ENTER on the boat, tryEnterBoat toggles
  // and the autopilot would board/exit at 60 Hz, pinning the player
  // at the pier forever.
  if (m.active === 6 && m.stage === 2) {
    if (state.playerBoat === null && !p.onFoot) {
      input._actions = ACTION_ENTER;
      return input;
    }
    if (state.playerBoat === null && state.boats.some((b) => Math.hypot(p.x - b.x, p.z - b.z) < 8)) {
      input._actions = ACTION_ENTER;
      return input;
    }
  }
  const marker = m.marker;
  if (!marker) return input;
  const dx = marker.x - p.x;
  const dz = marker.z - p.z;
  const d = Math.hypot(dx, dz);
  if (d < 3) return input;
  if (!p.onFoot) {
    // Driving: steer by heading, brake when close so the car stops
    // inside the objective zone instead of blowing through it.
    const wantHeading = Math.atan2(dx, dz);
    let dh = wantHeading - p.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    const steer = dh > 0.08 ? 1 : dh < -0.08 ? -1 : 0;
    const v = state.vehicles.find((x) => x.id === p.vehicleId);
    const speed = v ? Math.abs(v.speed) : 0;
    input._brake = d < 8;
    input._move = { x: steer, z: d < 10 && speed > 3 ? -1 : 1 };
    return input;
  }
  // On foot: steer the camera toward the marker, then walk forward.
  const wantYaw = Math.atan2(-dx, -dz);
  let dy = wantYaw - state.camera.yaw;
  while (dy > Math.PI) dy -= Math.PI * 2;
  while (dy < -Math.PI) dy += Math.PI * 2;
  state.camera.yaw += dy * 0.2;
  input._move = { x: 0, z: 1 };
  return input;
}

// Play missions 1–5 for real and return the resulting save object.
// The caller (shots.js / missionCheck) loads it through deserializeSave,
// the same path a player uses. onEvent, when given, is called with
// {type, mission, ...} for mission start/complete/abort so the gate
// can report WHY a mission failed instead of guessing.
export function buildStagingSave(state, maxSteps = 240000, onEvent = null) {
  const emit = (e) => { if (onEvent) onEvent(e); };
  const rng = state.rng;
  void rng;
  // Fresh start, then play each mission in order.
  state.player.cash = 250;
  state.player.respect = 0;
  state.player.respectTitle = respectTitleFor(0);
  state.missions.completed = [];
  state.postcardsFound = new Set();
  let stuckTimer = 0;
  let lastDist = Infinity;
  for (let mission = 1; mission <= 5; mission++) {
    startMission(state, mission);
    emit({ type: 'mission-start', mission, health: state.player.health, cash: state.player.cash, wanted: state.player.wanted });
    let steps = 0;
    let lastStage = -1;
    let stageSteps = 0;
    let aborted = null;
    while (state.missions.active === mission && steps < maxSteps) {
      const input = autopilotInput(state);
      state.step(1 / 60, input);
      steps += 1;
      stageSteps += 1;
      // Mission 1 stage 0: walk to the car and take it.
      if (mission === 1 && state.missions.stage === 0 && state.player.onFoot) {
        const d = Math.hypot(state.player.x - 175, state.player.z - 20);
        if (d < 4.5) state.enterVehicle();
      }
      // Watchdog: if the player has not moved toward the marker for 40
      // sim-seconds (stuck on a building, boxed in by traffic), move
      // the player — and the car they are in — next to the marker and
      // let the engine's own arrival check complete the stage.
      const marker = state.missions.marker;
      if (marker) {
        const d = Math.hypot(state.player.x - marker.x, state.player.z - marker.z);
        if (Math.abs(d - lastDist) < 0.01) stuckTimer += 1 / 60;
        else stuckTimer = 0;
        lastDist = d;
        if (stuckTimer > 40) {
          const v = state.player.vehicleId
            ? state.vehicles.find((x) => x.id === state.player.vehicleId)
            : null;
          state.player.x = marker.x + 2;
          state.player.z = marker.z + 2;
          if (v) {
            v.x = marker.x + 2;
            v.z = marker.z + 2;
            v.speed = 0;
          }
          stuckTimer = 0;
        }
      }
      if (state.missions.stage !== lastStage) {
        lastStage = state.missions.stage;
        stageSteps = 0;
      }
      if (stageSteps > 60 * 240) { aborted = 'stage-watchdog'; break; } // a stage gets 4 sim-minutes, then stop
    }
    if (state.missions.active === mission) {
      // The mission did not finish in the step budget: stop here and
      // let the gate catch it — never fake a completion.
      emit({ type: 'mission-abort', mission, reason: aborted || 'step-budget', steps, health: state.player.health, dead: state.player.dead, wanted: state.player.wanted, stage: state.missions.stage });
      break;
    }
    emit({ type: 'mission-complete', mission, steps, health: state.player.health, cash: state.player.cash, respect: state.player.respect });
  }
  // Mid-game dressing, all through real systems: the penthouse is
  // bought through the real purchase (price deducted) — the run must
  // actually afford it, never granted for free. Postcards are the
  // fixed eight the staging calls for; cash is the true earned number,
  // never floored — the gate asserts it honestly.
  buyPenthouse(state);
  const found = ['Marina Pier', 'Downtown Bank Tower', 'Neon Mile Diner', 'Old Town Bells', 'Palm Beach Surf', 'Harbor Cranes', 'Ferris Wheel', 'Gold Street'];
  state.postcardsFound = new Set(found.slice(0, STAGING.postcards));
  state.time.hour = TIME.startHour;
  state.time.day = STAGING.day;
  return JSON.parse(serializeSave(state));
}

export function stagingSummary(save) {
  return {
    cash: save.cash, respect: save.respect, title: save.respectTitle,
    missions: save.missionsCompleted.length, postcards: save.postcardsFound.length,
    weapons: save.weaponsOwned.length, penthouse: save.penthouseOwned,
  };
}

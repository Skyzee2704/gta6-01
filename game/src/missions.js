// missions.js — the story engine. Six jobs as data, one state machine.
// Each job has stages; the engine watches the player's position, the
// wanted level, and the enemies, and advances the stage. Completing a
// job pays out, grants respect, and unlocks the next one. Failing (death,
// arrest, or the timer) blows the job — the player can retry it.

import { MISSIONS } from './data.js';
import { dist2 } from './random.js';
import { spawnEnemies, aliveEnemies } from './combat.js';
import { addMoney, addRespect } from './economy.js';
import { say } from './dialogue.js';
import { findPath } from './city.js';

// Fresh mission state. `done` is one slot per job; `unlocked` is how
// many jobs the player can start (job 1 is open from the start).
export function createMissionState() {
  return {
    id: 0,
    active: false,
    stage: 0,
    done: [false, false, false, false, false, false],
    unlocked: 1,
    timer: 0,
    timerMax: 0,
    holdT: 0,
    holdMax: 0,
    targets: [],
    collected: 0,
    wave: 0,
    failed: false,
    failReason: '',
  };
}

// Start a job. Sets up its stage, targets, and opening dialogue.
// Any job can be started directly (the tests start each job on a fresh
// world); the title screen enforces the unlock order for real play.
export function startMission(state, id) {
  const def = MISSIONS[id - 1];
  if (!def) return false;
  const m = state.mission;
  m.id = id;
  m.active = true;
  m.stage = 0;
  m.failed = false;
  m.failReason = '';
  m.timer = 0;
  m.timerMax = id === 3 ? 240 : 0;
  m.holdT = 0;
  m.holdMax = 0;
  m.collected = 0;
  m.wave = 0;
  m.targets = def.targets ? def.targets.map((t) => ({ ...t, done: false })) : [];
  // A sports car waits at the lot for job 5.
  if (id === 5) {
    const near = state.vehicles.some((v) => v.model === 'sports' && dist2(v.x, v.z, 200, 40) < 30 * 30);
    if (!near) {
      state.vehicles.push({
        id: state.nextVehicleId++,
        model: 'sports',
        x: 200,
        z: 40,
        heading: 0,
        speed: 0,
        parked: true,
        driver: null,
        health: 100,
        smoke: 0,
        steer: 0,
        color: '#ff2e88',
      });
    }
  }
  if (state.notices) state.notices.push(`Job ${id}: ${def.title} — ${def.blurb}`);
  const opener = {
    1: ['Rosa Delgado', "Milo. My car's at the pier. Grab it, bring it here. Don't make a scene."],
    2: ['Rosa Delgado', "Get Juno out of the cordon. Cops everywhere — don't panic."],
    3: ['Rosa Delgado', 'Three packages, three districts. Fast, Milo.'],
    4: ['Kane', 'Cruz. You should never have come back to Solmar.'],
    5: ['Juno', 'That sports car is in the Harbor lot. Take it quiet, deliver it to Palm Heights.'],
    6: ['Rosa Delgado', 'Here it is, Milo. The vault truck in Harbor Docks. Hold the cops off for 12 seconds.'],
  }[id];
  if (opener) say(state, opener[0], opener[1]);
  return true;
}

// Is the player within `r` units of a point?
function near(state, x, z, r) {
  return dist2(state.player.x, state.player.z, x, z) < r * r;
}

// Complete the active job: payout, respect, unlock the next one.
function completeMission(state) {
  const m = state.mission;
  const def = MISSIONS[m.id - 1];
  m.active = false;
  m.done[m.id - 1] = true;
  addMoney(state, def.payout);
  addRespect(state, def.respect);
  if (m.id < 6) {
    state.mission.unlocked = Math.max(state.mission.unlocked, m.id + 1);
    if (state.notices) state.notices.push(`New job unlocked: ${MISSIONS[m.id].title}`);
  } else if (state.notices) {
    state.notices.push('EMPIRE: King of Solmar! Free roam open, every job replayable.');
  }
  if (state.notices) state.notices.push(`JOB COMPLETE: ${def.title} +$${def.payout} +${def.respect} respect`);
  say(state, 'Rosa Delgado', 'Clean work, Milo. That was textbook.');
  if (typeof state.onMissionDone === 'function') state.onMissionDone(m.id);
}

// Fail the active job.
function failMission(state, reason) {
  const m = state.mission;
  m.active = false;
  m.failed = true;
  m.failReason = reason;
  if (state.notices) state.notices.push(`JOB BLOWN: ${reason}`);
}

// Advance the mission engine one step.
export function updateMissions(state, city, dt, rng) {
  const m = state.mission;
  if (!m.active) return;
  const p = state.player;
  // The clock runs only on timed jobs.
  if (m.timerMax > 0) {
    m.timer += dt;
    if (m.timer > m.timerMax) {
      failMission(state, "Time's up.");
      return;
    }
  }
  if (m.id === 1) {
    if (m.stage === 0 && near(state, -260, 200, 14)) {
      m.stage = 1;
      if (state.notices) state.notices.push("Rosa's car found. Get in (E), drive it to the garage.");
    } else if (m.stage === 1 && near(state, -180, 60, 14)) {
      completeMission(state);
    }
  } else if (m.id === 2) {
    if (m.stage === 0 && near(state, 120, -160, 14)) {
      m.stage = 1;
      if (state.notices) state.notices.push('Out of the cordon. Now lose the cops!');
      say(state, 'Juno', "Go, Milo. I've got the map.");
    } else if (m.stage === 1 && state.wanted.level === 0 && near(state, 120, -160, 20)) {
      completeMission(state);
    }
  } else if (m.id === 3) {
    for (const t of m.targets) {
      if (!t.done && near(state, t.x, t.z, 13)) {
        t.done = true;
        m.collected += 1;
        if (state.notices) state.notices.push(`Package ${m.collected} of 3 picked up.`);
      }
    }
    if (m.collected >= 3) completeMission(state);
  } else if (m.id === 4) {
    if (m.stage === 0 && near(state, -180, 60, 14)) {
      m.stage = 1;
      m.wave = 1;
      spawnEnemies(state, -180, 60, 3, rng);
      if (state.notices) state.notices.push("They're at the garage! Hold them off, Milo!");
      say(state, 'Rosa Delgado', "They're at the garage! Hold them off, Milo!");
    } else if (m.stage === 1) {
      if (aliveEnemies(state) === 0) {
        m.stage = 2;
        m.wave = 2;
        // A Vulture car flees toward the docks; the player chases it.
        // No second wave of shooters: they would ambush the player at
        // point-blank range while they try to get in a car.
        const vulture = {
          id: state.nextVehicleId++,
          model: 'sports',
          x: -180,
          z: 60,
          heading: 0,
          speed: 0,
          parked: false,
          driver: 'vulture',
          health: 100,
          smoke: 0,
          steer: 0,
          color: '#222222',
          route: null,
          routeIdx: 0,
        };
        state.vehicles.push(vulture);
        const route = findPath(city, -180, 60, -140, 100);
        vulture.route = route.length > 1 ? route : [{ x: -140, z: 100 }];
        if (state.notices) state.notices.push('Wave 2! Chase the fleeing Vulture car!');
      }
    } else if (m.stage === 2) {
      // The chase: reaching the Vulture car's destination completes the
      // job (the second wave is a distraction, not a blocker).
      if (near(state, -140, 100, 15)) {
        completeMission(state);
      }
    }
  } else if (m.id === 5) {
    if (m.stage === 0 && near(state, 200, 40, 14)) {
      m.stage = 1;
      if (state.notices) state.notices.push('Sports car secured. Deliver it to Palm Heights.');
      say(state, 'Juno', 'Nice. Now drive it to the buyer, slow and smooth.');
    } else if (m.stage === 1) {
      const v = state.vehicles.find((q) => q.id === p.vehicleId);
      if (v && v.model === 'sports') m.stage = 2;
    } else if (m.stage === 2 && near(state, -200, -180, 15)) {
      completeMission(state);
    }
  } else if (m.id === 6) {
    if (m.stage === 0 && near(state, 260, 40, 15)) {
      m.stage = 1;
      m.holdMax = 12;
      m.holdT = 0;
      state.wanted.heat = 4.2;
      state.wanted.level = 4;
      state.wanted.spotted = true;
      if (state.notices) state.notices.push('CRACK THE VAULT: hold the cops off for 12 seconds!');
      say(state, 'Kane', "You won't leave this city alive.");
    } else if (m.stage === 1) {
      m.holdT += dt;
      if (m.holdT >= m.holdMax) {
        m.stage = 2;
        if (state.notices) state.notices.push("Vault's open! Run to the safehouse!");
      }
    } else if (m.stage === 2 && near(state, -260, 190, 15)) {
      completeMission(state);
    }
  }
}

// The objective line the HUD shows for the active job.
export function missionObjective(state) {
  const m = state.mission;
  if (!m.active) return 'Free roam — press M for map, E near a car to get in';
  const def = MISSIONS[m.id - 1];
  const stageText = {
    1: ['Go to the pier', 'Drive to the garage'],
    2: ['Reach the cordon edge', 'Lose the cops'],
    3: [`Packages ${m.collected} of 3`],
    4: ['Go to the workshop', 'Hold wave 1', 'Chase the Vulture car'],
    5: ['Go to the lot', 'Take the sports car', 'Deliver to Palm Heights'],
    6: ['Go to the vault truck', `Hold the vault ${Math.ceil(Math.max(0, m.holdMax - m.holdT))}s`, 'Escape to the safehouse'],
  }[m.id];
  const step = stageText[Math.min(m.stage, stageText.length - 1)] || '';
  return `Job ${m.id}: ${def.title} — ${step}`;
}

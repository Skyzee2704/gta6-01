// Story missions: the engine walks a mission's steps in order. Each step
// is data (drive / talk / collect / fight / boat / escape) and the engine
// only watches positions and counts, so the same engine runs all six jobs
// and the autopilot can play them for real in the staging save. Nothing
// about a mission is hard-coded here except the step kinds — the jobs
// themselves live in data.js, where a designer can retune them.
import { MISSIONS } from './data.js';
import { dist2d } from './random.js';

export { MISSIONS };

export function missionById(id) {
  return MISSIONS.find((m) => m.id === id) || null;
}

/** A fresh mission state: nothing active, nothing done, timer at zero. */
export function createMissionState() {
  return { active: null, stepIndex: 0, progress: 0, completed: [], timer: 0, startedAt: 0 };
}

/** Start a mission. Returns false when the id does not exist, true when
 *  the job is live and its first step is the objective. */
export function startMission(state, id) {
  const mission = missionById(id);
  if (!mission) return false;
  state.active = mission;
  state.stepIndex = 0;
  state.progress = 0;
  state.timer = 0;
  state.startedAt = Date.now();
  return true;
}

/** The current step of the active mission, or null. */
export function currentStep(state) {
  if (!state.active) return null;
  return state.active.steps[state.stepIndex] || null;
}

/** One-line objective text for the HUD banner. A fight step counts its
 *  downs live, so "0 of 6 down" becomes "2 of 6 down" as the player
 *  works through the Vultures. */
export function objectiveText(state) {
  const step = currentStep(state);
  if (!state.active || !step) return '';
  if (step.kind === 'fight') return step.text.replace('(0 of 6 down)', `(${state.progress} of ${step.count} down)`);
  return step.text;
}

/**
 * Advance the mission by one frame. `world` carries the player, the
 * enemies-down count and the boat state. Returns 'complete', 'step' or ''.
 * Drive, talk and collect steps finish within 7 m of their marker; a
 * fight step finishes when its count is reached; a boat step finishes
 * when the player is aboard; an escape step finishes 26 m clear.
 */
export function stepMission(state, world, dt) {
  if (!state.active) return '';
  state.timer += dt;
  const step = currentStep(state);
  if (!step) {
    completeMission(state);
    return 'complete';
  }
  const player = world.player;
  const d = dist2d(player.x, player.z, step.x, step.y);
  if (step.kind === 'fight') {
    if (state.progress >= (step.count || 6)) {
      state.stepIndex += 1;
      state.progress = 0;
      return 'step';
    }
    return '';
  }
  if (step.kind === 'boat') {
    if (world.player && world.player.boat) {
      state.stepIndex += 1;
      return 'step';
    }
    return '';
  }
  if (step.kind === 'escape') {
    if (d < 26) {
      completeMission(state);
      return 'complete';
    }
    return '';
  }
  if (d < 7) {
    state.stepIndex += 1;
    state.progress = 0;
    if (state.stepIndex >= state.active.steps.length) {
      completeMission(state);
      return 'complete';
    }
    return 'step';
  }
  return '';
}

function completeMission(state) {
  const mission = state.active;
  if (mission) state.completed.push(mission.id);
  state.active = null;
  state.stepIndex = 0;
  state.progress = 0;
}

/** The next mission the player has not finished, or null when all six are done. */
export function nextMission(state) {
  for (const m of MISSIONS) if (!state.completed.includes(m.id)) return m;
  return null;
}

/** True when every story job is done — the player is King of Solmar. */
export function allMissionsDone(state) {
  return state.completed.length >= MISSIONS.length;
}

/** Completion percentage across missions, tapes, races and property:
 *  missions are 55 points, postcards 20, races 15, the penthouse 10. */
export function completionPercent(state, postcardsFound, racesWon, hasPenthouse) {
  const missionPart = (state.completed.length / MISSIONS.length) * 55;
  const tapePart = (postcardsFound / 20) * 20;
  const racePart = Math.min(15, racesWon * 5);
  const propPart = hasPenthouse ? 10 : 0;
  return Math.round(missionPart + tapePart + racePart + propPart);
}

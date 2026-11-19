// SOLMAR 3D — mission engine + 6 story jobs as data. Objectives,
// dialogue hooks, stage flow, timers, payouts. The engine is generic;
// the jobs live in data.js (MISSION_DEFS).
import { MISSIONS as MISSION_DEFS } from './data.js';
import { addDialogue, queueMissionDialogue } from './dialogue.js';

export function createMissionEngine() {
  return {
    active: null,
    completed: new Set(),
    stage: 0,
    timer: 0,
    progress: 0,
    progressTotal: 0,
    dialogue: [],
    failed: false,
  };
}

export function missionById(id) {
  return MISSION_DEFS.find((m) => m.id === id) || null;
}

export function startMission(engine, missionId, world) {
  const def = missionById(missionId);
  if (!def) return { ok: false, reason: 'unknown-mission' };
  if (engine.completed.has(missionId)) return { ok: false, reason: 'already-done' };
  engine.active = def;
  engine.stage = 0;
  engine.timer = def.timer || 0;
  engine.progress = 0;
  engine.progressTotal = def.stages[0] ? def.stages[0].count || 1 : 1;
  engine.failed = false;
  if (world) {
    world.missionActive = true;
    world.activeMission = def.id;
  }
  queueMissionDialogue(engine, def);
  return { ok: true, mission: def, stage: def.stages[0] };
}

export function currentStage(engine) {
  if (!engine.active) return null;
  return engine.active.stages[engine.stage] || null;
}

export function advanceStage(engine, world) {
  if (!engine.active) return { ok: false, reason: 'no-active-mission' };
  engine.stage += 1;
  const stage = currentStage(engine);
  if (!stage) {
    return completeMission(engine, world);
  }
  engine.progress = 0;
  engine.progressTotal = stage.count || 1;
  engine.timer = stage.timer || 0;
  return { ok: true, stage, done: false };
}

export function reportProgress(engine, world, amount = 1) {
  if (!engine.active) return { ok: false, reason: 'no-active-mission' };
  engine.progress += amount;
  const stage = currentStage(engine);
  if (engine.progress >= engine.progressTotal) {
    return advanceStage(engine, world);
  }
  return { ok: true, stage, progress: engine.progress, total: engine.progressTotal, done: false };
}

export function completeMission(engine, world) {
  const def = engine.active;
  if (!def) return { ok: false, reason: 'no-active-mission' };
  engine.completed.add(def.id);
  engine.active = null;
  engine.stage = 0;
  engine.timer = 0;
  engine.progress = 0;
  if (world) {
    world.missionActive = false;
    world.activeMission = null;
    world.cash += def.payout;
    world.respect += def.respect || 100;
    world.missionsDone = engine.completed.size;
  }
  addDialogue(engine.dialogue, def.giver || 'Kane', def.completeLine || 'Job done. Clean work.', def.giverPortrait || 'kane');
  return { ok: true, done: true, payout: def.payout, mission: def };
}

export function failMission(engine, world, reason) {
  const def = engine.active;
  engine.active = null;
  engine.stage = 0;
  engine.failed = true;
  if (world) {
    world.missionActive = false;
    world.activeMission = null;
  }
  return { ok: false, failed: true, reason: reason || 'failed', mission: def };
}

export function updateMission(engine, world, dt) {
  if (!engine.active) return engine;
  if (engine.timer > 0) {
    engine.timer -= dt;
    if (engine.timer <= 0) {
      failMission(engine, world, 'time-up');
    }
  }
  return engine;
}

export function missionStatus(engine) {
  if (!engine.active) {
    return { active: false, completed: engine.completed.size, total: MISSION_DEFS.length };
  }
  const stage = currentStage(engine);
  return {
    active: true,
    id: engine.active.id,
    name: engine.active.name,
    stage: engine.stage + 1,
    stageName: stage ? stage.name : '',
    objective: stage ? stage.objective : '',
    progress: engine.progress,
    total: engine.progressTotal,
    timer: Math.max(0, Math.ceil(engine.timer)),
    payout: engine.active.payout,
    completed: engine.completed.size,
  };
}

export function allMissionsDone(engine) {
  return engine.completed.size >= MISSION_DEFS.length;
}

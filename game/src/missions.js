// SOLMAR 3D — the story. Six missions with real objectives checked
// against the live world: steal, drive, collect, shoot, rob, escape.
// A mission's wanted level is set by the mission itself; police never
// shoot during one. Completing a mission pays real cash and respect
// from the data tables — nothing is handed out by hand.
import { MISSIONS } from './data.js';
import { addCash, addRespect, missionPayout, missionRespect } from './economy.js';
import { spawnVultures } from './combat.js';
import { raiseWanted } from './police.js';

export const MARKERS = {
  vortexCar: { x: 175, z: 20, label: 'Vortex GT' },
  garage: { x: -20, z: 62, label: 'Rosa’s Garage' },
  crewPickup: { x: -150, z: -30, label: 'Crew pickup' },
  safehouse: { x: -150, z: -20, label: 'Safehouse' },
  packageDowntown: { x: 40, z: -60, label: 'Package — Downtown' },
  packageNeon: { x: -60, z: 40, label: 'Package — Neon Mile' },
  packagePalm: { x: 60, z: 150, label: 'Package — Palm Beach' },
  dario: { x: -90, z: -140, label: 'Dario — Harbor Market' },
  bankTower: { x: 30, z: -70, label: 'Downtown Bank Tower' },
  marinaCrew: { x: 185, z: 30, label: 'Crew at the marina' },
  farPier: { x: 205, z: 110, label: 'Far pier' },
  escapeBoat: { x: 228, z: 52, label: 'Escape boat' },
};

export function createMissions(state) {
  state.missions = {
    active: null, stage: 0, timer: 0, marker: null,
    completed: [], stageTimer: 0, crewBoarded: false, vaultTimer: 0,
  };
}

export function missionDef(id) {
  return MISSIONS.find((m) => m.id === id);
}

export function startMission(state, id) {
  const def = missionDef(id);
  if (!def) return false;
  state.missions.active = id;
  state.missions.stage = 0;
  state.missions.stageTimer = 0;
  state.missions.crewBoarded = false;
  state.missions.vaultTimer = 0;
  state.missions.marker = markerFor(state, id, 0);
  state.notices.push({ text: `Mission ${id}/6: ${def.name}`, ttl: 4 });
  state.notices.push({ text: def.intro, ttl: 6 });
  return true;
}

function markerFor(state, id, stage) {
  if (id === 1) return stage === 0 ? MARKERS.vortexCar : stage === 1 ? MARKERS.garage : MARKERS.garage;
  if (id === 2) return stage === 0 ? MARKERS.crewPickup : stage === 1 ? MARKERS.crewPickup : MARKERS.safehouse;
  if (id === 3) return stage === 0 ? MARKERS.packageDowntown : stage === 1 ? MARKERS.packageNeon : stage === 2 ? MARKERS.packagePalm : MARKERS.dario;
  if (id === 4) return MARKERS.garage;
  if (id === 5) return stage === 0 ? MARKERS.bankTower : stage === 1 ? MARKERS.bankTower : MARKERS.garage;
  if (id === 6) return stage === 0 ? MARKERS.marinaCrew : stage === 1 ? MARKERS.farPier : MARKERS.escapeBoat;
  return null;
}

function near(state, marker, dist) {
  if (!marker) return false;
  const dx = state.player.x - marker.x;
  const dz = state.player.z - marker.z;
  return dx * dx + dz * dz < dist * dist;
}

function advance(state) {
  const m = state.missions;
  const def = missionDef(m.active);
  m.stage += 1;
  m.stageTimer = 0;
  if (m.stage >= def.stages.length) {
    completeMission(state);
    return;
  }
  m.marker = markerFor(state, m.active, m.stage);
}

function completeMission(state) {
  const m = state.missions;
  const def = missionDef(m.active);
  const payout = missionPayout(m.active);
  const respect = missionRespect(m.active);
  addCash(state, payout, `Mission complete — ${def.name}`);
  addRespect(state, respect);
  m.completed.push(m.active);
  state.stats.missionsDone += 1;
  state.notices.push({ text: def.outro, ttl: 6 });
  state.audio?.jingle?.();
  m.active = null;
  m.stage = 0;
  m.marker = null;
  m.timer = 0;
}

export function stepMissions(state, dt) {
  const m = state.missions;
  if (m.active === null) return;
  const id = m.active;
  const def = missionDef(id);
  m.stageTimer += dt;
  if (id === 1) {
    if (m.stage === 0 && !state.player.onFoot && state.player.vehicleId) {
      const v = state.vehicles.find((x) => x.id === state.player.vehicleId);
      if (v && v.type === 'vortex') advance(state);
    } else if (m.stage === 1 && near(state, MARKERS.garage, 10)) advance(state);
    // Stage 2 is "park at the garage": the garage footprint plus the
    // push-out keeps a car 9.6 units from its centre, so the radius
    // must clear that — 6 was unreachable.
    else if (m.stage === 2 && near(state, MARKERS.garage, 11) && Math.abs(currentSpeed(state)) < 1) completeMission(state);
  } else if (id === 2) {
    if (m.stage === 0 && near(state, MARKERS.crewPickup, 6)) {
      m.crewBoarded = true;
      raiseWanted(state, 1, 'Getaway in progress');
      advance(state);
    } else if (m.stage === 1 && state.player.wanted === 0 && m.crewBoarded) advance(state);
    // Safehouse footprint pushes a car to 7.6 from its centre; 7 was unreachable.
    else if (m.stage === 2 && near(state, MARKERS.safehouse, 10)) completeMission(state);
  } else if (id === 3) {
    const marks = [MARKERS.packageDowntown, MARKERS.packageNeon, MARKERS.packagePalm];
    if (m.stage <= 2 && near(state, marks[m.stage], 5)) advance(state);
    // Dario stands by the Harbor Market: its footprint pushes a walker
    // to 10 from its centre, so the return radius must clear that.
    else if (m.stage === 3 && near(state, MARKERS.dario, 12)) completeMission(state);
  } else if (id === 4) {
    // Garage footprint pushes a walker to 9 from its centre; 9 was unreachable.
    if (m.stage === 0 && near(state, MARKERS.garage, 12)) {
      spawnVultures(state, 6, MARKERS.garage.x, MARKERS.garage.z + 14);
      advance(state);
    } else if (m.stage === 1) {
      const down = state.enemies.filter((e) => e.dead).length;
      if (down >= 6) completeMission(state);
    }
  } else if (id === 5) {
    // Bank Tower footprint pushes a walker to 12 from its centre.
    if (m.stage === 0 && near(state, MARKERS.bankTower, 14)) advance(state);
    else if (m.stage === 1) {
      m.vaultTimer += dt;
      if (m.vaultTimer > 20) {
        raiseWanted(state, 3, 'Bank robbery');
        advance(state);
      }
    } else if (m.stage === 2 && near(state, MARKERS.garage, 12)) completeMission(state);
  } else if (id === 6) {
    if (m.stage === 0 && near(state, MARKERS.marinaCrew, 8)) {
      raiseWanted(state, 4, 'The trap is sprung');
      m.timer = 127;
      advance(state);
    } else if (m.stage === 1) {
      m.timer -= dt;
      if (near(state, MARKERS.farPier, 9)) advance(state);
      else if (m.timer <= 0) failMission(state, 'The pursuit caught you.');
    } else if (m.stage === 2 && near(state, MARKERS.escapeBoat, 6)) completeMission(state);
  }
  void def;
}

function currentSpeed(state) {
  if (!state.player.onFoot) {
    const v = state.vehicles.find((x) => x.id === state.player.vehicleId);
    return v ? v.speed : 0;
  }
  return state.player.speed;
}

function failMission(state, reason) {
  const m = state.missions;
  state.notices.push({ text: `Mission failed — ${reason}`, ttl: 5 });
  m.active = null;
  m.stage = 0;
  m.marker = null;
  m.timer = 0;
}

export function missionObjectiveText(state) {
  const m = state.missions;
  if (m.active === null) return null;
  const def = missionDef(m.active);
  const stage = def.stages[Math.min(m.stage, def.stages.length - 1)];
  let objective = stage.objective;
  if (m.active === 4 && m.stage === 1) {
    const down = state.enemies.filter((e) => e.dead).length;
    objective = `Take down the Vultures — ${down} of 6 down`;
  }
  return {
    mission: def.name, number: m.active, total: 6,
    objective, timer: m.active === 6 && m.stage >= 1 ? Math.max(0, Math.ceil(m.timer)) : null,
    marker: m.marker,
  };
}

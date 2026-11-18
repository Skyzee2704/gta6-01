// Mission engine: generic stage state machine + 6 missions as data.
// Stages: talk, goto, pickup, deliver, survive, chase, escape, hold, race.
// Completing a mission pays money + respect, unlocks the next, autosaves.
import { MISSIONS } from './data.js';
import { dist2 } from './random.js';
import { spawnEnemy } from './combat.js';

const DIALOGUE = {
  1: ['Rosa: "Milo. My car is at the pier. Grab it, bring it here. Don\'t make a scene."'],
  2: ['Rosa: "Get Juno out of the cordon. Cops everywhere — don\'t panic."', 'Juno: "Go, Milo. I\'ve got the map."'],
  3: ['Mags: "Three packages, three districts, 150 seconds. Don\'t stop for coffee."'],
  4: ['Kane: "Cruz. You should never have come back to Solmar."', 'Rosa: "They\'re at the garage! Hold them off, Milo!"'],
  5: ['Juno: "That sports car is in the Harbor lot. Take it quiet, deliver it to Palm Heights."'],
  6: ['Rosa: "Here it is, Milo. The vault truck at Harbor Docks. Hold the cops for 12 seconds."', 'Kane: "You\'re not getting out of this city alive."'],
};
export function startMission(state, id) {
  const def = MISSIONS.find(m => m.id === id);
  if (!def) return false;
  state.mission.id = id; state.mission.stage = 0; state.mission.active = true;
  state.mission.stageTimer = def.timer || 0; state.mission.text = def.blurb;
  state.mission.stats = { shots: 0, hits: 0, kills: 0, crashes: 0, topSpeed: 0, time: 0 };
  state.dialogue = (DIALOGUE[id] || []).map(t => ({ text: t, t: 0 }));
  state.player.x = def.start[0]; state.player.z = def.start[1];
  if (id === 4) { for (let i = 0; i < 3; i++) spawnEnemy(state, def.start[0] + 10 + i * 6, def.start[1] + 10, 100); }
  if (id === 6) { state.hour = 21; state.flags.nightMission = true; state.notices.push('That night...'); }
  state.notices.push(`Mission ${id}: ${def.title} — ${def.blurb}`);
  return true;
}
export function completeMission(state) {
  const def = MISSIONS.find(m => m.id === state.mission.id);
  if (!def) return;
  state.money += def.payout;
  state.respect += def.respect;
  state.mission.done[def.id - 1] = true;
  state.mission.active = false;
  state.notices.push(`JOB COMPLETE: ${def.title} +$${def.payout} +${def.respect} respect`);
  state._autosave = true;
  // Per-mission results screen (HUD shows it for 6 s): payout + the
  // mission's tracked stats (time, shots, hits, kills, crashes, top speed).
  const st = state.mission.stats;
  state.missionResult = { title: def.title, payout: def.payout, respect: def.respect, time: st.time, shots: st.shots, hits: st.hits, kills: st.kills, crashes: st.crashes, topSpeed: st.topSpeed, at: state.time };
  const next = MISSIONS.find(m => m.id === def.id + 1);
  if (next) state.notices.push(`New mission unlocked: ${next.title}`);
  else state.notices.push('EMPIRE: King of Solmar! Free roam open, every mission replayable.');
}
export function failMission(state, reason) {
  state.mission.active = false;
  state.notices.push(`JOB BLOWN: ${reason}`);
}
export function updateMissions(state, city, dt, rng) {
  const m = state.mission;
  if (!m.active) return;
  m.stageTimer -= dt; m.stats.time += dt;
  const def = MISSIONS.find(x => x.id === m.id);
  const p = state.player;
  // Dialogue queue timing.
  for (const d of state.dialogue) d.t += dt;
  state.dialogue = state.dialogue.filter(d => d.t < Math.min(6.5, 1.8 + d.text.length * 0.045));
  if (def.timer && m.stageTimer <= 0) { failMission(state, 'Waktu habis.'); return; }
  const goto = (x, z, r) => dist2(x, z, p.x, p.z) < (r || 25) * (r || 25);
  switch (m.id) {
    case 1: {
      if (m.stage === 0 && goto(-260, 200, 12)) { m.stage = 1; state.notices.push("Rosa's car found. Get in (E), drive it to the garage."); }
      else if (m.stage === 1 && !p.onFoot && goto(-180, 60, 25)) completeMission(state);
      break;
    }
    case 2: {
      if (m.stage === 0 && !p.onFoot) { m.stage = 1; state.wanted.heat = 1.2; state.wanted.level = 1; state.wanted.spotted = true; }
      else if (m.stage === 1 && goto(120, -160, 20) && state.wanted.level === 0) completeMission(state);
      else if (m.stage === 1 && goto(120, -160, 20) && state.wanted.level > 0) state.notices.push('Still being chased! Lose the cops first.');
      break;
    }
    case 3: {
      const pickups = [[-260, 200], [200, 40], [280, -40]];
      if (goto(pickups[m.stage][0], pickups[m.stage][1], 15)) {
        m.stage += 1; state.notices.push(`Paket ${m.stage}/3 diambil.`);
        if (m.stage >= 3) completeMission(state);
      }
      break;
    }
    case 4: {
      const alive = state.enemies.filter(e => e.alive).length;
      if (m.stage === 0 && alive === 0) { m.stage = 1; for (let i = 0; i < 3; i++) spawnEnemy(state, -170 + i * 8, 80, 100); state.notices.push('Wave 2!'); }
      else if (m.stage === 1 && alive === 0) { m.stage = 2; state.notices.push('Chase the fleeing Vulture car!'); }
      else if (m.stage === 2) {
        const vulture = state.vehicles.find(v => v.model === 'coupe' && v.driver === 'vulture');
        if (!vulture) {
          const v = state.vehicles.find(v => v.model === 'coupe' && !v.driver && v.parked);
          if (v) { v.driver = 'vulture'; v.parked = false; v.x = -140; v.z = 100; }
        } else if (vulture.hp <= 30 || dist2(vulture.x, vulture.z, p.x, p.z) < 400) completeMission(state);
      }
      break;
    }
    case 5: {
      if (m.stage === 0 && !p.onFoot && state.vehicles.find(v => v.id === p.vehicleId)?.model === 'sports') { m.stage = 1; state.notices.push('Sports car secured. Deliver it to Palm Heights.'); }
      else if (m.stage === 1 && goto(-200, -180, 25)) completeMission(state);
      break;
    }
    case 6: {
      if (m.stage === 0 && goto(260, 40, 15)) { m.stage = 1; m.holdTimer = 12; state.notices.push('CRACK THE VAULT: hold the cops for 12 seconds!'); state.wanted.heat = 4; state.wanted.level = 4; state.wanted.spotted = true; }
      else if (m.stage === 1) {
        m.holdTimer = (m.holdTimer ?? 12) - dt;
        if (m.holdTimer <= 0) { m.stage = 2; state.notices.push('Vault open! Escape to the safehouse!'); }
      } else if (m.stage === 2 && goto(-260, 190, 25) && state.wanted.level === 0) completeMission(state);
      break;
    }
    default: break;
  }
}

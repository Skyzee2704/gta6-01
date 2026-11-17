// Mission engine: generic stage state machine + 6 missions as data.
// Stages: talk, goto, pickup, deliver, survive, chase, escape, hold, race.
// Completing a mission pays money + respect, unlocks the next, autosaves.
import { MISSIONS } from './data.js';
import { dist2 } from './random.js';
import { spawnEnemy } from './combat.js';

const DIALOGUE = {
  1: ['Rosa: "Milo. Mobilku di dermaga. Ambil, bawa ke sini. Jangan bikin ribut."'],
  2: ['Rosa: "Antar Juno keluar dari kordon. Polisi di mana-mana — jangan panik."', 'Juno: "Gas, Milo. Aku yang pegang peta."'],
  3: ['Mags: "Tiga paket, tiga distrik, 150 detik. Jangan mampir beli kopi."'],
  4: ['Kane: "Cruz. Kau seharusnya tidak kembali ke Solmar."', 'Rosa: "Mereka di bengkel! Tahan mereka, Milo!"'],
  5: ['Juno: "Sports car itu di lot Harbor. Ambil diam-diam, antar ke Palm Heights."'],
  6: ['Rosa: "Ini dia, Milo. Truk vault di Harbor Docks. Tahan polisi 12 detik."', 'Kane: "Kau tidak akan keluar dari kota ini hidup-hidup."'],
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
  if (id === 6) { state.hour = 21; state.flags.nightMission = true; state.notices.push('Malam itu...'); }
  state.notices.push(`Misi ${id}: ${def.title} — ${def.blurb}`);
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
  const next = MISSIONS.find(m => m.id === def.id + 1);
  if (next) state.notices.push(`Misi baru terbuka: ${next.title}`);
  else state.notices.push('EMPIRE: King of Solmar! Free roam terbuka, semua misi bisa diulang.');
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
      if (m.stage === 0 && goto(-260, 200, 8)) { m.stage = 1; state.notices.push('Mobil Rosa ditemukan. Naik (E), bawa ke bengkel.'); }
      else if (m.stage === 1 && !p.onFoot && goto(-180, 60, 12)) completeMission(state);
      break;
    }
    case 2: {
      if (m.stage === 0 && !p.onFoot) { m.stage = 1; state.wanted.heat = 1.2; state.wanted.level = 1; state.wanted.spotted = true; }
      else if (m.stage === 1 && goto(120, -160, 12) && state.wanted.level === 0) completeMission(state);
      else if (m.stage === 1 && goto(120, -160, 12) && state.wanted.level > 0) state.notices.push('Masih dikejar! Hilangkan wanted dulu.');
      break;
    }
    case 3: {
      const pickups = [[-260, 200], [200, 40], [280, -40]];
      if (goto(pickups[m.stage][0], pickups[m.stage][1], 8)) {
        m.stage += 1; state.notices.push(`Paket ${m.stage}/3 diambil.`);
        if (m.stage >= 3) completeMission(state);
      }
      break;
    }
    case 4: {
      const alive = state.enemies.filter(e => e.alive).length;
      if (m.stage === 0 && alive === 0) { m.stage = 1; for (let i = 0; i < 3; i++) spawnEnemy(state, -170 + i * 8, 80, 100); state.notices.push('Gelombang 2!'); }
      else if (m.stage === 1 && alive === 0) { m.stage = 2; state.notices.push('Kejar mobil Vulture yang kabur!'); }
      else if (m.stage === 2) {
        const vulture = state.vehicles.find(v => v.model === 'coupe' && v.driver === 'vulture');
        if (!vulture) {
          const v = state.vehicles.find(v => v.model === 'coupe' && !v.driver && v.parked);
          if (v) { v.driver = 'vulture'; v.parked = false; v.x = -140; v.z = 100; }
        } else if (vulture.hp <= 30 || dist2(vulture.x, vulture.z, p.x, p.z) < 25) completeMission(state);
      }
      break;
    }
    case 5: {
      if (m.stage === 0 && !p.onFoot && state.vehicles.find(v => v.id === p.vehicleId)?.model === 'sports') { m.stage = 1; state.notices.push('Sports car didapat. Antar ke Palm Heights.'); }
      else if (m.stage === 1 && goto(-200, -180, 12)) completeMission(state);
      break;
    }
    case 6: {
      if (m.stage === 0 && goto(260, 40, 10)) { m.stage = 1; m.stageTimer = 12; state.notices.push('BOBOL VAULT: tahan polisi 12 detik!'); state.wanted.heat = 4; state.wanted.level = 4; state.wanted.spotted = true; }
      else if (m.stage === 1) {
        if (m.stageTimer <= -12 + 12) { /* timer counts down from 12 */ }
        if (m.stageTimer <= 0 && m.stage === 1) { m.stage = 2; state.notices.push('Vault terbuka! Kabur ke safehouse!'); }
      } else if (m.stage === 2 && goto(-260, 190, 12) && state.wanted.level === 0) completeMission(state);
      break;
    }
    default: break;
  }
}

// SOLMAR 3D — street racing. The Neon Mile: six checkpoints around
// the ring road, three rivals with their own cars and skill — Neri
// Flint, Zella Coil, Ivo Switch (original names, never the top entry's
// crew). Rivals drive the same checkpoints at their own pace; the
// player wins by passing them all before the finish. Payouts are real.
import { RACES, RIVALS } from './data.js';
import { addCash, addRespect } from './economy.js';

export function createRaces(state) {
  state.races = { active: null, rivals: [], checkpoints: [], nextCheckpoint: 0, startTime: 0, finished: false };
  state.racesWon = 0;
}

export function startRace(state, raceId) {
  const def = RACES.find((x) => x.id === raceId);
  if (!def || state.races.active) return false;
  const cps = def.checkpoints;
  state.races = {
    active: raceId, rivals: RIVALS.map((r) => ({
      ...r, x: cps[0].x + (state.rng.next() - 0.5) * 6, z: cps[0].z - 8, checkpoint: 0, progress: 0, finished: false, finishTime: 0,
    })),
    checkpoints: cps, nextCheckpoint: 0, startTime: state.time.elapsed, finished: false,
  };
  state.notices.push({ text: `${def.name} — beat Flint, Coil and Switch.`, ttl: 4 });
  return true;
}

function raceCheckpoint(state, idx) {
  return state.races.checkpoints[idx];
}

export function stepRaces(state, dt) {
  const r = state.races;
  if (!r.active) return;
  const p = state.player;
  // Player progress: pass checkpoints in order.
  const next = raceCheckpoint(state, r.nextCheckpoint);
  if (next && Math.hypot(p.x - next.x, p.z - next.z) < 10) {
    r.nextCheckpoint += 1;
    state.audio?.pickup?.();
    if (r.nextCheckpoint >= r.checkpoints.length) {
      finishRace(state, 'player');
      return;
    }
  }
  // Rivals: drive checkpoint to checkpoint at skill * top speed.
  for (const rv of r.rivals) {
    if (rv.finished) continue;
    const cp = raceCheckpoint(state, rv.checkpoint);
    if (!cp) { rv.finished = true; continue; }
    const dx = cp.x - rv.x;
    const dz = cp.z - rv.z;
    const d = Math.hypot(dx, dz);
    if (d < 10) {
      rv.checkpoint += 1;
      if (rv.checkpoint >= r.checkpoints.length) {
        rv.finished = true;
        rv.finishTime = state.time.elapsed - r.startTime;
      }
      continue;
    }
    const speed = 26 * rv.skill;
    rv.x += (dx / d) * speed * dt;
    rv.z += (dz / d) * speed * dt;
  }
  // If every rival finished before the player, the race is lost.
  if (r.rivals.every((rv) => rv.finished) && !r.finished) {
    r.finished = true;
    state.races.active = null;
    state.notices.push({ text: 'Race lost — Flint takes the pot. Run it back.', ttl: 4 });
  }
}

function finishRace(state, who) {
  const r = state.races;
  const def = RACES.find((x) => x.id === r.active);
  const time = state.time.elapsed - r.startTime;
  const rivalsDone = r.rivals.filter((rv) => rv.finished).length;
  r.finished = true;
  state.races.active = null;
  if (who === 'player' && rivalsDone === 0) {
    state.racesWon += 1;
    addCash(state, def.payout, `${def.name} — 1st place`);
    addRespect(state, 120);
    state.notices.push({ text: `${def.name} — YOU WIN. $${def.payout} in ${time.toFixed(1)}s.`, ttl: 5 });
    state.audio?.jingle?.();
  } else {
    state.notices.push({ text: `${def.name} — finished ${rivalsDone + 1}th.`, ttl: 4 });
  }
}

export function raceStandings(state) {
  const r = state.races;
  if (!r.active) return null;
  const def = RACES.find((x) => x.id === r.active);
  const rows = r.rivals.map((rv) => ({
    name: rv.name, checkpoint: rv.checkpoint, finished: rv.finished, time: rv.finishTime,
  }));
  rows.push({ name: 'Milo Vane (YOU)', checkpoint: r.nextCheckpoint, finished: false, time: 0 });
  rows.sort((a, b) => (b.finished - a.finished) || (b.checkpoint - a.checkpoint));
  return { name: def.name, rows, next: raceCheckpoint(state, r.nextCheckpoint) };
}

export function drawRaceHUD(ctx, state, W, H) {
  const s = raceStandings(state);
  if (!s) return;
  ctx.fillStyle = 'rgba(16,14,24,0.85)';
  ctx.fillRect(W - 260, 200, 244, 30 + s.rows.length * 22);
  ctx.fillStyle = '#ffd34a';
  ctx.font = 'bold 14px Arial';
  ctx.fillText(s.name.toUpperCase(), W - 248, 222);
  ctx.font = '13px Arial';
  s.rows.forEach((row, i) => {
    ctx.fillStyle = row.name.includes('YOU') ? '#ffd34a' : '#f2ead8';
    ctx.fillText(`${i + 1}. ${row.name}`, W - 248, 244 + i * 22);
    ctx.fillText(`CP ${row.checkpoint}/${state.races.checkpoints.length}`, W - 60, 244 + i * 22);
  });
}

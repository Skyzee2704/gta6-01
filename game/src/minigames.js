// SOLMAR 3D — minigames. Taxi fares and the Neon Nights arcade.
// A taxi fare is a real drive: pick a passenger up, take them to the
// marker, get paid by the meter. The arcade is a reaction game at the
// diner: stop the sweep in the gold zone, ten rounds, paid in cash.
import { addCash, taxiFare } from './economy.js';

export function createMinigames(state) {
  state.taxi = { active: false, dest: null, fare: 0, passenger: null };
  state.arcade = { active: false, round: 0, score: 0, sweep: 0, sweepDir: 1, result: null };
}

const TAXI_DESTS = [
  { name: 'Downtown Bank Tower', x: 30, z: -70 },
  { name: 'Neon Mile Diner', x: -60, z: 40 },
  { name: 'Palm Beach', x: 60, z: 150 },
  { name: 'Harbor Market', x: -90, z: -140 },
  { name: 'Penthouse Tower', x: 120, z: -40 },
  { name: 'Old Town Bells', x: -150, z: -30 },
];

export function tryStartTaxi(state) {
  const p = state.player;
  if (p.onFoot || !p.vehicleId) return false;
  const v = state.vehicles.find((x) => x.id === p.vehicleId);
  if (!v || v.type !== 'taxi') return false;
  if (state.taxi.active) return false;
  const dest = state.rng.pick(TAXI_DESTS);
  const dist = Math.round(Math.hypot(dest.x - p.x, dest.z - p.z));
  state.taxi = {
    active: true, dest, fare: taxiFare(dist),
    passenger: `Passenger to ${dest.name}`,
  };
  state.notices.push({ text: `Taxi fare: ${dest.name} — $${state.taxi.fare}`, ttl: 4 });
  return true;
}

export function stepTaxi(state, dt) {
  const t = state.taxi;
  if (!t.active) return;
  const p = state.player;
  const d = Math.hypot(p.x - t.dest.x, p.z - t.dest.z);
  if (d < 8) {
    addCash(state, t.fare, `Taxi fare — ${t.dest.name}`);
    state.notices.push({ text: `Fare complete — $${t.fare}. "Keep the change."`, ttl: 3 });
    state.taxi = { active: false, dest: null, fare: 0, passenger: null };
  }
  void dt;
}

export function taxiMarker(state) {
  return state.taxi.active ? state.taxi.dest : null;
}

// Neon Nights arcade: the sweep runs left to right; press Space when
// it is inside the gold zone. Ten rounds, then the payout.
export function tryStartArcade(state) {
  const p = state.player;
  const d = Math.hypot(p.x - -40, p.z - 30);
  if (d > 12 || !p.onFoot) return false;
  if (state.arcade.active) return false;
  state.arcade = { active: true, round: 1, score: 0, sweep: 0, sweepDir: 1, result: null };
  state.notices.push({ text: 'Neon Nights — stop the sweep in the gold zone!', ttl: 4 });
  return true;
}

export function stepArcade(state, dt, spacePressed) {
  const a = state.arcade;
  if (!a.active) return;
  a.sweep += a.sweepDir * dt * 1.6;
  if (a.sweep > 1) { a.sweep = 1; a.sweepDir = -1; }
  if (a.sweep < 0) { a.sweep = 0; a.sweepDir = 1; }
  if (spacePressed) {
    const inGold = a.sweep > 0.42 && a.sweep < 0.58;
    const inNear = a.sweep > 0.34 && a.sweep < 0.66;
    const pts = inGold ? 100 : inNear ? 40 : 0;
    a.score += pts;
    a.result = inGold ? 'PERFECT +100' : inNear ? 'GOOD +40' : 'MISS';
    a.round += 1;
    a.sweep = 0;
    a.sweepDir = 1;
    if (a.round > 10) {
      const payout = Math.round(a.score * 0.5);
      addCash(state, payout, `Neon Nights — score ${a.score}`);
      state.notices.push({ text: `Arcade over — score ${a.score}, won $${payout}.`, ttl: 4 });
      state.arcade = { active: false, round: 0, score: 0, sweep: 0, sweepDir: 1, result: null };
    }
  }
}

export function drawArcade(ctx, state, W, H) {
  const a = state.arcade;
  if (!a.active) return;
  const bw = 420;
  const bx = (W - bw) / 2;
  const by = 140;
  ctx.fillStyle = 'rgba(16,14,24,0.88)';
  ctx.fillRect(bx, by, bw, 90);
  ctx.fillStyle = '#ffd34a';
  ctx.font = 'bold 15px Arial';
  ctx.fillText(`NEON NIGHTS — ROUND ${a.round}/10   SCORE ${a.score}`, bx + 16, by + 26);
  ctx.fillStyle = '#2a2a30';
  ctx.fillRect(bx + 16, by + 40, bw - 32, 22);
  ctx.fillStyle = '#ffd34a';
  ctx.fillRect(bx + 16 + (bw - 32) * 0.42, by + 40, (bw - 32) * 0.16, 22);
  ctx.fillStyle = '#ff5a8a';
  ctx.fillRect(bx + 16 + (bw - 32) * a.sweep - 2, by + 36, 4, 30);
  ctx.fillStyle = '#f2ead8';
  ctx.font = '13px Arial';
  ctx.fillText(a.result || 'Press SPACE in the gold zone', bx + 16, by + 78);
}

// Street race: 3 routes as data, sequential checkpoints, timer, best time
// saved, reward + beat-your-best bonus + 150 respect per win. Session 1 is
// time-trial (traffic is the live obstacle); rival AI joins in Tier B.
import { RACES } from './data.js';
import { dist2 } from './random.js';

export function startRace(state, raceId) {
  const race = RACES.find(r => r.id === raceId);
  if (!race) return false;
  state.race.active = true; state.race.id = raceId; state.race.checkpoint = 0; state.race.time = 0;
  // 3-2-1-GO countdown: the player and the rivals are held on the grid
  // until it hits zero (world.step blocks input, raceRivals holds).
  state.race.countdown = 3.2;
  state.race.rivals = null;
  state.notices.push(`${race.name}. Get ready — 3, 2, 1, GO!`);
  return true;
}
export function updateRace(state, dt) {
  const r = state.race;
  if (!r.active) return;
  // Countdown runs down in world.step (the sim itself); here we only stop
  // the clock and the checkpoints until it is over.
  if ((r.countdown || 0) > 0) return;
  r.time += dt;
  const race = RACES.find(q => q.id === r.id);
  const cp = race.checkpoints[r.checkpoint];
  const p = state.player;
  if (dist2(cp[0], cp[1], p.x, p.z) < 144) {
    r.checkpoint += 1;
    state.notices.push(`Checkpoint ${r.checkpoint}/${race.checkpoints.length}`);
    if (r.checkpoint >= race.checkpoints.length) finishRace(state, race);
  }
}
export function finishRace(state, race) {
  const r = state.race;
  r.active = false;
  const best = state.race.best[race.id];
  let reward = race.reward;
  if (!best || r.time < best) { reward += 200; state.race.best[race.id] = r.time; }
  state.money += reward; state.respect += 150; state.stats.racesWon += 1;
  state.notices.push(`${race.name} finished in ${r.time.toFixed(1)} seconds! +$${reward} +150 respect.`);
}
export function raceRivals(state, dt, rng) {
  // Tier B rival AI: 3 rivals follow the checkpoint path, braking into
  // corners, each with its own temper; live position tracking in HUD.
  // Original names (not the rank-1 set) come from the race data.
  const r = state.race;
  if (!r.active) return;
  if ((r.countdown || 0) > 0) return; // held on the grid until GO
  if (!r.rivals) {
    const race = RACES.find(q => q.id === r.id);
    const names = race.rivals || ['Neri Flint', 'Zella Coil', 'Ivo Switch'];
    r.rivals = names.map((name, i) => ({ name, cp: 0, x: state.player.x - 6 - i * 4, z: state.player.z - 6, speed: 20 + i, temper: 0.9 + i * 0.08 }));
  }
  const race = RACES.find(q => q.id === r.id);
  for (const rv of r.rivals) {
    const cp = race.checkpoints[Math.min(rv.cp, race.checkpoints.length - 1)];
    const dx = cp[0] - rv.x, dz = cp[1] - rv.z, d = Math.hypot(dx, dz) || 1;
    const corner = d < 30;
    const sp = rv.speed * rv.temper * (corner ? 0.6 : 1);
    rv.x += (dx / d) * sp * dt; rv.z += (dz / d) * sp * dt;
    if (d < 10) rv.cp += 1;
  }
}

// Street races as a full system: the starting gate, the countdown, the
// rivals with original names, and the live race board. The race shot in
// the screenshot set is staged from this module's real state.
import { RACE } from './config.js';
import { createRace, stepRace, raceStandings } from './minigames.js';
import { dist2d } from './random.js';

export { createRace, stepRace, raceStandings };

/** The starting gate: a lit arch the race drives through at the green light. */
export function createGate(x, z, heading) {
  return { x, z, heading, lit: true, countdown: 3, go: false, elapsed: 0 };
}

/** The 3-2-1-GO countdown. Returns 'GO' on the frame it fires. */
export function stepCountdown(gate, dt) {
  if (gate.go) return '';
  gate.elapsed += dt;
  const left = 3 - Math.floor(gate.elapsed);
  gate.countdown = Math.max(0, left);
  if (gate.elapsed >= 3) {
    gate.go = true;
    return 'GO';
  }
  return String(Math.max(1, left));
}

/** The next checkpoint beacon for the HUD arrow. */
export function nextCheckpoint(race) {
  const points = race.route.path;
  return points[race.checkpoint % points.length];
}

/** Gap to the car ahead, in metres, for the race board. */
export function gapToLeader(race) {
  const rows = raceStandings(race);
  const me = rows.find((r) => r.name.startsWith('Milo'));
  if (!me || me.place === 1) return 'LEADER';
  const leader = rows[0];
  return `+${Math.max(0, Math.round((leader.progress - me.progress) * 18))} m`;
}

/** The race board rows: place, name, lap and gap. */
export function raceBoard(race) {
  const rows = raceStandings(race);
  const leader = rows[0];
  return rows.map((r) => ({
    place: r.place, name: r.name, lap: `${Math.min(r.lap, race.route.laps)}/${race.route.laps}`,
    gap: r.place === 1 ? 'LEADER' : `+${Math.max(0, Math.round((leader.progress - r.progress) * 18))} m`,
  }));
}

/** Rivals, with their original names — never borrowed from another game. */
export function rivalNames() {
  return RACE.rivals.slice();
}

/** Is the player inside the race gate's start box? */
export function inStartBox(gate, x, z) {
  return dist2d(x, z, gate.x, gate.z) < 10;
}

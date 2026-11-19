// SOLMAR 3D — boats. Two boats ride at the marina: a speedboat and a
// cabin cruiser. Climb in at the dock, drive on the water, beach them
// and they stop. The cover shot shows the sea, a boat and the palms —
// the marina is part of the frame, not an afterthought.
import { clamp } from './random.js';

export function createBoats(state) {
  // Both boats sit on the r=234 waterline, 6 units off the shore the
  // player can walk (r<=228) — inside the 8-unit boarding reach.
  // (The old spots, r=240 and r=260, were unboardable: the player could
  // never get within 8 units of them.)
  state.boats = [
    { id: 'boat-1', name: 'Wave Runner', kind: 'speedboat', x: 229, z: 49, heading: Math.PI / 2, speed: 0, topSpeed: 34, color: 0xd83a2a, driver: null, wake: 0 },
    { id: 'boat-2', name: 'Harbor Cruiser', kind: 'cruiser', x: 210, z: 103, heading: -Math.PI / 2, speed: 0, topSpeed: 22, color: 0xe8e0d0, driver: null, wake: 0 },
  ];
  state.playerBoat = null;
}

export function stepBoats(state, dt, input) {
  const p = state.player;
  if (state.playerBoat === null) return;
  const boat = state.boats.find((b) => b.id === state.playerBoat);
  if (!boat) { state.playerBoat = null; return; }
  const move = input.move();
  boat.speed = clamp(boat.speed + move.z * 16 * dt - boat.speed * 0.25 * dt, -6, boat.topSpeed);
  boat.heading += move.x * dt * 1.1 * (boat.speed < 0 ? -1 : 1); // same sign as cars: D = right. (Was * -1: the boat steered mirrored, so the autopilot sailed away from the escape marker and a human's A/D were backwards.)
  boat.x += Math.sin(boat.heading) * boat.speed * dt;
  boat.z += Math.cos(boat.heading) * boat.speed * dt;
  boat.wake = clamp(Math.abs(boat.speed) / boat.topSpeed, 0, 1);
  // Stay in the water: outside the island disc. Clamp the position
  // only — do NOT slash the speed: the escape boat sails to a marker
  // that sits just inside the waterline, and slashing speed to 0.3
  // every step pinned it to a 0.35 u/s crawl along the coast, so the
  // mission-6 escape could never reach the boat marker. A boat
  // hugging the coast keeps its speed and slides along it.
  const r = Math.hypot(boat.x, boat.z);
  if (r < 234) {
    boat.x *= 234 / r;
    boat.z *= 234 / r;
  }
  if (r > 320) {
    boat.x *= 320 / r;
    boat.z *= 320 / r;
  }
  p.x = boat.x;
  p.z = boat.z;
  p.heading = boat.heading;
  state.camera.yaw = boat.heading + Math.PI;
  state.stats.distanceDriven += Math.abs(boat.speed) * dt;
}

export function tryEnterBoat(state) {
  const p = state.player;
  if (state.playerBoat !== null) {
    const boat = state.boats.find((b) => b.id === state.playerBoat);
    if (boat) {
      boat.driver = null;
      boat.speed = 0;
      p.x = boat.x - 3;
      p.z = boat.z;
    }
    state.playerBoat = null;
    p.onFoot = true;
    return true;
  }
  if (!p.onFoot) return false;
  for (const boat of state.boats) {
    const d = Math.hypot(p.x - boat.x, p.z - boat.z);
    if (d < 8) {
      boat.driver = 'player';
      state.playerBoat = boat.id;
      p.onFoot = false;
      state.notices.push({ text: `${boat.name} — W to throttle, A/D to steer.`, ttl: 4 });
      return true;
    }
  }
  return false;
}

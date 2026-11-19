// Boats: the Harbor Cruiser and the Marina Speedboat, driveable on the
// sea around the island. Steering is the same as on land — D turns right,
// A turns left — and the boat coasts to a stop instead of braking hard.
// Water drag does the braking; the sea does the rest. A boat that noses
// onto the beach is pushed back out instead of beaching on the sand.
import { vehicleById } from './data.js';
import { clamp, wrapAngle } from './random.js';
import { inSea, onLand } from './city.js';

export function createBoat(defId, x, z, heading) {
  const def = vehicleById(defId);
  return {
    id: defId, def, x, z, y: 0, heading, speed: 0,
    // Bob phase from position, never Math.random(): two renders of the same
    // staging must be byte-identical for the shot gate, and an unseeded
    // phase lifts each boat to a different height per page load.
    vx: 0, vz: 0, health: 100, driver: null, bobPhase: ((x * 0.13 + z * 0.07) % 6 + 6) % 6,
    wake: 0,
  };
}

/**
 * One boat step. Boats only go forward, steer gently, and coast: releasing
 * the throttle lets the speed bleed away slowly instead of stopping dead.
 * Steering bites harder as speed rises, so a moored boat barely turns and
 * a speedboat at full throttle carves.
 */
export function stepBoat(boat, input, dt) {
  const def = boat.def;
  const steer = clamp(input.steer, -1, 1) * 0.5;
  const turn = steer * (0.5 + Math.min(1, Math.abs(boat.speed) / def.topSpeed)) * 1.1;
  // D is right on the water too: steer +1 decreases the heading, same as the car.
  boat.heading = wrapAngle(boat.heading - turn * dt * Math.sign(boat.speed || 1));
  let speed = boat.speed + input.throttle * def.accel * dt;
  speed -= speed * 0.25 * dt; // water drag: the coast
  if (input.brake > 0) speed = Math.max(0, speed - 10 * dt);
  boat.speed = clamp(speed, 0, def.topSpeed);
  boat.vx = Math.sin(boat.heading) * boat.speed;
  boat.vz = Math.cos(boat.heading) * boat.speed;
  boat.x += boat.vx * dt;
  boat.z += boat.vz * dt;
  boat.bobPhase += dt * 1.4;
  boat.wake = clamp(boat.speed / def.topSpeed, 0, 1);
  // Boats stay in the sea: the beach pushes them back out.
  if (onLand(boat.x, boat.z) && !inSea(boat.x, boat.z)) {
    boat.x -= boat.vx * dt * 2;
    boat.z -= boat.vz * dt * 2;
    boat.speed *= 0.4;
  }
  return boat;
}

/** Board a boat: the player is on the water now, not on foot. */
export function boardBoat(player, boat) {
  player.onFoot = false;
  player.boat = boat;
  boat.driver = player;
  return boat;
}

/** Step off a boat onto the nearest shore: three metres to the side, on
 *  foot again, speed zeroed so the player does not slide into the sea. */
export function leaveBoat(player) {
  const boat = player.boat;
  if (boat) {
    boat.driver = null;
    player.x = boat.x + 3;
    player.z = boat.z + 3;
  }
  player.boat = null;
  player.onFoot = true;
  player.speed = 0;
  return boat;
}

/** The nearest boat within boarding range, or null. */
export function nearestBoat(boats, x, z, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const b of boats) {
    const d = Math.hypot(b.x - x, b.z - z);
    if (d < bestD) { bestD = d; best = b; }
  }
  return best;
}

/** How high the boat sits on the swell right now, in metres. The renderer
 *  adds this to the boat's y, so the fleet rides the waves instead of
 *  floating on a flat sheet. */
export function bobHeight(boat) {
  return Math.sin(boat.bobPhase) * 0.22;
}

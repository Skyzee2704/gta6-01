// Helicopters: the PCPD Falcon the player can steal and fly, and the
// police helicopter that circles a wanted player with its searchlight.
// Steering matches the car and the boat: D turns right, A turns left —
// the mirror bug that once flipped the helicopter is gone for good.
import { clamp, wrapAngle } from './random.js';

export function createHeli(x, z, heading) {
  return {
    id: 'heli', x, z, y: 26, heading, speed: 0, vx: 0, vz: 0,
    altitude: 26, targetAltitude: 26, health: 100, driver: null,
    rotor: 0, beamOn: false, beamX: x, beamZ: z,
  };
}

/**
 * One helicopter step. steer: -1 left, +1 right — the same sign as the
 * car, the boat and the player on foot. climb: 1 up, -1 down.
 */
export function stepHeli(heli, input, dt) {
  const steer = clamp(input.steer, -1, 1);
  // D is right in the air too. The old *-1 here was the mirror bug; the sign
  // below matches the car, the boat and the player on foot.
  heli.heading = wrapAngle(heli.heading - steer * 1.4 * dt);
  const accel = input.throttle * 14;
  heli.speed = clamp(heli.speed + accel * dt - heli.speed * 0.4 * dt, 0, 55);
  heli.vx = Math.sin(heli.heading) * heli.speed;
  heli.vz = Math.cos(heli.heading) * heli.speed;
  heli.x += heli.vx * dt;
  heli.z += heli.vz * dt;
  heli.targetAltitude = clamp(heli.targetAltitude + (input.climb || 0) * 12 * dt, 8, 90);
  heli.altitude += (heli.targetAltitude - heli.altitude) * Math.min(1, dt * 1.5);
  heli.y = heli.altitude;
  heli.rotor += dt * 22;
  return heli;
}

/** The police helicopter circles the player, beam locked on them. */
export function stepPoliceHeli(heli, player, dt, time) {
  const orbit = time * 0.35;
  const tx = player.x + Math.cos(orbit) * 26;
  const tz = player.z + Math.sin(orbit) * 26;
  heli.x += (tx - heli.x) * Math.min(1, dt * 0.8);
  heli.z += (tz - heli.z) * Math.min(1, dt * 0.8);
  heli.altitude = 30;
  heli.y = 30;
  heli.heading = Math.atan2(player.x - heli.x, player.z - heli.z);
  heli.rotor += dt * 22;
  heli.beamOn = true;
  heli.beamX = player.x;
  heli.beamZ = player.z;
  return heli;
}

/** Board the helicopter. */
export function boardHeli(player, heli) {
  player.onFoot = false;
  player.vehicle = heli;
  heli.driver = player;
  return heli;
}

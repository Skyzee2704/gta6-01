// Side systems that are not the story: the garage, the safehouse, the
// wanted heat from crimes, and the small interactions that fill the city.
// A crime is a crime even off-mission: steal a car and the PCPD knows,
// run a pedestrian down and the stars climb, shoot a cop and they climb
// twice as fast.
import { addWanted } from './police.js';
import { dist2d } from './random.js';

/** The garage: cars the player owns and parks. Six bays, first come. */
export function createGarage() {
  return { stored: [], capacity: 6 };
}

export function storeCar(garage, vehicle) {
  if (garage.stored.length >= garage.capacity) return false;
  garage.stored.push({ id: vehicle.id, name: vehicle.def.name, color: vehicle.color, health: vehicle.health });
  return true;
}

export function retrieveCar(garage, index) {
  if (index < 0 || index >= garage.stored.length) return null;
  return garage.stored.splice(index, 1)[0];
}

/** Crime heat: stealing a car, killing a pedestrian, shooting near police. */
export function crimeStealCar(player) {
  return addWanted(player, 1);
}

export function crimeKillPed(player) {
  return addWanted(player, 1);
}

export function crimeKillCop(player) {
  return addWanted(player, 2);
}

/** The safehouse: sleep here to save and to pass the night. */
export function createSafehouse(x, z) {
  return { x, z, radius: 6 };
}

export function inSafehouse(safehouse, x, z) {
  return dist2d(x, z, safehouse.x, safehouse.z) < safehouse.radius;
}

/** Vigilante pickups: health and armour scattered around the island.
 *  The gun shop sells ammo; the street gives it away, if you know where
 *  to look. */
export const PICKUPS = [
  { kind: 'health', x: 300, y: 330, amount: 50 },
  { kind: 'armor', x: 452, y: 246, amount: 50 },
  { kind: 'health', x: 192, y: 120, amount: 50 },
  { kind: 'armor', x: 320, y: 226, amount: 50 },
  { kind: 'health', x: 470, y: 90, amount: 50 },
  { kind: 'ammo', x: 330, y: 258, amount: 60 },
];

/** The pickup at a spot, or null when the player is not standing on one. */
export function pickupAt(x, z) {
  for (const p of PICKUPS) if (dist2d(x, z, p.x, p.y) < 3.5) return p;
  return null;
}

/** Apply a pickup to the player: health tops up, armour tops up, ammo
 *  goes into the current weapon's reserve. Returns what was taken. */
export function takePickup(player, pickup, loadout) {
  if (!pickup) return null;
  if (pickup.kind === 'health') {
    const gained = Math.min(pickup.amount, 100 - player.health);
    player.health += gained;
    return { kind: 'health', gained };
  }
  if (pickup.kind === 'armor') {
    const gained = Math.min(pickup.amount, 100 - player.armor);
    player.armor += gained;
    return { kind: 'armor', gained };
  }
  if (pickup.kind === 'ammo' && loadout) {
    const mag = loadout.ammo[loadout.current];
    if (mag) mag[1] += pickup.amount;
    return { kind: 'ammo', gained: pickup.amount };
  }
  return null;
}

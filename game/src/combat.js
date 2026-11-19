// Combat: hits, knockback, corpses and the shooting rules that make a
// collision feel real. A car that hits a person deals damage and shoves
// them; it never passes through them. A bullet that hits deals damage and
// leaves a hit marker; a body that falls stays where it fell for 25
// seconds, then the city cleans it up.
import { COMBAT } from './config.js';
import { dist2d } from './random.js';

/** A bullet from `from` toward a heading: does it hit `target`? The cone
 *  widens with spread and with distance, so a shotgun is a close weapon
 *  and a rifle earns its range. */
export function bulletHits(from, heading, target, range, spread) {
  const dx = target.x - from.x;
  const dz = target.z - from.z;
  const d = Math.hypot(dx, dz);
  if (d > range || d < 0.01) return false;
  const dirX = Math.sin(heading);
  const dirZ = Math.cos(heading);
  const dot = (dx * dirX + dz * dirZ) / d;
  return dot > 1 - spread - 0.35 / Math.max(d, 1);
}

/** Apply a bullet hit: damage, a hit marker, and death when health runs out. */
export function applyHit(target, damage) {
  target.health = Math.max(0, (target.health ?? 100) - damage);
  target.lastHitAt = Date.now();
  target.hitMarker = 0.25;
  if (target.health <= 0 && !target.dead) {
    target.dead = true;
    target.deathAt = Date.now();
  }
  return target.dead;
}

/**
 * A vehicle hitting a person on foot. Returns the damage dealt, or 0 when
 * the hit is on cooldown or too slow to hurt. The victim is shoved away
 * from the vehicle's nose, hard, and a pedestrian killed this way raises
 * the driver's wanted level. The cooldown stops one pass from dealing
 * damage twenty times in a single second.
 */
export function vehicleHitsPerson(vehicle, person, now) {
  const speed = Math.abs(vehicle.speed || 0);
  if (speed < 3) return 0;
  if (person.lastCarHitAt && now - person.lastCarHitAt < COMBAT.carHitCooldown * 1000) return 0;
  const d = dist2d(vehicle.x, vehicle.z, person.x, person.z);
  if (d > 2.1) return 0;
  person.lastCarHitAt = now;
  const away = Math.atan2(person.x - vehicle.x, person.z - vehicle.z);
  person.x += Math.sin(away) * COMBAT.carHitKnockback * 0.12;
  person.z += Math.cos(away) * COMBAT.carHitKnockback * 0.12;
  person.knockback = COMBAT.carHitKnockback;
  person.knockX = Math.sin(away);
  person.knockZ = Math.cos(away);
  person.knockDir = away;
  const damage = COMBAT.carHitDamage * (0.5 + Math.min(1, speed / 40));
  person.health = Math.max(0, (person.health ?? 100) - damage);
  if (person.health <= 0) person.dead = true;
  return damage;
}

/** A corpse lies where it fell and is cleaned up after 25 seconds. */
export function corpseExpired(corpse, now) {
  return now - corpse.diedAt > 25000;
}

/** Blood and hit-marker state for one frame of feedback. */
export function combatFeedback() {
  return { hitMarker: 0, tracer: null, muzzle: 0 };
}

/** True when a target is close enough to punch: inside 1.6 m and in
 *  front of the attacker. */
export function inPunchRange(from, heading, target) {
  const d = dist2d(from.x, from.z, target.x, target.z);
  if (d > 1.6) return false;
  const dx = target.x - from.x;
  const dz = target.z - from.z;
  return (dx * Math.sin(heading) + dz * Math.cos(heading)) / Math.max(d, 0.01) > 0.2;
}

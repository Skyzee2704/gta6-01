// A small seeded random number generator (mulberry32): the same seed gives the
// same city, the same traffic and the same screenshot, which is what makes the
// staged scenes repeatable. Nothing here touches the browser or the clock.
export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A whole number from min to max, inclusive, from the seeded stream. */
export function intBetween(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

/** A real number between min and max, from the seeded stream. */
export function floatBetween(random, min, max) {
  return min + random() * (max - min);
}

/** One element of a list, picked by the seeded stream. */
export function pick(random, list) {
  return list[Math.floor(random() * list.length)];
}

/** A shuffled copy of a list, using the seeded stream. */
export function shuffled(random, list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/** Clamp a value into a range. */
export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

/** Linear interpolation between two values. */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Wrap an angle into the -PI..PI range. */
export function wrapAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

/** Distance between two points on the ground plane. */
export function dist2d(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

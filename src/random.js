// Seeded randomness for SOLMAR: one seed, one city, one traffic pattern,
// one screenshot. mulberry32 is tiny, fast and deterministic, so the staged
// shots repeat byte for byte and the headless checks can replay a world
// exactly. Nothing in this file touches the browser, the clock or the disk.
export function createRandom(seed) {
  let state = (seed | 0) >>> 0;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick a whole number between min and max, both ends included. */
export function intBetween(random, min, max) {
  const span = max - min + 1;
  return min + Math.floor(random() * span);
}

/** Pick a real number anywhere from min up to max. */
export function floatBetween(random, min, max) {
  return min + random() * (max - min);
}

/** Return one element of a list, chosen by the seeded stream. */
export function pick(random, list) {
  if (!list || list.length === 0) return undefined;
  return list[Math.floor(random() * list.length)];
}

/** Return a shuffled copy of a list, leaving the original untouched. */
export function shuffled(random, list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const held = out[i];
    out[i] = out[j];
    out[j] = held;
  }
  return out;
}

/** Hold a value inside [min, max]; values outside are pulled to the edge. */
export function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** Slide between a and b by fraction t (0 gives a, 1 gives b). */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Smoothstep: like lerp, but eased at both ends so motion starts soft. */
export function smoothstep(a, b, t) {
  const clamped = clamp((t - a) / (b - a), 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

/** Fold an angle into the -PI..PI range so heading differences stay small. */
export function wrapAngle(angle) {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/** Straight-line distance between two points on the ground plane. */
export function dist2d(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

/** Squared ground distance — cheaper when only a comparison is needed. */
export function dist2dSquared(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

/** True when two ground points sit within radius of each other. */
export function withinRadius(ax, az, bx, bz, radius) {
  return dist2dSquared(ax, az, bx, bz) <= radius * radius;
}

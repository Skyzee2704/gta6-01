// random.js — deterministic randomness for the sim.
// Everything the sim rolls comes from a seeded generator, so the same seed
// always builds the same city, the same traffic, the same missions. The
// renderer never touches this; it uses its own stateless hash so drawing
// cannot disturb the sim's roll order.

// Mulberry32: a small, fast, well-distributed seeded PRNG.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A stateful RNG with the helpers the sim uses everywhere.
export class RNG {
  constructor(seed) {
    this.next = mulberry32(seed);
  }
  // Float in [0, 1).
  float() {
    return this.next();
  }
  // Float in [min, max).
  range(min, max) {
    return min + this.next() * (max - min);
  }
  // Integer in [min, max] inclusive.
  int(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  // Pick one element of an array.
  pick(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }
  // True with probability p.
  chance(p) {
    return this.next() < p;
  }
}

// Squared distance between two points on the ground plane. The sim uses
// squared distances for cheap range checks and takes the root only when
// it needs a real distance.
export function dist2(x0, z0, x1, z1) {
  const dx = x1 - x0;
  const dz = z1 - z0;
  return dx * dx + dz * dz;
}

// Real distance on the ground plane.
export function dist(x0, z0, x1, z1) {
  return Math.sqrt(dist2(x0, z0, x1, z1));
}

// Clamp a value into [min, max].
export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

// Linear interpolation.
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Wrap an angle into (-PI, PI].
export function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a <= -Math.PI) a += Math.PI * 2;
  return a;
}

// Stateless hash of a 2D point: the same (x, z) always gives the same
// value in [0, 1). The renderer uses this for per-building variation
// without touching the sim RNG.
export function hash2(x, z) {
  let h = (Math.floor(x * 12.9898) * 374761393 + Math.floor(z * 78.233) * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Integer arithmetic keeps procedural generation repeatable across runtimes.
export function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function mix32(value) {
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return (value ^ (value >>> 16)) >>> 0;
}

export function hash2(x, y) {
  return mix32(Math.imul(x | 0, 0x1f123bb5) ^ Math.imul(y | 0, 0x5f356495)) / 4294967296;
}

export function hashString(s) {
  let value = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    value = Math.imul(value ^ s.charCodeAt(i), 16777619);
  }
  return mix32(value) / 4294967296;
}

export const randomRange = (rng, a, b) => a + rng() * (b - a);
export const randomInt = (rng, a, b) => Math.floor(randomRange(rng, Math.ceil(a), Math.floor(b) + 1));
export const randomPick = (rng, arr) => arr[randomInt(rng, 0, arr.length - 1)];
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
// Squared distance on the ground plane; avoids a square root in proximity checks.
export const dist2 = (ax, az, bx, bz) => (bx - ax) ** 2 + (bz - az) ** 2;

// Seeded random numbers. One small generator keeps the city layout and the
// screenshot staging deterministic: the same seed always builds the same
// Solmar, so a screenshot can be reproduced exactly.
export function makeRng(seed) {
  let state = seed >>> 0;
  if (state === 0) state = 0x9e3779b9;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

export function range(rng, low, high) {
  return low + rng() * (high - low);
}

export function rangeInt(rng, low, high) {
  return low + Math.floor(rng() * (high - low + 1));
}

export function chance(rng, probability) {
  return rng() < probability;
}

// Fisher-Yates shuffle that returns a new array, leaving the input alone.
export function shuffled(rng, list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

// SOLMAR 3D — deterministic seeded RNG. Every random choice in the sim
// flows through here so a fixed seed replays identically. No imports.
export function hashSeed(text) {
  let h = 2166136261;
  const s = String(text);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

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

export function createRng(seed) {
  const numeric = typeof seed === 'string' ? hashSeed(seed) : seed >>> 0;
  const next = mulberry32(numeric);
  return {
    seed: numeric,
    next() {
      return next();
    },
    range(min, max) {
      return min + next() * (max - min);
    },
    int(min, max) {
      return Math.floor(min + next() * (max - min + 1));
    },
    pick(list) {
      if (!list || list.length === 0) return undefined;
      return list[Math.floor(next() * list.length)];
    },
    chance(p) {
      return next() < p;
    },
    shuffle(list) {
      const out = list.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const tmp = out[i];
        out[i] = out[j];
        out[j] = tmp;
      }
      return out;
    },
    sign() {
      return next() < 0.5 ? -1 : 1;
    },
    gaussian() {
      return (next() + next() + next() - 1.5) / 1.5;
    },
  };
}

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

export function rngFromState(state) {
  return createRng(state && state.seed != null ? state.seed : 1);
}

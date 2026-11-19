// SOLMAR 3D — interiors. Four enterable places: the Neon Mile Diner
// (restaurant, eat to heal), Harbor Market (public, buy snacks), Rosa's
// Garage (respray and repairs) and the Penthouse (sleep to morning).
// Each is a real room built far away at (1000, 1000) so it never
// overlaps the island; stepping through the door teleports the player
// in, the exit door brings them back to the street they came from.
import { INTERIORS, PRICES } from './data.js';
import { addCash } from './economy.js';

const ROOM_OFFSETS = {
  diner: { x: 1000, z: 1000 },
  market: { x: 1030, z: 1000 },
  garage: { x: 1000, z: 1030 },
  penthouse: { x: 1030, z: 1030 },
};

export function createInteriors(state) {
  state.interiors = { current: null, returnPos: null };
}

export function interiorDef(id) {
  return INTERIORS.find((x) => x.id === id);
}

export function nearInteriorDoor(state) {
  const p = state.player;
  if (!p.onFoot || state.interiors.current) return null;
  for (const def of INTERIORS) {
    const d = Math.hypot(p.x - def.x, p.z - def.z);
    if (d < 6) return def;
  }
  return null;
}

export function enterInterior(state, id) {
  const def = interiorDef(id);
  if (!def) return false;
  const p = state.player;
  state.interiors.returnPos = { x: p.x, z: p.z, heading: p.heading };
  const room = ROOM_OFFSETS[id];
  p.x = room.x;
  p.z = room.z;
  p.heading = 0;
  state.camera.yaw = Math.PI;
  state.interiors.current = id;
  state.notices.push({ text: `Inside — ${def.name}. ${def.blurb}`, ttl: 4 });
  return true;
}

export function exitInterior(state) {
  const it = state.interiors;
  if (!it.current) return false;
  const p = state.player;
  if (it.returnPos) {
    p.x = it.returnPos.x + 2;
    p.z = it.returnPos.z + 2;
    p.heading = it.returnPos.heading;
  }
  it.current = null;
  it.returnPos = null;
  return true;
}

// What the player can do inside each place.
export function interiorAction(state) {
  const id = state.interiors.current;
  if (!id) return null;
  const p = state.player;
  if (id === 'diner') {
    if (p.cash < 12) return { ok: false, text: 'Not enough cash for a meal.' };
    p.cash -= 12;
    p.health = Math.min(100, p.health + 35);
    state.audio?.pickup?.();
    return { ok: true, text: 'Diner special — health restored.' };
  }
  if (id === 'market') {
    if (p.cash < 8) return { ok: false, text: 'Not enough cash.' };
    p.cash -= 8;
    p.health = Math.min(100, p.health + 15);
    return { ok: true, text: 'Harbor snack — a little health back.' };
  }
  if (id === 'garage') {
    if (p.onFoot) return { ok: false, text: 'Bring a car in for a respray.' };
    const v = state.vehicles.find((x) => x.id === p.vehicleId);
    if (!v) return { ok: false, text: 'No car here.' };
    if (p.cash < PRICES.respray) return { ok: false, text: `Respray costs $${PRICES.respray}.` };
    p.cash -= PRICES.respray;
    v.color = state.rng.int(0, 0xffffff);
    v.damage = 0;
    return { ok: true, text: 'Resprayed and repaired — looking fresh.' };
  }
  if (id === 'penthouse') {
    state.time.hour = 8;
    state.time.day += 1;
    p.health = 100;
    return { ok: true, text: 'Slept until morning — Day ' + state.time.day + '. Fully rested.' };
  }
  return null;
}

export function inInterior(state) {
  return state.interiors.current !== null;
}

export function interiorHint(state) {
  const id = state.interiors.current;
  if (!id) return null;
  const hints = {
    diner: 'E — order the special ($12, +35 health)  •  Q — leave',
    market: 'E — buy a snack ($8, +15 health)  •  Q — leave',
    garage: 'E — respray & repair ($100)  •  Q — leave',
    penthouse: 'E — sleep until morning  •  Q — leave',
  };
  return hints[id] || null;
}

export function buyPenthouse(state) {
  const p = state.player;
  if (state.penthouseOwned) return { ok: false, text: 'You already own the Penthouse.' };
  if (p.cash < PRICES.penthouse) return { ok: false, text: `Penthouse costs $${PRICES.penthouse.toLocaleString('en-US')} — you have $${p.cash.toLocaleString('en-US')}.` };
  p.cash -= PRICES.penthouse;
  state.penthouseOwned = true;
  return { ok: true, text: 'Penthouse Tower is yours. The city is below you now.' };
}

export { ROOM_OFFSETS };

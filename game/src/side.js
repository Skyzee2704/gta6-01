// SOLMAR 3D — side content. Postcards, the penthouse purchase, the
// safehouse save point, respawn after death, and the ambient "the city
// is alive" hooks. A postcard is worth $150 and 5 respect — twenty of
// them, hidden at the island's best views.
import { addCash, addRespect, PRICES } from './economy.js';
import { saveToSlot } from './save.js';
import { buyPenthouse } from './interiors.js';

export function createSide(state) {
  state.postcardsFound = new Set();
  state.penthouseOwned = false;
  state.side = { savedAt: null };
}

export function stepSide(state, dt) {
  const p = state.player;
  // Postcard pickup: walk over one and it is yours.
  for (const pc of state.city.postcards) {
    if (state.postcardsFound.has(pc.id)) continue;
    const d = Math.hypot(p.x - pc.x, p.z - pc.z);
    if (d < 2.5) {
      state.postcardsFound.add(pc.id);
      addCash(state, 150, `Postcard — ${pc.name}`);
      addRespect(state, 5);
      state.audio?.pickup?.();
      state.notices.push({ text: `Postcard ${state.postcardsFound.size}/20 — ${pc.name} (+$150)`, ttl: 3 });
    }
  }
  // Safehouse: save the game.
  if (p.onFoot) {
    const d = Math.hypot(p.x - -150, p.z - -20);
    if (d < 5 && state.side.savedAt !== state.time.day + ':' + Math.floor(state.time.hour)) {
      // The prompt appears in the HUD via main.js; the save happens on E.
    }
  }
  void dt;
}

export function trySaveAtSafehouse(state) {
  const p = state.player;
  const d = Math.hypot(p.x - -150, p.z - -20);
  if (d < 5 && p.onFoot) {
    saveToSlot(state, 'main');
    state.notices.push({ text: 'Game saved at the Safehouse.', ttl: 3 });
    return true;
  }
  return false;
}

export function tryBuyPenthouse(state) {
  const p = state.player;
  const d = Math.hypot(p.x - 0, p.z - -100);
  if (d < 8 && p.onFoot) {
    const r = buyPenthouse(state);
    state.notices.push({ text: r.text, ttl: 4 });
    return true;
  }
  return false;
}

// Death: respawn at the hospital, keep the cash, lose a little respect
// for the embarrassment. The mission stays failed, not the save.
export function respawn(state) {
  const p = state.player;
  p.dead = false;
  p.health = 100;
  p.armor = 0;
  p.wanted = 0;
  p.x = 60;
  p.z = -100;
  p.heading = 0;
  p.onFoot = true;
  p.vehicleId = null;
  state.police.units.length = 0;
  state.police.heli = null;
  state.enemies.length = 0;
  if (state.missions.active !== null) {
    state.missions.active = null;
    state.missions.marker = null;
    state.notices.push({ text: 'Mission failed — you woke up in the hospital.', ttl: 4 });
  }
  state.notices.push({ text: 'You wake up at Solmar General. The city waits.', ttl: 4 });
}

// Context prompt for the HUD: what E does right here, right now.
export function contextPrompt(state) {
  const p = state.player;
  if (state.interiors.current) return 'E — use this place  •  Q — leave';
  if (state.races.active) return null;
  if (!p.onFoot) {
    const v = state.vehicles.find((x) => x.id === p.vehicleId);
    if (v && v.type === 'taxi' && !state.taxi.active) return 'E — start a taxi fare';
    return 'E — get out';
  }
  const nearCar = state.vehicles.some((v) => Math.hypot(p.x - v.x, p.z - v.z) < 4);
  if (nearCar) return 'E — get in';
  const nearBoat = state.boats.some((b) => Math.hypot(p.x - b.x, p.z - b.z) < 8);
  if (nearBoat) return 'E — board the boat';
  const nearHeli = Math.hypot(p.x - state.heli.x, p.z - state.heli.z) < 5;
  if (nearHeli) return 'E — fly the helicopter';
  const nearDoor = Math.hypot(p.x - -40, p.z - 30) < 6;
  if (nearDoor) return 'E — enter the diner';
  const nearSafe = Math.hypot(p.x - -150, p.z - -20) < 5;
  if (nearSafe) return 'E — save at the safehouse';
  const nearPent = Math.hypot(p.x - 0, p.z - -100) < 8;
  if (nearPent && !state.penthouseOwned) return `E — buy the Penthouse ($${PRICES.penthouse.toLocaleString('en-US')})`;
  return null;
}

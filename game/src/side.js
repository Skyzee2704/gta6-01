// Side activities: Solmar Postcards (20), Solmar Cab taxi fares, respray
// and the Harbor Arms shop. Tapes live in city data; taxi runs here.
import { ECONOMY } from './config.js';
import { taxiFare } from './economy.js';
import { dist2 } from './random.js';

export function tapesLeft(state, city) { return city.tapes.filter(t => !t.taken).length; }
export function startTaxi(state, city, rng) {
  const p = state.player;
  const node = city.nodes[Math.floor(rng() * city.nodes.length)];
  state.taxi.active = true;
  state.taxi.passenger = { x: node.x, z: node.z };
  state.taxi.timer = 90;
  state.notices.push('Solmar Cab: pick up the passenger at the yellow marker.');
}
export function updateTaxi(state, city, dt) {
  const t = state.taxi;
  if (!t.active) return;
  t.timer -= dt;
  const p = state.player;
  if (t.timer <= 0) { t.active = false; state.notices.push('Taxi: passenger gave up, took too long.'); return; }
  if (!t.target && dist2(p.x, p.z, t.passenger.x, t.passenger.z) < 64) {
    const node = city.nodes[Math.floor(Math.random() * city.nodes.length)];
    t.target = { x: node.x, z: node.z };
    t.startX = p.x; t.startZ = p.z;
    state.notices.push('Passenger aboard! Take them to the green marker.');
  } else if (t.target && dist2(p.x, p.z, t.target.x, t.target.z) < 64) {
    const d = Math.hypot(t.target.x - t.startX, t.target.z - t.startZ);
    const fare = taxiFare(d, t.timer);
    state.money += fare; state.respect += 20;
    state.stats.fares += 1;
    state.notices.push(`Taxi done: +$${fare} +20 respect.`);
    t.active = false; t.target = null;
  }
}
export function shopItems(state) {
  const { WEAPONS } = { WEAPONS: null };
  return state.weapons;
}

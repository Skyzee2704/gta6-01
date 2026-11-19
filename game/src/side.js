// SOLMAR 3D — side activities: taxi fares, respray shop, property
// purchase, postcard hunting, and the garage store/retrieve loop.
import { POSTCARDS, PROPERTIES, RESPECT_TIERS } from './data.js';
import { createRng } from './random.js';

export function createSideState(seed = 1) {
  return {
    rng: createRng(seed * 61 + 2),
    taxiActive: false,
    taxiFare: null,
    taxiPassenger: null,
    resprayQueue: [],
    postcardsFound: new Set(),
    properties: [],
    garage: [],
    garageCapacity: 4,
  };
}

export function startTaxiFare(side, player) {
  const dest = {
    x: side.rng.range(40, 600),
    y: side.rng.range(40, 440),
    name: 'fare drop-off',
  };
  side.taxiActive = true;
  side.taxiFare = {
    dest,
    distance: Math.round(Math.hypot(dest.x - player.x, dest.y - player.y)),
    fare: 0,
    tip: 0,
    startedAt: Date.now(),
  };
  side.taxiPassenger = { mood: 100, name: 'Passenger' };
  return side.taxiFare;
}

export function completeTaxiFare(side, player) {
  if (!side.taxiActive || !side.taxiFare) return null;
  const fare = side.taxiFare;
  const payout = Math.max(40, Math.round(fare.distance * 0.45));
  const tip = side.taxiPassenger && side.taxiPassenger.mood > 70 ? Math.round(payout * 0.25) : 0;
  side.taxiActive = false;
  side.taxiFare = null;
  side.taxiPassenger = null;
  return { payout, tip, total: payout + tip };
}

export function resprayCost(vehicle) {
  return 350;
}

export function resprayVehicle(side, vehicle, color) {
  const cost = resprayCost(vehicle);
  side.resprayQueue.push({ vehicle: vehicle.def.id, color, cost, done: true });
  vehicle.paint = color;
  return { cost, color };
}

export function buyProperty(side, player, propertyId) {
  const prop = PROPERTIES.find((p) => p.id === propertyId);
  if (!prop) return { ok: false, reason: 'unknown-property' };
  if (side.properties.includes(propertyId)) return { ok: false, reason: 'already-owned' };
  if (player.cash < prop.price) return { ok: false, reason: 'not-enough-cash', price: prop.price };
  player.cash -= prop.price;
  side.properties.push(propertyId);
  if (prop.id === 'penthouse') player.respect += 150;
  return { ok: true, property: prop, cashLeft: player.cash };
}

export function findPostcard(side, player) {
  for (const pc of POSTCARDS) {
    if (side.postcardsFound.has(pc.id)) continue;
    const d = Math.hypot(pc.x - player.x, pc.y - player.y);
    if (d < 3) {
      side.postcardsFound.add(pc.id);
      player.respect += 25;
      return { found: pc, total: side.postcardsFound.size, of: POSTCARDS.length };
    }
  }
  return null;
}

export function storeInGarage(side, vehicle) {
  if (side.garage.length >= side.garageCapacity) return { ok: false, reason: 'garage-full' };
  side.garage.push({ id: vehicle.def.id, condition: vehicle.condition, paint: vehicle.paint || vehicle.def.color });
  return { ok: true, stored: vehicle.def.id, count: side.garage.length };
}

export function retrieveFromGarage(side, vehicleId) {
  const idx = side.garage.findIndex((v) => v.id === vehicleId);
  if (idx < 0) return { ok: false, reason: 'not-in-garage' };
  const [v] = side.garage.splice(idx, 1);
  return { ok: true, vehicle: v, count: side.garage.length };
}

export function respectTierName(respect) {
  let name = RESPECT_TIERS[0].name;
  for (const t of RESPECT_TIERS) {
    if (respect >= t.min) name = t.name;
  }
  return name;
}

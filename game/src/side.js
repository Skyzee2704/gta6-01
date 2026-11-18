// side.js — side activities: postcards, the Solmar Cab taxi, Pay n Spray,
// the gun shop, and the property ladder. These are the things that make
// Solmar a place to live in between jobs.

import { WEAPONS } from './data.js';
import { dist2 } from './random.js';
import { addMoney, addRespect } from './economy.js';

// The shop's stock: weapons with prices and respect requirements.
// The playtest imports this to check the shop is wired.
export function shopItems(state) {
  return WEAPONS.map((w) => ({
    id: w.id,
    name: w.name,
    price: w.price,
    respect: w.respect,
    owned: !!state.weapons.owned[w.id],
    canAfford: state.money >= w.price,
    unlocked: state.respectLevel >= w.respect,
  }));
}

// The diner menu.
export function dinerMenu(state) {
  return [
    { id: 'meal', name: "Rosa's Lunch", price: 25, desc: 'Full health' },
    { id: 'coffee', name: 'Harbor Coffee', price: 8, desc: 'A quick lift' },
  ];
}

// Collect a postcard tape when the player walks over it.
export function updateTapes(state, city) {
  const p = state.player;
  for (const tape of city.tapes) {
    if (tape.found) continue;
    if (dist2(p.x, p.z, tape.x, tape.z) < 9) {
      tape.found = true;
      state.tapesFound += 1;
      addMoney(state, 250);
      addRespect(state, 25);
      if (state.notices) state.notices.push(`Postcard: ${tape.title} +$250`);
      if (state.tapesFound >= 20 && state.notices) {
        state.notices.push('All 20 postcards! Bonus 5000 dollars + free Sniper Longeye 308.');
        addMoney(state, 5000);
        state.weapons.owned.sniper = true;
        state.weapons.ammo.sniper = 5;
      }
    }
  }
}

// The taxi: a passenger waits at a marker; pick them up, drop them off.
export function updateTaxi(state, city, dt, rng) {
  const taxi = state.taxi;
  if (!taxi.active) return;
  const p = state.player;
  if (taxi.stage === 0) {
    // Waiting for the player to reach the passenger.
    if (dist2(p.x, p.z, taxi.pickup.x, taxi.pickup.z) < 100) {
      taxi.stage = 1;
      if (state.notices) state.notices.push('Passenger aboard! Drop them at the green marker.');
    }
  } else if (taxi.stage === 1) {
    taxi.timer += dt;
    if (dist2(p.x, p.z, taxi.dropoff.x, taxi.dropoff.z) < 100) {
      const fare = 120 + Math.round(taxi.timer * 2);
      addMoney(state, fare);
      addRespect(state, 20);
      if (state.notices) state.notices.push(`Cab fare done: +$${fare} +20 respect.`);
      taxi.active = false;
      state.stats.fares = (state.stats.fares || 0) + 1;
    } else if (taxi.timer > 120) {
      if (state.notices) state.notices.push('Cab: passenger gave up, too slow.');
      taxi.active = false;
    }
  }
}

// Start a taxi fare: a passenger appears at a random road node.
export function startTaxi(state, city, rng) {
  const a = city.nodes[rng.int(0, city.nodes.length - 1)];
  const b = city.nodes[rng.int(0, city.nodes.length - 1)];
  state.taxi = {
    active: true,
    stage: 0,
    timer: 0,
    pickup: { x: a.x, z: a.z },
    dropoff: { x: b.x, z: b.z },
  };
  if (state.notices) state.notices.push('Solmar Cab: pick up the passenger at the yellow marker.');
}

// Pay n Spray: fresh paint clears the wanted level (for a price).
export function respray(state) {
  const cost = 150;
  if (state.money < cost) {
    if (state.notices) state.notices.push(`Not enough cash for a respray ($${cost}).`);
    return false;
  }
  addMoney(state, -cost);
  state.wanted.heat = 0;
  state.wanted.level = 0;
  state.wanted.spotted = false;
  if (state.notices) state.notices.push(`Pay n Spray: fresh paint, wanted cleared (-$${cost}).`);
  return true;
}

// Buy the Palm Heights penthouse.
export function buyPenthouse(state) {
  if (state.properties.penthouse) return false;
  if (state.money < 20000) {
    if (state.notices) state.notices.push('Not enough cash for the penthouse ($20,000).');
    return false;
  }
  addMoney(state, -20000);
  state.properties.penthouse = true;
  if (state.notices) state.notices.push('Penthouse Palm Heights bought! Income 500 dollars per game day.');
  return true;
}

// Daily income from the penthouse (called when the day rolls over).
export function dailyIncome(state) {
  if (state.properties.penthouse) addMoney(state, 500);
}

// The sim: pure numbers, no THREE, no DOM, no window. Fixed step 1/60.
// createWorld(seed) -> { state, city, rng, step, addHeat, ... }. The renderer
// only reads state; it never writes it. Deterministic from seed 1.
import { STEP, SEED, START_HOUR, PLAYER, ECONOMY } from './config.js';
import { createRng, clamp, dist2 } from './random.js';
import { createCity, buildingAt, clampToCity, inWater } from './city.js';
import { CRIMES, respectLevel, WEAPONS } from './data.js';
import { createVehicleState, updateVehicle, enterVehicle, exitVehicle, nearestVehicle } from './vehicles.js';
import { updateTraffic } from './traffic.js';
import { updatePeds, killPed } from './npc.js';
import { updatePolice } from './police.js';
import { updateMissions } from './missions.js';
import { updateEnemies } from './combat.js';
import { updateBoats } from './boats.js';
import { updateWeather } from './weather.js';
import { updateAircraft } from './aircraft.js';
import { tickFireCooldown } from './weapons.js';

export const EVENT_NONE = 0;
export const EVENT_WASTED = 1;
export const EVENT_BUSTED = 2;
export const EVENT_MISSION_DONE = 4;
export const EVENT_MISSION_FAIL = 8;
export const EVENT_TAPE = 16;
export const EVENT_ARREST = 32;

export function createWorld(seed) {
  const rng = createRng(seed ?? SEED);
  const city = createCity(seed ?? SEED);
  const state = {
    seed: seed ?? SEED, time: 0, hour: START_HOUR, day: 1,
    player: { x: -180, z: 60, y: 0, vy: 0, heading: 0, speed: 0, health: PLAYER.health, armor: 0, onFoot: true, vehicleId: -1, boatId: -1, heliId: -1, dead: false, busted: false, running: false, aiming: false },
    money: 250, respect: 0, respectLevel: 0,
    wanted: { heat: 0, level: 0, spotted: false, escape: 0, searchX: 0, searchZ: 0, searchR: 0 },
    vehicles: [], peds: [], cops: [], enemies: [], particles: [], boats: [], helis: [],
    weapons: { owned: { pistol: { mag: 12, reserve: 60 } }, current: 'pistol', wheelOpen: false },
    mission: { id: 0, stage: 0, stageTimer: 0, active: false, done: [false, false, false, false, false, false], text: '', stats: { shots: 0, hits: 0, kills: 0, crashes: 0, topSpeed: 0, time: 0 } },
    race: { active: false, id: null, checkpoint: 0, time: 0, best: {} },
    taxi: { active: false, passenger: null, target: null, timer: 0, fare: 0 },
    weather: { kind: 'clear', t: 0, transition: 0, rain: 0 },
    interior: null, dialogue: [], notices: [], district: 'old', districtTimer: 0,
    tapesTaken: 0, penthouseOwned: false, garage: [], savedAt: null,
    stats: { distance: 0, steals: 0, escapes: 0, racesWon: 0, fares: 0 },
    flags: { nightMission: false },
  };
  // Parked cars become world vehicles (stealable).
  city.parked.forEach((p, i) => state.vehicles.push(createVehicleState(i, p.model, p.x, p.z, p.heading, p.color, true)));
  // The Big Score sports car, parked in the guarded lot at Harbor Docks.
  state.vehicles.push(createVehicleState(state.vehicles.length, 'sports', 200, 40, 0, 0xd81a1a, true));
  // Two drivable boats moored at the marina / harbor.
  city.boats.forEach((b, i) => state.boats.push({ id: i, model: b.model, x: b.x, z: b.z, heading: 0, speed: 0, bob: 0, driver: false }));
  // Player helicopter on the harbor helipad.
  state.helis.push({ id: 0, x: 280, z: -80, y: 0, heading: 0, speed: 0, vy: 0, rotor: 0, pilot: false });
  state.helis.push({ id: 1, x: 0, z: -160, y: 62, heading: 0, speed: 0, vy: 0, rotor: 0, pilot: false, roof: true });

  function addHeat(crimeId, witness) {
    const crime = CRIMES.find(c => c.id === crimeId);
    if (!crime || !witness) return;
    state.wanted.heat = clamp(state.wanted.heat + crime.heat, 0, 5.99);
    state.wanted.level = Math.min(5, Math.floor(state.wanted.heat));
    state.wanted.spotted = true;
    state.wanted.escape = 0;
    state.wanted.searchX = state.player.x; state.wanted.searchZ = state.player.z;
    state.wanted.searchR = 240 + state.wanted.level * 85;
  }
  function witnessesNear(range) {
    for (const p of state.peds) if (p.alive && dist2(p.x, p.z, state.player.x, state.player.z) < range * range) return true;
    for (const c of state.cops) if (dist2(c.x, c.z, state.player.x, state.player.z) < range * range) return true;
    return false;
  }
  function spawnParticle(x, y, z, kind, life) {
    const p = state.particles.find(q => !q.active);
    if (!p) { if (state.particles.length < 240) state.particles.push({ active: true, x, y, z, vx: 0, vy: 0, vz: 0, kind, life: life ?? 0.6, max: life ?? 0.6 }); return; }
    p.active = true; p.x = x; p.y = y; p.z = z; p.vx = 0; p.vy = 0; p.vz = 0; p.kind = kind; p.life = life ?? 0.6; p.max = p.life;
  }
  function collideBuildings(x, z, r) {
    const b = buildingAt(city, x, z);
    if (!b) return null;
    const dx = x - b.x, dz = z - b.z;
    const px = b.w / 2 + r - Math.abs(dx), pz = b.d / 2 + r - Math.abs(dz);
    if (px < pz) return { x: b.x + Math.sign(dx || 1) * (b.w / 2 + r), z };
    return { x, z: b.z + Math.sign(dz || 1) * (b.d / 2 + r) };
  }
  function step(dt, input) {
    const p = state.player;
    const _ox = p.x, _oz = p.z; // for the lifetime distance stat (this step)
    state.time += dt;
    tickFireCooldown(state, dt);
    // Race countdown (3-2-1-GO): tick it down here, in the sim itself, so it
    // runs in the browser and in headless tests alike — and block driving /
    // movement input while it runs, so the player and the rivals are held
    // on the grid until GO.
    if (state.race.active && (state.race.countdown || 0) > 0) {
      state.race.countdown = Math.max(0, state.race.countdown - dt);
      input = { ...input, forward: false, back: false, left: false, right: false, run: false, jump: false, interact: false, enterVehicle: false, handbrake: false, fire: false };
    }
    state.hour += dt * 0.01; // 0.6 minutes per second
    if (state.hour >= 24) { state.hour -= 24; state.day += 1; if (state.penthouseOwned) state.money += ECONOMY.penthouseIncome; }
    // District banner.
    const { districtAt } = { districtAt: (x, z) => (z > 120 ? 'marina' : x > 220 ? 'harbor' : x > 80 && z > -40 ? 'neon' : x < -160 ? (z < -80 ? 'palm' : 'old') : z < -120 ? 'downtown' : x < 0 ? 'old' : 'downtown') };
    const d = districtAt(p.x, p.z);
    if (d !== state.district) { state.district = d; state.districtTimer = 4.5; }
    if (state.districtTimer > 0) state.districtTimer -= dt;
    // Wanted decay when unseen and outside the search zone.
    const w = state.wanted;
    if (w.level > 0 && !w.spotted) {
      w.escape += dt;
      const need = 5 + w.level * 1.5;
      if (w.escape > need) { w.heat = 0; w.level = 0; w.escape = 0; state.stats.escapes += 1; state.notices.push('Wanted cleared. You got away.'); }
    }
    if (w.level > 0) {
      const dSearch = Math.hypot(p.x - w.searchX, p.z - w.searchZ);
      if (dSearch > w.searchR) w.spotted = false;
    }
    // Player on foot.
    if (p.onFoot && !p.dead) {
      const run = input.run ? PLAYER.run : PLAYER.walk;
      let mx = 0, mz = 0;
      if (input.forward) { mx += Math.sin(p.heading); mz += Math.cos(p.heading); }
      if (input.back) { mx -= Math.sin(p.heading); mz -= Math.cos(p.heading); }
      if (input.left) { mx += Math.cos(p.heading); mz -= Math.sin(p.heading); }
      if (input.right) { mx -= Math.cos(p.heading); mz += Math.sin(p.heading); }
      const len = Math.hypot(mx, mz) || 1;
      p.x += (mx / len) * run * dt * (mx || mz ? 1 : 0);
      p.z += (mz / len) * run * dt * (mx || mz ? 1 : 0);
      p.speed = (mx || mz) ? run : 0;
      p.running = !!input.run;
      if (input.jump && p.y === 0) p.vy = PLAYER.jumpV;
      p.vy -= PLAYER.gravity * dt;
      p.y = Math.max(0, p.y + p.vy * dt);
      if (p.y === 0) p.vy = 0;
      const hit = collideBuildings(p.x, p.z, 0.6);
      if (hit) { p.x = hit.x; p.z = hit.z; }
      const c = clampToCity(p.x, p.z); p.x = c.x; p.z = c.z;
      if (inWater(p.x, p.z)) { p.z = 238; }
      if (input.interact) tryInteract();
      if (input.enterVehicle) { tryEnterVehicle(); input.enterVehicle = false; }
    } else if (p.vehicleId >= 0) {
      updateVehicle(state, city, dt, input);
    } else if (p.boatId >= 0) {
      // Boat driving handled by boats subsystem through input.
    } else if (p.heliId >= 0) {
      // Helicopter handled by aircraft subsystem.
    }
    updateTraffic(state, city, dt, rng);
    updatePeds(state, city, dt, rng);
    updatePolice(state, city, dt, rng);
    updateEnemies(state, city, dt, rng);
    // Car-pedestrian collision. A moving non-police car that hits the player
    // on foot hurts them (the "run over" fix). A ped is only killed — and
    // only adds heat — when the PLAYER's car hits them; traffic cars brake
    // for peds instead (traffic.js) and never give the player heat.
    for (const v of state.vehicles) {
      const sp = Math.abs(v.speed || 0);
      if (sp < 3 || v.driver === 'police') continue;
      if (p.onFoot && !p.dead && dist2(v.x, v.z, p.x, p.z) < 2.56) {
        damagePlayer(Math.min(40, Math.round(sp * 1.5)));
        const dx = p.x - v.x, dz = p.z - v.z, dd = Math.hypot(dx, dz) || 1;
        p.x += (dx / dd) * 3; p.z += (dz / dd) * 3; p.vy = Math.max(p.vy, 4);
        collideBuildings(state, p);
        state.particles.push({ active: true, x: p.x, y: 1.2, z: p.z, vx: 0, vy: 0, vz: 0, kind: 'spark', life: 0.3, max: 0.3 });
        state.notices.push('Run over by a car!');
        v.speed *= 0.7;
      }
      if (v.driver !== 'player') continue;
      for (const q of state.peds) {
        if (!q.alive) continue;
        if (dist2(v.x, v.z, q.x, q.z) < 2.56) {
          killPed(state, q);
          addHeat('hitPed', witnessesNear(60));
          state.notices.push('Pedestrian run over!');
          v.speed *= 0.7;
        }
      }
    }
    updateMissions(state, city, dt, rng);
    updateBoats(state, city, dt, input, rng);
    updateAircraft(state, city, dt, input, rng);
    updateWeather(state, dt, rng);
    // Particles.
    for (const pt of state.particles) {
      if (!pt.active) continue;
      pt.life -= dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.z += pt.vz * dt;
      if (pt.life <= 0) pt.active = false;
    }
    // Tape pickup.
    for (const t of city.tapes) {
      if (!t.taken && dist2(t.x, t.z, p.x, p.z) < 4) {
        t.taken = true; state.tapesTaken += 1;
        state.money += ECONOMY.tapeMoney; addRespect(ECONOMY.tapeRespect);
        state.notices.push(`Postcard: ${t.title} +$${ECONOMY.tapeMoney}`);
        if (state.tapesTaken === 20) { state.money += ECONOMY.tapeBonus; state.weapons.owned.sniper = { mag: 5, reserve: 15 }; state.notices.push('All 20 Postcards! Bonus $5000 + free Sniper Longeye 308.'); }
      }
    }
    // Lifetime distance (pause STATS): the player's movement this step,
    // counted before any death respawn teleports the player.
    state.stats.distance += Math.hypot(p.x - _ox, p.z - _oz);
    // Death / busted flags surfaced as events; the sim respawns the player
    // at the safehouse hospital (fee + half ammo) so play continues.
    let events = EVENT_NONE;
    if (p.health <= 0 && !p.dead) { events |= EVENT_WASTED; damagePlayer(0, 'wasted'); }
    if (p.busted) events |= EVENT_BUSTED;
    return events;
  }
  function addRespect(n) {
    state.respect += n;
    state.respectLevel = respectLevel(state.respect);
  }
  function tryInteract() {
    const p = state.player;
    // Diner door.
    if (dist2(p.x, p.z, city.diner.x, city.diner.z) < 36) { state.interior = 'diner'; return; }
    if (dist2(p.x, p.z, city.gunshop.x, city.gunshop.z) < 36) { state.interior = 'gunshop'; return; }
    // Pay n Spray.
    for (const s of city.paynspray) {
      if (dist2(p.x, p.z, s.x, s.z) < 36 && state.wanted.level > 0) {
        const cost = ECONOMY.resprayBase + state.wanted.level * ECONOMY.resprayPerLevel;
        if (state.money >= cost) { state.money -= cost; state.wanted.heat = 0; state.wanted.level = 0; state.notices.push(`Pay n Spray: new paint, wanted cleared (-$${cost}).`); }
      }
    }
    // Penthouse buy.
    if (dist2(p.x, p.z, city.penthouse.x, city.penthouse.z) < 36 && !state.penthouseOwned && state.money >= ECONOMY.penthousePrice) {
      state.money -= ECONOMY.penthousePrice; state.penthouseOwned = true; state.notices.push('Penthouse Palm Heights bought! Income $500/day in-game.');
    }
    // Safehouse sleep/save.
    if (dist2(p.x, p.z, city.safehouse.x, city.safehouse.z) < 36) {
      state.wanted.heat = 0; state.wanted.level = 0; state.hour = 8; state.notices.push('Slept at the safehouse. Wanted cleared, time 08:00.');
    }
  }
  function tryEnterVehicle() {
    const p = state.player;
    // Helicopter first (helipad).
    for (const h of state.helis) if (!h.pilot && dist2(p.x, p.z, h.x, h.z) < 16) { h.pilot = true; p.heliId = h.id; p.onFoot = false; return; }
    // Boat at the dock: board from the pier end (shore clamps the player
    // to z = 238, boats sit at z = 252, so the radius must span the gap).
    for (const b of state.boats) if (!b.driver && dist2(p.x, p.z, b.x, b.z) < 400) { b.driver = true; p.boatId = b.id; p.onFoot = false; return; }
    const v = nearestVehicle(state, p.x, p.z, 6);
    if (v) enterVehicle(state, v, rng);
  }
  function damagePlayer(amount, source) {
    const p = state.player;
    let rest = amount;
    if (p.armor > 0) { const absorbed = Math.min(p.armor, rest * 0.65); p.armor -= absorbed; rest -= absorbed; }
    p.health = Math.max(0, p.health - rest);
    if (p.health <= 0) {
      const fee = Math.min(ECONOMY.hospitalMax, Math.max(ECONOMY.hospitalMin, ECONOMY.hospitalFee + Math.floor(state.money * ECONOMY.hospitalPct)));
      state.money = Math.max(0, state.money - fee);
      for (const k of Object.keys(state.weapons.owned)) if (state.weapons.owned[k]) state.weapons.owned[k].reserve = Math.floor(state.weapons.owned[k].reserve / 2);
      p.x = -260; p.z = 190; p.health = PLAYER.health; p.dead = false; p.onFoot = true; p.vehicleId = -1;
      state.notices.push(`WASTED. The hospital charged $${fee}.`);
    }
  }
  return { state, city, rng, step, addHeat, witnessesNear, spawnParticle, collideBuildings, addRespect, damagePlayer, tryEnterVehicle };
}
export function emptyInput() {
  return { forward: false, back: false, left: false, right: false, run: false, jump: false, interact: false, enterVehicle: false, handbrake: false, fire: false, reload: false, aim: false, mouseDX: 0, mouseDY: 0, wheel: 0, radioNext: false, radioPrev: false };
}

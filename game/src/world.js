// The sim: every system in one fixed-step loop, with no drawing and no
// browser in it. The renderer reads this state; the tools run it headless.
// Nothing here allocates after createWorld returns, and nothing reads the
// clock except the elapsed counter — the same seed always plays the same.
import { STEP, START_HOUR, WORLD } from './config.js';
import { createRandom, clamp, dist2d, wrapAngle } from './random.js';
import { generateCity, districtAt, onLand } from './city.js';
import { generateProps } from './props.js';
import { createPlayer, stepPlayerOnFoot } from './character.js';
import { createVehicle, stepVehicle, nearestVehicle, enterVehicle, exitVehicle } from './vehicles.js';
import { createBoat, stepBoat, nearestBoat, boardBoat, leaveBoat } from './boats.js';
import { createHeli, stepHeli, stepPoliceHeli } from './aircraft.js';
import { createPoliceUnit, stepPolice, spawnUnit, wantedUnitCount, decayWanted, addWanted } from './police.js';
import { maintainCrowd, stepPeds } from './npc.js';
import { maintainTraffic, stepTraffic } from './traffic.js';
import { createMissionState, startMission, stepMission, nextMission, completionPercent } from './missions.js';
import { createEconomy, payMission } from './economy.js';
import { createWeather, stepWeather, clockText } from './weather.js';
import { createDialogue, queueMissionLines, stepDialogue } from './dialogue.js';
import { freshLoadout, fireWeapon, reloadWeapon, cycleWeapon, ammoText } from './weapons.js';
import { vehicleHitsPerson, bulletHits, applyHit } from './combat.js';
import { createTaxiJob, stepTaxiJob, collectPostcard } from './minigames.js';
import { stagingSave } from './save.js';

export const EVENT_NONE = 0;
export const EVENT_MISSION_COMPLETE = 1;
export const EVENT_PLAYER_DEAD = 2;
export const EVENT_WANTED_UP = 4;
export const EVENT_PICKUP = 8;

export function createWorld(seed) {
  const random = createRandom(seed);
  const city = generateCity(seed);
  const props = generateProps(city, seed);
  const player = createPlayer(330, 396);
  const economy = createEconomy();
  const weather = createWeather();
  const missions = createMissionState();
  const dialogue = createDialogue();
  const loadout = freshLoadout();
  const taxi = createTaxiJob();
  const race = null;

  // Parked cars around the marina and downtown, plus the boats and the heli.
  const vehicles = [];
  const parkedSpots = [[330, 400], [336, 404], [318, 392], [300, 330], [452, 252], [320, 226], [200, 130], [448, 128]];
  const parkedDefs = ['coupe', 'sedan', 'taxi', 'sport', 'pickup', 'van', 'muscle', 'limo'];
  for (let i = 0; i < parkedSpots.length; i += 1) {
    const car = createVehicle(parkedDefs[i % parkedDefs.length], parkedSpots[i][0], parkedSpots[i][1], random() * Math.PI * 2);
    car.parked = true;
    vehicles.push(car);
  }
  // Boats sit just offshore at Harbor Point: close enough to wade to,
  // far enough out to float. (470, 88) was on dry land — beached boats.
  const boats = [createBoat('boat', 515, 66, 0.4), createBoat('speedboat', 530, 78, 0.6)];
  const heli = createHeli(320, 200, 0);
  const peds = [];
  const traffic = [];
  const police = [];
  const policeHeli = createHeli(320, 180, 0);
  const corpses = [];
  const state = {
    seed, random, city, props, player, economy, weather, missions, dialogue,
    loadout, taxi, race, vehicles, boats, heli, peds, traffic, police, policeHeli,
    corpses, elapsed: 0, day: 1, hour: START_HOUR, time: 0,
    gunfireAt: null, screen: 'title', paused: false,
    stats: { distanceDriven: 0, carsStolen: 0, chasesEscaped: 0, racesWon: 0, taxiFares: 0, kills: 0, deaths: 0 },
    notices: [], inInterior: null, camera: { camX: 330, camY: 6, camZ: 382, camYaw: 0 },
  };
  return {
    state,
    reset() { resetWorld(state, seed); },
    step(dt, input) { return stepWorld(state, dt, input || {}); },
    startMission(id) {
      const ok = startMission(state.missions, id);
      if (ok) queueMissionLines(state.dialogue, id);
      return ok;
    },
    loadStaging() { loadStagingSave(state); },
  };
}

function resetWorld(state, seed) {
  const fresh = createWorld(seed).state;
  for (const key of Object.keys(fresh)) state[key] = fresh[key];
}

function loadStagingSave(state) {
  const save = stagingSave();
  state.economy.cash = save.cash;
  state.economy.respect = save.respect;
  state.economy.day = save.day;
  state.economy.penthouse = save.penthouse;
  state.economy.garage = save.garage;
  state.player.money = save.cash;
  state.player.x = save.playerX;
  state.player.z = save.playerZ;
  state.hour = save.hour;
  state.weather.hour = save.hour;
  for (const id of save.missionsDone) if (!state.missions.completed.includes(id)) state.missions.completed.push(id);
  startMission(state.missions, save.mission);
  queueMissionLines(state.dialogue, save.mission);
  state.loadout.owned = save.owned.slice();
  state.loadout.ammo = JSON.parse(JSON.stringify(save.ammo));
  state.loadout.current = 'rifle';
  state.postcardsFound = save.postcards.slice();
  state.racesWon = save.racesWon;
}

/** The district the player is standing in, with its tagline. */
export function currentDistrict(state) {
  return districtAt(state.player.x, state.player.z);
}

function collideWithBuildings(state, x, z) {
  for (const b of state.city.buildings) {
    if (Math.abs(x - b.x) < b.w / 2 + 0.5 && Math.abs(z - b.z) < b.d / 2 + 0.5) return true;
  }
  return false;
}

/**
 * On foot you can wade a few metres past the shoreline to board a boat,
 * but you cannot walk out to sea. A point counts as wadeable when the
 * shoreline is within 8 m back toward the island centre.
 */
function wadeOk(x, z) {
  if (onLand(x, z)) return true;
  const dx = WORLD.centreX - x;
  const dz = WORLD.centreY - z;
  const len = Math.hypot(dx, dz) || 1;
  return onLand(x + (dx / len) * 8, z + (dz / len) * 8);
}

function stepWorld(state, dt, input) {
  let events = EVENT_NONE;
  state.elapsed += dt;
  state.time += dt;
  stepWeather(state.weather, dt, state.random);
  state.hour = state.weather.hour;
  const player = state.player;
  const inMission = state.missions.active !== null;

  // Wanted decay and police numbers follow the wanted level.
  const seen = state.police.length > 0;
  decayWanted(player, dt, seen && player.wanted > 0);
  const wantUnits = wantedUnitCount(player.wanted);
  while (state.police.length < wantUnits) {
    spawnUnit(state.police, state.police.length + 1, player, state.city.roads, state.random);
  }
  while (state.police.length > wantUnits) state.police.pop();
  stepPolice(state.police, player, player.wanted, dt, inMission, state.random);
  if (player.wanted >= 3) stepPoliceHeli(state.policeHeli, player, dt, state.time);

  // Movement: on foot, in a car, on a boat, or in the helicopter.
  if (player.vehicle && player.vehicle.id === 'heli') {
    stepHeli(player.vehicle, { steer: input.steer || 0, throttle: input.forward ? 1 : 0, climb: (input.climbUp ? 1 : 0) - (input.climbDown ? 1 : 0) }, dt);
  } else if (player.vehicle) {
    const ox = player.vehicle.x;
    const oz = player.vehicle.z;
    stepVehicle(player.vehicle, { steer: input.steer || 0, throttle: input.forward ? 1 : 0, brake: input.back ? 1 : 0, handbrake: !!input.handbrake }, dt);
    // Cars do not drive through buildings: a penetration reverts the move.
    if (collideWithBuildings(state, player.vehicle.x, player.vehicle.z)) {
      player.vehicle.x = ox;
      player.vehicle.z = oz;
      player.vehicle.speed *= 0.3;
      player.vehicle.vx *= 0.3;
      player.vehicle.vz *= 0.3;
    }
    player.x = player.vehicle.x;
    player.z = player.vehicle.z;
    player.heading = player.vehicle.heading;
    state.stats.distanceDriven += Math.abs(player.vehicle.speed || 0) * dt;
  } else if (player.boat) {
    stepBoat(player.boat, { steer: input.steer || 0, throttle: input.forward ? 1 : 0, brake: input.back ? 1 : 0 }, dt);
    player.x = player.boat.x;
    player.z = player.boat.z;
    player.heading = player.boat.heading;
  } else {
    stepPlayerOnFoot(player, {
      steer: input.steer || 0, forward: !!input.forward, back: !!input.back, run: !!input.run,
    }, dt, (x, z) => !collideWithBuildings(state, x, z) && wadeOk(x, z));
  }

  // Enter or exit a vehicle, boat or helicopter.
  if (input.enter) {
    if (player.vehicle) exitVehicle(player);
    else if (player.boat) leaveBoat(player);
    else {
      const car = nearestVehicle(state.vehicles, player.x, player.z, 4);
      const boat = nearestBoat(state.boats, player.x, player.z, 5);
      const heliNear = dist2d(player.x, player.z, state.heli.x, state.heli.z) < 5 ? state.heli : null;
      if (car) {
        const wasParked = car.parked;
        enterVehicle(player, car);
        if (wasParked) { state.stats.carsStolen += 1; addWanted(player, 1); events |= EVENT_WANTED_UP; }
      } else if (boat) boardBoat(player, boat);
      else if (heliNear) { player.onFoot = false; player.vehicle = heliNear; heliNear.driver = player; }
    }
  }

  // Traffic and crowds live around the player.
  maintainTraffic(state.traffic, player, state.city.roads, state.random, 12);
  stepTraffic(state.traffic, dt, [...state.vehicles, player]);
  maintainCrowd(state.peds, player, state.city, state.random, 14);
  stepPeds(state.peds, player, dt, state.gunfireAt, state.random);
  state.gunfireAt = null;

  // Cars hitting people: damage plus knockback, never a pass-through.
  const nowMs = Math.floor(state.time * 1000);
  for (const car of [...state.vehicles, ...state.traffic]) {
    if (!car.driver && car.parked) continue;
    // Your own car cannot run you over: you are in it. vehicleHitsPerson
    // damages the person directly, so the check must skip the driver's
    // own vehicle BEFORE the call, not after.
    if (car.driver !== player) vehicleHitsPerson(car, player, nowMs);
    for (const ped of state.peds) {
      if (ped.dead) continue;
      const hit = vehicleHitsPerson(car, ped, nowMs);
      if (hit > 0 && ped.health <= 0) {
        ped.dead = true;
        state.corpses.push({ x: ped.x, z: ped.z, diedAt: nowMs });
        if (car.driver === player) addWanted(player, 1);
      }
    }
  }

  // Shooting: the held weapon fires toward the heading.
  if (input.fire && player.onFoot) {
    const shots = fireWeapon(state.loadout, dt);
    if (shots > 0) {
      state.gunfireAt = { x: player.x, z: player.z };
      for (const ped of state.peds) {
        if (ped.dead) continue;
        if (bulletHits(player, player.heading, ped, 60, 0.02)) {
          applyHit(ped, 34);
          if (ped.dead) { state.stats.kills += 1; state.corpses.push({ x: ped.x, z: ped.z, diedAt: nowMs }); }
        }
      }
      for (const unit of state.police) {
        if (unit.onFoot && bulletHits(player, player.heading, unit, 60, 0.02)) {
          applyHit(unit, 34);
          if (unit.dead) addWanted(player, 2);
        }
      }
    }
  } else if (state.loadout.cooldown > 0) state.loadout.cooldown -= dt;
  if (state.loadout.muzzleFlash > 0) state.loadout.muzzleFlash -= dt;

  // Missions advance; finishing one pays out.
  if (inMission) {
    const result = stepMission(state.missions, state, dt);
    if (result === 'complete') {
      const done = state.missions.completed[state.missions.completed.length - 1];
      // Pay the finished mission's payout and respect now.
      const def = [1200, 2600, 4200, 6000, 9500, 15000][done - 1] || 0;
      const rep = [220, 320, 420, 520, 650, 900][done - 1] || 0;
      payMission(state.economy, def, rep);
      player.money = state.economy.cash;
      state.stats.missionsDone = state.missions.completed.length;
      state.notices.push(`Mission complete: +$${def}`);
      events |= EVENT_MISSION_COMPLETE;
    }
  }
  stepDialogue(state.dialogue, dt);

  // Taxi fares pay out on drop-off.
  const fare = stepTaxiJob(state.taxi, player);
  if (fare > 0) {
    state.economy.cash += fare;
    player.money = state.economy.cash;
    state.stats.taxiFares += 1;
  }

  // Postcards: walk close to collect one.
  const found = state.postcardsFound || (state.postcardsFound = []);
  const card = collectPostcard(found, player.x, player.z);
  if (card) {
    found.push(card.id);
    state.economy.cash += 100;
    player.money = state.economy.cash;
    state.notices.push(`Postcard found: ${card.spot} (+$100)`);
    events |= EVENT_PICKUP;
  }

  // Death and respawn at the safehouse.
  if (player.health <= 0) {
    player.health = 100;
    player.x = 210;
    player.z = 150;
    player.wanted = 0;
    state.stats.deaths += 1;
    events |= EVENT_PLAYER_DEAD;
  }
  return events;
}

export { STEP, clockText, completionPercent, nextMission };

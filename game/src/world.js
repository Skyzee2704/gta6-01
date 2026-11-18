// world.js — the simulation. One fixed step advances everything: the
// clock, the player, the cars, the traffic, the peds, the police, the
// enemies, the missions, the race, the weather, the particles.
// Pure numbers: no DOM, no canvas, no THREE. The renderer only reads
// this state and draws it.

import { STEP, START_HOUR, MINUTES_PER_SECOND, SPAWN, WALK_SPEED, RUN_SPEED, WORLD } from './config.js';
import { RNG, dist2, clamp, wrapAngle } from './random.js';
import { createCity, buildingAt } from './city.js';
import { createWanted, updateWanted, updatePolice, bustPlayer } from './police.js';
import { createVehicles, driveVehicle, enterVehicle as carEnter, exitVehicle as carExit, nearestParkedCar } from './vehicles.js';
import { updateTraffic } from './traffic.js';
import { createPeds, updatePeds } from './npc.js';
import { updateEnemies, damagePlayer, pruneEnemies } from './combat.js';
import { createMissionState, updateMissions } from './missions.js';
import { createRaceState, updateRace, raceRivals } from './minigames.js';
import { createWeather, updateWeather, gripFactor } from './weather.js';
import { createDialogue, updateDialogue } from './dialogue.js';
import { updateTapes, updateTaxi } from './side.js';
import { createBoats, updateBoats, enterBoat, exitBoat, nearestBoat } from './boats.js';
import { createHelis, updateHelis, enterHeli, exitHeli, heliAtPad } from './aircraft.js';
import { enterInterior, leaveInterior } from './interiors.js';
import { emptyInput } from './input.js';
import { addWantedHeat, nextWeapon } from './weapons.js';

// Event name the world emits when a mission completes.
export const EVENT_MISSION_DONE = 'mission-done';

// Re-export the input factory so the tests import it from here.
export { emptyInput };

// Build a fresh world from a seed. Returns { state, city, rng, step }.
export function createWorld(seed) {
  const rng = new RNG(seed);
  const city = createCity(seed);
  const state = {
    seed,
    city,
    time: 0,
    hour: START_HOUR,
    day: 1,
    money: 250,
    respect: 0,
    respectLevel: 0,
    tapesFound: 0,
    wanted: createWanted(),
    mission: createMissionState(),
    race: createRaceState(),
    weather: createWeather(),
    dialogue: createDialogue(),
    player: {
      x: SPAWN.x,
      z: SPAWN.z,
      heading: SPAWN.heading,
      onFoot: true,
      vehicleId: -1,
      boatId: -1,
      heliId: -1,
      speed: 0,
      health: 100,
      armor: 0,
    },
    vehicles: createVehicles(city, rng),
    peds: createPeds(city, rng, 24),
    cops: [],
    enemies: [],
    corpses: [],
    boats: createBoats(city),
    helis: createHelis(city),
    particles: [],
    notices: [],
    interior: null,
    properties: { penthouse: false, safehouse: true },
    garage: [],
    weapons: {
      current: 'pistol',
      owned: { pistol: true },
      ammo: { pistol: 12 },
      reloadT: 0,
      lastShotAt: -99,
    },
    taxi: { active: false, stage: 0, timer: 0, pickup: { x: 0, z: 0 }, dropoff: { x: 0, z: 0 } },
    stats: {
      distance: 0,
      stolen: 0,
      escapes: 0,
      racesWon: 0,
      fares: 0,
      kills: 0,
      shotsFired: 0,
      shotsHit: 0,
    },
    roadblock: null,
    heliSearch: false,
    tracer: null,
    shotFx: null,
    nextVehicleId: 1000,
    nextCopId: 0,
    nextEnemyId: 0,
    onMissionDone: null,
  };
  // Wire the vehicle id counter past the spawned fleet.
  state.nextVehicleId = 1000 + state.vehicles.length;

  function step(dt, input) {
    stepWorld(state, city, rng, dt, input || emptyInput());
  }

  return { state, city, rng, step };
}

// Advance the whole sim one fixed step.
function stepWorld(state, city, rng, dt, input) {
  const p = state.player;
  // Clock.
  state.time += dt;
  state.hour += (MINUTES_PER_SECOND * dt) / 60;
  if (state.hour >= 24) {
    state.hour -= 24;
    state.day += 1;
    if (state.properties.penthouse) {
      state.money += 500;
    }
  }
  // Weapon reload timer.
  if (state.weapons.reloadT > 0) state.weapons.reloadT -= dt;
  // Tracer / shot fx decay.
  if (state.tracer) {
    state.tracer.t -= dt;
    if (state.tracer.t <= 0) state.tracer = null;
  }
  if (state.shotFx) {
    state.shotFx.t -= dt;
    if (state.shotFx.t <= 0) state.shotFx = null;
  }
  // Mouse look (on foot only).
  if (input.mouseDX) {
    p.heading -= input.mouseDX * 0.003;
  }
  // Enter / exit vehicles, boats, helis, interiors.
  if (input.enterVehicle) {
    if (!p.onFoot) {
      if (p.vehicleId >= 0) carExit(state);
      else if (p.boatId >= 0) exitBoat(state);
      else if (p.heliId >= 0) exitHeli(state);
    } else if (state.interior) {
      leaveInterior(state);
    } else {
      const car = carEnter(state, city);
      if (!car) {
        const boat = enterBoat(state);
        if (!boat) {
          const heli = enterHeli(state);
          if (!heli) enterInterior(state, city);
        }
      }
    }
  }
  if (input.interact && p.onFoot && !state.interior) {
    enterInterior(state, city);
  }
  // Race countdown: the grid is locked until GO. Driving input is
  // ignored while the countdown runs so the player cannot leave the
  // start line before the race begins. (Mouse look still works.)
  if (state.race.active && !state.race.started && state.race.countdown > 0) {
    input = { ...input, forward: false, back: false, left: false, right: false, handbrake: false };
  }
  // Movement.
  if (p.vehicleId >= 0) {
    const v = state.vehicles.find((q) => q.id === p.vehicleId);
    if (v) {
      driveVehicle(v, input, dt, city, gripFactor(state));
      p.x = v.x;
      p.z = v.z;
      p.heading = v.heading;
      p.speed = v.speed;
      state.stats.distance += Math.abs(v.speed) * dt;
      // Car-ped collision: a moving car that hits a ped knocks them down.
      if (Math.abs(v.speed) >= 3) {
        for (const ped of state.peds) {
          if (ped.down) continue;
          if (dist2(ped.x, ped.z, v.x, v.z) < 1.6 * 1.6) {
            knockPed(state, ped, v, rng);
          }
        }
      }
      // The player's car explodes at 0 health.
      if (v.health <= 0 && !v.exploded) {
        v.exploded = true;
        if (state.notices) state.notices.push('Your car exploded!');
        damagePlayer(state, 25);
        carExit(state);
      }
    }
  } else if (p.boatId >= 0) {
    updateBoats(state, dt, input);
  } else if (p.heliId >= 0) {
    updateHelis(state, dt, input);
  } else if (p.onFoot) {
    moveOnFoot(state, city, dt, input);
  }
  // World systems.
  updateTraffic(state, city, dt, rng);
  updatePeds(state, city, dt, rng);
  updateEnemies(state, city, dt, rng);
  updatePolice(state, city, dt, rng);
  updateWanted(state, dt);
  updateMissions(state, city, dt, rng);
  updateRace(state, dt);
  raceRivals(state, dt, rng);
  updateWeather(state, dt, rng);
  updateDialogue(state, dt);
  updateTapes(state, city);
  updateTaxi(state, city, dt, rng);
  updateParticles(state, dt);
  updateCorpses(state, dt);
  // Radio (edge-triggered: one press = one station change).
  if (input.radioNext) state.radioIndex = ((state.radioIndex || 0) + 1) % 4;
  if (input.radioPrev) state.radioIndex = ((state.radioIndex || 0) + 3) % 4;
  // Weapon switching (edge-triggered).
  if (input.weaponNext) nextWeapon(state);
  // Death: respawn at the hospital, bill the player, blow the mission.
  if (p.health <= 0) {
    respawn(state);
  }
  // Notices: keep the last few.
  if (state.notices.length > 6) state.notices.splice(0, state.notices.length - 6);
}

// On-foot movement: W/S along the heading, A/D strafe sideways.
// A strafes left, D strafes right (not mirrored).
function moveOnFoot(state, city, dt, input) {
  const p = state.player;
  const speed = input.run ? RUN_SPEED : WALK_SPEED;
  const fx = Math.sin(p.heading);
  const fz = Math.cos(p.heading);
  // Right vector (perpendicular, clockwise from facing).
  const rx = Math.cos(p.heading);
  const rz = -Math.sin(p.heading);
  let mx = 0;
  let mz = 0;
  if (input.forward) { mx += fx; mz += fz; }
  if (input.back) { mx -= fx; mz -= fz; }
  if (input.left) { mx -= rx; mz -= rz; }
  if (input.right) { mx += rx; mz += rz; }
  const len = Math.hypot(mx, mz);
  if (len > 0.01) {
    mx /= len;
    mz /= len;
    const nx = p.x + mx * speed * dt;
    const nz = p.z + mz * speed * dt;
    // Buildings block walking: slide along the wall.
    if (!buildingAt(city, nx, nz)) {
      p.x = nx;
      p.z = nz;
    } else if (!buildingAt(city, nx, p.z)) {
      p.x = nx;
    } else if (!buildingAt(city, p.x, nz)) {
      p.z = nz;
    }
    p.x = clamp(p.x, WORLD.minX + 2, WORLD.maxX - 2);
    p.z = clamp(p.z, WORLD.minZ + 2, WORLD.maxZ - 2);
    p.speed = speed;
    state.stats.distance += speed * dt;
  } else {
    p.speed = 0;
  }
}

// A car hits a ped: the ped goes down with a knockback. Killing a ped
// with a car raises wanted heat (witnessed by definition: the driver).
function knockPed(state, ped, vehicle, rng) {
  ped.down = true;
  ped.downT = 0;
  ped.health = 0;
  const away = Math.atan2(ped.x - vehicle.x, ped.z - vehicle.z);
  ped.x += Math.sin(away) * 2;
  ped.z += Math.cos(away) * 2;
  state.corpses.push({ x: ped.x, z: ped.z, heading: ped.heading, t: 0 });
  addWantedHeat(state, 1.0);
  if (state.notices) state.notices.push('You hit a pedestrian!');
}

// Particles: age them out.
function updateParticles(state, dt) {
  for (const pt of state.particles) {
    if (!pt.active) continue;
    pt.life -= dt;
    if (pt.life <= 0) pt.active = false;
  }
  if (state.particles.length > 400) {
    state.particles = state.particles.filter((pt) => pt.active).slice(-300);
  }
}

// Corpses: lie for 25 seconds, then fade away.
function updateCorpses(state, dt) {
  for (const c of state.corpses) c.t += dt;
  state.corpses = state.corpses.filter((c) => c.t < 25);
}

// The player died: hospital respawn, a bill, the mission blows.
function respawn(state) {
  const p = state.player;
  state.money = Math.max(0, state.money - 300);
  p.health = 100;
  p.x = -260;
  p.z = 190;
  p.onFoot = true;
  p.vehicleId = -1;
  p.boatId = -1;
  p.heliId = -1;
  p.speed = 0;
  state.wanted.heat = Math.max(0, state.wanted.heat - 1);
  state.wanted.level = Math.max(0, state.wanted.level - 1);
  if (state.mission.active) {
    state.mission.active = false;
    state.mission.failed = true;
    state.mission.failReason = 'You died.';
    if (state.notices) state.notices.push('JOB BLOWN: You died.');
  }
  if (state.notices) state.notices.push('FLATLINED. The hospital sends a bill. Try again.');
  // Clear the enemies that killed the player so the retry is fair.
  pruneEnemies(state);
}

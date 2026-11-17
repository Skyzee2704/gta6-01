// The world: one object holding everything alive in Solmar, and one
// fixed-step update that moves it all. The player, the cars, the crowd, the
// police, the mission engine, particles and the camera all meet here.
import {
  WORLD_W, WORLD_H, VIEW_W, VIEW_H, WALK_SPEED, RUN_SPEED, PLAYER_RADIUS,
  PLAYER_MAX_HP, CLOCK_START_HOURS, CLOCK_MINUTES_PER_SECOND,
  MAX_TRAFFIC, MAX_PEDESTRIANS,
} from './config.js';
import { makeRng, range, pick } from './random.js';
import { createCityMap, pushOutOfBuildings, randomRoadPoint, randomSidewalkPoint, districtAt } from './city.js';
import { createVehicle, driveVehicle, collideVehicles, collideVehicleWithCity, resetVehicleIds } from './vehicles.js';
import { createPedestrian, updatePedestrians, maintainPedestrians, scarePedestrians, resetPedestrianIds } from './pedestrians.js';
import { spawnTrafficCar, updateTraffic, maintainTraffic } from './traffic.js';
import {
  createWanted, commitCrime, wantedCruiserCount, spawnCruiser, spawnRoadblock,
  updatePoliceCruiser, updateWanted, policeCatchCheck,
} from './police.js';
import {
  createLoadout, createEnemy, firePistol, punch, startReload, finishReload,
  updateEnemies, resetEnemyIds,
} from './combat.js';
import { createMissionState, startMission, updateMission } from './missions.js';

export function createWorld(seed) {
  resetVehicleIds();
  resetPedestrianIds();
  resetEnemyIds();
  const rng = makeRng(seed);
  const city = createCityMap(seed);
  const world = {
    seed,
    rng,
    city,
    status: 'playing', // 'playing' | 'busted' | 'wasted'
    statusTimer: 0,
    clockMinutes: CLOCK_START_HOURS * 60,
    camera: { x: 480, y: 1620 },
    shake: 0,
    time: 0,
    events: [],
    sfx: [],
    particles: [],
    tracers: [],
    wanted: createWanted(),
    mission: createMissionState(),
    failedMission: null,
    crimeCooldown: 0,
    roadblockLevel: 0,
    player: {
      x: 420,
      y: 1660,
      angle: -Math.PI / 2,
      hp: PLAYER_MAX_HP,
      armor: 0,
      money: 0,
      respect: 0,
      onFoot: true,
      car: null,
      loadout: createLoadout(),
      aimX: 0,
      aimY: 0,
      speed: 0,
      district: 'Solmar Marina',
    },
    vehicles: [],
    peds: [],
    enemies: [],
    onObjectiveAdvanced: null,
    onMissionComplete: null,
  };

  // The city starts lived-in: parked cars in the lots and on the streets,
  // traffic already rolling, people already on the sidewalks.
  for (const lot of city.parkingLots) {
    // The Marina lot keeps a bay free for Rosa's mission coupe.
    const bays = lot.x === 420 ? 1 : 2;
    for (let i = 0; i < bays; i += 1) {
      const type = pick(rng, ['sedan', 'coupe', 'taxi', 'van']);
      const car = createVehicle(rng, type, lot.x + 20 + i * 56, lot.y + 18, 0, 'parked');
      world.vehicles.push(car);
    }
  }
  for (let i = 0; i < 6; i += 1) {
    const spot = randomRoadPoint(rng);
    const car = createVehicle(rng, pick(rng, ['sedan', 'coupe', 'taxi']), spot.x, spot.y, range(rng, 0, Math.PI * 2), 'parked');
    world.vehicles.push(car);
  }
  for (let i = 0; i < MAX_TRAFFIC; i += 1) {
    world.vehicles.push(spawnTrafficCar(rng));
  }
  for (let i = 0; i < MAX_PEDESTRIANS; i += 1) {
    const spot = randomSidewalkPoint(rng);
    world.peds.push(createPedestrian(rng, spot.x, spot.y));
  }
  return world;
}

// A parked mission car the story needs, placed and tagged so the mission
// engine can find it later.
export function spawnMissionCar(world, type, x, y, angle, tag) {
  const car = createVehicle(world.rng, type, x, y, angle, 'mission');
  car.tag = tag;
  world.vehicles.push(car);
  return car;
}

function prepareMissionScene(world, index) {
  if (index === 0) {
    // Parked on the sidewalk by the dock, clear of every building, nose
    // north and ready to drive — never inside a block where Milo could
    // not reach it on foot. Rosa's garage tuned it: it takes a beating.
    const coupe = spawnMissionCar(world, 'coupe', 456, 1560, -Math.PI / 2, 'missionCar');
    coupe.hp = 140;
    coupe.maxHp = 140;
  } else if (index === 4) {
    // Parked on the sidewalk by the buyer lot, clear of the buildings.
    spawnMissionCar(world, 'sports', 1970, 855, Math.PI / 2, 'scoreCar');
    spawnMissionCar(world, 'sedan', 1970, 930, 0, 'guardCar');
  } else if (index === 5) {
    spawnMissionCar(world, 'truck', 1980, 1250, Math.PI, 'vaultTruck');
  }
}

// When an objective becomes active it may need the scene changed: enemies
// to fight, a car to chase, or the heat to rise.
export function prepareObjectiveScene(world) {
  const state = world.mission;
  const obj = state.objective;
  if (!obj) return;
  if (obj.kind === 'defeat') {
    for (let i = 0; i < obj.count; i += 1) {
      const a = (i / obj.count) * Math.PI * 2;
      const enemy = createEnemy(world.rng, obj.spawnAt.x + Math.cos(a) * 120, obj.spawnAt.y + Math.sin(a) * 120);
      world.enemies.push(enemy);
    }
  } else if (obj.kind === 'chase') {
    const car = spawnMissionCar(world, 'coupe', world.player.x + 420, world.player.y - 160, Math.PI / 2, 'vultureCar');
    car.owner = 'mission';
    car.fleeing = true;
    car.speed = 260;
  } else if (obj.kind === 'escape') {
    commitCrime(world.wanted, 2, true);
    for (let i = 0; i < 3; i += 1) world.vehicles.push(spawnCruiser(world.rng, world.player.x, world.player.y));
  } else if (state.mission && state.mission.id === 5 && obj.kind === 'goto') {
    commitCrime(world.wanted, 4, true);
    for (let i = 0; i < 4; i += 1) world.vehicles.push(spawnCruiser(world.rng, world.player.x, world.player.y));
    for (const b of spawnRoadblock(world.rng, world.player.x, world.player.y, world.player.angle)) {
      world.vehicles.push(b);
    }
    world.roadblockLevel = 4;
  }
}

export function startMissionInWorld(world, index) {
  prepareMissionScene(world, index);
  const ok = startMission(world.mission, index);
  if (ok) prepareObjectiveScene(world);
  return ok;
}

function nearestCar(world, x, y, radius) {
  let best = null;
  let bestDist = radius;
  for (const car of world.vehicles) {
    if (car.hp <= 0) continue;
    const dist = Math.hypot(car.x - x, car.y - y);
    if (dist < bestDist) {
      best = car;
      bestDist = dist;
    }
  }
  return best;
}

function witnessNearby(world, x, y) {
  for (const ped of world.peds) {
    if (Math.hypot(ped.x - x, ped.y - y) < 260) return true;
  }
  for (const car of world.vehicles) {
    if (car.owner === 'police' && Math.hypot(car.x - x, car.y - y) < 560) return true;
  }
  return false;
}

export function enterCar(world, car) {
  const player = world.player;
  if (car.owner === 'player' || car.owner === 'mission') {
    // Your own car, or the one the story put there: no heat for taking it.
  } else if (car.owner === 'police' || car.owner === 'roadblock') {
    // Taking a cruiser is grand theft auto in front of the whole department.
    commitCrime(world.wanted, 2, true);
    world.sfx.push('steal');
  } else {
    // A stranger's car, parked or driven: yank the driver out if there
    // is one, and if anyone saw it happen the heat rises.
    if (car.owner === 'traffic' && car.driver) {
      car.driver = false;
      const ped = createPedestrian(world.rng, car.x + 30, car.y + 30);
      ped.state = 'flee';
      ped.fleeTimer = 3;
      world.peds.push(ped);
    }
    if (witnessNearby(world, car.x, car.y)) commitCrime(world.wanted, 1, true);
    world.sfx.push('steal');
  }
  car.owner = 'player';
  player.car = car;
  player.onFoot = false;
  player.angle = car.angle;
}

export function exitCar(world) {
  const player = world.player;
  const car = player.car;
  if (!car) return;
  const sideX = Math.cos(car.angle + Math.PI / 2);
  const sideY = Math.sin(car.angle + Math.PI / 2);
  player.x = car.x + sideX * 34;
  player.y = car.y + sideY * 34;
  player.onFoot = true;
  player.car = null;
  player.angle = car.angle;
  car.speed = 0;
}

function addParticles(world, x, y, count, color, speed, life, size) {
  for (let i = 0; i < count; i += 1) {
    const a = world.rng() * Math.PI * 2;
    const v = range(world.rng, speed * 0.3, speed);
    world.particles.push({
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: range(world.rng, life * 0.5, life),
      maxLife: life,
      size: range(world.rng, size * 0.6, size * 1.4),
      color,
      kind: 'puff',
    });
  }
}

function updatePlayerOnFoot(world, input, dt) {
  const player = world.player;
  let mx = 0;
  let my = 0;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  if (input.up) my -= 1;
  if (input.down) my += 1;
  const moving = mx !== 0 || my !== 0;
  if (moving) {
    const len = Math.hypot(mx, my);
    mx /= len;
    my /= len;
    const speed = input.run ? RUN_SPEED : WALK_SPEED;
    player.x += mx * speed * dt;
    player.y += my * speed * dt;
    player.speed = speed;
    if (player.loadout.weapon === 'fists') player.angle = Math.atan2(my, mx);
  } else {
    player.speed = 0;
  }
  if (player.loadout.weapon === 'pistol') {
    player.angle = Math.atan2(player.aimY - player.y, player.aimX - player.x);
  }
  const body = { x: player.x, y: player.y, r: PLAYER_RADIUS };
  pushOutOfBuildings(world.city, body);
  player.x = body.x;
  player.y = body.y;
  player.x = Math.max(20, Math.min(WORLD_W - 20, player.x));
  player.y = Math.max(20, Math.min(WORLD_H - 20, player.y));

  if (input.attackPressed) {
    if (player.loadout.weapon === 'pistol') {
      const shot = firePistol(world, player.x, player.y, player.aimX, player.aimY);
      if (shot) {
        world.shake = Math.max(world.shake, 3);
        world.sfx.push('shot');
        scarePedestrians(world.peds, player.x, player.y, 320);
        if (world.crimeCooldown <= 0 && witnessNearby(world, player.x, player.y)) {
          commitCrime(world.wanted, 1, true);
          world.crimeCooldown = 3;
        }
      }
    } else {
      punch(world, player.x, player.y, player.angle);
      world.sfx.push('punch');
    }
  }
  if (input.reloadPressed) startReload(world);
  if (input.weaponPistol) player.loadout.weapon = 'pistol';
  if (input.weaponFists) player.loadout.weapon = 'fists';
}

function updatePlayerInCar(world, input, dt) {
  const player = world.player;
  const car = player.car;
  if (!car) {
    player.onFoot = true;
    return;
  }
  const throttle = (input.up ? 1 : 0) - (input.down ? 0.7 : 0);
  const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  driveVehicle(car, throttle, steer, input.handbrake, dt);
  collideVehicleWithCity(world.city, car, (c, b) => pushOutOfBuildings(c, b));
  player.x = car.x;
  player.y = car.y;
  player.angle = car.angle;
  player.speed = Math.abs(car.speed);
  if (car.skid > 0.4 && Math.abs(car.speed) > 140) {
    world.particles.push({
      x: car.x - Math.cos(car.angle) * 20,
      y: car.y - Math.sin(car.angle) * 20,
      vx: 0, vy: 0,
      life: 1.6, maxLife: 1.6,
      size: 7, color: 'rgba(30, 25, 20, 0.5)', kind: 'skid',
    });
  }
  if (car.smoke > 0.3 && world.rng() < 0.4) {
    world.particles.push({
      x: car.x - Math.cos(car.angle) * 24,
      y: car.y - Math.sin(car.angle) * 24,
      vx: range(world.rng, -14, 14), vy: range(world.rng, -30, -8),
      life: 1.1, maxLife: 1.1,
      size: range(world.rng, 6, 12), color: 'rgba(90, 85, 80, 0.55)', kind: 'puff',
    });
  }
  // Running someone over is a crime the whole street sees.
  for (let i = world.peds.length - 1; i >= 0; i -= 1) {
    const ped = world.peds[i];
    const dist = Math.hypot(ped.x - car.x, ped.y - car.y);
    if (dist < 26 && Math.abs(car.speed) > 90) {
      world.peds.splice(i, 1);
      commitCrime(world.wanted, 2, true);
      scarePedestrians(world.peds, car.x, car.y, 320);
      addParticles(world, ped.x, ped.y, 8, '#c94f42', 90, 0.7, 5);
      world.sfx.push('thud');
      world.shake = Math.max(world.shake, 5);
    }
  }
}

function updatePolice(world, dt) {
  const player = world.player;
  const wanted = world.wanted;
  const cruisers = world.vehicles.filter((v) => v.owner === 'police');
  const want = wantedCruiserCount(wanted);
  if (cruisers.length < want) {
    world.vehicles.push(spawnCruiser(world.rng, player.x, player.y));
  }
  let nearest = null;
  for (const car of world.vehicles) {
    if (car.owner !== 'police') continue;
    const dist = updatePoliceCruiser(car, player.x, player.y, dt);
    collideVehicleWithCity(world.city, car, (c, b) => pushOutOfBuildings(c, b));
    if (nearest === null || dist < nearest) nearest = dist;
    // A cruiser ramming the player's car damages it and shakes the screen,
    // but only once per beat of contact — per-step damage would shred a
    // car in a single sideswipe.
    if (player.car) {
      const d = Math.hypot(car.x - player.car.x, car.y - player.car.y);
      if (d < 60 && Math.abs(car.speed) > 120 && world.time - (car.lastRam || 0) > 0.8) {
        car.lastRam = world.time;
        player.car.hp -= 4;
        world.shake = Math.max(world.shake, 4);
      }
    }
  }
  // High heat brings roadblocks: parked cruisers across the road ahead.
  if (wanted.level >= 4 && world.roadblockLevel !== wanted.level) {
    for (const b of spawnRoadblock(world.rng, player.x, player.y, player.angle)) {
      world.vehicles.push(b);
    }
    world.roadblockLevel = wanted.level;
  }
  if (wanted.level < 4) world.roadblockLevel = 0;
  updateWanted(wanted, nearest, dt);
  if (player.onFoot && player.hp > 0) {
    const caught = policeCatchCheck(world.vehicles, player.x, player.y, player.speed);
    if (caught) {
      world.status = 'busted';
      world.statusTimer = 0;
      world.sfx.push('busted');
    }
  }
}

function updateCarPairs(world) {
  const cars = world.vehicles;
  for (let i = 0; i < cars.length; i += 1) {
    for (let j = i + 1; j < cars.length; j += 1) {
      const a = cars[i];
      const b = cars[j];
      if (a.hp <= 0 || b.hp <= 0) continue;
      if (Math.abs(a.x - b.x) > 90 || Math.abs(a.y - b.y) > 90) continue;
      collideVehicles(a, b);
    }
  }
  // A wrecked player car strands the driver on foot.
  for (const car of cars) {
    if (car.hp <= 0 && car.owner === 'player' && world.player.car === car) {
      world.player.car = null;
      world.player.onFoot = true;
    }
  }
}

function updateFleeingCars(world, dt) {
  const player = world.player;
  for (const car of world.vehicles) {
    if (!car.fleeing || car.hp <= 0) continue;
    const dx = car.x - player.x;
    const dy = car.y - player.y;
    const wantAngle = Math.atan2(dy, dx);
    let diff = wantAngle - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, diff * 2));
    driveVehicle(car, 0.9, steer, false, dt);
    collideVehicleWithCity(world.city, car, (c, b) => pushOutOfBuildings(c, b));
  }
}

// One fixed step of the whole simulation.
export function updateWorld(world, input, dt) {
  world.time += dt;
  world.clockMinutes += CLOCK_MINUTES_PER_SECOND * dt;
  if (world.clockMinutes >= 1440) world.clockMinutes -= 1440;
  world.crimeCooldown = Math.max(0, world.crimeCooldown - dt);
  world.shake = Math.max(0, world.shake - dt * 14);
  if (world.mission.banner > 0) world.mission.banner -= dt;

  const player = world.player;
  const loadout = player.loadout;
  if (loadout.cooldown > 0) loadout.cooldown -= dt;
  if (loadout.reloading) {
    loadout.reloadTimer -= dt;
    if (loadout.reloadTimer <= 0) finishReload(world);
  }

  if (world.status !== 'playing') {
    world.statusTimer += dt;
    return;
  }

  player.aimX = input.aimX;
  player.aimY = input.aimY;

  if (input.interactPressed) {
    if (player.onFoot) {
      // Close enough to climb in: the radius is tight on purpose, so a
      // car parked bumper to bumper with another is never the wrong one.
      const car = nearestCar(world, player.x, player.y, 48);
      if (car) enterCar(world, car);
    } else {
      exitCar(world);
    }
  }

  if (player.onFoot) updatePlayerOnFoot(world, input, dt);
  else updatePlayerInCar(world, input, dt);

  // The chase target drives itself away from the player.
  updateFleeingCars(world, dt);
  updateTraffic(world.vehicles, player.car, dt, world.rng);
  maintainTraffic(world.vehicles, world.rng, MAX_TRAFFIC, player.x, player.y);
  // The crowd, kept topped up. Pedestrians scatter from a speeding car —
  // the player included — so a fast driver clears the crossing ahead.
  const carDanger = !player.onFoot && player.car && Math.abs(player.car.speed) > 120
    ? { x: player.car.x, y: player.car.y, radius: 300 }
    : null;
  updatePedestrians(world.peds, dt, world.rng, carDanger, world.city);
  maintainPedestrians(world.peds, world.rng, MAX_PEDESTRIANS);
  updateEnemies(world, dt, world.rng);
  updateCarPairs(world);
  updatePolice(world, dt);

  // Mission engine, including failing the run when the player dies or
  // gets caught mid-mission.
  const missionResult = updateMission(world.mission, world, dt);
  if (missionResult === 'completed' || world.mission.justCompleted) {
    world.sfx.push('missionComplete');
    world.mission.lastDone = world.mission.justCompleted;
    world.mission.justCompleted = null;
  }
  if (world.mission.failed) {
    world.sfx.push('missionFailed');
    world.failedMission = { index: world.mission.index, reason: world.mission.failedReason };
    world.mission = createMissionState();
  }
  if (world.mission.objective && world.mission.objectiveAdvanced) {
    world.mission.objectiveAdvanced = false;
    prepareObjectiveScene(world);
  }

  // Turn this step's events into particles, sounds and mission progress.
  for (const event of world.events) {
    if (event.type === 'shot') {
      world.tracers.push({ x0: event.x, y0: event.y, x1: event.endX, y1: event.endY, life: 0.09, maxLife: 0.09 });
      addParticles(world, event.endX, event.endY, 4, '#f2c14e', 60, 0.25, 3);
    } else if (event.type === 'enemyHit') {
      addParticles(world, event.x, event.y, 6, '#c94f42', 80, 0.5, 4);
    } else if (event.type === 'enemyDown') {
      world.mission.defeated += 1;
      addParticles(world, event.x, event.y, 14, '#c94f42', 120, 0.8, 5);
      world.sfx.push('enemyDown');
    } else if (event.type === 'pickup') {
      addParticles(world, event.x, event.y, 10, '#f2c14e', 70, 0.7, 4);
      world.sfx.push('pickup');
    } else if (event.type === 'playerHit') {
      addParticles(world, event.x, event.y, 5, '#e5484d', 70, 0.4, 4);
      world.shake = Math.max(world.shake, 3);
    }
  }
  world.events.length = 0;

  // Particles and tracers age out.
  for (let i = world.particles.length - 1; i >= 0; i -= 1) {
    const p = world.particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.life <= 0) world.particles.splice(i, 1);
  }
  for (let i = world.tracers.length - 1; i >= 0; i -= 1) {
    const t = world.tracers[i];
    t.life -= dt;
    if (t.life <= 0) world.tracers.splice(i, 1);
  }

  // Camera follows the player (or their car), clamped inside the city.
  const tx = Math.max(VIEW_W / 2, Math.min(WORLD_W - VIEW_W / 2, player.x));
  const ty = Math.max(VIEW_H / 2, Math.min(WORLD_H - VIEW_H / 2, player.y));
  world.camera.x += (tx - world.camera.x) * Math.min(1, dt * 5);
  world.camera.y += (ty - world.camera.y) * Math.min(1, dt * 5);
  player.district = districtAt(player.x, player.y);

  if (player.hp <= 0 && world.status === 'playing') {
    world.status = 'wasted';
    world.statusTimer = 0;
    world.sfx.push('wasted');
  }
}

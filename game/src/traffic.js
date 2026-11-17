// Traffic: the cars that belong to the city. Each one follows the road
// grid — a lane, a direction, and a next intersection where it may turn —
// slows for the car ahead, yields briefly at crossings, and stops dead when
// the player blocks its lane.
import { ROAD_X, ROAD_Y, ROAD_HALF } from './config.js';
import { range, chance, pick } from './random.js';
import { createVehicle, randomStreetType, driveVehicle } from './vehicles.js';

const LANE_OFFSET = 15;

// Spawn a traffic car on a road, pointed along it, already moving.
export function spawnTrafficCar(rng, x, y) {
  const type = randomStreetType(rng);
  const onVertical = chance(rng, 0.5);
  let road, angle, lane;
  if (onVertical) {
    road = pick(rng, ROAD_X);
    lane = chance(rng, 0.5) ? -LANE_OFFSET : LANE_OFFSET;
    angle = chance(rng, 0.5) ? Math.PI / 2 : -Math.PI / 2;
    x = road + lane;
    y = y !== undefined ? y : range(rng, 80, 1800);
  } else {
    road = pick(rng, ROAD_Y);
    lane = chance(rng, 0.5) ? -LANE_OFFSET : LANE_OFFSET;
    angle = chance(rng, 0.5) ? 0 : Math.PI;
    x = x !== undefined ? x : range(rng, 80, 2400);
    y = road + lane;
  }
  const car = createVehicle(rng, type, x, y, angle, 'traffic');
  car.speed = range(rng, 120, 200);
  car.targetSpeed = car.speed;
  car.lane = lane;
  return car;
}

// The car ahead, in this car's lane, within look-ahead distance.
function carAhead(car, cars, lookAhead) {
  const fx = Math.cos(car.angle);
  const fy = Math.sin(car.angle);
  let best = null;
  let bestDist = lookAhead;
  for (const other of cars) {
    if (other === car) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const along = dx * fx + dy * fy;
    if (along <= 0 || along > bestDist) continue;
    const side = Math.abs(-dx * fy + dy * fx);
    if (side > 26) continue;
    best = other;
    bestDist = along;
  }
  return best;
}

// Is the car about to enter an intersection? Then it may turn, or pause.
function nearIntersection(car) {
  for (const rx of ROAD_X) {
    for (const ry of ROAD_Y) {
      const dx = rx - car.x;
      const dy = ry - car.y;
      if (Math.abs(dx) < 44 && Math.abs(dy) < 44) return { x: rx, y: ry };
    }
  }
  return null;
}

export function updateTraffic(cars, playerCar, dt, rng) {
  for (const car of cars) {
    if (car.owner !== 'traffic') continue;
    // Yield: wait a beat at an intersection sometimes, like a real driver.
    if (car.stuck > 0) {
      car.stuck -= dt;
      driveVehicle(car, 0, 0, false, dt);
      continue;
    }
    const ahead = carAhead(car, cars, 90);
    const playerBlock = playerCar && carAhead(car, [playerCar], 80);
    if (ahead || playerBlock) {
      // Ease off the gas instead of rear-ending the car ahead.
      driveVehicle(car, -0.25, 0, false, dt);
      continue;
    }
    const node = nearIntersection(car);
    if (node && chance(rng, 0.012)) {
      // Turn onto the crossing road: snap the heading, keep the lane side.
      const goingVertical = Math.abs(Math.cos(car.angle)) < 0.5;
      if (goingVertical) {
        car.angle = chance(rng, 0.5) ? 0 : Math.PI;
        car.y = node.y + car.lane;
        car.x = node.x + (car.angle === 0 ? 0 : 0);
      } else {
        car.angle = chance(rng, 0.5) ? Math.PI / 2 : -Math.PI / 2;
        car.x = node.x + car.lane;
      }
      car.stuck = chance(rng, 0.3) ? range(rng, 0.4, 1.0) : 0;
    }
    // Nudge back onto the lane centre so cars never drift off the road.
    const fx = Math.cos(car.angle);
    const fy = Math.sin(car.angle);
    const sideX = -fy;
    const sideY = fx;
    const goingVertical = Math.abs(fx) < 0.5;
    let laneCentre;
    if (goingVertical) {
      let best = ROAD_X[0];
      for (const rx of ROAD_X) if (Math.abs(rx - car.x) < Math.abs(best - car.x)) best = rx;
      laneCentre = best + car.lane;
      const off = laneCentre - car.x;
      car.x += off * 0.6 * dt;
    } else {
      let best = ROAD_Y[0];
      for (const ry of ROAD_Y) if (Math.abs(ry - car.y) < Math.abs(best - ry)) best = ry;
      laneCentre = best + car.lane;
      const off = laneCentre - car.y;
      car.y += off * 0.6 * dt;
    }
    const throttle = car.speed < car.targetSpeed ? 0.55 : 0;
    driveVehicle(car, throttle, 0, false, dt);
    // A car that reached the map edge turns around at the next junction.
    if (car.x < 70 || car.x > 2490 || car.y < 70 || car.y > 1840) {
      car.angle += Math.PI;
      car.x = Math.max(80, Math.min(2480, car.x));
      car.y = Math.max(80, Math.min(1830, car.y));
    }
  }
}

// Top the traffic back up to its budget, spawning fresh cars on roads away
// from the player so they never pop into view.
export function maintainTraffic(cars, rng, count, playerX, playerY) {
  let tries = 0;
  while (cars.filter((c) => c.owner === 'traffic').length < count && tries < 12) {
    tries += 1;
    const car = spawnTrafficCar(rng);
    const dist = Math.hypot(car.x - playerX, car.y - playerY);
    if (dist < 420) continue;
    cars.push(car);
  }
}

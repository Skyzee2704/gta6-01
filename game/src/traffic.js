// Traffic: civilian cars that drive the road graph, brake for obstacles,
// and keep the streets busy. Variety is the point — the road shows many
// different cars, never a parade of the same sedan.
import { vehicleById } from './data.js';
import { createVehicle, stepVehicle } from './vehicles.js';
import { createRandom, pick, dist2d } from './random.js';

const TRAFFIC_DEFS = ['sedan', 'taxi', 'pickup', 'van', 'coupe', 'bus', 'muscle', 'scooter', 'bike', 'limo'];

/** A traffic car, following one road segment at a time. */
export function createTrafficCar(id, x, z, heading, random) {
  const def = pick(random, TRAFFIC_DEFS);
  const car = createVehicle(def, x, z, heading);
  car.id = `traffic-${id}`;
  car.parked = false;
  car.cruise = 9 + random() * 7;
  car.lane = random() < 0.5 ? -2.6 : 2.6;
  return car;
}

/** Keep traffic full near the player, on roads, out of sight when spawning. */
export function maintainTraffic(cars, player, roads, random, target) {
  const want = target || 12;
  for (let i = cars.length - 1; i >= 0; i -= 1) {
    if (dist2d(cars[i].x, cars[i].z, player.x, player.z) > 150) cars.splice(i, 1);
  }
  let guard = 0;
  while (cars.length < want && guard < 60) {
    guard += 1;
    const road = roads[Math.floor(random() * roads.length)];
    const t = random();
    const x = road.x1 + (road.x2 - road.x1) * t;
    const z = road.z1 + (road.z2 - road.z1) * t;
    if (dist2d(x, z, player.x, player.z) < 45) continue;
    const heading = Math.atan2(road.x2 - road.x1, road.z2 - road.z1) + (random() < 0.5 ? 0 : Math.PI);
    cars.push(createTrafficCar(cars.length, x, z, heading, random));
  }
  return cars;
}

/** One traffic step: cruise, brake when something is ahead, stay on the road. */
export function stepTraffic(cars, dt, obstacles) {
  for (const car of cars) {
    let throttle = 0.55;
    let brake = 0;
    // Brake when another car or the player is right ahead.
    for (const other of obstacles) {
      if (other === car) continue;
      const dx = other.x - car.x;
      const dz = other.z - car.z;
      const ahead = dx * Math.sin(car.heading) + dz * Math.cos(car.heading);
      const side = Math.abs(dx * Math.cos(car.heading) - dz * Math.sin(car.heading));
      if (ahead > 0 && ahead < 9 && side < 3.4) { throttle = 0; brake = 1; break; }
    }
    const speedNow = Math.abs(car.speed || 0);
    if (speedNow > car.cruise) throttle = 0;
    stepVehicle(car, { steer: 0, throttle, brake, handbrake: false }, dt);
    // Keep traffic inside the round map.
    const d = Math.hypot(car.x - 320, (car.z - 240) / 0.75);
    if (d > 295) car.heading += Math.PI;
  }
  return cars;
}

export function trafficCount(cars) {
  return cars.length;
}

export function trafficVariety(cars) {
  return new Set(cars.map((c) => c.id.split('-')[0] + c.def.id)).size;
}

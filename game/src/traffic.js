// SOLMAR 3D — traffic: civilian cars on the road graph, braking for the
// player and for each other, lane discipline, despawn far behind.
// Population ring: spawn out of view, never pop in.
import { createRng } from './random.js';
import { nearestNode, findPath } from './city.js';
import { VEHICLES } from './data.js';

export function createTraffic(seed = 1) {
  return {
    rng: createRng(seed * 41 + 9),
    cars: [],
    nextId: 1,
    spawnTimer: 0,
  };
}

export function spawnTrafficCar(traffic, city, nearX, nearY) {
  const rng = traffic.rng;
  const def = rng.pick(VEHICLES.filter((v) => v.kind === 'car' || v.kind === 'taxi'));
  const node = nearestNode(city, nearX + rng.range(-80, 80), nearY + rng.range(-80, 80));
  const car = {
    id: 'traffic' + traffic.nextId++,
    def,
    x: node.x + rng.range(-4, 4),
    y: node.y + rng.range(-4, 4),
    heading: rng.range(0, Math.PI * 2),
    speed: rng.range(6, 12),
    targetSpeed: rng.range(8, 14),
    node: node.id,
    path: null,
    pathIdx: 0,
    braking: false,
    color: rng.pick([0xc22e2e, 0x2e6fc2, 0xe0a030, 0x3f7a3a, 0xf2f0e8, 0x8e2e6f]),
  };
  traffic.cars.push(car);
  return car;
}

export function updateTraffic(traffic, city, player, dt) {
  traffic.spawnTimer -= dt;
  const want = 10;
  if (traffic.cars.length < want && traffic.spawnTimer <= 0) {
    traffic.spawnTimer = 0.8;
    spawnTrafficCar(traffic, city, player.x, player.y);
  }
  for (const car of traffic.cars) {
    let ahead = null;
    let aheadD = Infinity;
    for (const other of traffic.cars) {
      if (other === car) continue;
      const dx = other.x - car.x;
      const dy = other.y - car.y;
      const d = Math.hypot(dx, dy);
      const dot = dx * Math.sin(car.heading) + dy * Math.cos(car.heading);
      if (dot > 0 && d < aheadD) {
        aheadD = d;
        ahead = other;
      }
    }
    const pdx = player.x - car.x;
    const pdy = player.y - car.y;
    const pd = Math.hypot(pdx, pdy);
    const pdot = pdx * Math.sin(car.heading) + pdy * Math.cos(car.heading);
    const blocked = (ahead && aheadD < 9) || (pdot > 0 && pd < 9);
    car.braking = blocked;
    const target = blocked ? 0 : car.targetSpeed;
    car.speed += (target - car.speed) * Math.min(1, dt * 1.2);
    if (!car.path || car.pathIdx >= car.path.length) {
      const from = nearestNode(city, car.x, car.y);
      const dest = city.nodes[traffic.rng.int(0, city.nodes.length - 1)];
      car.path = findPath(city, from.id, dest.id) || [from.id];
      car.pathIdx = 0;
    }
    const nextNode = city.nodes[car.path[car.pathIdx]];
    if (nextNode) {
      const dx = nextNode.x - car.x;
      const dy = nextNode.y - car.y;
      const d = Math.hypot(dx, dy);
      const wantHeading = Math.atan2(dx, dy);
      let dh = wantHeading - car.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      car.heading += Math.max(-1.4 * dt, Math.min(1.4 * dt, dh));
      if (d < 4) car.pathIdx++;
    }
    car.x += Math.sin(car.heading) * car.speed * dt;
    car.y += Math.cos(car.heading) * car.speed * dt;
  }
  const px = player.x;
  const py = player.y;
  traffic.cars = traffic.cars.filter((c) => {
    const dx = c.x - px;
    const dy = c.y - py;
    return dx * dx + dy * dy < 130 * 130;
  });
  return traffic;
}

export function trafficNear(traffic, x, y, radius) {
  return traffic.cars.filter((c) => Math.hypot(c.x - x, c.y - y) < radius);
}

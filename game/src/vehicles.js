// Vehicles: every car in Solmar, from a parked sedan to a police cruiser.
// A vehicle is a small record — type, pose, speed, health, who drives it —
// and the arcade physics here: accelerate, steer by speed, handbrake drift,
// drag, and a bump when two cars touch.
import { VEHICLE_TYPES, VEHICLE_COLORS, WORLD_W, WORLD_H } from './config.js';
import { pick } from './random.js';

let nextVehicleId = 1;

export function createVehicle(rng, type, x, y, angle, owner) {
  const spec = VEHICLE_TYPES[type];
  const colors = VEHICLE_COLORS[type] || ['#8a8f96'];
  return {
    id: nextVehicleId,
    type,
    label: spec.label,
    x, y,
    angle,
    speed: 0,
    steer: 0,
    hp: spec.hp,
    maxHp: spec.hp,
    color: type === 'cruiser' ? '#f2f2f2' : pick(rng, colors),
    owner: owner || 'parked', // 'player' | 'traffic' | 'police' | 'parked' | 'mission'
    driver: owner === 'traffic' || owner === 'police',
    smoke: 0,
    skid: 0,
    siren: 0,
    despawn: 0,
    targetSpeed: 0,
    lane: 0,
    stuck: 0,
  };
}

export function resetVehicleIds() {
  nextVehicleId = 1;
}

// Arcade driving: forward is the car's nose. Throttle adds speed along the
// nose, steering turns harder the faster the car goes (up to a point), the
// handbrake cuts grip so the tail slides, and drag always pulls speed down.
export function driveVehicle(car, throttle, steerInput, handbrake, dt) {
  const spec = VEHICLE_TYPES[car.type];
  const forward = throttle > 0 ? 1 : throttle < 0 ? -1 : 0;
  const power = Math.abs(throttle);
  if (forward !== 0) {
    const cap = forward > 0 ? spec.top : spec.reverse;
    car.speed += forward * spec.accel * power * dt;
    if (car.speed > cap) car.speed = cap;
    if (car.speed < -spec.reverse) car.speed = -spec.reverse;
  }
  // Rolling drag, stronger when the handbrake is held.
  const drag = handbrake ? 1.6 : 0.55;
  car.speed -= car.speed * drag * dt;
  if (Math.abs(car.speed) < 4 && forward === 0) car.speed = 0;

  const speedFactor = Math.min(1, Math.abs(car.speed) / 220);
  const grip = handbrake ? spec.grip * 0.45 : spec.grip;
  const turnRate = grip * speedFactor * (car.speed >= 0 ? 1 : -1);
  car.angle += steerInput * turnRate * dt;
  car.steer = steerInput;

  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  // The world edge is a hard wall; the beach and water stop cars too.
  car.x = Math.max(30, Math.min(WORLD_W - 30, nx));
  car.y = Math.max(30, Math.min(WORLD_H - 46, ny));
  if (handbrake && Math.abs(car.speed) > 120) car.skid = Math.min(1, car.skid + dt * 4);
  else car.skid = Math.max(0, car.skid - dt * 3);

  if (car.hp < car.maxHp * 0.45) car.smoke = Math.min(1, car.smoke + dt);
  else car.smoke = Math.max(0, car.smoke - dt * 2);
}

// Two cars as pairs of circles (nose and tail) so a sideswipe and a
// head-on both read. Returns the push applied, and damages both cars.
export function collideVehicles(a, b) {
  const specA = VEHICLE_TYPES[a.type];
  const specB = VEHICLE_TYPES[b.type];
  const rA = specA.wid * 0.62;
  const rB = specB.wid * 0.62;
  let hit = false;
  for (const offA of [-specA.len * 0.22, specA.len * 0.22]) {
    const ax = a.x + Math.cos(a.angle) * offA;
    const ay = a.y + Math.sin(a.angle) * offA;
    for (const offB of [-specB.len * 0.22, specB.len * 0.22]) {
      const bx = b.x + Math.cos(b.angle) * offB;
      const by = b.y + Math.sin(b.angle) * offB;
      const dx = bx - ax;
      const dy = by - ay;
      const dist = Math.hypot(dx, dy);
      const min = rA + rB;
      if (dist >= min || dist < 0.001) continue;
      const push = (min - dist) / 2;
      const nx = dx / dist;
      const ny = dy / dist;
      a.x -= nx * push;
      a.y -= ny * push;
      b.x += nx * push;
      b.y += ny * push;
      const impact = Math.abs(a.speed - b.speed);
      // Only a hard hit damages: a gentle push while cars grind past each
      // other is not a crash, and without this a long sideswipe drains a
      // car's health in a second.
      if (impact > 140) {
        a.hp -= impact * 0.015;
        b.hp -= impact * 0.015;
      }
      a.speed *= 0.82;
      b.speed *= 0.82;
      hit = true;
    }
  }
  return hit;
}

// A car against the buildings: treat it as one circle at its centre with a
// radius from its length, and slide it out. Returns true on contact.
export function collideVehicleWithCity(city, car, pushOutOfBuildings) {
  const spec = VEHICLE_TYPES[car.type];
  const body = { x: car.x, y: car.y, r: spec.len * 0.42 };
  const hit = pushOutOfBuildings(city, body);
  if (hit) {
    car.x = body.x;
    car.y = body.y;
    if (Math.abs(car.speed) > 120) {
      car.hp -= Math.abs(car.speed) * 0.02;
    }
    car.speed *= 0.55;
  }
  return hit;
}

// Pick a body style weighted toward ordinary street cars.
export function randomStreetType(rng) {
  const roll = rng();
  if (roll < 0.34) return 'sedan';
  if (roll < 0.52) return 'coupe';
  if (roll < 0.66) return 'taxi';
  if (roll < 0.80) return 'van';
  if (roll < 0.92) return 'sports';
  return 'truck';
}

// Wanted level and the Solmar Police Department. Crime raises the heat —
// stealing a car in front of a witness, punching someone, firing a gun —
// and cruisers spawn to chase the player down. Lay low and the stars fade;
// reach the safehouse and they vanish. Get caught on foot and it is
// BUSTED; get your health to zero and it is WASTED.
import {
  WANTED_MAX, WANTED_DECAY_HIDE_SECONDS, WANTED_DECAY_STEP_SECONDS,
  POLICE_CATCH_RADIUS, POLICE_SPAWN_DISTANCE, MAX_POLICE,
  ROAD_X, ROAD_Y,
} from './config.js';
import { createVehicle, driveVehicle } from './vehicles.js';
import { randomRoadPoint } from './city.js';
import { chance, pick, range } from './random.js';

export function createWanted() {
  return {
    level: 0,
    hiddenTimer: 0, // seconds since any cruiser last saw the player
    decayTimer: 0, // counts down to the next star dropping off
    lastCrime: 0,
  };
}

// A crime the player commits. `witnessed` means a cop or a bystander saw
// it happen; unseen crime still counts, but less.
export function commitCrime(wanted, stars, witnessed) {
  if (stars <= 0) return;
  wanted.level = Math.min(WANTED_MAX, wanted.level + stars);
  wanted.hiddenTimer = 0;
  wanted.decayTimer = 0;
  wanted.lastCrime = stars;
}

export function wantedCruiserCount(wanted) {
  if (wanted.level <= 0) return 0;
  return Math.min(MAX_POLICE, wanted.level + 1);
}

// Spawn a cruiser on a road at a distance from the player, pointed roughly
// toward them.
export function spawnCruiser(rng, playerX, playerY) {
  let x = playerX;
  let y = playerY;
  for (let tries = 0; tries < 10; tries += 1) {
    const spot = randomRoadPoint(rng);
    const dist = Math.hypot(spot.x - playerX, spot.y - playerY);
    if (dist > POLICE_SPAWN_DISTANCE && dist < 1100) {
      x = spot.x;
      y = spot.y;
      break;
    }
  }
  const car = createVehicle(rng, 'cruiser', x, y, Math.atan2(playerY - y, playerX - x), 'police');
  car.speed = 200;
  car.siren = 1;
  return car;
}

// A roadblock: two cruisers parked across the road ahead of the player,
// there to be dodged or smashed through.
export function spawnRoadblock(rng, playerX, playerY, playerAngle) {
  const ahead = 420;
  const cx = playerX + Math.cos(playerAngle) * ahead;
  const cy = playerY + Math.sin(playerAngle) * ahead;
  const roadX = ROAD_X.reduce((best, rx) => (Math.abs(rx - cx) < Math.abs(best - cx) ? rx : best), ROAD_X[0]);
  const roadY = ROAD_Y.reduce((best, ry) => (Math.abs(ry - cy) < Math.abs(best - ry) ? ry : best), ROAD_Y[0]);
  const vertical = Math.abs(roadX - cx) < Math.abs(roadY - cy);
  const blockers = [];
  if (vertical) {
    blockers.push(createVehicle(rng, 'cruiser', roadX - 14, roadY, Math.PI / 2, 'police'));
    blockers.push(createVehicle(rng, 'cruiser', roadX + 14, roadY, -Math.PI / 2, 'police'));
  } else {
    blockers.push(createVehicle(rng, 'cruiser', roadX, roadY - 14, 0, 'police'));
    blockers.push(createVehicle(rng, 'cruiser', roadX, roadY + 14, Math.PI, 'police'));
  }
  for (const b of blockers) {
    b.owner = 'roadblock';
    b.speed = 0;
  }
  return blockers;
}

// Steer a cruiser at the player: full throttle, turn toward the target,
// ram when close. On foot the cruiser stops short and the officer closes
// in; the world checks the catch radius.
export function updatePoliceCruiser(car, targetX, targetY, dt) {
  const steerTarget = cruiserSteerPoint(car, targetX, targetY);
  const dx = steerTarget.x - car.x;
  const dy = steerTarget.y - car.y;
  const dist = Math.hypot(targetX - car.x, targetY - car.y);
  const wantAngle = Math.atan2(dy, dx);
  let diff = wantAngle - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const steer = Math.max(-1, Math.min(1, diff * 2.2));
  const throttle = dist > 60 ? 1 : 0.4;
  driveVehicle(car, throttle, steer, false, dt);
  car.siren = 1;
  return dist;
}

// Where a cruiser aims: straight at the player when close, but along the
// road grid when far — otherwise it would spend the whole chase grinding
// against a building between it and the player.
function cruiserSteerPoint(car, targetX, targetY) {
  const dist = Math.hypot(targetX - car.x, targetY - car.y);
  if (dist < 300) return { x: targetX, y: targetY };
  const nearestX = (v) => ROAD_X.reduce((best, rx) => (Math.abs(rx - v) < Math.abs(best - v) ? rx : best), ROAD_X[0]);
  const nearestY = (v) => ROAD_Y.reduce((best, ry) => (Math.abs(ry - v) < Math.abs(best - v) ? ry : best), ROAD_Y[0]);
  const tx = nearestX(targetX);
  const ty = nearestY(targetY);
  const cx = nearestX(car.x);
  const cy = nearestY(car.y);
  const onRoadX = Math.abs(car.x - cx) < 52;
  const onRoadY = Math.abs(car.y - cy) < 52;
  if (!onRoadX && !onRoadY) return { x: cx, y: cy };
  if (cx === tx && cy === ty) return { x: targetX, y: targetY };
  // Step to the neighbouring intersection that gets closest to the target.
  const ix = ROAD_X.indexOf(cx);
  const iy = ROAD_Y.indexOf(cy);
  const candidates = [];
  if (ix > 0) candidates.push({ x: ROAD_X[ix - 1], y: cy });
  if (ix < ROAD_X.length - 1) candidates.push({ x: ROAD_X[ix + 1], y: cy });
  if (iy > 0) candidates.push({ x: cx, y: ROAD_Y[iy - 1] });
  if (iy < ROAD_Y.length - 1) candidates.push({ x: cx, y: ROAD_Y[iy + 1] });
  let best = candidates[0];
  let bestScore = Infinity;
  for (const c of candidates) {
    const score = Math.abs(c.x - tx) + Math.abs(c.y - ty);
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

// Tick the wanted clock: while any cruiser can see the player the heat
// holds; once unseen for a while the stars start dropping off one by one.
export function updateWanted(wanted, nearestCruiserDist, dt) {
  if (wanted.level <= 0) {
    wanted.hiddenTimer = 0;
    wanted.decayTimer = 0;
    return;
  }
  const seen = nearestCruiserDist !== null && nearestCruiserDist < 560;
  if (seen) {
    wanted.hiddenTimer = 0;
    wanted.decayTimer = 0;
  } else {
    wanted.hiddenTimer += dt;
    if (wanted.hiddenTimer > WANTED_DECAY_HIDE_SECONDS) {
      wanted.decayTimer += dt;
      if (wanted.decayTimer >= WANTED_DECAY_STEP_SECONDS) {
        wanted.decayTimer = 0;
        wanted.level = Math.max(0, wanted.level - 1);
      }
    }
  }
}

// Is a cruiser close enough to the player on foot to make the arrest?
export function policeCatchCheck(cruisers, playerX, playerY, playerSpeed) {
  for (const car of cruisers) {
    if (car.owner !== 'police') continue;
    const dist = Math.hypot(car.x - playerX, car.y - playerY);
    if (dist < POLICE_CATCH_RADIUS && playerSpeed < 120) return car;
  }
  return null;
}

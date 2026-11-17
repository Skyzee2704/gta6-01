// Pedestrians: the people on Solmar's sidewalks. They stroll between
// sidewalk points, cross at zebra crossings now and then, and scatter when
// a gun goes off or a car comes at them too fast.
import { WORLD_W, WORLD_H } from './config.js';
import { makeRng, pick, range, chance } from './random.js';
import { randomSidewalkPoint, isOnSidewalk, pushOutOfBuildings } from './city.js';

const SHIRT_COLORS = [
  '#d94f4f', '#4f7dd9', '#e8c14a', '#5aa864', '#9a5fb8',
  '#e87a3a', '#3fb8a8', '#d9d9d9', '#5a5a66', '#c98ab8',
];
const SKIN_COLORS = ['#e8b88a', '#c98a5e', '#8a5a3a', '#f0cba0', '#6e4526'];

let nextPedId = 1;

export function createPedestrian(rng, x, y) {
  return {
    id: nextPedId,
    x, y,
    angle: range(rng, 0, Math.PI * 2),
    speed: range(rng, 40, 70),
    walkSpeed: range(rng, 40, 70),
    target: null,
    state: 'walk', // 'walk' | 'flee' | 'cross'
    fleeTimer: 0,
    shirt: pick(rng, SHIRT_COLORS),
    skin: pick(rng, SKIN_COLORS),
    phase: rng() * Math.PI * 2,
    scared: 0,
  };
}

export function resetPedestrianIds() {
  nextPedId = 1;
}

// Give a pedestrian a fresh sidewalk destination near where they stand.
function chooseDestination(rng, ped) {
  const spot = randomSidewalkPoint(rng);
  ped.target = { x: spot.x, y: spot.y };
}

// A gunshot or a speeding car nearby sends everyone in earshot running.
export function scarePedestrians(peds, x, y, radius) {
  for (const ped of peds) {
    const dx = ped.x - x;
    const dy = ped.y - y;
    const dist = Math.hypot(dx, dy);
    if (dist < radius) {
      ped.state = 'flee';
      ped.fleeTimer = 2.5 + (radius - dist) / radius;
      ped.scared = 1;
      ped.target = {
        x: Math.max(40, Math.min(WORLD_W - 40, ped.x + (dx / (dist || 1)) * 260)),
        y: Math.max(40, Math.min(WORLD_H - 40, ped.y + (dy / (dist || 1)) * 260)),
      };
    }
  }
}

export function updatePedestrians(peds, dt, rng, danger, city) {
  for (const ped of peds) {
    ped.phase += dt * 6;
    if (danger) {
      const dx = ped.x - danger.x;
      const dy = ped.y - danger.y;
      const dist = Math.hypot(dx, dy);
      if (dist < danger.radius && ped.state !== 'flee') {
        ped.state = 'flee';
        ped.fleeTimer = 2;
        ped.target = {
          x: Math.max(40, Math.min(WORLD_W - 40, ped.x + (dx / (dist || 1)) * 240)),
          y: Math.max(40, Math.min(WORLD_H - 40, ped.y + (dy / (dist || 1)) * 240)),
        };
      }
    }
    if (ped.state === 'flee') {
      ped.fleeTimer -= dt;
      if (ped.fleeTimer <= 0) {
        ped.state = 'walk';
        ped.target = null;
      }
    }
    if (!ped.target) {
      if (ped.state === 'walk' && chance(rng, 0.02)) {
        chooseDestination(rng, ped);
      } else if (ped.state === 'flee') {
        chooseDestination(rng, ped);
        ped.state = 'walk';
      }
    }
    if (ped.target) {
      const dx = ped.target.x - ped.x;
      const dy = ped.target.y - ped.y;
      const dist = Math.hypot(dx, dy);
      const speed = ped.state === 'flee' ? ped.walkSpeed * 3.2 : ped.walkSpeed;
      if (dist < 8) {
        ped.target = null;
      } else {
        ped.angle = Math.atan2(dy, dx);
        ped.x += (dx / dist) * speed * dt;
        ped.y += (dy / dist) * speed * dt;
      }
    }
    ped.scared = Math.max(0, ped.scared - dt * 0.4);
    ped.x = Math.max(24, Math.min(WORLD_W - 24, ped.x));
    ped.y = Math.max(24, Math.min(WORLD_H - 24, ped.y));
    if (city) {
      // Sidewalk walkers never cut through a building: slide along its wall.
      const body = { x: ped.x, y: ped.y, r: 10 };
      if (pushOutOfBuildings(city, body)) {
        ped.x = body.x;
        ped.y = body.y;
        ped.target = null;
      }
    }
  }
}

// Keep the sidewalks populated: top the crowd back up to its budget with
// fresh walkers, and drop any that wandered off the map edge.
export function maintainPedestrians(peds, rng, count) {
  while (peds.length < count) {
    const spot = randomSidewalkPoint(rng);
    peds.push(createPedestrian(rng, spot.x, spot.y));
  }
}

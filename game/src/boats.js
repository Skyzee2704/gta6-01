// SOLMAR 3D — boats: drivable speedboat and yacht at the marina.
// Waterline bob, wake, docking at the marina slips.
import { clamp } from './random.js';
import { box } from './materials.js';

export function createBoatState(kind, x, y) {
  return {
    kind: kind || 'speedboat',
    x,
    y,
    heading: 0,
    speed: 0,
    bob: 0,
    docked: true,
    wake: 0,
  };
}

export function updateBoat(b, input, dt) {
  const topSpeed = b.kind === 'yacht' ? 12 : 30;
  const accel = input.up ? 8 : input.down ? -5 : 0;
  b.speed = clamp(b.speed + accel * dt, 0, topSpeed);
  const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  b.heading += steer * 0.8 * dt * (b.speed > 1 ? 1 : 0.2);
  b.x += Math.sin(b.heading) * b.speed * dt;
  b.y += Math.cos(b.heading) * b.speed * dt;
  b.bob += dt * 1.4;
  b.wake = Math.min(1, b.speed / topSpeed);
  b.docked = b.speed < 0.5;
  return b;
}

export function buildBoatMesh(def, materials) {
  const g = new THREE.Group();
  const hull = new THREE.MeshStandardMaterial({ color: def.color || 0xf2f0e8, roughness: 0.4, metalness: 0.3 });
  const body = box(2.4, 0.9, 5.2, hull);
  body.position.y = 0.5;
  g.add(body);
  const deck = box(2.0, 0.2, 4.4, materials.wood);
  deck.position.y = 1.0;
  g.add(deck);
  const cabin = box(1.6, 0.9, 1.8, materials.glassDark);
  cabin.position.set(0, 1.5, -0.6);
  g.add(cabin);
  const rail = box(2.3, 0.12, 0.12, materials.chrome);
  rail.position.set(0, 1.15, 2.5);
  g.add(rail);
  return g;
}

export const MARINA_SLIPS = [
  { x: 90, y: 18, heading: 0 },
  { x: 120, y: 18, heading: 0 },
  { x: 150, y: 18, heading: 0 },
  { x: 180, y: 18, heading: 0 },
];

export function nearestSlip(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const s of MARINA_SLIPS) {
    const d = Math.hypot(s.x - x, s.y - y);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return { slip: best, distance: bestD };
}

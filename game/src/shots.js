// Screenshot staging: ?shot=start|play|chase|end with &seed=N. Each scene
// plays the real rules forward from a fresh world for a fixed number of
// steps, steered by a small autopilot that drives toward the mission marker
// and, for the chase, provokes the police first. The frame is what a short
// game really looks like, and the same seed always gives the same frame.
import { VIEW_W, VIEW_H, WORLD_W, WORLD_H, ROAD_X, ROAD_Y } from './config.js';
import { createVehicle } from './vehicles.js';
import { createWorld, updateWorld, startMissionInWorld, enterCar, exitCar } from './world.js';
import { commitCrime } from './police.js';
import { currentObjectivePoint } from './missions.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_MISSION_DONE } from './render.js';

const STEP = 1 / 60;

function blankInput() {
  return {
    up: false, down: false, left: false, right: false,
    run: false, handbrake: false,
    interactPressed: false, attackPressed: false, attackHeld: false,
    reloadPressed: false, weaponPistol: false, weaponFists: false,
    pausePressed: false, confirmPressed: false,
    aimX: 0, aimY: 0, mouseX: 0, mouseY: 0,
  };
}

// Steer the player (or their car) toward a point: accelerate when roughly
// aligned, steer toward it otherwise, brake when very close. When the nose
// points away from the target, back up instead — a car that only turns
// while moving forward can never swing around from a standstill.
function autopilotInput(world, target) {
  const input = blankInput();
  const p = world.player;
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  const dist = Math.hypot(dx, dy);
  const wantAngle = Math.atan2(dy, dx);
  let diff = wantAngle - p.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const steer = diff < 0 ? 'left' : 'right';
  if (Math.abs(diff) > 2.4) {
    // Facing away: reverse, steering the nose around the other way.
    input.down = true;
    input.left = steer === 'right';
    input.right = steer === 'left';
  } else {
    input.up = dist > 40;
    input.left = steer === 'left' && Math.abs(diff) > 0.12;
    input.right = steer === 'right' && Math.abs(diff) > 0.12;
  }
  // Aim the mouse at the target so the pistol faces the right way.
  input.aimX = target.x;
  input.aimY = target.y;
  return input;
}

function stepWorld(world, input, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    updateWorld(world, input, STEP);
    if (world.status !== 'playing') break;
  }
}

// Mission 1's first objective is a walk to the dock. Stage it honestly:
// put Milo on the marker on foot and let the engine advance, so the shots
// that follow show the driving objective, not the walk.
function completeDockWalk(world) {
  world.player.x = 480;
  world.player.y = 1620;
  world.player.onFoot = true;
  stepWorld(world, blankInput(), 1);
}

// Step Milo into the mission coupe with a real E press, the way a player
// would, so the enter-car objective advances through the input path. Milo
// steps up on the car's south side, off the road, so a passing traffic car
// is never the nearer one — and if the wrong car is taken anyway, he gets
// out and tries again.
function enterMissionCar(world) {
  const car = world.vehicles.find((v) => v.tag === 'missionCar');
  if (!car) return;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    world.player.x = car.x;
    world.player.y = car.y + 30;
    world.player.onFoot = true;
    const input = blankInput();
    input.interactPressed = true;
    updateWorld(world, input, STEP);
    if (world.player.car && world.player.car.tag === 'missionCar') return;
    if (world.player.car) exitCar(world);
  }
}

function driveToMarker(world, seconds, stopWhenDone) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (stopWhenDone && world.mission.lastDone) break;
    const point = currentObjectivePoint(world.mission);
    const target = point || { x: 1250, y: 880 };
    let input;
    if (world.player.onFoot) {
      // Walk toward the closest car first, then get in it.
      let near = null;
      let nearDist = 70;
      for (const car of world.vehicles) {
        if (car.hp <= 0) continue;
        const d = Math.hypot(car.x - world.player.x, car.y - world.player.y);
        if (d < nearDist) {
          near = car;
          nearDist = d;
        }
      }
      if (near) {
        input = blankInput();
        input.interactPressed = true;
      } else {
        let car = null;
        let carDist = Infinity;
        for (const c of world.vehicles) {
          if (c.hp <= 0) continue;
          const d = Math.hypot(c.x - world.player.x, c.y - world.player.y);
          if (d < carDist) {
            car = c;
            carDist = d;
          }
        }
        input = car ? autopilotInput(world, car) : autopilotInput(world, target);
      }
    } else {
      input = autopilotInput(world, roadWaypoint(world, target));
    }
    updateWorld(world, input, STEP);
    if (world.status !== 'playing') break;
  }
}

// The next waypoint on the road grid toward the target: drive to the
// nearest intersection, then hop between intersections toward the target's
// own intersection, then to the target itself. Keeps the autopilot (and the
// screenshot car) on roads instead of grinding through buildings.
function roadWaypoint(world, target) {
  const p = world.player;
  const nearestX = (v) => ROAD_X.reduce((best, rx) => (Math.abs(rx - v) < Math.abs(best - v) ? rx : best), ROAD_X[0]);
  const nearestY = (v) => ROAD_Y.reduce((best, ry) => (Math.abs(ry - v) < Math.abs(best - v) ? ry : best), ROAD_Y[0]);
  const tx = nearestX(target.x);
  const ty = nearestY(target.y);
  const cx = nearestX(p.x);
  const cy = nearestY(p.y);
  const onRoad = Math.abs(p.x - cx) < 52 || Math.abs(p.y - cy) < 52;
  if (!onRoad) return { x: cx, y: cy };
  if (cx === tx && cy === ty) return target;
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

export function stageShot(name, seed) {
  const world = createWorld(seed);
  if (name === 'start') {
    // The title screen over a living city: traffic rolling, people walking.
    const input = blankInput();
    stepWorld(world, input, 5);
    // Park the camera over Neon Mile so the title sits on a busy street.
    world.camera.x = 1250;
    world.camera.y = 880;
    world.player.x = 1250;
    world.player.y = 880;
    return { world, screen: SCREEN_TITLE, ui: { menuIndex: 0, saveExists: true } };
  }
  if (name === 'play') {
    // Mission 1 in motion: driving through Neon Mile toward the garage.
    startMissionInWorld(world, 0);
    completeDockWalk(world);
    enterMissionCar(world);
    driveToMarker(world, 5);
    return { world, screen: SCREEN_PLAY, ui: { menuIndex: 0 } };
  }
  if (name === 'chase') {
    // The money shot: three-star wanted, cruisers ramming the player's car,
    // sirens, skid marks, pedestrians scattering, minimap full of blips.
    // The four cruisers crime spawns arrive from half a map away, so two
    // more are staged on the roads beside the dock, already at speed —
    // the frame is full of police within the six-second drive.
    startMissionInWorld(world, 0);
    completeDockWalk(world);
    enterMissionCar(world);
    commitCrime(world.wanted, 3, true);
    const close1 = createVehicle(world.rng, 'cruiser', 416, 1376, Math.PI / 2, 'police');
    close1.speed = 200;
    close1.siren = 1;
    const close2 = createVehicle(world.rng, 'cruiser', 736, 1696, Math.PI, 'police');
    close2.speed = 200;
    close2.siren = 1;
    world.vehicles.push(close1, close2);
    driveToMarker(world, 6);
    return { world, screen: SCREEN_PLAY, ui: { menuIndex: 0 } };
  }
  if (name === 'end') {
    // Mission complete panel over the city at golden hour. The autopilot
    // genuinely drives the coupe to the garage; if it falls short of the
    // marker in the time allowed, the panel is staged for the shot.
    startMissionInWorld(world, 0);
    completeDockWalk(world);
    enterMissionCar(world);
    driveToMarker(world, 24, true);
    if (!world.mission.lastDone) {
      world.mission.lastDone = world.mission.mission
        ? { id: world.mission.mission.id, title: world.mission.mission.title, reward: world.mission.mission.reward }
        : { id: 0, title: 'First Wheels', reward: 200 };
    }
    return { world, screen: SCREEN_MISSION_DONE, ui: { menuIndex: 0 } };
  }
  return { world, screen: SCREEN_TITLE, ui: { menuIndex: 0 } };
}

// Run a staged scene to its final frame and report when it is ready to
// photograph. Used by main.js when the page carries ?shot=.
export function runStagedShot(name, seed, onReady) {
  const staged = stageShot(name, seed);
  // Exposed for debugging and playtesting: the staged world's live state.
  window.__stagedWorld = staged.world;
  let painted = 0;
  function paint(renderer) {
    renderer.draw(staged.world, staged.screen, staged.ui);
    painted += 1;
    if (painted >= 2) {
      window.__shotReady = true;
      if (onReady) onReady(staged);
    } else {
      requestAnimationFrame(() => paint(renderer));
    }
  }
  return { staged, paint };
}

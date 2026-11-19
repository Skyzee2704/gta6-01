// People, built like people. Reference: the free 7.5-head figure canon
// (one head 0.24 m on a 1.80 m adult; shoulders two heads wide; crotch at
// 3.75 heads, knees at 5.63 heads). Every body part is a box with a clear
// job: head, torso, two arms, two legs, hands, feet. No spheres anywhere
// on a body — spheres are how a person turns into an alien.
// The same numbers are built in Blender (tools/blender-character.py) and
// the render there is the proportion check for this file.
import { PLAYER } from './config.js';
import { clamp, wrapAngle } from './random.js';

export const HEAD = PLAYER.head; // 0.24 m
export const BODY_HEIGHT = PLAYER.height; // 1.80 m = 7.5 heads

/** Body-part boxes for one person, in local space, feet at y = 0. */
export function bodyParts(person) {
  const h = HEAD;
  const legLen = 3.75 * h; // ground to hip
  const torsoLen = 2.5 * h; // hip to shoulder
  const armLen = 3.1 * h; // shoulder to fingertip
  const s = person.scale || 1;
  return {
    head: { w: 0.92 * h, h: 1.0 * h, d: 0.88 * h, y: (6.5 * h) * s, color: person.skin },
    hair: { w: 0.96 * h, h: 0.42 * h, d: 0.92 * h, y: (7.05 * h) * s, color: person.hair },
    torso: { w: 1.9 * h, h: torsoLen, d: 0.95 * h, y: (3.75 * h + torsoLen / 2) * s, color: person.shirt, taper: 0.86 },
    armL: { w: 0.42 * h, h: armLen, d: 0.42 * h, x: -1.15 * h, y: (6.25 * h - armLen / 2) * s, color: person.shirt },
    armR: { w: 0.42 * h, h: armLen, d: 0.42 * h, x: 1.15 * h, y: (6.25 * h - armLen / 2) * s, color: person.shirt },
    handL: { w: 0.4 * h, h: 0.72 * h, d: 0.4 * h, x: -1.15 * h, y: (6.25 * h - armLen - 0.3 * h) * s, color: person.skin },
    handR: { w: 0.4 * h, h: 0.72 * h, d: 0.4 * h, x: 1.15 * h, y: (6.25 * h - armLen - 0.3 * h) * s, color: person.skin },
    legL: { w: 0.55 * h, h: legLen, d: 0.55 * h, x: -0.48 * h, y: (legLen / 2) * s, color: person.pants },
    legR: { w: 0.55 * h, h: legLen, d: 0.55 * h, x: 0.48 * h, y: (legLen / 2) * s, color: person.pants },
    footL: { w: 0.55 * h, h: 0.28 * h, d: 1.15 * h, x: -0.48 * h, y: 0.14 * h, z: 0.22 * h, color: person.shoes || '#14141a' },
    footR: { w: 0.55 * h, h: 0.28 * h, d: 1.15 * h, x: 0.48 * h, y: 0.14 * h, z: 0.22 * h, color: person.shoes || '#14141a' },
  };
}

/** Walk-cycle swing for the limbs, in radians, from speed and time. */
export function walkSwing(speed, time) {
  const amp = clamp(speed / PLAYER.runSpeed, 0, 1) * 0.55;
  const phase = time * (4 + speed * 1.1);
  return { legL: Math.sin(phase) * amp, legR: -Math.sin(phase) * amp, armL: -Math.sin(phase) * amp * 0.7, armR: Math.sin(phase) * amp * 0.7 };
}

export function createPlayer(x, z) {
  return {
    x, z, y: 0, heading: 0, speed: 0, vx: 0, vz: 0,
    health: PLAYER.maxHealth, armor: 0, onFoot: true, vehicle: null, boat: null,
    weapon: 'pistol', ammo: { pistol: [12, 60], smg: [0, 0], rifle: [0, 0], shotgun: [0, 0], sniper: [0, 0] },
    owned: ['fists', 'pistol'], money: 250, respect: 0,
    walkTime: 0, hurtCooldown: 0, wanted: 0, wantedTimer: 0,
    scale: 1, skin: '#c98d5f', hair: '#1c1c22', shirt: '#2e5fa3', pants: '#22303e',
  };
}

/**
 * Move the player on foot. steer is -1 (A, left) or +1 (D, right); forward
 * is W, back is S. D is right and A is left, always: the sign is never flipped.
 */
export function stepPlayerOnFoot(player, input, dt, collide) {
  // Steer +1 is D, and D turns the player toward screen-right. With the
  // forward vector (sin h, cos h) and the chase camera behind, screen-right
  // is a DECREASING heading — so D subtracts. Never flip this sign.
  const turn = input.steer * PLAYER.turnSpeed * dt;
  player.heading = wrapAngle(player.heading - turn);
  const want = (input.forward ? 1 : 0) - (input.back ? 0.55 : 0);
  const target = want * (input.run ? PLAYER.runSpeed : PLAYER.walkSpeed);
  player.speed += clamp(target - player.speed, -PLAYER.accel * dt, PLAYER.accel * dt);
  const nx = player.x + Math.sin(player.heading) * player.speed * dt;
  const nz = player.z + Math.cos(player.heading) * player.speed * dt;
  if (!collide || collide(nx, player.z)) player.x = nx;
  if (!collide || collide(player.x, nz)) player.z = nz;
  player.vx = Math.sin(player.heading) * player.speed;
  player.vz = Math.cos(player.heading) * player.speed;
  player.walkTime += dt * (0.5 + Math.abs(player.speed) / PLAYER.runSpeed);
  if (player.hurtCooldown > 0) player.hurtCooldown -= dt;
  return player;
}

/**
 * Chase camera: behind the player, boom 13 to 16 by speed, FOV 60 widening
 * to 72 with speed, swing capped at 0.35 so the frame never whips around.
 * keepClear steps the camera back until no building is between it and the
 * player — it walks until free, it never gives up after one hit.
 */
export function chaseCamera(player, speed, buildings, dt, state) {
  const boom = 13 + clamp(speed / 48, 0, 1) * 3;
  const height = 5.2 + clamp(speed / 48, 0, 1) * 1.6;
  const fov = 60 + clamp(speed / 48, 0, 1) * 12;
  const backX = -Math.sin(player.heading);
  const backZ = -Math.cos(player.heading);
  let dist = boom;
  // Walk the camera out until the line to the player is clear of buildings.
  for (let step = 0; step < 12; step += 1) {
    const cx = player.x + backX * dist;
    const cz = player.z + backZ * dist;
    let blocked = false;
    for (const b of buildings) {
      if (Math.abs(cx - b.x) < b.w / 2 + 1 && Math.abs(cz - b.z) < b.d / 2 + 1) { blocked = true; break; }
    }
    if (!blocked) break;
    dist = Math.max(4, dist - 1.2);
  }
  const targetX = player.x + backX * dist;
  const targetZ = player.z + backZ * dist;
  const targetY = height;
  const k = Math.min(1, dt * 6);
  state.camX += (targetX - state.camX) * k;
  state.camY += (targetY - state.camY) * k;
  state.camZ += (targetZ - state.camZ) * k;
  // Swing: the camera yaw follows the heading, capped so it never snaps.
  const wantYaw = Math.atan2(player.x - state.camX, player.z - state.camZ);
  const dyaw = wrapAngle(wantYaw - state.camYaw);
  state.camYaw += clamp(dyaw, -0.35 * dt * 8, 0.35 * dt * 8);
  return { x: state.camX, y: state.camY, z: state.camZ, yaw: state.camYaw, fov, dist };
}

export function createCameraState(x, z) {
  return { camX: x, camY: 6, camZ: z - 14, camYaw: 0 };
}

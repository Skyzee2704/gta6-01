// character.js — the boxy human. Proportions 1:7.5 heads (the human
// canon): the crotch is the body's midpoint, shoulders are 2 heads wide,
// arms reach the mid-thigh. ZERO spheres in the body — boxes only.
// The head is an egg-ish box (taller than wide), the torso tapers, the
// limbs are boxes. Walk and run are a simple swing of the arms and legs.

/* global THREE */

import { buildingAt } from './city.js';
import { clamp } from './random.js';

// Head unit: one head = 0.24 units, so a full person is 1.8 units tall.
export const HEAD = 0.24;
export const PERSON_HEIGHT = HEAD * 7.5;

// Build a person mesh group. `opts` picks the look: shirt, pants, skin,
// hair color, and whether this is the player (yellow jacket) or a ped.
// Returns a THREE.Group whose children are named boxes.
export function buildPerson(opts = {}) {
  const shirt = opts.shirt || '#c0392b';
  const pants = opts.pants || '#2a2a3a';
  const skin = opts.skin || '#e8b98a';
  const hair = opts.hair || '#2a1a0a';
  const jacket = opts.jacket || null;
  const g = new THREE.Group();
  const H = HEAD;
  // Legs: two boxes, each 3.75 heads tall (hip to foot).
  const legH = H * 3.75;
  const legGeo = new THREE.BoxGeometry(H * 0.55, legH, H * 0.55);
  const legMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.9 });
  const legL = new THREE.Mesh(legGeo, legMat);
  legL.position.set(-H * 0.32, legH / 2, 0);
  legL.name = 'legL';
  const legR = new THREE.Mesh(legGeo, legMat);
  legR.position.set(H * 0.32, legH / 2, 0);
  legR.name = 'legR';
  // Torso: a box, 2 heads wide, 2 heads tall (chest to hip), tapered by
  // a slightly narrower top box.
  const torsoH = H * 2;
  const torsoGeo = new THREE.BoxGeometry(H * 2, torsoH, H * 0.9);
  const torsoMat = new THREE.MeshStandardMaterial({ color: jacket || shirt, roughness: 0.85 });
  const torso = new THREE.Mesh(torsoGeo, torsoMat);
  torso.position.set(0, legH + torsoH / 2, 0);
  torso.name = 'torso';
  // Arms: two boxes, 3 heads long, hanging to the mid-thigh.
  const armH = H * 3;
  const armGeo = new THREE.BoxGeometry(H * 0.45, armH, H * 0.45);
  const armMat = new THREE.MeshStandardMaterial({ color: jacket || shirt, roughness: 0.85 });
  const armL = new THREE.Mesh(armGeo, armMat);
  armL.position.set(-H * 1.15, legH + torsoH - armH / 2 + H * 0.4, 0);
  armL.name = 'armL';
  const armR = new THREE.Mesh(armGeo, armMat);
  armR.position.set(H * 1.15, legH + torsoH - armH / 2 + H * 0.4, 0);
  armR.name = 'armR';
  // Hands: small skin boxes at the arm ends.
  const handGeo = new THREE.BoxGeometry(H * 0.4, H * 0.4, H * 0.4);
  const handMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.8 });
  const handL = new THREE.Mesh(handGeo, handMat);
  handL.position.set(-H * 1.15, legH + torsoH - armH + H * 0.2, 0);
  handL.name = 'handL';
  const handR = new THREE.Mesh(handGeo, handMat);
  handR.position.set(H * 1.15, legH + torsoH - armH + H * 0.2, 0);
  handR.name = 'handR';
  // Head: a box a little taller than wide (egg-ish, not a ball).
  const headGeo = new THREE.BoxGeometry(H * 0.85, H * 1.05, H * 0.85);
  const headMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.8 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.set(0, legH + torsoH + H * 0.55, 0);
  head.name = 'head';
  // Hair: a flat box cap on top of the head.
  const hairGeo = new THREE.BoxGeometry(H * 0.9, H * 0.3, H * 0.9);
  const hairMat = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.95 });
  const hairMesh = new THREE.Mesh(hairGeo, hairMat);
  hairMesh.position.set(0, legH + torsoH + H * 1.05, 0);
  hairMesh.name = 'hair';
  g.add(legL, legR, torso, armL, armR, handL, handR, head, hairMesh);
  // The group origin is at the feet; the total height is 7.5 heads.
  g.userData.parts = { legL, legR, torso, armL, armR, handL, handR, head, hair: hairMesh };
  return g;
}

// The player's look: Milo Cruz, yellow jacket, dark hair.
export function buildPlayer() {
  return buildPerson({ shirt: '#f5c518', pants: '#2a2a3a', skin: '#e8b98a', hair: '#1a1a1a', jacket: '#f5c518' });
}

// Animate a person: swing arms and legs with the walk cycle. `phase`
// advances with distance walked; `speed` is 0 when standing.
export function animatePerson(group, phase, speed) {
  const parts = group.userData.parts;
  if (!parts) return;
  const swing = clamp(speed / 6, 0, 1.6) * 0.55;
  const s = Math.sin(phase);
  const c = Math.sin(phase + Math.PI);
  parts.legL.rotation.x = s * swing;
  parts.legR.rotation.x = c * swing;
  parts.armL.rotation.x = c * swing * 0.8;
  parts.armR.rotation.x = s * swing * 0.8;
  // A slight bob.
  group.position.y = Math.abs(Math.sin(phase)) * 0.04 * clamp(speed / 6, 0, 1);
}

// A carry pose: the weapon is always visible, held muzzle-down at the
// side when the player is not aiming.
export function carryPose(group, aiming) {
  const parts = group.userData.parts;
  if (!parts) return;
  if (aiming) {
    parts.armR.rotation.x = -Math.PI / 2 + 0.3;
    parts.armL.rotation.x = -Math.PI / 2 + 0.5;
  } else {
    parts.armR.rotation.x = 0.25;
    parts.armL.rotation.x = -0.1;
  }
}

// Chase camera: sit behind the player at a boom distance, with a swing
// that follows lateral motion and a field of view that widens with
// speed. `keepClear` steps the boom in until the camera is out of any
// building (the spawn-camera fix: never stop after one step).
// Returns { x, y, z } for the camera.
export function chaseCamera(state, city, boom, height) {
  const p = state.player;
  // The camera sits behind the heading.
  const bx = Math.sin(p.heading);
  const bz = Math.cos(p.heading);
  // Step the boom from full length down until the spot is not inside a
  // building. Fall back to a short boom when nothing is clear.
  let t = 1;
  let clear = null;
  while (t > 0.15) {
    const cx = p.x - bx * boom * t;
    const cz = p.z - bz * boom * t;
    if (!buildingAt(city, cx, cz)) {
      clear = { x: cx, z: cz };
      break;
    }
    t -= 0.1;
  }
  if (!clear) {
    clear = { x: p.x - bx * boom * 0.2, z: p.z - bz * boom * 0.2 };
  }
  return { x: clear.x, y: height, z: clear.z };
}

// Field of view: 60 at rest, up to 72 at speed.
export function chaseFov(speed, topSpeed = 46) {
  return 60 + clamp(Math.abs(speed) / topSpeed, 0, 1) * 12;
}

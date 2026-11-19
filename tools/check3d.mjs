// check3d — the look-and-shape gate, headless. Character proportions
// (1:7.5 head, every part a box, no spheres on a character), dark
// asphalt (never blue), matte zebra/sidewalk (no sun glare), and the
// spawn chase camera clear of buildings. Prints measured numbers;
// exits 1 on fail. Visual likeness itself is judged from the shots.
import { createState } from '../game/src/world.js';
import { bodyParts, pointInBuilding, computeChaseCamera } from '../game/src/character.js';
import { PLAYER } from '../game/src/config.js';
import { createMaterials } from '../game/src/materials.js';

const failures = [];
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(label);
};

// Characters: 1.8 tall, head exactly 1/7.5, all eight parts present.
const parts = bodyParts();
const headH = parts.head.h;
check(
  Math.abs(headH - PLAYER.heightUnits * PLAYER.headRatio) < 0.001,
  'head is exactly 1/7.5 of height',
  `head ${headH.toFixed(3)} of ${PLAYER.heightUnits}`,
);
check(
  ['head', 'hair', 'torso', 'armL', 'armR', 'legL', 'legR', 'handL', 'handR'].every((k) => parts[k]),
  'all body parts present (head/hair/torso/arms/legs/hands)',
  Object.keys(parts).join(','),
);
// Spans must be continuous with no gaps: legs [0, .86], torso [.86, 1.56], head [1.56, 1.80].
const span = (p) => [p.y - p.h / 2, p.y + p.h / 2];
const [legB, legT] = span(parts.legL);
const [torB, torT] = span(parts.torso);
const [headB, headT] = span(parts.head);
check(legB === 0, 'legs start at the ground', `legs bottom ${legB}`);
check(Math.abs(legT - torB) < 0.01, 'legs meet torso, no gap', `legs top ${legT.toFixed(2)}, torso bottom ${torB.toFixed(2)}`);
check(Math.abs(torT - headB) < 0.01, 'torso meets head, no gap', `torso top ${torT.toFixed(2)}, head bottom ${headB.toFixed(2)}`);
check(Math.abs(headT - PLAYER.heightUnits) < 0.001, 'character is 1.8 tall', `head top ${headT.toFixed(2)}`);
check(parts.head.w === parts.head.h && parts.head.h === parts.head.d, 'head is a cube, not a sphere', `${parts.head.w}x${parts.head.h}x${parts.head.d}`);

// Materials: asphalt dark and not blue; zebra/sidewalk matte, no glare.
const mats = createMaterials();
const asphalt = mats.asphalt.color;
check(asphalt.getHex() === 0x35353a, 'asphalt is dark 0x35353a (reads as a road, not a black void)', `#${asphalt.getHexString()}`);
check(asphalt.b < asphalt.r + 0.1 && asphalt.b < 0.2, 'asphalt is not blue', `rgb(${asphalt.r.toFixed(2)}, ${asphalt.g.toFixed(2)}, ${asphalt.b.toFixed(2)})`);
check(mats.sidewalk.roughness >= 0.9 && mats.sidewalk.metalness === 0, 'sidewalk matte (no glare)', `roughness ${mats.sidewalk.roughness}`);
check(mats.zebra.roughness >= 0.9 && mats.zebra.metalness === 0, 'zebra matte (no glare)', `roughness ${mats.zebra.roughness}`);

// Spawn chase camera clear of buildings (also asserted in cityCheck).
const state = createState(1);
const cam = computeChaseCamera(state);
check(!pointInBuilding(state, cam.pos.x, cam.pos.z, 1), 'spawn chase camera clear of buildings', `cam (${cam.pos.x.toFixed(1)}, ${cam.pos.z.toFixed(1)})`);

if (failures.length > 0) {
  console.log(`\ncheck3d: ${failures.length} FAILURE(S)`);
  process.exit(1);
}
console.log('\ncheck3d: PASS');

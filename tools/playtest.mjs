// playtest — 11 scripted gameplay tests against the real sim, no
// browser needed. Each test drives the engine the way a player would
// (keys, mouse, entering vehicles, shooting, getting hit) and asserts
// the rule Sky demanded. Teleports are test setup only — the assertions
// always run through the real step functions. Exits 1 on any failure.
import { createState, idleInput } from '../game/src/world.js';
import { stubInput } from './stubInput.mjs';
import { KEYMAP } from '../game/src/input.js';
import { stepPlayerOnFoot, pointInBuilding } from '../game/src/character.js';
import { fireWeapon, startReload, stepWeapons, switchWeapon, weaponShape } from '../game/src/weapons.js';
import { stepPolice } from '../game/src/police.js';
import { stepSide } from '../game/src/side.js';
import { startMission } from '../game/src/missions.js';
import { MARKERS } from '../game/src/missions.js';

const failures = [];
let n = 0;
const test = (label, fn) => {
  n += 1;
  try {
    const detail = fn();
    console.log(`PASS  ${n}. ${label}${detail ? ` — ${detail}` : ''}`);
  } catch (e) {
    console.log(`FAIL  ${n}. ${label} — ${e.message}`);
    failures.push(label);
  }
};
const assert = (ok, msg) => {
  if (!ok) throw new Error(msg);
};

// 1. Controls are not mirrored: A is left, D is right, W forward, S back.
test('keys not mirrored (A=left, D=right)', () => {
  assert(KEYMAP.KeyA === 'left', `KeyA=${KEYMAP.KeyA}`);
  assert(KEYMAP.KeyD === 'right', `KeyD=${KEYMAP.KeyD}`);
  assert(KEYMAP.KeyW === 'forward' && KEYMAP.KeyS === 'back', 'W/S wrong');
  return 'KeyA=left, KeyD=right';
});

// 2. Mouse look is not mirrored: mouse right turns the view right.
test('mouse look not mirrored', () => {
  const s = createState(1);
  const input = stubInput();
  const yaw0 = s.camera.yaw;
  input._look = { dx: 10, dy: 0 };
  stepPlayerOnFoot(s, 1 / 60, input);
  assert(s.camera.yaw < yaw0, `mouse right did not decrease yaw (${yaw0.toFixed(3)} -> ${s.camera.yaw.toFixed(3)})`);
  input._look = { dx: -10, dy: 0 };
  stepPlayerOnFoot(s, 1 / 60, input);
  assert(Math.abs(s.camera.yaw - yaw0) < 0.001, 'mouse left did not restore yaw');
  return 'dx>0 decreases yaw';
});

// 3. A strafes screen-left, D screen-right, at yaw 0.
test('A moves screen-left, D moves screen-right', () => {
  const s = createState(1);
  s.camera.yaw = 0;
  const input = stubInput();
  input._move = { x: -1, z: 0 };
  for (let i = 0; i < 60; i++) stepPlayerOnFoot(s, 1 / 60, input);
  assert(s.player.x < -9, `A did not move left (x=${s.player.x.toFixed(2)})`);
  assert(Math.abs(s.player.z - -52) < 1, `A drifted in z (${s.player.z.toFixed(2)})`);
  const s2 = createState(1);
  s2.camera.yaw = 0;
  const input2 = stubInput();
  input2._move = { x: 1, z: 0 };
  for (let i = 0; i < 60; i++) stepPlayerOnFoot(s2, 1 / 60, input2);
  assert(s2.player.x > -7, `D did not move right (x=${s2.player.x.toFixed(2)})`);
  return 'A -> -x, D -> +x at yaw 0';
});

// 4. Weapon in hand without right-click; fire, reload, switch all work.
test('weapon held, fires, reloads, switches (5 slots)', () => {
  const s = createState(1);
  assert(s.weapons.current === 'vk47', `default held weapon is ${s.weapons.current}`);
  assert(s.weapons.owned.length === 5, `owned ${s.weapons.owned.length}`);
  const shape = weaponShape('vk47');
  assert(shape.parts.length >= 4, 'VK-47 has no HUD silhouette');
  assert(weaponShape('pistol').parts.length !== shape.parts.length, 'silhouettes not distinct');
  assert(fireWeapon(s) === true, 'fire failed');
  assert(s.weapons.ammo.vk47.mag === 29, `mag ${s.weapons.ammo.vk47.mag} after 1 shot`);
  assert(s.stats.shotsFired === 1, 'shot not counted');
  startReload(s);
  for (let i = 0; i < 120; i++) stepWeapons(s, 1 / 60);
  assert(s.weapons.ammo.vk47.mag === 30 && s.weapons.ammo.vk47.reserve === 89, `reload gave ${JSON.stringify(s.weapons.ammo.vk47)}`);
  switchWeapon(s, 1);
  assert(s.weapons.current === 'shotgun', `next slot is ${s.weapons.current}`);
  switchWeapon(s, -1);
  assert(s.weapons.current === 'vk47', `prev slot is ${s.weapons.current}`);
  return 'VK-47 30/90 -> fire -> reload -> switch shotgun -> back';
});

// 5. Police get out and SHOOT at wanted >= 2 (not just circle).
test('police foot officer shoots at wanted 2', () => {
  const s = createState(1);
  s.missions.active = null;
  s.player.wanted = 2;
  s.player.health = 100;
  s.police.units.push({
    id: 9001, kind: 'foot', callsign: 'PCPD-99',
    x: s.player.x + 20, z: s.player.z, heading: 0, speed: 0, state: 'ON FOOT',
    node: 0, route: null, routeIdx: 0, burstTimer: 0.1, shotsInBurst: 0, siren: true, lightBar: true,
  });
  const input = idleInput();
  for (let i = 0; i < 300; i++) s.step(1 / 60, input);
  const shooter = s.police.units.find((u) => u.kind === 'foot' && u.state === 'SHOOTING');
  assert(shooter, 'no foot officer entered SHOOTING state');
  assert(s.player.health < 100, `police fire did no damage (health ${s.player.health})`);
  return `foot officer SHOOTING, health ${s.player.health}`;
});

// 6. A car hitting the player on foot hurts and knocks them back.
test('car hits player: damage + knockback, no ghost-through', () => {
  const s = createState(1);
  s.missions.active = null;
  const px = s.player.x;
  const pz = s.player.z;
  s.traffic.push({
    id: 9999, type: 'solmar', name: 'Solmar', kind: 'car',
    x: px, z: pz + 2, heading: Math.PI, speed: 13, color: 0x888888,
    node: 0, route: [0], routeIdx: 0, brake: false, driver: 'traffic',
  });
  const input = idleInput();
  for (let i = 0; i < 10; i++) s.step(1 / 60, input);
  assert(s.player.health < 100, `no damage (health ${s.player.health})`);
  const moved = Math.hypot(s.player.x - px, s.player.z - pz);
  assert(moved > 1, `no knockback (moved ${moved.toFixed(2)})`);
  return `health ${s.player.health}, knocked ${moved.toFixed(1)} units`;
});

// 7. The player's car hitting a ped kills the ped and raises wanted.
test('player car hits ped: ped dies, wanted rises', () => {
  const s = createState(1);
  s.missions.active = null;
  s.player.x = -28;
  s.player.z = -45;
  // Peds populate over the first seconds; let the ring fill first.
  const idle = idleInput();
  for (let i = 0; i < 120; i++) s.step(1 / 60, idle);
  assert(s.peds.length > 0, 'no peds spawned');
  s.enterVehicle();
  assert(!s.player.onFoot, 'did not get in the car');
  const car = s.vehicles.find((v) => v.id === s.player.vehicleId);
  const ped = s.peds[0];
  const input = stubInput();
  input._move = { x: 0, z: 1 };
  let dead = false;
  for (let i = 0; i < 300 && !dead; i++) {
    // Hold the ped 1.5 units ahead of the car — inside the 2.2 impact
    // radius — so the impact rule itself is tested, not ped wandering.
    // A slow car (< 3) does not kill, so the hit fires once it is moving.
    const fx = Math.sin(car.heading);
    const fz = Math.cos(car.heading);
    ped.x = car.x + fx * 1.5;
    ped.z = car.z + fz * 1.5;
    s.step(1 / 60, input);
    dead = ped.dead;
  }
  assert(dead, 'ped survived 5s of driving through it');
  assert(s.player.wanted >= 1, `wanted did not rise (${s.player.wanted})`);
  assert(s.stats.kills >= 1, 'kill not counted');
  return `ped dead, wanted ${s.player.wanted}`;
});

// 8. Boats: board at the marina and drive.
test('boat boards and drives', () => {
  const s = createState(1);
  s.player.x = 222;
  s.player.z = 47;
  const entered = s.enterVehicle();
  assert(entered && s.playerBoat === 'boat-1', `board failed (playerBoat=${s.playerBoat})`);
  const boat = s.boats[0];
  const x0 = boat.x;
  const input = stubInput();
  input._move = { x: 0, z: 1 };
  for (let i = 0; i < 120; i++) s.step(1 / 60, input);
  assert(boat.speed > 5, `boat did not accelerate (speed ${boat.speed.toFixed(1)})`);
  assert(boat.x > x0 + 5, `boat did not move (x ${x0} -> ${boat.x.toFixed(1)})`);
  return `speed ${boat.speed.toFixed(1)}, x ${boat.x.toFixed(1)}`;
});

// 9. Helicopter: board at the helipad and climb with Space.
test('helicopter boards and climbs', () => {
  const s = createState(1);
  s.player.x = -60;
  s.player.z = -163;
  const entered = s.enterVehicle();
  assert(entered && s.heli.flying === true, `board failed (flying=${s.heli.flying})`);
  const input = stubInput();
  input._brake = true;
  for (let i = 0; i < 120; i++) s.step(1 / 60, input);
  assert(s.heli.y > 5, `heli did not climb (y=${s.heli.y.toFixed(1)})`);
  return `y=${s.heli.y.toFixed(1)} after 2s of Space`;
});

// 10. Postcards: walking over one collects it, +$150 and +5 respect.
test('postcard pickup pays $150 + 5 respect', () => {
  const s = createState(1);
  const pc = s.city.postcards[0];
  s.player.x = pc.x;
  s.player.z = pc.z;
  stepSide(s, 1 / 60);
  assert(s.postcardsFound.has(pc.id), 'postcard not collected');
  assert(s.player.cash === 400, `cash ${s.player.cash}, expected 400`);
  assert(s.player.respect === 5, `respect ${s.player.respect}, expected 5`);
  return `${pc.name}: cash $400, respect 5`;
});

// 11. Mission 1 plays through the real engine: steal, drive, park.
test('mission 1 completes through the real engine', () => {
  const s = createState(1);
  startMission(s, 1);
  s.player.x = 173;
  s.player.z = 20;
  s.enterVehicle();
  const input = idleInput();
  for (let i = 0; i < 10; i++) s.step(1 / 60, input);
  assert(s.missions.stage === 1, `stage 0 did not advance (stage=${s.missions.stage})`);
  const v = s.vehicles.find((x) => x.id === s.player.vehicleId);
  v.x = MARKERS.garage.x;
  v.z = MARKERS.garage.z + 9;
  v.speed = 0;
  s.player.x = v.x;
  s.player.z = v.z;
  for (let i = 0; i < 600 && !s.missions.completed.includes(1); i++) s.step(1 / 60, input);
  assert(s.missions.completed.includes(1), `mission 1 did not complete (stage=${s.missions.stage}, active=${s.missions.active})`);
  // 250 start + 1500 payout + 150 for the Rosa's Garage postcard,
  // which the car drives past at the garage door; respect 200 + 5.
  assert(s.player.cash === 1900, `cash ${s.player.cash}, expected 1900 (250 + 1500 + 150 postcard)`);
  assert(s.player.respect === 205, `respect ${s.player.respect}, expected 205 (200 + 5 postcard)`);
  return 'completed, cash $1900, respect 205';
});

if (failures.length > 0) {
  console.log(`\nplaytest: ${failures.length} FAILURE(S) of ${n}`);
  process.exit(1);
}
console.log(`\nplaytest: ${n}/${n} PASS`);

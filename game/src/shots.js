import { blankInput, stepWorld, say } from './world.js';
import { nearestRoadPoint, nearestNode, districtAt } from './city.js';
import { spawnVehicle, enterVehicle } from './vehicles.js';
import { setWantedLevel, spawnCop } from './police.js';
import { startMission } from './missions.js';
import { spawnEnemy } from './combat.js';
import { fireWeapon } from './weapons.js';
import { stepDialogue } from './dialogue.js';

export const SHOT_NAMES = Object.freeze(['cover', 'title', 'onfoot', 'map']);
const point = (label, x, y, z) => ({label, x, y, z});
function requireCheck(checks, label, ok, detail) {
  checks.push({label, ok: !!ok, detail});
  if (!ok) throw new Error(`SHOT STAGING FAILED: ${label} ${detail || 'out of frame'}`);
}
function projected(renderer, element) {
  const p = renderer.shotHelpers.projectToNDC(element.x, element.y, element.z);
  return {ok: p.inside && Math.abs(p.x) <= .95 && Math.abs(p.y) <= .95, p};
}
function frameElements(renderer, origin, elements, checks, options = {}) {
  const {heading = 0, distance = 70, elevation = 36, targetY = 12, fov = 65} = options;
  let found = false;
  // Widen the boom before declaring failure; retain a small yaw search.
  for (const scale of [1, 1.25, 1.6, 2]) {
    for (const yaw of [0, -.1, .1, -.2, .2, -.3, .3]) {
      const angle = heading + yaw;
      renderer.shotHelpers.setShotCamera({
        x: origin.x - Math.cos(angle) * distance * scale,
        y: elevation * scale,
        z: origin.z - Math.sin(angle) * distance * scale
      }, {x: origin.x, y: targetY, z: origin.z}, fov);
      if (elements.every(e => projected(renderer, e).ok)) { found = true; break; }
    }
    if (found) break;
  }
  for (const element of elements) {
    const result = projected(renderer, element);
    requireCheck(checks, element.label, result.ok, result.ok ? JSON.stringify(result.p) : 'out of frame');
  }
}
function beginJob(w, index) {
  w.mission.unlocked = Math.max(w.mission.unlocked, index + 1);
  if (!startMission(w, index)) throw new Error(`SHOT STAGING FAILED: could not start job ${index + 1}`);
}
function cover(w, renderer, hud, checks) {
  const road = nearestRoadPoint(w.city, -170, w.city.waterLineZ - 48);
  const car = spawnVehicle(w, 'sports', road.x, road.z, 0, {owned: true, color: '#ffc94d'});
  Object.assign(w.player, {x: car.x, z: car.z});
  if (!enterVehicle(w, car)) throw new Error('SHOT STAGING FAILED: sports car entry');
  const drive = blankInput();
  drive.forward = true;
  for (let i = 0; i < 600; i++) {
    // Turn back at the ends of the boulevard to keep the full-speed run on land.
    if (car.x > 230) car.heading = Math.PI;
    if (car.x < -230) car.heading = 0;
    stepWorld(w, drive, 1 / 60);
  }
  // The capture formation is composed on the unobstructed waterfront road.
  Object.assign(car, {x: 0, z: road.z, heading: 0, speed: 42, health: 100});
  Object.assign(w.player, {x: car.x, z: car.z, heading: 0, speed: 42, health: 100, dead: false, busted: false});
  beginJob(w, 5);
  const active = w.mission.active;
  const escape = active.stages.findIndex(s => s.kind.includes('escape'));
  if (escape >= 0) {
    active.stageIndex = escape;
    active.stage = active.stages[escape];
    active.stage.timer = 127;
    active.timer = 127;
    active.stage.position = {...w.city.spawn.safehouse};
  }
  setWantedLevel(w, 4);
  const elements = [point('sports car', car.x, 1, car.z)];
  for (const side of [-1, 1]) {
    const cop = spawnCop(w, car.x - 12, car.z + side * 4);
    const cruiser = w.vehicles.find(v => v.id === cop.vehicleId);
    Object.assign(cruiser, {heading: 0, speed: 38});
    elements.push(point(`pursuing cruiser ${side}`, cruiser.x, 1, cruiser.z));
  }
  w.flags.heli = {x: car.x + 18, z: car.z - 12, y: 60, active: true};
  // Police stores its searchlight in flags; aircraft meshes use the aircraft list.
  w.helis ||= [];
  w.helis.push({id: 'shot-police-heli', type: 'heli', ...w.flags.heli, heading: 0, color: '#162039', health: 100});
  elements.push(point('police helicopter', w.flags.heli.x, 60, w.flags.heli.z));
  elements.push(point('sea', 20, 0, w.city.waterLineZ + 14));
  for (let i = 0; i < 3; i++) {
    const v = spawnVehicle(w, ['taxi', 'sedan', 'van'][i], car.x + 12 + i * 12, car.z + 5, 0, {driver: 'traffic', speed: 10});
    const node = nearestNode(w.city, v.x, v.z);
    w.traffic.push({vehicleId: v.id, node: node.id, nextNode: node.edges[0], progress: 0, speed: 10, state: 'drive', honkT: 0, jamT: 0, cruise: 10, panicChecked: false});
    elements.push(point(`traffic ${i + 1}`, v.x, 1, v.z));
  }
  for (let i = 0; i < 2; i++) {
    const npc = w.npcs[i];
    if (!npc) throw new Error('SHOT STAGING FAILED: missing pedestrian');
    Object.assign(npc, {x: car.x + 6 + i * 8, z: car.z + 10, dead: false, health: 100, state: 'walk'});
    elements.push(point(`pedestrian ${i + 1}`, npc.x, 1, npc.z));
  }
  w.time = 12;
  hud.hideScreens();
  hud.update(w, 0);
  frameElements(renderer, car, elements, checks, {heading: -.3, distance: 75, elevation: 65, targetY: 22, fov: 68});
}
function title(w, renderer, hud, checks) {
  const p = nearestRoadPoint(w.city, -77, w.city.waterLineZ - 48);
  Object.assign(w.player, {x: p.x, z: p.z, heading: Math.PI / 2});
  w.time = 12.5;
  hud.update(w, 0);
  hud.showScreen('title', {saveSummary: {job: 4, money: 4850, day: 3, time: 12.5}});
  renderer.shotHelpers.setShotCamera({x:-240,y:18,z:290},{x:40,y:28,z:160},70);
  const count = document.querySelectorAll('.solmar-cast canvas').length;
  requireCheck(checks, 'six cast portraits', count === 6, `found ${count}`);
}
function onfoot(w, renderer, hud, checks) {
  beginJob(w, 3);
  const p = w.city.intersections.find(p => districtAt(w.city, p.x, p.z) === 'neon-mile');
  if (!p) throw new Error('SHOT STAGING FAILED: Neon Mile road missing');
  Object.assign(w.player, {x: p.x, z: p.z, heading: 0, onFoot: true, vehicleId: null, aiming: true});
  w.enemies.length = 0;
  const enemies = [-1, 1].map(side => spawnEnemy(w, p.x + 12, p.z + side * 3, {fireT: 2}));
  if (enemies.some(e => !e)) throw new Error('SHOT STAGING FAILED: enemy spawn');
  w.dialogue.current = null;
  w.dialogue.queue.length = 0;
  say(w, 'kane', 'Cruz. You should never have come back to Solmar.');
  stepDialogue(w, blankInput(), 2);
  fireWeapon(w);
  w.time = 19.25;
  hud.hideScreens();
  hud.update(w, 0);
  frameElements(renderer, {x: p.x + 5, z: p.z}, [
    point('player', p.x, 1, p.z),
    ...enemies.map((e, i) => point(`enemy ${i + 1}`, e.x, 1, e.z))
  ], checks, {heading: -.55, distance: 16, elevation: 3, targetY: 1, fov: 62});
  const dialogue = document.querySelector('.solmar-dialogue');
  requireCheck(checks, 'dialogue box', dialogue && !dialogue.hidden && dialogue.getClientRects().length > 0, 'must be visible');
}
function map(w, renderer, hud, checks) {
  w.time = 12;
  hud.update(w, 0);
  hud.showScreen('map');
  const canvas = document.querySelector('.solmar-mapcanvas');
  requireCheck(checks, 'city map canvas', canvas && canvas.width > 0, 'must exist');
  const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  let varied = false;
  for (let i = 4; i < pixels.length; i += 4) {
    if (pixels[i] !== pixels[0] || pixels[i + 1] !== pixels[1] || pixels[i + 2] !== pixels[2]) { varied = true; break; }
  }
  requireCheck(checks, 'drawn map pixels', varied, 'must contain multiple colors');
  renderer.shotHelpers.setShotCamera({x:-240,y:18,z:290},{x:40,y:28,z:160},70);
}
export function stageShot(world, renderer, hud, name) {
  if (!SHOT_NAMES.includes(name)) throw new Error(`SHOT STAGING FAILED: unknown shot ${name}`);
  if (world.seed !== 1) throw new Error('SHOT STAGING FAILED: seed must be 1');
  const checks = [];
  ({cover, title, onfoot, map})[name](world, renderer, hud, checks);
  renderer.update(world, blankInput(), 1 / 60);
  renderer.update(world, blankInput(), 1 / 60);
  return {name, checks};
}

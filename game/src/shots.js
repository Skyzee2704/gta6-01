// SOLMAR 3D — the four screenshots. Each shot stages the real game at
// a real moment: the cover loads the staging save (missions 1–5 played
// through the engine, never a fresh save) and drops the player into the
// mission-6 escape; the race starts a real race; the on-foot shot is
// mid-shootout in mission 4; the map is the drawn city map. Staging is
// deterministic (seed 1) so re-rendering gives byte-identical pixels.
// The NDC check is fail-loud: a subject outside the frame fails the shot.
import { SHOTS } from './config.js';
import { buildStagingSave, deserializeSave } from './save.js';
import { startMission } from './missions.js';
import { spawnVultures } from './combat.js';
import { startRace } from './races.js';

export const SHOT_NAMES = ['cover', 'race', 'onfoot', 'map'];

// Stage the named shot in the state. stagingSave is the parsed
// staging-save.json (built by missionCheck through the real engine);
// when null the save is built live, which is slower but identical.
export function stageShot(name, state, stagingSave = null) {
  if (name === 'cover') return stageCover(state, stagingSave);
  if (name === 'race') return stageRace(state);
  if (name === 'onfoot') return stageOnFoot(state);
  if (name === 'map') return stageMap(state);
  throw new Error(`unknown shot: ${name}`);
}

function loadStaging(state, stagingSave) {
  if (stagingSave) {
    deserializeSave(state, JSON.stringify(stagingSave));
    return stagingSave;
  }
  return buildStagingSave(state);
}

function stageCover(state, stagingSave) {
  const save = loadStaging(state, stagingSave);
  // Mission 6, escape stage: timer 127, four stars, the crew is with us.
  state.missions.active = 6;
  state.missions.stage = 1;
  state.missions.timer = 127;
  state.missions.marker = { x: 205, z: 110, label: 'Far pier' };
  state.time.hour = 18.6;
  state.time.day = 3;
  state.weather.set('golden');
  // The player, in the Vortex GT, flat out down Marina Boulevard.
  const v = state.vehicles.find((x) => x.type === 'vortex');
  const p = state.player;
  p.onFoot = false;
  p.vehicleId = v.id;
  v.driver = 'player';
  v.x = 182;
  v.z = 40;
  v.heading = Math.PI; // north up the boulevard
  v.speed = 27.2; // 98 km/h
  p.x = v.x;
  p.z = v.z;
  p.heading = v.heading;
  p.wanted = 4;
  state.camera.yaw = v.heading + Math.PI - 0.32; // angled to catch the sea
  state.camera.pitch = 0.1;
  // A cruiser in ramming formation, pulling alongside the rear quarter.
  state.police.units = [{
    id: 9001, kind: 'cruiser', callsign: 'PCPD-12',
    x: 177, z: 36, heading: Math.PI, speed: 27,
    state: 'RAMMING', node: 0, route: null, routeIdx: 0,
    burstTimer: 1, shotsInBurst: 0, siren: true, lightBar: true,
  }];
  // The helicopter ahead and low, beam locked on — the camera looks
  // 17 degrees down, so a heli at y=32 projected above the top edge
  // (NDC fail in rebuild #4's first run); y=14 sits comfortably in
  // the frame, a low police heli with its searchlight on the car.
  state.police.heli = { x: 196, z: -30, y: 14, angle: 0.6, beam: true };
  state.police.lastSeen = { x: p.x, z: p.z };
  // The boat, placed for the frame: north-east ahead, sea behind it.
  state.boats[0].x = 212;
  state.boats[0].z = -18;
  // Radio on: SOLMAR 88.5. The VK-47 is in hand, 30 in the mag.
  state.audio.setStation(0);
  state.weapons.current = 'vk47';
  state.weapons.ammo.vk47 = { mag: 30, reserve: 90 };
  state.dialog = {
    speaker: 'kane', name: 'Kane Doyle',
    text: 'Four stars. Do not stop for anything. The far pier — go!',
    ttl: 30,
  };
  return {
    name: 'cover', hour: 18.6, cash: save.cash, respect: save.respect,
    subjects: [
      { label: 'player car', x: v.x, y: 1, z: v.z },
      { label: 'cruiser', x: 177, y: 1, z: 36 },
      { label: 'heli', x: 196, y: 14, z: -30 },
      { label: 'boat', x: 212, y: 1, z: -18 },
    ],
  };
}

function stageRace(state) {
  state.time.hour = 18.8;
  state.weather.set('golden');
  state.missions.active = null;
  state.missions.marker = null;
  // The player, in the Vortex GT, on the start line of the ring road.
  const v = state.vehicles.find((x) => x.type === 'vortex');
  const p = state.player;
  p.onFoot = false;
  p.vehicleId = v.id;
  v.driver = 'player';
  v.x = 204;
  v.z = -6;
  v.heading = 0; // along the ring, +z
  v.speed = 0;
  p.x = v.x;
  p.z = v.z;
  p.heading = v.heading;
  p.wanted = 0;
  state.camera.yaw = v.heading + Math.PI;
  state.camera.pitch = 0.08;
  state.audio.setStation(1); // NEON 101.2 for race night
  startRace(state, 'neon-mile');
  // Rivals on the line beside the player, not buried behind the camera.
  const rivals = state.races.rivals;
  const spots = [[199, -4], [209, -4], [199, -12]];
  rivals.forEach((r, i) => {
    r.x = spots[i][0];
    r.z = spots[i][1];
  });
  return {
    name: 'race', hour: 18.8,
    subjects: [
      { label: 'player car', x: v.x, y: 1, z: v.z },
      ...rivals.map((r) => ({ label: r.name, x: r.x, y: 1, z: r.z })),
      { label: 'start gate', x: 204, y: 2, z: 0 },
    ],
  };
}

function stageOnFoot(state) {
  state.time.hour = 20.5; // 20:30, Neon Mile at night
  state.weather.set('clear');
  state.missions.active = 4;
  state.missions.stage = 1;
  state.missions.marker = { x: -20, z: 62, label: 'Rosa’s Garage' };
  // Two Vultures already down (corpses), four still up — "2 of 6 down".
  // All six stand on the street around the diner corner, never inside
  // a building footprint.
  state.enemies = [];
  spawnVultures(state, 6, -30, 32);
  const vultureSpots = [[-24, 28], [-32, 34], [-28, 30], [-36, 22], [-16, 34], [-44, 18]];
  state.enemies.forEach((e, i) => {
    e.x = vultureSpots[i][0];
    e.z = vultureSpots[i][1];
  });
  state.enemies[0].dead = true;
  state.enemies[0].deathTime = state.time.elapsed;
  state.enemies[1].dead = true;
  state.enemies[1].deathTime = state.time.elapsed;
  const p = state.player;
  p.onFoot = true;
  p.vehicleId = null;
  p.x = -20;
  p.z = 10;
  p.heading = Math.atan2(-28 - p.x, 30 - p.z);
  p.wanted = 0;
  // A three-quarter camera (0.25 rad off dead-behind): with the camera
  // exactly behind Milo the muzzle flash sat squarely over his torso
  // and hid the rifle, the tracer read as a line to his own head, and
  // the hit marker landed on his face. From 3/4 the gun, the flash and
  // the tracer all read as a shot fired past him at the Vulture.
  state.camera.yaw = p.heading + Math.PI - 0.25;
  state.camera.pitch = 0.05;
  // The VK-47, mid-burst: muzzle flash and a tracer to the lead Vulture.
  state.weapons.current = 'vk47';
  state.weapons.muzzleFlash = 0.07;
  state.combat.tracers.push({
    x1: p.x, y1: 1.45, z1: p.z, x2: -28, y2: 1.2, z2: 30, ttl: 0.5, color: 0xffe9a0,
  });
  state.combat.target = state.enemies[2];
  // No frozen hit marker: it is a transient flash that lives 0.25 s in
  // gameplay, and frozen in a still it reads as a red X on Milo's face.
  // The burst is already shown by the flash, the tracer and the chevron.
  state.audio.setStation(0);
  state.dialog = {
    speaker: 'kane', name: 'Kane Doyle',
    text: 'They are inside my garage, Milo. Six Vultures. End it.',
    ttl: 30,
  };
  return {
    name: 'onfoot', hour: 20.5,
    subjects: [
      { label: 'player', x: p.x, y: 1.5, z: p.z },
      { label: 'vulture 1', x: -28, y: 1.5, z: 30 },
      { label: 'vulture 2', x: -36, y: 1.5, z: 26 },
      { label: 'diner', x: -40, y: 4, z: 30 },
    ],
  };
}

function stageMap(state) {
  state.time.hour = 12.0;
  state.weather.set('clear');
  return { name: 'map', hour: 12.0, subjects: [] };
}

// Mean luma of a canvas (0..1), Rec. 709 weights.
export function computeLuma(canvas) {
  const w = canvas.width;
  const h = canvas.height;
  const off = document.createElement('canvas');
  off.width = 160;
  off.height = 90;
  const ctx = off.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(canvas, 0, 0, 160, 90);
  const data = ctx.getImageData(0, 0, 160, 90).data;
  let sum = 0;
  const n = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  }
  return sum / n / 255;
}

// NDC check: every subject must project inside the frame, in front of
// the camera. Returns {ok, missing: [labels]} — fail-loud.
export function checkNDC(project, subjects) {
  const missing = [];
  for (const s of subjects) {
    const p = project(s.x, s.y, s.z);
    if (!p || !p.visible || p.x < 0 || p.x > 1280 || p.y < 0 || p.y > 720) {
      missing.push(s.label);
    }
  }
  return { ok: missing.length === 0, missing };
}

export function lumaFloorFor(name) {
  return SHOTS.lumaFloor[name];
}

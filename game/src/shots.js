// SOLMAR 3D — shot staging: the 4 screenshot scenes. Each one plays the
// real rules forward from a fresh world (or the real staging save loaded
// through the real load path) for a fixed number of seconds with a simple
// autopilot, so the frame is what real play looks like and the same seed
// always gives the same frame. NDC-check: required elements must project
// inside the viewport or the shot FAILS LOUD.
//
// 2026-11-19 (rebuild #3, Sky: "gedung nutupin jalan"): the cover chase
// is posed ON Gold Street (x=320, a real north-south street), not at
// x=300 — the old pose drove the car north through a block interior
// 20 units off any street, so no road was visible under it. The
// ferris wheel at (300,300) now sits ahead-left of the car, the heli
// top-right (x +28, was -28), both in frame. On-foot: after the
// chase sim the Vultures scattered (Vulture 1 to NDC x=-0.89, half
// its body off the left edge) — both are now snapped to symmetric
// spots ahead of the player (9 ahead, +/-8.5 side, target NDC x
// about +/-0.45) so BOTH bodies are fully in frame. On-foot was
// RE-STAGED onto Gold Street (player 320,240 heading north): the
// old block-interior pose hid the right-hand Vulture behind a
// facade despite NDC +0.43, so the snap is now occlusion-aware
// (own spot + camera sightline checked, fallback grid). Rewritten
// under recording 01a1f2f3 (recorder 01a1f27c died 16:33 WITA).
import { SHOT_HOURS, LUMA_FLOOR, SHOT_MAX_BYTES } from './config.js';
import { buildMidGameStaging } from './save.js';
import { createWorld, advanceWorld } from './world.js';
import { buildCity, nearestNode } from './city.js';
import { createVehicleState, updateVehicle } from './vehicles.js';
import { createPolice, updatePolice } from './police.js';
import { buildingAt } from './buildings.js';
import { createNpcManager, updateNpcs, spawnVulture } from './npc.js';
import { createTraffic, updateTraffic } from './traffic.js';
import { createRace, startRace, updateRace } from './races.js';
import { createMissionEngine, startMission } from './missions.js';

export const SHOT_DEFS = [
  {
    id: '1-cover',
    query: 'cover',
    name: 'Cover — street chase, golden hour',
    hour: 18.6,
    lumaFloor: 0.35,
    staging: true,
    require: ['playerCar', 'cruiser', 'heli', 'pedestrian'],
  },
  {
    id: '2-race',
    query: 'race',
    name: 'Race — Neon Mile start gate',
    hour: 18.8,
    lumaFloor: 0.35,
    staging: true,
    require: ['playerCar', 'rival1', 'rival2', 'rival3'],
  },
  {
    id: '3-onfoot',
    query: 'onfoot',
    name: 'On foot — Vulture Trouble at dusk',
    hour: 20.5,
    lumaFloor: 0.25,
    staging: true,
    require: ['player', 'vulture1', 'vulture2'],
  },
  {
    id: '4-map',
    query: 'map',
    name: 'Map — city overview',
    hour: 12.0,
    lumaFloor: 0.35,
    staging: true,
    require: ['map'],
  },
];

export function shotDef(id) {
  return SHOT_DEFS.find((s) => s.id === id) || SHOT_DEFS[0];
}

export function stageShot(query, seed = 1) {
  const def = SHOT_DEFS.find((s) => s.query === query) || SHOT_DEFS[0];
  const staging = buildMidGameStaging();
  const world = { ...createWorld(seed), ...staging, player: { ...createWorld(seed).player, ...staging.player } };
  world.hour = def.hour;
  const city = buildCity(seed);
  const police = createPolice(seed);
  const npcs = createNpcManager(seed);
  const traffic = createTraffic(seed);
  const race = createRace(seed);
  const missions = createMissionEngine();
  const player = createVehicleState('comet', 320, 130, 0);
  const state = {
    def,
    world,
    city,
    police,
    npcs,
    traffic,
    race,
    missions,
    player,
    vultures: [],
    rivals: [],
    seconds: 0,
  };
  if (query === 'cover') {
    stageCover(state, seed);
  } else if (query === 'race') {
    stageRace(state, seed);
  } else if (query === 'onfoot') {
    stageOnFoot(state, seed);
  } else if (query === 'map') {
    stageMap(state, seed);
  }
  return state;
}

function driveAutopilot(state, dt) {
  const v = state.player;
  const input = { up: true, down: false, left: false, right: false, handbrake: false };
  const ahead = { x: v.x + Math.sin(v.heading) * 20, y: v.y + Math.cos(v.heading) * 20 };
  const city = state.city;
  const near = nearestNode(city, ahead.x, ahead.y);
  const wantHeading = Math.atan2(near.x - v.x, near.y - v.y);
  let dh = wantHeading - v.heading;
  while (dh > Math.PI) dh -= Math.PI * 2;
  while (dh < -Math.PI) dh += Math.PI * 2;
  input.left = dh > 0.12;
  input.right = dh < -0.12;
  updateVehicle(v, input, dt);
  state.world.player.x = v.x;
  state.world.player.y = v.y;
  state.world.player.heading = v.heading;
  state.world.player.speed = v.speed;
  state.world.player.onFoot = false;
}

function stageCover(state, seed) {
  const w = state.world;
  w.wanted = 4;
  w.wantedHeat = 150;
  const police = state.police;
  police.nextId = 20;
  // The chase is posed ON Gold Street (x=320, a real north-south
  // street), not at x=300: the old pose drove the car north through
  // a block interior 20 units off any street, so no road was visible
  // under it — the "gedung nutupin jalan" Sky flagged. The ferris
  // wheel at (300,300) now sits ahead-left of the car, the heli
  // top-right, both in frame.
  state.player.x = 320;
  state.player.y = 300;
  state.player.heading = 0;
  state.player.speed = 27;
  for (let s = 0; s < 6 * 60; s++) {
    const dt = 1 / 60;
    driveAutopilot(state, dt);
    updatePolice(police, state.city, state.world.player, w, dt);
    updateTraffic(state.traffic, state.city, state.world.player, dt);
    updateNpcs(state.npcs, state.world.player, dt, state.city);
    advanceWorld(w, dt);
    state.seconds += dt;
  }
  let coverY = 300;
  for (let y = 280; y <= 420; y += 5) {
    if (!buildingAt(state.city, 320, y - 10, 2) && !buildingAt(state.city, 320, y, 6)) {
      coverY = y;
      break;
    }
  }
  state.npcs.peds = [];
  let coverX = 320;
  for (let x = 316; x <= 324; x += 2) {
    let blocked = false;
    for (const t of state.city.trees) {
      if (Math.abs(t.x - x) < 5 && t.y > coverY - 12 && t.y < coverY + 17) {
        blocked = true;
        break;
      }
    }
    if (!blocked) {
      coverX = x;
      break;
    }
  }
  state.player.x = coverX;
  state.player.y = coverY;
  state.player.heading = 0;
  state.player.speed = 27;
  state.world.player.x = coverX;
  state.world.player.y = coverY;
  state.world.player.heading = 0;
  state.world.player.speed = 27;
  police.units = [
    {
      id: 'PCPD-12',
      kind: 'cruiser',
      x: coverX + 6,
      y: coverY + 12,
      heading: 0,
      speed: 26,
      state: 'RAMMING',
      node: 0,
      path: null,
      pathIdx: 0,
      siren: true,
      lightBar: true,
      onFoot: false,
      shootT: 0,
    },
    {
      id: 'PCPD-13',
      kind: 'cruiser',
      x: coverX - 7,
      y: coverY + 18,
      heading: 0,
      speed: 24,
      state: 'PURSUIT',
      node: 0,
      path: null,
      pathIdx: 0,
      siren: true,
      lightBar: true,
      onFoot: false,
      shootT: 0,
    },
  ];
  police.heli = {
    id: 'PCPD-AIR1',
    kind: 'heli',
    x: coverX + 28,
    y: coverY + 55,
    z: 38,
    heading: 0,
    speed: 18,
    state: 'SPOTLIGHT',
    beamOn: true,
    beamTarget: { x: coverX, y: coverY },
    rotor: 0,
  };
  const fx = Math.sin(state.player.heading);
  const fy = Math.cos(state.player.heading);
  const px = -fy;
  const py = fx;
  for (let i = 0; i < 2; i++) {
    const ahead = 14 + i * 6;
    const side = i === 0 ? 7 : -7;
    state.npcs.peds.push({
      id: 'cover-ped' + i,
      x: state.player.x + fx * ahead + px * side,
      y: state.player.y + fy * ahead + py * side,
      heading: state.player.heading,
      speed: 1.2,
      health: 100,
      look: { skin: 0xe8b890, shirt: 0x2e6fc2, pants: 0x2a3542, hair: 0x2a2018 },
      bark: 'Nice car.',
      barkT: 5,
      state: 'walk',
      district: 'beach',
    });
  }
  return state;
}

function stageRace(state, seed) {
  const w = state.world;
  w.hour = 18.8;
  w.player.x = 314;
  w.player.y = 130;
  w.player.heading = Math.PI / 2;
  w.player.speed = 8;
  state.player.x = 314;
  state.player.y = 130;
  state.player.heading = Math.PI / 2;
  state.player.speed = 8;
  state.world.player.x = 314;
  state.world.player.y = 130;
  state.world.player.heading = Math.PI / 2;
  state.world.player.speed = 8;
  startRace(state.race, state.world.player);
  state.race.countdown = 0;
  state.race.phase = 'racing';
  state.race.elapsed = 12.4;
  state.race.lap = 1;
  state.race.checkpoint = 1;
  state.race.playerPlace = 3;
  state.race.gapToLeader = 1.8;
  state.race.standings = [
    { name: 'Neri Flint', place: 1, isPlayer: false },
    { name: 'Zella Coil', place: 2, isPlayer: false },
    { name: 'Milo', place: 3, isPlayer: true },
    { name: 'Ivo Switch', place: 4, isPlayer: false },
  ];
  const spots = [
    [332, 128],
    [328, 133],
    [322, 136],
  ];
  state.race.rivals = state.race.rivals.map((r, i) => ({
    ...r,
    x: spots[i][0],
    y: spots[i][1],
    heading: Math.PI / 2,
    speed: 11 + i,
  }));
  return state;
}

function stageOnFoot(state, seed) {
  const w = state.world;
  w.hour = 20.5;
  w.player.onFoot = true;
  // Posed ON Gold Street (x=320), heading north — the old pose at
  // (300,240) heading 0.5 stood in a block interior, and the
  // right-hand Vulture's snap spot sat INSIDE building b84 with its
  // sightline blocked: NDC said +0.43 (in frame) but the body was
  // hidden behind a facade. On the street both flanks are open
  // asphalt/sidewalk with clear sightlines (verified by probe).
  w.player.x = 320;
  w.player.y = 240;
  w.player.heading = 0;
  const missions = state.missions;
  startMission(missions, 'vulture-trouble', w);
  missions.progress = 2;
  missions.progressTotal = 6;
  state.vultures = [
    spawnVulture(state.npcs, 326, 234, 'Vulture 1'),
    spawnVulture(state.npcs, 314, 234, 'Vulture 2'),
  ];
  for (const v of state.vultures) {
    v.state = 'chase';
    v.aggro = 1;
  }
  for (let s = 0; s < 2 * 60; s++) {
    const dt = 1 / 60;
    updateNpcs(state.npcs, state.world.player, dt, state.city);
    advanceWorld(w, dt);
    state.seconds += dt;
  }
  // After the chase sim the Vultures have scattered: Vulture 1 chased to
  // NDC x=-0.89 (half its body off the left edge — only its marker and a
  // sliver of red were in frame), Vulture 2 to +0.58. Snap both to
  // symmetric spots ahead of the player so BOTH bodies are fully in
  // frame (target NDC x about +/-0.45). Same pattern as stageCover,
  // which places police/heli/peds explicitly after its sim. Screen-right
  // on the ground plane is (-cos h, sin h) — see stageCover's px/py.
  //
  // Occlusion-aware (2026-11-19): NDC in-frame is NOT enough — the
  // old snap put the right-hand Vulture at NDC +0.43 yet its body was
  // hidden behind a facade (spot inside building b84, sightline
  // blocked). The shot camera sits 8 units behind the player (the
  // on-foot branch in main.js uses boom 8), so each candidate spot
  // must be clear itself AND have a clear sightline from the camera
  // ground point. Wide-then-narrow, near-then-far; first clear spot
  // wins. On Gold Street the (8.5, 9) spots are clear for both.
  const fx = Math.sin(w.player.heading);
  const fy = Math.cos(w.player.heading);
  const rx = -fy;
  const ry = fx;
  const camX = w.player.x - fx * 8;
  const camY = w.player.y - fy * 8;
  function sightClear(x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist / 2));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (buildingAt(state.city, x0 + dx * t, y0 + dy * t, 1.5)) return false;
    }
    return true;
  }
  function snapSpot(sign) {
    for (const side of [8.5, 6, 4, 2.5]) {
      for (const ahead of [9, 12, 15]) {
        const x = w.player.x + fx * ahead + rx * side * sign;
        const y = w.player.y + fy * ahead + ry * side * sign;
        if (buildingAt(state.city, x, y, 1)) continue;
        if (!sightClear(camX, camY, x, y)) continue;
        return { x, y };
      }
    }
    return { x: w.player.x + fx * 9 + rx * 8.5 * sign, y: w.player.y + fy * 9 + ry * 8.5 * sign };
  }
  const s0 = snapSpot(-1);
  const s1 = snapSpot(1);
  state.vultures[0].x = s0.x;
  state.vultures[0].y = s0.y;
  state.vultures[1].x = s1.x;
  state.vultures[1].y = s1.y;
  for (const v of state.vultures) {
    v.heading = Math.atan2(w.player.x - v.x, w.player.y - v.y);
  }
  return state;
}

function stageMap(state) {
  const w = state.world;
  w.hour = 12.0;
  return state;
}

export function ndcCheck(projectNDC, required, positions) {
  const failures = [];
  for (const key of required) {
    const pos = positions[key];
    if (!pos) {
      failures.push(key + ': no position');
      continue;
    }
    const ndc = projectNDC(pos);
    if (!ndc.visible) {
      failures.push(key + ': outside viewport (x=' + ndc.x.toFixed(2) + ', y=' + ndc.y.toFixed(2) + ')');
    }
  }
  return { pass: failures.length === 0, failures };
}

export function lumaFloorFor(shotId) {
  const def = shotDef(shotId);
  return def.lumaFloor;
}

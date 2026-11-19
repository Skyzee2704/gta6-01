// The screenshot scenes: each one plays the real rules forward from a
// fresh world with the mid-game staging save, steered by an autopilot, so
// the frame is what a short game really looks like and the same seed always
// gives the same frame. Every required element is checked in NDC before
// the freeze — one element out of frame fails the shot out loud.
import { STEP } from './config.js';
import { startMission, currentStep } from './missions.js';
import { queueMissionLines, stepDialogue } from './dialogue.js';
import { wrapAngle, dist2d } from './random.js';
import { districtAt } from './city.js';
import { MISSIONS, POSTCARDS } from './data.js';

const SHOT_STEPS = { cover: 600, race: 420, onfoot: 300, map: 60 };

/**
 * Autopilot: steer toward a point, throttle on, brake when too close.
 * If the player has barely moved for 1.5 s while trying, a building is in
 * the way: pick a waypoint 28 m to the right of the route, walk there,
 * then resume. No teleporting, ever.
 */
export function autopilotInput(state, tx, tz) {
  const player = state.player;
  const ap = state.autopilot || (state.autopilot = { lastX: player.x, lastZ: player.z, stuck: 0, detour: null, side: 1 });
  const moved = dist2d(player.x, player.z, ap.lastX, ap.lastZ);
  ap.lastX = player.x;
  ap.lastZ = player.z;
  let gx = tx;
  let gz = tz;
  const d = dist2d(player.x, player.z, tx, tz);
  // Blocked while walking to a detour point: abandon it and try the
  // other side instead of waiting out the timeout against a second wall.
  if (ap.detour) {
    gx = ap.detour.x;
    gz = ap.detour.z;
    if (dist2d(player.x, player.z, gx, gz) < 6 || state.time > ap.detour.until) {
      ap.detour = null;
      ap.stuck = 0;
    } else if (moved < 0.02) {
      ap.stuck += 1 / 60;
      if (ap.stuck > 1.5) {
        ap.detour = null;
        ap.stuck = 0;
        ap.side *= -1;
      }
    } else if (moved > 0.05) ap.stuck = 0;
  }
  if (!ap.detour && d > 4) {
    ap.stuck += 1 / 60;
    if (moved < 0.02) {
      if (ap.stuck > 1.5) {
        ap.stuck = 0;
        // Perpendicular to the route, alternating sides, 20 m out.
        const dx = tx - player.x;
        const dz = tz - player.z;
        const len = Math.hypot(dx, dz) || 1;
        ap.detour = { x: player.x + (dz / len) * 20 * ap.side, z: player.z - (dx / len) * 20 * ap.side, until: state.time + 8 };
        gx = ap.detour.x;
        gz = ap.detour.z;
      }
    } else if (moved > 0.05) ap.stuck = 0;
  }
  const want = Math.atan2(gx - player.x, gz - player.z);
  const diff = wrapAngle(want - player.heading);
  // Heading decreases when turning right, so a positive error needs steer -1.
  const steer = diff > 0.12 ? -1 : diff < -0.12 ? 1 : 0;
  // Run on foot when the target is far; walk when close, so the final
  // approach does not overshoot the step trigger. In a vehicle, brake
  // inside 25 m — a coupe at 42 m/s with no brakes sails straight past
  // the target and ends up on the grass.
  const inVehicle = !!state.player.vehicle;
  return { steer, forward: d > 4, back: inVehicle && d < 25, run: d > 30, handbrake: false, fire: false, enter: false };
}

/** Drive the world forward N steps with the autopilot toward a target. */
export function driveForward(world, steps, tx, tz) {
  for (let i = 0; i < steps; i += 1) {
    world.step(STEP, autopilotInput(world.state, tx, tz));
    // Stop on arrival: a fixed step count lets a 42 m/s car overshoot the
    // target, turn around and wander off the boulevard onto the grass.
    if (dist2d(world.state.player.x, world.state.player.z, tx, tz) < 8) break;
  }
}

function ndcCheck(project, elements) {
  const missing = [];
  for (const element of elements) {
    const p = project(element.x, element.y, element.z);
    if (!p.visible || p.x < -0.95 || p.x > 0.95 || p.y < -0.95 || p.y > 0.95) missing.push(element.name);
  }
  return missing;
}

function stageCover(world) {
  const state = world.state;
  world.loadStaging();
  state.hour = 18.6;
  state.weather.hour = 18.6;
  state.weather.kind = 'clear';
  // Mission 6, escape stage: the player flees down Marina Boulevard.
  const mission = state.missions.active;
  if (mission) {
    state.missions.stepIndex = mission.steps.length - 1;
    state.missions.timer = 127;
  }
  // The player is already in the coupe: steal it first, then drive.
  const coupe = state.vehicles.find((v) => v.id === 'coupe');
  if (coupe) {
    coupe.x = 330;
    coupe.z = 396;
    coupe.heading = Math.PI / 2;
    state.player.x = 330;
    state.player.z = 396;
    state.player.heading = Math.PI / 2;
    state.player.onFoot = false;
    state.player.vehicle = coupe;
    coupe.driver = state.player;
    coupe.parked = false;
  }
  // Wanted 4: a cruiser in ramming formation behind, the heli above.
  state.player.wanted = 4;
  state.player.wantedTimer = 0;
  driveForward(world, 240, 420, 396);
  driveForward(world, 360, 470, 396);
  // The escape cruises at 98 KM/H in the shot: the autopilot brakes late
  // from 42 m/s, so the frozen frame would otherwise read 142 KM/H.
  const heroCar = state.player.vehicle;
  if (heroCar) {
    heroCar.speed = 27.2;
    heroCar.vx = Math.sin(heroCar.heading) * 27.2;
    heroCar.vz = Math.cos(heroCar.heading) * 27.2;
    heroCar.brakeLight = false;
  }
  // Place the pursuit AFTER the final drive, relative to where the player
  // actually ended up. The police are frozen during missions, so anything
  // placed before the drive is left ~100 m behind and out of frame.
  const h = state.player.heading;
  const fx = Math.sin(h);
  const fz = Math.cos(h);
  const rx = -Math.cos(h);
  const rz = Math.sin(h);
  if (state.police[0]) {
    const cop = state.police[0];
    // Eight metres behind and six to the side: dead behind, the cruiser
    // sits 3 m in front of the chase camera and falls off the bottom edge.
    cop.x = state.player.x - fx * 8 + rx * 6;
    cop.z = state.player.z - fz * 8 + rz * 6;
    cop.heading = h;
    cop.state = 'RAMMING';
    cop.onFoot = false;
    // Keep the parked cruiser in frame: its render position follows the unit.
    cop.carX = cop.x;
    cop.carZ = cop.z;
    cop.carHeading = h;
  }
  // Low hover ahead-right: at y=30 and 20 m ahead the heli sits 51 degrees
  // above the camera axis, past the 30-degree half-FOV — out of frame.
  // At y=18 and 35 m ahead it is ~20 degrees up, NDC y ~0.67, in frame.
  state.policeHeli.x = state.player.x + fx * 35 + rx * 12;
  state.policeHeli.z = state.player.z + fz * 35 + rz * 12;
  state.policeHeli.y = 18;
  state.policeHeli.beamOn = true;
  state.policeHeli.beamX = state.player.x;
  state.policeHeli.beamZ = state.player.z;
  // One pedestrian on the sidewalk ahead, in frame.
  const ped = state.peds[0];
  if (ped) {
    ped.x = state.player.x + fx * 14 + rx * 6;
    ped.z = state.player.z + fz * 14 + rz * 6;
    ped.targetX = ped.x;
    ped.targetZ = ped.z;
    ped.waitTimer = 9;
  }
  return {
    // The pursuit needs a wider camera: boom 18, height 6.5, so the
    // cruiser 10 m behind the player sits 8 m ahead of the lens instead
    // of 3 m — in frame instead of off the bottom edge.
    cameraBoom: 18,
    cameraHeight: 6.5,
    required: [
      { name: 'player car', x: state.player.x, y: 1.5, z: state.player.z },
      { name: 'police cruiser', x: state.police[0] ? state.police[0].x : 0, y: 1.5, z: state.police[0] ? state.police[0].z : 0 },
      { name: 'police heli', x: state.policeHeli.x, y: 18, z: state.policeHeli.z },
      { name: 'pedestrian', x: ped ? ped.x : state.player.x + 6, y: 1.5, z: ped ? ped.z : state.player.z + 4 },
    ],
  };
}

function stageRace(world) {
  const state = world.state;
  world.loadStaging();
  state.hour = 18.8;
  state.weather.hour = 18.8;
  state.weather.kind = 'clear';
  const sport = state.vehicles.find((v) => v.id === 'sport');
  if (sport) {
    sport.x = 448;
    sport.z = 240;
    sport.heading = 0;
    state.player.x = 448;
    state.player.z = 240;
    state.player.heading = 0;
    state.player.onFoot = false;
    state.player.vehicle = sport;
    sport.driver = state.player;
    sport.parked = false;
  }
  // Three rivals with original names, in the pack beside the player.
  const rivals = [
    { name: 'Neri Flint', def: 'muscle', side: -1, ahead: 6 },
    { name: 'Zella Coil', def: 'coupe', side: 1, ahead: 6 },
    { name: 'Ivo Switch', def: 'sport', side: -1, ahead: -6 },
  ];
  state.race = { route: { id: 'neon-loop', name: 'Neon Loop', laps: 3, path: [[448, 240], [480, 280], [440, 330], [400, 280], [420, 220]] }, lap: 1, checkpoint: 0, time: 12, finished: false, rivals: rivals.map((r) => ({ name: r.name, progress: 2, lap: 1 })), playerProgress: 2 };
  // A race is not a story job: the staging save's mission 6 banner and
  // Kane's dialogue do not belong in this frame. Clear both, so the HUD
  // reads FREE ROAM and the race is the story.
  state.missions.active = null;
  state.missions.stepIndex = 0;
  state.dialogue.queue = [];
  state.dialogue.current = null;
  driveForward(world, 120, 470, 260);
  // Thin the ambient traffic for the frame AFTER the drive: slicing before
  // it is undone by maintainTraffic refilling the ring to 12 during the
  // drive. 12 traffic cars plus 3 rivals plus the player put 130 draw
  // calls in view against the 100 budget; four traffic cars is enough to
  // show varied vehicles on the road.
  state.traffic = state.traffic.slice(0, 4);
  // Rivals are placed AFTER the drive, in formation around where the
  // player actually ended up — placed before it, the drive leaves them
  // 30 m behind and out of frame.
  const h = state.player.heading;
  const fx = Math.sin(h);
  const fz = Math.cos(h);
  const rx = -Math.cos(h);
  const rz = Math.sin(h);
  const placed = [];
  for (const rival of rivals) {
    const car = state.vehicles.find((v) => v.id === rival.def) || state.vehicles[0];
    car.x = state.player.x + fx * rival.ahead + rx * 4 * rival.side;
    car.z = state.player.z + fz * rival.ahead + rz * 4 * rival.side;
    car.heading = h;
    car.parked = false;
    placed.push({ name: `rival ${rival.name}`, x: car.x, y: 1.5, z: car.z });
  }
  return {
    // Wider and higher than the chase default: the player car was half
    // out of the bottom-left corner at boom 13.
    cameraBoom: 17,
    cameraHeight: 6.5,
    required: [
      { name: 'player car', x: state.player.x, y: 1.5, z: state.player.z },
      placed[0],
      placed[1],
    ],
  };
}

function stageOnFoot(world) {
  const state = world.state;
  world.loadStaging();
  state.hour = 20.5;
  state.weather.hour = 20.5;
  state.weather.kind = 'clear';
  startMission(state.missions, 4);
  // loadStaging() queues mission 6's lines; clear them first or the
  // shot shows Kane's last-job line under a mission 4 banner.
  state.dialogue.queue = [];
  state.dialogue.current = null;
  queueMissionLines(state.dialogue, 4);
  // Pop the first line into `current`: the shot paints without stepping
  // the world, so without this the dialogue box stays empty.
  stepDialogue(state.dialogue, 0.1);
  // The fight happens ON the ring road's east point, facing north along
  // it. At the old spot (448, 240) the player stood on the lawn between
  // the spoke and the ring, and the dark grass filled 60% of the frame
  // (luma 0.219 against a 0.25 floor). On the road, the frame is asphalt,
  // lit windows and neon instead.
  state.player.x = 470;
  state.player.z = 240;
  state.player.heading = Math.PI;
  state.player.onFoot = true;
  state.player.vehicle = null;
  state.loadout.current = 'rifle';
  state.loadout.muzzleFlash = 0.09;
  // Two Vultures with red markers, in frame, and one civilian behind.
  state.peds.length = 0;
  state.peds.push(
    { id: 900, x: 472, z: 226, heading: 0, speed: 0, health: 100, dead: false, skin: '#c98d5f', hair: '#4a2c14', shirt: '#5a1f1f', pants: '#22303e', scale: 1, walkTime: 0, targetX: 472, targetZ: 226, waitTimer: 9, fleeing: false },
    { id: 901, x: 468, z: 230, heading: 0, speed: 0, health: 100, dead: false, skin: '#8a5a3b', hair: '#14141a', shirt: '#5a1f1f', pants: '#22303e', scale: 1, walkTime: 0, targetX: 468, targetZ: 230, waitTimer: 9, fleeing: false },
    { id: 902, x: 460, z: 252, heading: 0, speed: 1.4, health: 100, dead: false, skin: '#d9a066', hair: '#3a3a3a', shirt: '#17a589', pants: '#3a3f4a', scale: 1, walkTime: 0, targetX: 460, targetZ: 252, waitTimer: 0, fleeing: false },
  );
  state.missions.progress = 2;
  return {
    required: [
      { name: 'player', x: state.player.x, y: 1.5, z: state.player.z },
      { name: 'vulture 1', x: 472, y: 1.5, z: 226 },
      { name: 'vulture 2', x: 468, y: 1.5, z: 230 },
    ],
  };
}

/** Draw the city map: roads, district blocks, sea, beach, markers and grid. */
export function drawMapShot(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = '#101418';
  ctx.fillRect(0, 0, W, H);
  const scaleX = (W * 0.62) / 640;
  const scaleY = (H * 0.86) / 480;
  const ox = 24;
  const oy = 40;
  const X = (x) => ox + x * scaleX;
  const Y = (z) => oy + z * scaleY;
  // Sea and beach ring.
  ctx.fillStyle = '#1d4e6b';
  ctx.beginPath();
  ctx.ellipse(ox + 320 * scaleX, oy + 240 * scaleY, 320 * scaleX + 30, 240 * scaleY + 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d9b380';
  ctx.beginPath();
  ctx.ellipse(ox + 320 * scaleX, oy + 240 * scaleY, 302 * scaleX, 226 * scaleY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a5a3a';
  ctx.beginPath();
  ctx.ellipse(ox + 320 * scaleX, oy + 240 * scaleY, 288 * scaleX, 214 * scaleY, 0, 0, Math.PI * 2);
  ctx.fill();
  // Roads.
  ctx.strokeStyle = '#26262a';
  ctx.lineWidth = 5;
  for (const road of state.city.roads) {
    ctx.beginPath();
    ctx.moveTo(X(road.x1), Y(road.z1));
    ctx.lineTo(X(road.x2), Y(road.z2));
    ctx.stroke();
  }
  // District blocks.
  const districtColors = { marina: '#2e86c1', downtown: '#8e44ad', neon: '#ff4fd8', beach: '#e8b400', oldtown: '#a67c52', harbor: '#17a589' };
  for (const d of state.city.districts) {
    ctx.fillStyle = districtColors[d.id] || '#888';
    ctx.beginPath();
    ctx.arc(X(d.x), Y(d.y), 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f5efe4';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(d.name, X(d.x), Y(d.y) - 22);
  }
  // Grid A-F, 1-6.
  ctx.fillStyle = '#b8ab96';
  ctx.font = '12px system-ui, sans-serif';
  for (let i = 0; i < 6; i += 1) {
    ctx.fillText(String.fromCharCode(65 + i), ox + (i + 0.5) * (640 / 6) * scaleX, oy - 8);
    ctx.fillText(String(i + 1), ox - 12, oy + (i + 0.5) * (480 / 6) * scaleY);
  }
  // Markers: mission, player, police, postcards, shops.
  const step = state.missions.active ? state.missions.active.steps[state.missions.stepIndex] : null;
  if (step) {
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.arc(X(step.x), Y(step.y), 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(X(state.player.x), Y(state.player.z), 6, 0, Math.PI * 2);
  ctx.fill();
  for (const card of POSTCARDS.slice(0, 8)) {
    ctx.fillStyle = '#37e6ff';
    ctx.fillRect(X(card.x) - 3, Y(card.y) - 3, 6, 6);
  }
  // Side panel: the six missions with payout and status, legend, cash, respect.
  const px = W * 0.68;
  ctx.fillStyle = '#f5efe4';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SOLMAR — City Map', px, 60);
  ctx.font = '15px system-ui, sans-serif';
  let y = 96;
  for (const m of MISSIONS) {
    const done = state.missions.completed.includes(m.id);
    const active = state.missions.active && state.missions.active.id === m.id;
    ctx.fillStyle = done ? '#2ecc71' : active ? '#ffd23e' : '#b8ab96';
    ctx.fillText(`${done ? '✓' : active ? '▶' : '·'} ${m.id}. ${m.name} — $${m.payout.toLocaleString('en-US')}`, px, y);
    y += 26;
  }
  y += 10;
  ctx.fillStyle = '#f5efe4';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(`Cash $${state.economy.cash.toLocaleString('en-US')}   Respect ${state.economy.respect}`, px, y);
  y += 26;
  ctx.fillText(`Postcards ${(state.postcardsFound || []).length}/20   Penthouse ${state.economy.penthouse ? 'owned' : 'not owned'}`, px, y);
  y += 34;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = '#b8ab96';
  ctx.fillText('Legend: ★ mission   ● you   ■ postcard   ◆ police', px, y);
  return true;
}

/** Stage one shot by name. Returns the NDC checklist for the caller. */
export function stageShot(name, world) {
  if (name === 'cover') return stageCover(world);
  if (name === 'race') return stageRace(world);
  if (name === 'onfoot') return stageOnFoot(world);
  if (name === 'map') {
    world.loadStaging();
    world.state.hour = 12;
    world.state.weather.hour = 12;
    return { map: true, required: [] };
  }
  throw new Error(`unknown shot: ${name}`);
}

export { ndcCheck, SHOT_STEPS };

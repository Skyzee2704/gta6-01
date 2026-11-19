// SOLMAR 3D — boot and the one loop. Input every frame, the world in
// fixed 1/60 s steps, the renderer paints what is there. Four screens:
// title, play, paused, game over. ?shot=cover|race|onfoot|map stages
// that screenshot instead of running the loop, renders it, measures
// luma and the NDC check, and sets window.__shotReady for the tool.
// ?demo=1 plays the cover escape on autopilot for the preview video.
import { TIME } from './config.js';
import { createState, stepWorld, idleInput } from './world.js';
import {
  ACTION_CONFIRM, ACTION_PAUSE, ACTION_MAP, createInput,
} from './input.js';
import { createRenderer, renderFrame, makeProjector, resizeRenderer, renderStats } from './render.js';
import { drawHUD, drawTitle, drawPause, drawGameOver } from './hud.js';
import { drawMinimap } from './minimap.js';
import { drawRaceHUD } from './races.js';
import { drawArcade } from './minigames.js';
import { stageShot, computeLuma, checkNDC } from './shots.js';
import { loadFromSlot, saveToSlot, autopilotInput } from './save.js';
import { contextPrompt } from './side.js';
import { missionObjectiveText } from './missions.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const demoParam = params.get('demo');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 1;

const gameCanvas = document.getElementById('game');
const hudCanvas = document.getElementById('hud');
const statusEl = document.getElementById('status');

function fitCanvases(W, H) {
  gameCanvas.width = W;
  gameCanvas.height = H;
  hudCanvas.width = W;
  hudCanvas.height = H;
}

function announce(message) {
  if (statusEl) statusEl.textContent = message;
}

// The drawn city map: parchment, the round island, roads, labels, the
// mission list, the legend and the lifetime stats. Used by the map shot
// and by the M key / pause MAP tab.
export function drawMapScreen(ctx, state, W, H) {
  ctx.fillStyle = '#e8e0c8';
  ctx.fillRect(0, 0, W, H);
  const cx = W * 0.32;
  const cy = H * 0.52;
  const radius = Math.min(W, H) * 0.42;
  const scale = radius / 232;
  const toMap = (x, z) => ({ x: cx + x * scale, y: cy + z * scale });
  // Sea, sand, grass.
  ctx.fillStyle = '#7ab8d8';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#d8c48f';
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8aa86a';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  // Roads.
  ctx.strokeStyle = '#3a3a3e';
  ctx.lineWidth = 4;
  for (const road of state.city.roads) {
    ctx.beginPath();
    road.points.forEach(([x, z], i) => {
      const p = toMap(x, z);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  }
  // Landmarks.
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'left';
  for (const lm of state.city.landmarks) {
    const p = toMap(lm.x, lm.z);
    ctx.fillStyle = '#8a2a3a';
    ctx.fillRect(p.x - 4, p.y - 4, 8, 8);
    ctx.fillStyle = '#2a2a30';
    ctx.fillText(lm.name, p.x + 8, p.y + 4);
  }
  // The player.
  const pp = toMap(state.player.x, state.player.z);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(pp.x, pp.y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#16121a';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Mission marker.
  if (state.missions.marker) {
    const mp = toMap(state.missions.marker.x, state.missions.marker.z);
    ctx.fillStyle = '#ffd34a';
    ctx.save();
    ctx.translate(mp.x, mp.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-7, -7, 14, 14);
    ctx.restore();
  }
  // Right column: title, mission list, legend, stats.
  const rx = W * 0.68;
  ctx.fillStyle = '#2a2a30';
  ctx.font = 'bold 30px Arial';
  ctx.fillText('SOLMAR CITY', rx, 90);
  ctx.font = '15px Arial';
  ctx.fillStyle = '#5a5a60';
  ctx.fillText('The island is round. The law is not.', rx, 116);
  const mission = missionObjectiveText(state);
  ctx.fillStyle = '#2a2a30';
  ctx.font = 'bold 18px Arial';
  ctx.fillText('MISSIONS', rx, 160);
  ctx.font = '15px Arial';
  for (let i = 1; i <= 6; i++) {
    const done = state.missions.completed.includes(i);
    ctx.fillStyle = done ? '#2a7a3a' : '#2a2a30';
    ctx.fillText(`${done ? '✓' : '○'}  Mission ${i}${state.missions.active === i ? '  — ACTIVE' : ''}`, rx, 160 + i * 26);
  }
  if (mission) {
    ctx.fillStyle = '#8a2a3a';
    ctx.fillText(mission.objective, rx, 160 + 7 * 26);
  }
  ctx.fillStyle = '#2a2a30';
  ctx.font = 'bold 18px Arial';
  ctx.fillText('LEGEND', rx, 400);
  ctx.font = '15px Arial';
  ctx.fillText('■  Landmark      ◆  Objective      ○  You', rx, 428);
  ctx.fillText(`Postcards ${state.postcardsFound.size}/20   •   Races won ${state.racesWon}/3`, rx, 456);
  ctx.fillText(`Cash $${state.player.cash.toLocaleString('en-US')}   •   ${state.player.respectTitle}`, rx, 484);
  // Clock in real HH:MM (hour is a float: 18.6 = 18:36, not "18.6:00").
  const totalMin = Math.round(state.time.hour * 60);
  const hh = String(Math.floor(totalMin / 60) % 24).padStart(2, '0');
  const mm = String(totalMin % 60).padStart(2, '0');
  ctx.fillText(`Day ${state.time.day}   •   ${hh}:${mm}`, rx, 512);
}

async function runShot(name) {
  fitCanvases(1280, 720);
  const state = createState(seed);
  let stagingSave = null;
  if (name === 'cover') {
    try {
      const res = await fetch('./staging-save.json');
      if (res.ok) stagingSave = await res.json();
    } catch {
      stagingSave = null;
    }
  }
  const meta = stageShot(name, state, stagingSave);
  const r = createRenderer(gameCanvas);
  const hudCtx = hudCanvas.getContext('2d');
  resizeRenderer(r, 1280, 720);
  if (name === 'map') {
    drawMapScreen(hudCtx, state, 1280, 720);
    const luma = computeLuma(hudCanvas);
    window.__shotResult = { name, luma, ndcOk: true, missing: [], hour: meta.hour };
    window.__shotReady = true;
    return;
  }
  renderFrame(r, state, 0);
  // Settle one idle step so instanced matrices are all fresh, without
  // moving the staged scene.
  const project = makeProjector(r, 1280, 720);
  drawHUD(hudCtx, state, 1280, 720, project);
  drawRaceHUD(hudCtx, state, 1280, 720);
  drawArcade(hudCtx, state, 1280, 720);
  drawMinimap(hudCtx, state, 1280 - 110, 720 - 210, 90);
  const ndc = checkNDC(project, meta.subjects);
  // Composite luma: game canvas + HUD overlay, as the screenshot sees it.
  const comp = document.createElement('canvas');
  comp.width = 1280;
  comp.height = 720;
  const cctx = comp.getContext('2d');
  cctx.drawImage(gameCanvas, 0, 0);
  cctx.drawImage(hudCanvas, 0, 0);
  const luma = computeLuma(comp);
  if (!ndc.ok) {
    // Fail-loud: a red screen so a bad frame can never pass silently.
    cctx.fillStyle = 'rgba(200,20,20,0.85)';
    cctx.fillRect(0, 0, 1280, 720);
    cctx.fillStyle = '#ffffff';
    cctx.font = 'bold 40px Arial';
    cctx.fillText(`NDC FAIL: ${ndc.missing.join(', ')} out of frame`, 60, 360);
    hudCtx.fillStyle = 'rgba(200,20,20,0.85)';
    hudCtx.fillRect(0, 0, 1280, 720);
  }
  const stats = renderStats(r);
  window.__shotResult = {
    name, luma, ndcOk: ndc.ok, missing: ndc.missing,
    hour: meta.hour, drawCalls: stats.drawCalls, triangles: stats.triangles,
  };
  window.__shotReady = true;
}

// ?demo=1 — the gameplay preview: the cover staging (mission 6 escape,
// Vortex down Marina Boulevard, cruiser alongside, heli overhead)
// driven live by the same autopilot that plays missions 1–5 for the
// staging save. Real engine, real renderer, no player input — this is
// what record-video.mjs records for Sky's preview.
//
// Two modes: live (?demo=1) runs on requestAnimationFrame; offline
// (?demo=1&step=1) exposes window.__stepDemo(dt) instead, so the
// recorder can render the video frame by frame at full 1280x720
// quality. SwiftShader (software GL, no GPU on this VM) renders the
// live scene at ~2–5 fps, which records as a slideshow; the offline
// stepper renders each frame as slowly as it needs and the video is
// still a smooth 30 fps.
async function runDemo() {
  fitCanvases(1280, 720);
  const state = createState(seed);
  let stagingSave = null;
  try {
    const res = await fetch('./staging-save.json');
    if (res.ok) stagingSave = await res.json();
  } catch {
    stagingSave = null;
  }
  stageShot('cover', state, stagingSave);
  // Demo start: SOUTHBOUND, not the cover's northbound still. The
  // cover shot is a still of the car flat out north at 98 km/h; driven
  // live, the autopilot must U-turn at that speed to reach the far
  // pier (205,110 — south) and it beaches the car in the north-east
  // corner within ~8 s. Southbound at 54 km/h the same escape drives
  // cleanly down the boulevard to the pier, police in pursuit, heli
  // ahead, boat on the sea to the left. Same mission, same police,
  // same dialog and timer — only the driving line is one the
  // autopilot can actually follow.
  const demoCar = state.vehicles.find((x) => x.type === 'vortex');
  demoCar.heading = 0; // south, down the boulevard toward the pier
  demoCar.speed = 15; // 54 km/h — fast, but the autopilot can turn it
  state.player.heading = 0;
  state.camera.yaw = Math.PI - 0.32; // behind the car, angled to the sea
  state.police.heli = { x: 196, z: 90, y: 14, angle: 0.6, beam: true };
  state.boats[0].x = 212;
  state.boats[0].z = 80;
  const demoCruiser = state.police.units[0];
  if (demoCruiser) {
    demoCruiser.heading = 0;
    demoCruiser.x = 177;
    demoCruiser.z = 20; // behind the car, chasing south
  }
  const r = createRenderer(gameCanvas);
  const hudCtx = hudCanvas.getContext('2d');
  resizeRenderer(r, 1280, 720);
  let last = performance.now();
  let accumulator = 0;
  let frames = 0;
  // One composite canvas, reused: game + HUD in a single JPEG.
  const comp = document.createElement('canvas');
  comp.width = 1280;
  comp.height = 720;
  const cctx = comp.getContext('2d');
  function demoStep(dt) {
    // Advance the sim by dt in 1/60 s substeps. Shared by the live
    // loop and the offline stepper, so both show exactly the same game.
    let remaining = dt;
    while (remaining > 0) {
      const s = Math.min(STEP, remaining);
      stepWorld(state, s, autopilotInput(state));
      remaining -= s;
    }
  }
  function demoRender() {
    renderFrame(r, state, 0);
    const project = makeProjector(r, 1280, 720);
    drawHUD(hudCtx, state, 1280, 720, project);
    drawRaceHUD(hudCtx, state, 1280, 720);
    drawArcade(hudCtx, state, 1280, 720);
    drawMinimap(hudCtx, state, 1280 - 110, 720 - 210, 90);
    frames += 1;
    window.__demoFrames = frames;
  }
  window.__demoReady = true;
  // Debug hook for QA: the demo's exact state (player, car, camera,
  // mission) so a bad frame can be diagnosed by numbers, not guesses.
  window.__demoState = () => {
    const v = state.vehicles.find((x) => x.id === state.player.vehicleId);
    const project = makeProjector(r, 1280, 720);
    const s2 = v ? project(v.x, 1, v.z) : null;
    return {
      px: +state.player.x.toFixed(1), pz: +state.player.z.toFixed(1),
      onFoot: state.player.onFoot, heading: +state.player.heading.toFixed(2),
      car: v ? { x: +v.x.toFixed(1), z: +v.z.toFixed(1), speed: +v.speed.toFixed(1), damage: Math.round(v.damage) } : null,
      camYaw: +state.camera.yaw.toFixed(2),
      camPos: [+r.camera.position.x.toFixed(1), +r.camera.position.y.toFixed(1), +r.camera.position.z.toFixed(1)],
      carScreen: s2 ? { x: Math.round(s2.x), y: Math.round(s2.y), visible: s2.visible } : null,
      vehicles: {
        count: r.vehicleBody.count,
        culled: r.vehicleBody.frustumCulled,
        sphere: r.vehicleBody.boundingSphere
          ? { c: r.vehicleBody.boundingSphere.center.toArray().map((n) => +n.toFixed(1)), r: +r.vehicleBody.boundingSphere.radius.toFixed(1) }
          : null,
      },
      mission: state.missions.active, stage: state.missions.stage,
      marker: state.missions.marker,
    };
  };
  const offline = new URLSearchParams(location.search).get('step') === '1';
  if (offline) {
    // Offline: the recorder drives every frame. Returns the frame as
    // a JPEG data URL so the recorder never needs a page screenshot.
    window.__stepDemo = (dt) => {
      demoStep(dt);
      demoRender();
      cctx.drawImage(gameCanvas, 0, 0);
      cctx.drawImage(hudCanvas, 0, 0);
      return comp.toDataURL('image/jpeg', 0.85);
    };
    return;
  }
  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    while (accumulator >= STEP) {
      demoStep(STEP);
      accumulator -= STEP;
    }
    demoRender();
  }
  requestAnimationFrame(frame);
}

function runGame() {
  fitCanvases(window.innerWidth, window.innerHeight);
  const state = createState(seed);
  const r = createRenderer(gameCanvas);
  const hudCtx = hudCanvas.getContext('2d');
  const input = createInput(gameCanvas);
  resizeRenderer(r, window.innerWidth, window.innerHeight);
  window.addEventListener('resize', () => {
    fitCanvases(window.innerWidth, window.innerHeight);
    resizeRenderer(r, window.innerWidth, window.innerHeight);
  });
  let screen = 'title';
  let pauseTab = 0;
  let mapOpen = false;
  let missionsDone = 0;
  let titleSave = null;
  try {
    const raw = window.localStorage.getItem('solmar.save.main');
    if (raw) titleSave = JSON.parse(raw);
  } catch { titleSave = null; }
  let accumulator = 0;
  let last = performance.now();

  function startGame(fromSave) {
    if (fromSave && loadFromSlot(state, 'main')) {
      announce('Continuing your save.');
    } else {
      state.time.hour = TIME.startHour;
      announce('New game. Milo Vane, Solmar City.');
    }
    screen = 'play';
  }

  function handleActions() {
    const actions = input.takeActions();
    if (screen === 'title') {
      if (actions & ACTION_CONFIRM) startGame(!!titleSave);
      return;
    }
    if (screen === 'over') {
      if (actions & ACTION_CONFIRM) {
        state.respawn();
        screen = 'play';
      }
      return;
    }
    if (actions & ACTION_PAUSE) {
      if (screen === 'play') {
        screen = 'paused';
        announce('Paused.');
      } else if (screen === 'paused') {
        screen = 'play';
        announce('Playing.');
      }
      return;
    }
    if (screen === 'paused') return;
    if (actions & ACTION_MAP) {
      mapOpen = !mapOpen;
    }
  }

  // Clicks: title buttons, pause tabs, story rows (start a mission).
  hudCanvas.addEventListener('click', (event) => {
    const rect = hudCanvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (hudCanvas.width / rect.width);
    const y = (event.clientY - rect.top) * (hudCanvas.height / rect.height);
    // The HUD canvas sits over the game canvas: a click in play still
    // has to lock the pointer for mouse look.
    if (screen === 'play' && gameCanvas.requestPointerLock) gameCanvas.requestPointerLock();
    if (screen === 'title') {
      if (y > 280 && y < 390 && x > hudCanvas.width / 2 - 260 && x < hudCanvas.width / 2 + 260) startGame(true);
      else if (y > 400 && y < 450) startGame(false);
      return;
    }
    if (screen !== 'paused') return;
    const tabs = ['MAP', 'STATS', 'STORY', 'SETTINGS'];
    tabs.forEach((t, i) => {
      const tx = hudCanvas.width / 2 - 180 + i * 120;
      if (Math.abs(x - tx) < 55 && y > 70 && y < 100) pauseTab = i;
    });
    if (pauseTab === 2) {
      for (let i = 1; i <= 6; i++) {
        const ry = 190 + i * 28;
        if (y > ry - 14 && y < ry + 10 && x > hudCanvas.width / 2 - 300 && x < hudCanvas.width / 2 + 100) {
          if (!state.missions.completed.includes(i) && state.missions.active === null) {
            state.startMission(i);
            screen = 'play';
          }
        }
      }
    }
  });

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    const W = hudCanvas.width;
    const H = hudCanvas.height;
    if (screen === 'title') {
      // Attract mode: the city turns slowly behind the logo.
      state.camera.yaw += 0.0004;
      state.camera.pitch = 0.25;
      state.player.x = 0;
      state.player.z = 0;
      while (accumulator >= STEP) {
        stepWorld(state, STEP, idleInput());
        accumulator -= STEP;
      }
      renderFrame(r, state, 0);
      drawTitle(hudCtx, state, W, H, titleSave);
      return;
    }
    if (screen === 'play') {
      while (accumulator >= STEP) {
        stepWorld(state, STEP, input);
        accumulator -= STEP;
        if (state.player.dead) {
          screen = 'over';
          break;
        }
      }
      if (state.missions.completed.length > missionsDone) {
        missionsDone = state.missions.completed.length;
        saveToSlot(state, 'main');
      }
    } else {
      accumulator = 0;
    }
    if (screen === 'over') {
      renderFrame(r, state, 0);
      drawGameOver(hudCtx, state, W, H);
      return;
    }
    renderFrame(r, state, 0);
    const project = makeProjector(r, W, H);
    if (screen === 'paused') {
      if (pauseTab === 0) {
        drawMapScreen(hudCtx, state, W, H);
        // Tab bar stays on top of the map so the player can leave it.
        hudCtx.textAlign = 'center';
        ['MAP', 'STATS', 'STORY', 'SETTINGS'].forEach((t, i) => {
          hudCtx.fillStyle = i === 0 ? '#ffd34a' : '#2a2a30';
          hudCtx.font = 'bold 18px Arial';
          hudCtx.fillText(t, W / 2 - 180 + i * 120, 40);
        });
        hudCtx.textAlign = 'left';
      } else {
        drawPause(hudCtx, state, W, H, pauseTab);
      }
      return;
    }
    if (mapOpen) {
      drawMapScreen(hudCtx, state, W, H);
      return;
    }
    drawHUD(hudCtx, state, W, H, project);
    drawRaceHUD(hudCtx, state, W, H);
    drawArcade(hudCtx, state, W, H);
    drawMinimap(hudCtx, state, W - 110, H - 210, 90);
    const prompt = contextPrompt(state);
    if (prompt) {
      hudCtx.fillStyle = 'rgba(16,14,24,0.82)';
      hudCtx.font = '13px Arial';
      const pw = hudCtx.measureText(prompt).width + 24;
      hudCtx.fillRect(W / 2 - pw / 2, H - 70, pw, 24);
      hudCtx.fillStyle = '#f2ead8';
      hudCtx.fillText(prompt, W / 2 - pw / 2 + 12, H - 53);
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === 'play') {
      screen = 'paused';
      announce('Paused.');
    }
  });

  announce('SOLMAR 3D. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shotName) {
  runShot(shotName).catch((err) => {
    window.__shotResult = { name: shotName, error: String(err) };
    window.__shotReady = true;
  });
} else if (demoParam) {
  runDemo().catch((err) => {
    window.__demoError = String(err);
    window.__demoReady = true;
  });
} else {
  runGame();
}

// record-video: 12 s / 360 frames of real gameplay at 1280x720, for the
// preview video Sky watches before approving the submit.
//
// The headless rAF loop is throttled (100-2800 ms gaps on an occluded page),
// so a real-time capture would be mostly identical frames. Instead the
// video is driven frame-by-frame in-page: start the game, pause it (the
// rAF loop then stops stepping the world), and for each of 360 frames step
// the world twice with the autopilot, draw, update the HUD and the minimap,
// and screenshot. ffmpeg assembles the frames at 30 fps.
//
// The mp4 lives OUTSIDE the repo (video/ is gitignored): the dossier
// carries screenshots, not video. 360 frames, ~12 s, mission 6 escape:
// the coupe flees east along Marina Boulevard with a 4-star pursuit.
import { freePort, startServer, launchBrowser, openGame, stop } from './browser.mjs';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';

const exec = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.resolve(repoRoot, '..');
const outPath = path.join(outDir, 'gta6-01-preview.mp4');
const framesDir = path.join(outDir, '.preview-frames');
fs.mkdirSync(framesDir, { recursive: true });

const FRAMES = 360;
const FPS = 30;
// East along Marina Boulevard, then north up the east ring road.
const WAYPOINTS = [[470, 396], [520, 360], [520, 300], [470, 260], [420, 240]];

let server = null;
let browser = null;
try {
  const gamePort = await freePort();
  const cdpPort = await freePort();
  server = await startServer(repoRoot, gamePort);
  browser = await launchBrowser(cdpPort);
  const page = await openGame(cdpPort, gamePort, 'index.html');
  await page.waitFor(`window.__solmar && window.__frameInfo`, 90000);

  // Start the game, then load the staging save (mission 6, $12,950,
  // rifle 30/90) so the video is the escape, not a fresh $250 start.
  await page.evaluate(`document.getElementById('title-start').click()`);
  await page.evaluate(`(() => {
    const w = window.__solmar.world;
    w.loadStaging();
    // Four stars: the pursuit is the video.
    w.state.player.wanted = 4;
    return true;
  })()`);

  // Pause: the rAF loop stops stepping the world, and the video driver
  // below owns every step. Hide the pause overlay — the screen state
  // stays PAUSED, the frame stays clean.
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'p', code: 'KeyP', windowsVirtualKeyCode: 80 });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'p', code: 'KeyP', windowsVirtualKeyCode: 80 });
  await new Promise((r) => setTimeout(r, 500));
  await page.evaluate(`document.getElementById('pause').style.display = 'none'`);

  // In-page driver: two 1/60 s steps per 30 fps frame, autopilot toward
  // the next waypoint, then draw + HUD + minimap. Returns live telemetry
  // so the log shows the escape actually happening.
  await page.evaluate(`(async () => {
    const shots = await import('./src/shots.js');
    const hudMod = await import('./src/hud.js');
    const mapMod = await import('./src/minimap.js');
    const { STEP } = await import('./src/config.js');
    const byId = (id) => document.getElementById(id);
    const hud = hudMod.createHud({
      cash: byId('hud-cash'), clock: byId('hud-clock'), respect: byId('hud-respect'),
      wanted: byId('hud-wanted'), response: byId('hud-response'),
      weapons: byId('hud-weapons'), ammo: byId('hud-ammo'), weaponPic: byId('hud-weapon-pic'),
      mission: byId('hud-mission'), missionTimer: byId('hud-mission-timer'),
      vehicle: byId('hud-vehicle'), radio: byId('hud-radio'),
      dialogue: byId('hud-dialogue'), dialogueText: byId('hud-dialogue-text'), portrait: byId('hud-portrait'),
      notice: byId('hud-notice'),
    });
    const minimap = mapMod.createMinimap(byId('minimap'));
    const w = window.__solmar.world;
    const renderer = window.__solmar.renderer;
    const state = w.state;
    const waypoints = ${JSON.stringify(WAYPOINTS)};
    let wp = 0;
    window.__videoStep = () => {
      const p = state.player;
      const [tx, tz] = waypoints[wp];
      const d = Math.hypot(p.x - tx, p.z - tz);
      if (d < 15 && wp < waypoints.length - 1) wp += 1;
      const [nx, nz] = waypoints[wp];
      for (let i = 0; i < 2; i += 1) {
        const input = shots.autopilotInput(state, nx, nz);
        w.step(STEP, input);
      }
      renderer.draw(state, 'play');
      hudMod.updateHud(hud, state, STEP);
      mapMod.drawMinimap(minimap, state, mapMod.minimapBlips(state));
      return {
        x: +p.x.toFixed(1), z: +p.z.toFixed(1),
        speed: p.vehicle ? +p.vehicle.speed.toFixed(1) : 0,
        wanted: p.wanted, health: Math.round(p.health),
        police: state.police.length, onFoot: state.police.filter((u) => u.onFoot).length,
        cash: state.economy.cash, wp,
      };
    };
    return true;
  })()`);

  let last = null;
  for (let i = 0; i < FRAMES; i += 1) {
    // One evaluate returns the telemetry AND the frame: the WebGL canvas
    // is read with toDataURL in the same task as the draw, while the
    // drawing buffer is still valid. CDP screenshots were 12 s/frame —
    // the headless compositor throttles BeginFrame on an occluded page,
    // and a 360-frame video would take over an hour.
    const shot = await page.evaluate(`(() => {
      const telemetry = window.__videoStep();
      const url = document.getElementById('game').toDataURL('image/jpeg', 0.85);
      return { telemetry, url };
    })()`);
    last = shot.telemetry;
    const b64 = shot.url.split(',')[1];
    fs.writeFileSync(path.join(framesDir, `frame${String(i + 1).padStart(4, '0')}.jpg`), Buffer.from(b64, 'base64'));
    if (i % 60 === 0) console.log(`frame ${i + 1}/${FRAMES}`, JSON.stringify(last));
  }
  console.log(`frame ${FRAMES}/${FRAMES}`, JSON.stringify(last));

  // ffmpeg: 16 MB maxBuffer — the default 1 MB dies on a 360-frame encode.
  await exec('ffmpeg', [
    '-y', '-loglevel', 'error', '-framerate', String(FPS),
    '-i', path.join(framesDir, 'frame%04d.jpg'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outPath,
  ], { maxBuffer: 16 * 1024 * 1024 });
  const probe = await exec('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration,size',
    '-show_entries', 'stream=width,height,r_frame_rate',
    '-of', 'default=noprint_wrappers=1', outPath,
  ]);
  console.log(`video: ${outPath}\n${probe.stdout}`);
} finally {
  if (server) stop(server);
  if (browser) stop(browser);
  fs.rmSync(framesDir, { recursive: true, force: true });
}

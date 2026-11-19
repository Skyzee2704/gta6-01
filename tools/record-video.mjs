// SOLMAR 3D — record-video: captures REAL gameplay (not AI, not a shot) for
// the Sky preview (Aturan 30 gate 2). Loads the staging save, clicks
// CONTINUE, drives with real keyboard input for ~20 s at 8 fps, and encodes
// the frames to an mp4 with ffmpeg. Fails loud on any page error.
import { launchBrowser, openGame, startServer, stopServer } from './browser.mjs';
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const PORT = 8905;
const DURATION_S = 12;
const FPS = 5;
const WIDTH = 960;
const HEIGHT = 540;
const FRAMES_DIR = join(homedir(), '.cache', 'tmp', 'gta6-01-preview-frames');
const OUT = join(homedir(), 'workspace', 'makefun', 'gta6-01', 'gta6-01-preview.mp4');

const failures = [];
function check(name, ok, detail) {
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail != null ? ' — ' + detail : ''));
  if (!ok) failures.push(name);
}

rmSync(FRAMES_DIR, { recursive: true, force: true });
mkdirSync(FRAMES_DIR, { recursive: true });

let server = null;
let browser = null;
try {
  server = await startServer(PORT);
  browser = await launchBrowser();
  const { page, errors, consoleErrors } = await openGame(browser, PORT, 'staging=1&seed=1', WIDTH, HEIGHT);
  await page.waitForSelector('#btn-continue', { timeout: 30000 });
  await page.waitForTimeout(800);
  await page.click('#btn-continue');
  await page.waitForTimeout(1000);
  const screen = await page.evaluate(() => window.__solmar.screen);
  check('game in play', screen === 'play', 'screen=' + screen);
  check('page loaded without page errors', errors.length === 0, errors.join(' | ').slice(0, 300));
  check('no console errors', consoleErrors.length === 0, consoleErrors.join(' | ').slice(0, 300));

  // Drive: hold W, steer gently left/right in a slow weave so the city,
  // traffic and police chase all pass through the frame.
  await page.keyboard.down('KeyW');
  const totalFrames = DURATION_S * FPS;
  for (let i = 0; i < totalFrames; i++) {
    const t = i / FPS;
    if (t > 4 && t < 8) await page.keyboard.down('KeyA');
    else await page.keyboard.up('KeyA');
    if (t > 12 && t < 16) await page.keyboard.down('KeyD');
    else await page.keyboard.up('KeyD');
    await page.screenshot({ path: join(FRAMES_DIR, `frame_${String(i).padStart(3, '0')}.jpg`), type: 'jpeg', quality: 70 });
    await page.waitForTimeout(1000 / FPS);
  }
  await page.keyboard.up('KeyW');
  await page.keyboard.up('KeyA');
  await page.keyboard.up('KeyD');
  console.log(`captured ${totalFrames} frames`);
} finally {
  if (browser) await browser.close().catch(() => {});
  stopServer(server);
}

if (failures.length > 0) {
  console.log('RECORD-VIDEO FAIL — ' + failures.join(', '));
  process.exit(1);
}

const ff = spawnSync('ffmpeg', ['-y', '-framerate', String(FPS), '-i', join(FRAMES_DIR, 'frame_%03d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], { encoding: 'utf8' });
if (ff.status !== 0) {
  console.log('ffmpeg failed: ' + (ff.stderr || '').slice(-500));
  process.exit(1);
}
console.log('VIDEO OK — ' + OUT);
console.log('RECORD-VIDEO PASS');

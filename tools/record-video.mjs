// record-video — the gameplay preview video, rendered OFFLINE frame
// by frame. SwiftShader (software GL, no GPU on this VM) renders the
// live demo at ~2–5 fps, which records as a slideshow, so the
// recorder drives the demo one fixed step at a time (?demo=1&step=1):
// each call advances the sim 1/30 s and returns the frame as a JPEG.
// ffmpeg assembles the frames into a smooth 30 fps mp4. The video is
// the real game (full 1280x720, shadows on) — only the wall-clock
// time is fake. Exits 1 if the demo never starts or a frame fails.
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { startServer, launchBrowser, GAME_WIDTH, GAME_HEIGHT } from './browser.mjs';

const FRAMES_DIR = new URL('../video/.frames/', import.meta.url);
const FPS = 30;
const SECONDS = 12;
const TOTAL = FPS * SECONDS;
const STEP_DT = 1 / FPS;

const server = await startServer(8901);
const browser = await launchBrowser();
try {
  mkdirSync(FRAMES_DIR, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: GAME_WIDTH, height: GAME_HEIGHT },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on('pageerror', (err) => console.log(`PAGEERROR demo: ${err.message}`));
  await page.goto(`${server.base}/index.html?demo=1&step=1&seed=1`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__demoReady === true, null, { timeout: 90000 });
  console.log(`INFO  demo ready, rendering ${TOTAL} frames (${SECONDS} s at ${FPS} fps)...`);
  for (let i = 0; i < TOTAL; i++) {
    const dataUrl = await page.evaluate((dt) => window.__stepDemo(dt), STEP_DT);
    const base64 = dataUrl.split(',', 2)[1];
    writeFileSync(new URL(`../video/.frames/frame-${String(i + 1).padStart(4, '0')}.jpg`, import.meta.url), Buffer.from(base64, 'base64'));
    if ((i + 1) % 60 === 0) console.log(`INFO  frame ${i + 1}/${TOTAL}`);
  }
  await context.close();
} finally {
  await browser.close();
  server.close();
}

// Assemble the frames and drop the intermediates.
// NOTE: the ffmpeg input pattern MUST NOT go through `new URL` —
// `%04` in a URL is percent-decoded to the 0x04 control byte, so
// ffmpeg got `frame-<0x04>d.jpg` and failed with "No such file".
// Build the pattern from the plain directory path instead.
const framesDir = fileURLToPath(new URL('../video/.frames/', import.meta.url));
const mp4 = new URL('../video/gameplay.mp4', import.meta.url);
execFileSync('ffmpeg', ['-y', '-framerate', String(FPS), '-i', `${framesDir}frame-%04d.jpg`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', fileURLToPath(mp4)], { stdio: 'pipe', maxBuffer: 16 * 1024 * 1024 }); // maxBuffer: ffmpeg's progress log exceeds the 1 MiB default and throws ERR_CHILD_PROCESS_STDIO_MAXBUFFER even on success
rmSync(FRAMES_DIR, { recursive: true, force: true });
const size = statSync(mp4).size;
const probe = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', fileURLToPath(mp4)], { encoding: 'utf8' }).trim();
console.log(`INFO  video/gameplay.mp4: ${(size / 1024).toFixed(0)} KiB, ${Number(probe).toFixed(1)} s, ${TOTAL} frames at ${FPS} fps`);
console.log('\nrecord-video: PASS');

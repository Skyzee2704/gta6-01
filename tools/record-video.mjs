// record-video.mjs — record a short gameplay video (driving at golden
// hour) with Playwright + SwiftShader, then assemble it with ffmpeg.
// Reports page errors; the gate is 0 page errors.
// Usage: node tools/record-video.mjs [--seconds 8] [--out video/solmar.mp4]
// The video is written to <repo>/video/solmar-gameplay.mp4 by default.

import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..');
const args = process.argv.slice(2);
const secondsIdx = args.indexOf('--seconds');
const seconds = secondsIdx === -1 ? 8 : Number(args[secondsIdx + 1]) || 8;
const outIdx = args.indexOf('--out');
const outPath = outIdx === -1 ? join(repo, 'video', 'solmar-gameplay.mp4') : args[outIdx + 1];
const port = 8125;
const tmpDir = process.env.TMPDIR || join(process.env.HOME, '.cache', 'tmp');
const framesDir = join(tmpDir, 'solmar-video-frames');
const fps = 10;

mkdirSync(framesDir, { recursive: true });
mkdirSync(dirname(outPath), { recursive: true });
// Clear old frames.
for (const f of readdirSync(framesDir)) rmSync(join(framesDir, f), { force: true });

// Serve game/.
const serve = spawn('node', ['serve.ts', '--port', String(port)], { cwd: repo, stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((r) => setTimeout(r, 2000));

const pageErrors = [];
let browser = null;
try {
  browser = await chromium.launch({
    executablePath:
      process.env.CHROME ||
      join(process.env.HOME, '.cache', 'ms-playwright', 'chromium-1255', 'chrome-linux64', 'chrome'),
    args: [
      '--no-sandbox',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--window-size=1280,720',
    ],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') pageErrors.push(msg.text());
  });
  // Load the cover shot (the player in a sports car at golden hour).
  await page.goto(`http://127.0.0.1:${port}/?shot=cover&seed=1`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1500);
  // Drive forward for the duration, capturing frames.
  await page.keyboard.down('KeyW');
  const totalFrames = Math.round(seconds * fps);
  for (let i = 0; i < totalFrames; i++) {
    await page.screenshot({ path: join(framesDir, `frame-${String(i).padStart(4, '0')}.png`) });
    await page.waitForTimeout(1000 / fps);
  }
  await page.keyboard.up('KeyW');
  // A frame count sanity check.
  const frames = readdirSync(framesDir).filter((f) => f.endsWith('.png'));
  console.log(`record-video: captured ${frames.length} frames (${seconds}s @ ${fps}fps)`);
  console.log(`record-video: page errors: ${pageErrors.length}`);
  for (const e of pageErrors.slice(0, 5)) console.log('  page error:', e);
} finally {
  if (browser) await browser.close();
  serve.kill();
}

// Assemble with ffmpeg.
await new Promise((resolve, reject) => {
  const ff = spawn('ffmpeg', [
    '-y', '-v', 'error',
    '-framerate', String(fps),
    '-i', join(framesDir, 'frame-%04d.png'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    outPath,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  let err = '';
  ff.stderr.on('data', (d) => { err += d; });
  ff.on('close', (code) => {
    if (code === 0) resolve();
    else reject(new Error(`ffmpeg exit ${code}: ${err}`));
  });
});

const { statSync } = await import('node:fs');
const size = statSync(outPath).size;
console.log(`record-video: wrote ${outPath} (${size} bytes, 1280x720, ${seconds}s)`);
if (pageErrors.length > 0) {
  console.log('record-video: FAIL — page errors present');
  process.exit(1);
}
console.log('record-video: PASS (0 page errors)');

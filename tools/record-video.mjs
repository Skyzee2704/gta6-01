// record-video: record a gameplay video of SOLMAR 3D with Playwright
// (Chromium + SwiftShader, no GPU needed) and report page errors.
// The game is played with scripted keys: Space starts, then the player
// walks to a parked car, presses E to get in, and drives around the city.
// OUT env var = mp4 path (default /tmp/solmar-video.mp4).
// DUR env var = recording seconds (default 60).
// Exit 0 iff the video was written and there were 0 page errors.
import { chromium } from '/home/hatch/workspace/makefun/node_modules/playwright-core/index.mjs';
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, renameSync, readdirSync, rmSync } from 'node:fs';

const OUT = process.env.OUT || '/tmp/solmar-video.mp4';
const DUR = Number(process.env.DUR || 60);
const PORT = 8132;
const VID_DIR = '/tmp/solmar-video-frames';
mkdirSync(VID_DIR, { recursive: true });
for (const f of readdirSync(VID_DIR)) rmSync(`${VID_DIR}/${f}`);

const serve = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: '/home/hatch/workspace/makefun/gta6-01/repo', stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2000));
const errors = [];
const browser = await chromium.launch({
  executablePath: '/home/hatch/.cache/ms-playwright/chromium-1187/chrome-linux/chrome',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: VID_DIR, size: { width: 1280, height: 720 } },
});
const page = await ctx.newPage();
page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message.slice(0, 300)));
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(3000);
// Start the game from the title screen.
await page.keyboard.press('Space');
await page.waitForTimeout(1000);
// Walk forward to the road, then try to get in a parked car.
await page.keyboard.down('KeyW');
await page.waitForTimeout(4000);
await page.keyboard.press('KeyE');
await page.waitForTimeout(500);
// Drive: hold W, steer gently, brake once in a while.
const t0 = Date.now();
let steer = 'KeyA';
while (Date.now() - t0 < (DUR - 6) * 1000) {
  await page.keyboard.down(steer);
  await page.waitForTimeout(2500);
  await page.keyboard.up(steer);
  steer = steer === 'KeyA' ? 'KeyD' : 'KeyA';
}
await page.keyboard.up('KeyW');
await page.waitForTimeout(1000);
await ctx.close();
await browser.close();
serve.kill();
const webm = readdirSync(VID_DIR).find(f => f.endsWith('.webm'));
if (!webm) { console.error('record-video: FAIL no video file'); process.exit(1); }
execSync(`ffmpeg -y -v error -i "${VID_DIR}/${webm}" -c:v libx264 -pix_fmt yuv420p -crf 23 "${OUT}"`);
const size = (await import('node:fs')).statSync(OUT).size;
console.log(`record-video: ${OUT} ${size} bytes, ${errors.length} page errors`);
if (errors.length) { for (const e of errors.slice(0, 8)) console.log('  ERR:', e); }
process.exit(errors.length ? 1 : 0);

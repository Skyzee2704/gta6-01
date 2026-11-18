// raceRenderCheck: verify the P0-7 race visuals in a real browser.
// Starts a race, puts the player's car on the start line facing the
// first gate, waits past the countdown, and screenshots the scene.
// The screenshot must show lit checkpoint gates, rival cars, and
// floating name tags. Reports page errors; the gate is 0 page errors.
// Usage: TMPDIR=~/.cache/tmp node tools/raceRenderCheck.mjs
// Output: <TMPDIR>/race-render-check.png
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..');
const tmpDir = process.env.TMPDIR || join(process.env.HOME, '.cache', 'tmp');
const outPath = join(tmpDir, 'race-render-check.png');
const port = 8126;

const serve = spawn('node', ['serve.ts', '--port', String(port)], { cwd: repo, stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((r) => setTimeout(r, 2000));

const pageErrors = [];
let browser = null;
try {
  browser = await chromium.launch({
    executablePath:
      process.env.CHROME
      || join(process.env.HOME, '.cache', 'ms-playwright', 'chromium-1255', 'chrome-linux64', 'chrome'),
    args: [
      '--no-sandbox',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--window-size=800,450',
    ],
  });
  const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') pageErrors.push(msg.text());
  });
  await page.goto(`http://127.0.0.1:${port}/?shot=cover&seed=1`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1500);
  // Start the marina race, then put the player's car on the start line
  // facing back toward the first gate (heading -PI/2 faces -x).
  await page.evaluate(() => {
    window.__solmar.startRace('marina');
    const s = window.__solmar.getState();
    // Shorten the countdown: SwiftShader runs the sim slower than wall
    // time, and the countdown itself is verified at sim level by
    // raceFixCheck. This just gets the rivals driving sooner.
    s.race.countdown = 0.2;
    const v = s.vehicles.find((q) => q.id === s.player.vehicleId);
    if (v) {
      v.x = -200;
      v.z = 200;
      v.heading = -Math.PI / 2;
      v.speed = 0;
    }
    s.player.x = -200;
    s.player.z = 200;
    s.player.heading = -Math.PI / 2;
  });
  // Countdown (3s) + racing: SwiftShader runs the sim slower than wall
  // time, so wait generously to be past GO with the rivals spread out.
  await page.waitForTimeout(9000);
  const race = await page.evaluate(() => {
    const s = window.__solmar.getState();
    return {
      active: s.race.active,
      started: s.race.started,
      cp: s.race.cp,
      checkpoints: s.race.checkpoints.length,
      rivals: s.race.rivals.map((r) => ({ name: r.name, x: Math.round(r.x), z: Math.round(r.z), cp: r.cp })),
    };
  });
  console.log(`race state: ${JSON.stringify(race)}`);
  await page.screenshot({ path: outPath });
  console.log(`screenshot: ${outPath}`);
} finally {
  if (browser) await browser.close();
  serve.kill();
}
if (pageErrors.length) {
  console.error(`raceRenderCheck: FAIL ${pageErrors.length} page errors`);
  for (const e of pageErrors.slice(0, 5)) console.error(`  ${e}`);
  process.exit(1);
}
console.log('raceRenderCheck: PASS (0 page errors)');

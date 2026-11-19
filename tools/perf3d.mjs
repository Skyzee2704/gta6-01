// perf3d — the render budget gate. Loads every shot in headless
// Chromium and reads the renderer's own counters from
// window.__shotResult: draw calls <= 100, triangles <= 200,000.
// The sim budget (<= 8 ms/step) is covered by simCheck in Node.
// Exits 1 on any breach.
import { readFileSync } from 'node:fs';
import { startServer, launchBrowser, openPage, waitShot } from './browser.mjs';

const failures = [];
const shots = JSON.parse(readFileSync(new URL('../shots.json', import.meta.url), 'utf8'));

const server = await startServer(8901);
const browser = await launchBrowser();
try {
  for (const shot of shots) {
    const short = shot.query.match(/shot=(\w+)/)[1];
    const { context, page } = await openPage(browser, server.base, `index.html${shot.query}`);
    try {
      const result = await waitShot(page);
      if (result.error) {
        console.log(`FAIL  ${shot.name}: page error — ${result.error}`);
        failures.push(shot.name);
        continue;
      }
      if (short === 'map') {
        console.log(`INFO  ${shot.name}: 2D map screen, no 3D counters (luma ${result.luma.toFixed(3)})`);
        continue;
      }
      const dcOk = result.drawCalls <= 100;
      const triOk = result.triangles <= 200000;
      console.log(`${dcOk && triOk ? 'PASS' : 'FAIL'}  ${shot.name}: ${result.drawCalls} draw calls (<= 100), ${result.triangles.toLocaleString('en-US')} triangles (<= 200,000)`);
      if (!dcOk || !triOk) failures.push(shot.name);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}

if (failures.length > 0) {
  console.log(`\nperf3d: ${failures.length} FAILURE(S)`);
  process.exit(1);
}
console.log('\nperf3d: PASS');

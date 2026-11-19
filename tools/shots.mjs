// shots — the screenshot gate. Renders each shot in shots.json twice
// (determinism: byte-identical re-render), reads luma and the NDC
// check from window.__shotResult, screenshots the viewport to
// screenshots/ as JPEG, and enforces the floors and the 256 KiB cap.
// Luma floors: cover/race/map >= 0.35, onfoot >= 0.25. Exits 1 on fail.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { SHOTS } from '../game/src/config.js';
import { startServer, launchBrowser, openPage, waitShot, GAME_WIDTH, GAME_HEIGHT } from './browser.mjs';

const shots = JSON.parse(readFileSync(new URL('../shots.json', import.meta.url), 'utf8'));
const outDir = new URL('../screenshots/', import.meta.url);

// Clear stale screenshots so only this run's four files ship.
for (const f of readdirSync(outDir)) {
  if (f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png')) rmSync(new URL(`../screenshots/${f}`, import.meta.url));
}

const failures = [];
const server = await startServer(8901);
const browser = await launchBrowser();
try {
  for (const shot of shots) {
    const short = shot.query.match(/shot=(\w+)/)[1];
    const floor = SHOTS.lumaFloor[short];
    const hashes = [];
    let result = null;
    let file = null;
    for (let pass = 0; pass < 2; pass++) {
      const { context, page } = await openPage(browser, server.base, `index.html${shot.query}`);
      try {
        result = await waitShot(page);
        if (result.error) throw new Error(`page error: ${result.error}`);
        if (!result.ndcOk) throw new Error(`NDC FAIL: ${(result.missing || []).join(', ')} out of frame`);
        // JPEG quality ladder: start 80, step down until under the cap.
        let quality = 80;
        let buffer = null;
        for (;;) {
          buffer = await page.screenshot({ type: 'jpeg', quality, clip: { x: 0, y: 0, width: GAME_WIDTH, height: GAME_HEIGHT } });
          if (buffer.length <= SHOTS.maxBytes || quality <= 40) break;
          quality -= 10;
        }
        hashes.push(createHash('sha256').update(buffer).digest('hex'));
        if (pass === 0) file = { buffer, quality };
      } finally {
        await context.close();
      }
    }
    const size = file.buffer.length;
    const deterministic = hashes[0] === hashes[1];
    const lumaOk = result.luma >= floor;
    const sizeOk = size <= SHOTS.maxBytes;
    const ok = lumaOk && sizeOk && deterministic;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${shot.name}: luma ${result.luma.toFixed(3)} (floor ${floor}), ${size.toLocaleString('en-US')} B (<= ${SHOTS.maxBytes.toLocaleString('en-US')}, q${file.quality}), deterministic ${deterministic ? 'yes' : 'NO'} (sha ${hashes[0].slice(0, 12)})`);
    if (!lumaOk) failures.push(`${shot.name} luma ${result.luma.toFixed(3)} < ${floor}`);
    if (!sizeOk) failures.push(`${shot.name} size ${size} > ${SHOTS.maxBytes}`);
    if (!deterministic) failures.push(`${shot.name} not deterministic`);
    if (ok) writeFileSync(new URL(`../screenshots/${shot.name}`, import.meta.url), file.buffer);
  }
} finally {
  await browser.close();
  server.close();
}

if (failures.length > 0) {
  console.log(`\nshots: ${failures.length} FAILURE(S): ${failures.join('; ')}`);
  process.exit(1);
}
console.log('\nshots: PASS');

// Diagnostic: render the three 3D shots and save the JPEGs to /tmp
// regardless of luma, so the frames can be looked at. Not a gate.
import { writeFileSync } from 'node:fs';
import { startServer, launchBrowser, openPage, waitShot, GAME_WIDTH, GAME_HEIGHT } from './browser.mjs';

const server = await startServer(8901);
const browser = await launchBrowser();
try {
  for (const name of ['cover', 'race', 'onfoot']) {
    const { context, page } = await openPage(browser, server.base, `index.html?shot=${name}&seed=1`);
    try {
      const result = await waitShot(page);
      const buffer = await page.screenshot({ type: 'jpeg', quality: 80, clip: { x: 0, y: 0, width: GAME_WIDTH, height: GAME_HEIGHT } });
      writeFileSync(`/tmp/diag-${name}.jpg`, buffer);
      console.log(name, 'luma', result.luma.toFixed(3), 'ndcOk', result.ndcOk, 'drawCalls', result.drawCalls, 'triangles', result.triangles);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}

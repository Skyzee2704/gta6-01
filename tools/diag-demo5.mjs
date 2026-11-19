// Diagnostic: step the offline demo to 4 s sim time and save the
// frame, to see the stopped car at the coast deterministically.
import { writeFileSync } from 'node:fs';
import { startServer, launchBrowser, openPage } from './browser.mjs';

const server = await startServer(8901);
const browser = await launchBrowser();
try {
  const { context, page } = await openPage(browser, server.base, 'index.html?demo=1&step=1&seed=1');
  try {
    await page.waitForFunction(() => window.__demoReady === true, null, { timeout: 90000 });
    let jpg = null;
    for (let i = 0; i < 120; i++) {
      jpg = await page.evaluate((dt) => window.__stepDemo(dt), 1 / 30);
    }
    writeFileSync('/tmp/demo-offline-4s.jpg', Buffer.from(jpg.split(',', 2)[1], 'base64'));
    console.log('state:', JSON.stringify(await page.evaluate(() => window.__demoState())));
  } finally {
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

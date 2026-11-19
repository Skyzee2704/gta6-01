// Diagnostic: run the LIVE demo for a few wall-seconds and screenshot
// it, to see whether the southbound car actually drives (before the
// slow offline render). Not a gate.
import { writeFileSync } from 'node:fs';
import { startServer, launchBrowser, openPage } from './browser.mjs';

const server = await startServer(8901);
const browser = await launchBrowser();
try {
  const { context, page } = await openPage(browser, server.base, 'index.html?demo=1&seed=1');
  try {
    await page.waitForFunction(() => window.__demoReady === true, null, { timeout: 90000 });
    await page.waitForTimeout(9000);
    const frames = await page.evaluate(() => window.__demoFrames || 0);
    const buffer = await page.screenshot({ type: 'jpeg', quality: 80 });
    writeFileSync('/tmp/diag-demo.jpg', buffer);
    console.log('demo frames in 9 s wall:', frames);
  } finally {
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

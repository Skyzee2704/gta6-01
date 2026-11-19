// Diagnostic: screenshot the LIVE demo at 1 s and 2 s (car still on
// the boulevard) to find when the car disappears from the frame.
import { writeFileSync } from 'node:fs';
import { startServer, launchBrowser, openPage } from './browser.mjs';

const server = await startServer(8901);
const browser = await launchBrowser();
try {
  const { context, page } = await openPage(browser, server.base, 'index.html?demo=1&seed=1');
  try {
    await page.waitForFunction(() => window.__demoReady === true, null, { timeout: 90000 });
    await page.waitForTimeout(1000);
    writeFileSync('/tmp/demo-t1.jpg', await page.screenshot({ type: 'jpeg', quality: 80 }));
    await page.waitForTimeout(1000);
    writeFileSync('/tmp/demo-t2.jpg', await page.screenshot({ type: 'jpeg', quality: 80 }));
    console.log('frames:', await page.evaluate(() => window.__demoFrames || 0));
  } finally {
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

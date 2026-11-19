// Diagnostic: screenshot the LIVE demo at 4 s and 7 s to see the
// southbound drive (is the car visible, is the chase readable?).
import { writeFileSync } from 'node:fs';
import { startServer, launchBrowser, openPage } from './browser.mjs';

const server = await startServer(8901);
const browser = await launchBrowser();
try {
  const { context, page } = await openPage(browser, server.base, 'index.html?demo=1&seed=1');
  try {
    await page.waitForFunction(() => window.__demoReady === true, null, { timeout: 90000 });
    await page.waitForTimeout(4000);
    writeFileSync('/tmp/demo-t4.jpg', await page.screenshot({ type: 'jpeg', quality: 80 }));
    await page.waitForTimeout(3000);
    writeFileSync('/tmp/demo-t7.jpg', await page.screenshot({ type: 'jpeg', quality: 80 }));
    console.log('frames:', await page.evaluate(() => window.__demoFrames || 0));
  } finally {
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

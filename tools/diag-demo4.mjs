// Diagnostic: print the demo state at 1 s and 2 s to find where the
// car goes when it vanishes from the frame.
import { startServer, launchBrowser, openPage } from './browser.mjs';

const server = await startServer(8901);
const browser = await launchBrowser();
try {
  const { context, page } = await openPage(browser, server.base, 'index.html?demo=1&seed=1');
  try {
    await page.waitForFunction(() => window.__demoReady === true, null, { timeout: 90000 });
    await page.waitForTimeout(1000);
    console.log('t=1s', JSON.stringify(await page.evaluate(() => window.__demoState())));
    await page.waitForTimeout(1000);
    console.log('t=2s', JSON.stringify(await page.evaluate(() => window.__demoState())));
    await page.waitForTimeout(2000);
    console.log('t=4s', JSON.stringify(await page.evaluate(() => window.__demoState())));
  } finally {
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

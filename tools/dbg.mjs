import { launchBrowser, openGame, startServer, stopServer } from './browser.mjs';
const PORT = 8903;
let server = null, browser = null;
try {
  server = await startServer(PORT);
  browser = await launchBrowser();
  const { page, errors, consoleErrors } = await openGame(browser, PORT, 'shot=cover&staging=1&seed=1');
  try { await page.waitForFunction(() => window.__solmar && window.__solmar.shotReady, { timeout: 20000 }); console.log('SHOTREADY OK'); }
  catch (e) { console.log('TIMEOUT'); }
  console.log('pageerrors:', JSON.stringify(errors, null, 1));
  console.log('consoleErrors:', JSON.stringify(consoleErrors, null, 1));
  const state = await page.evaluate(() => {
    const g = window.__solmar;
    if (!g) return 'no __solmar';
    return { keys: Object.keys(g), shotReady: g.shotReady, screen: g.screen, frames: g.frames };
  }).catch(e => 'eval err ' + e.message);
  console.log('state:', JSON.stringify(state));
} catch (e) { console.log('ERR ' + e.message); }
finally { if (browser) await browser.close().catch(()=>{}); stopServer(server); }

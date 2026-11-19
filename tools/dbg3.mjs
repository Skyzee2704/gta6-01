import { launchBrowser, openGame, waitShotReady, startServer, stopServer } from './browser.mjs';
const PORT = 8906;
let server = null, browser = null;
try {
  server = await startServer(PORT);
  browser = await launchBrowser();
  const { page } = await openGame(browser, PORT, 'shot=cover&staging=1&seed=1');
  await waitShotReady(page, 45000);
  await page.waitForTimeout(1200);
  const hide = async (name) => page.evaluate((n) => {
    const g = window.__solmar;
    const o = g.renderer.scene.getObjectByName(n);
    if (o) o.visible = false;
    return !!o;
  }, name);
  const show = async (name) => page.evaluate((n) => {
    const g = window.__solmar;
    const o = g.renderer.scene.getObjectByName(n);
    if (o) o.visible = true;
  }, name);
  console.log('hide buildings:', await hide('buildings'));
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/dbg-nobuild.png' });
  await show('buildings');
  console.log('hide sea:', await hide('sea'));
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/dbg-nosea.png' });
  await show('sea');
  console.log('hide props:', await hide('props'));
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/dbg-noprops.png' });
  console.log('done');
} catch (e) { console.log('ERR ' + e.message); }
finally { if (browser) await browser.close().catch(()=>{}); stopServer(server); }

import { launchBrowser, openGame, waitShotReady, startServer, stopServer } from './browser.mjs';
const PORT = 8905;
let server = null, browser = null;
try {
  server = await startServer(PORT);
  browser = await launchBrowser();
  const { page } = await openGame(browser, PORT, 'shot=cover&staging=1&seed=1');
  await waitShotReady(page, 45000);
  await page.waitForTimeout(1500);
  const names = await page.evaluate(() => {
    const g = window.__solmar;
    const out = [];
    g.renderer.scene.traverse(o => { if (o.isMesh || o.isGroup) out.push(o.name || o.type); });
    return out;
  });
  console.log('scene names:', JSON.stringify(names));
  await page.evaluate(() => {
    const g = window.__solmar;
    const sky = g.renderer.scene.getObjectByName('skyDome');
    if (sky) sky.visible = false;
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/dbg-nosky.png' });
  await page.evaluate(() => {
    const g = window.__solmar;
    const sky = g.renderer.scene.getObjectByName('skyDome');
    if (sky) sky.visible = true;
    for (let i = 0; i < 4; i++) {
      const n = g.renderer.scene.getObjectByName('neonSigns' + i);
      if (n) n.visible = false;
    }
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/dbg-noneon.png' });
  console.log('done');
} catch (e) { console.log('ERR ' + e.message); }
finally { if (browser) await browser.close().catch(()=>{}); stopServer(server); }

import { launchBrowser, openGame, waitShotReady, startServer, stopServer } from './browser.mjs';
const PORT = 8904;
let server = null, browser = null;
try {
  server = await startServer(PORT);
  browser = await launchBrowser();
  const { page } = await openGame(browser, PORT, 'shot=cover&staging=1&seed=1');
  await waitShotReady(page, 45000);
  await page.waitForTimeout(2000);
  const probe = await page.evaluate(() => {
    const g = window.__solmar;
    const cam = g.renderer.camera.position;
    const p = g.world.player;
    const out = { cam: [cam.x.toFixed(1), cam.y.toFixed(1), cam.z.toFixed(1)], player: [p.x.toFixed(1), p.y.toFixed(1), p.heading.toFixed(2)], cars: [] };
    g.renderer.scene.traverse(o => {
      if (o.userData && o.userData.def) {
        const ndc = g.renderer.projectNDC(o.position);
        out.cars.push({ def: o.userData.def.id, pos: [o.position.x.toFixed(1), o.position.y.toFixed(1), o.position.z.toFixed(1)], ndc: { x: +ndc.x.toFixed(2), y: +ndc.y.toFixed(2), vis: ndc.visible }, vis: o.visible });
      }
    });
    return out;
  });
  console.log(JSON.stringify(probe, null, 1));
} catch (e) { console.log('ERR ' + e.message); }
finally { if (browser) await browser.close().catch(()=>{}); stopServer(server); }

import { launchBrowser, openGame, waitShotReady, startServer, stopServer } from './browser.mjs';
const PORT = 8907;
let server = null, browser = null;
try {
  server = await startServer(PORT);
  browser = await launchBrowser();
  const { page } = await openGame(browser, PORT, 'shot=cover&staging=1&seed=1');
  await waitShotReady(page, 45000);
  await page.waitForTimeout(1200);
  const hits = await page.evaluate(() => {
    const g = window.__solmar;
    const cam = g.renderer.camera;
    const ray = new THREE.Raycaster();
    const out = [];
    for (const [nx, ny] of [[0.6, 0.92], [0.9, 0.92], [0.3, 0.92], [0.75, 0.85]]) {
      ray.setFromCamera(new THREE.Vector2(nx, ny), cam);
      const list = ray.intersectObjects(g.renderer.scene.children, true);
      out.push({ ndc: [nx, ny], hits: list.slice(0, 4).map(h => ({ name: h.object.name || h.object.type, dist: +h.distance.toFixed(1), point: h.point.toArray().map(v => +v.toFixed(1)) })) });
    }
    return out;
  });
  console.log(JSON.stringify(hits, null, 1));
} catch (e) { console.log('ERR ' + e.message); }
finally { if (browser) await browser.close().catch(()=>{}); stopServer(server); }

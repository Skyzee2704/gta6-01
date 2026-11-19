import { launchBrowser, openGame, waitShotReady, startServer, stopServer } from './browser.mjs';
const PORT = 8902;
let server = null, browser = null;
try {
  server = await startServer(PORT);
  browser = await launchBrowser();
  const { page } = await openGame(browser, PORT, 'shot=cover&staging=1&seed=1');
  await waitShotReady(page, 45000);
  await page.waitForTimeout(1500);
  const probe = await page.evaluate(() => {
    const g = window.__solmar;
    const cam = g.renderer.camera.position;
    const p = g.world.player;
    const car = g.renderer.scene.children.find(c => c.userData && c.userData.def);
    const meshes = [];
    g.renderer.scene.traverse(o => { if (o.isMesh) meshes.push({ name: o.name || o.type, vis: o.visible, pos: o.position ? [o.position.x.toFixed(1), o.position.y.toFixed(1), o.position.z.toFixed(1)] : null }); });
    const ndc = g.renderer.projectNDC(new THREE.Vector3(p.x, 1, p.y));
    return {
      cam: [cam.x.toFixed(1), cam.y.toFixed(1), cam.z.toFixed(1)],
      player: [p.x.toFixed(1), p.y.toFixed(1), 'heading ' + p.heading.toFixed(2), 'speed ' + p.speed.toFixed(1), 'onFoot ' + p.onFoot],
      playerNDC: { x: ndc.x.toFixed(2), y: ndc.y.toFixed(2), visible: ndc.visible },
      meshCount: meshes.length,
      carMeshes: meshes.filter(m => m.name === '' ).length,
      sample: meshes.slice(0, 12),
    };
  });
  console.log(JSON.stringify(probe, null, 1));
} catch (e) { console.log('ERR ' + e.message); }
finally { if (browser) await browser.close().catch(()=>{}); stopServer(server); }

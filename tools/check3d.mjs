// SOLMAR 3D — check3d: headless 3D gate. Loads the cover shot, waits for
// shotReady, fails loud on any page error, verifies WebGL rendered
// (non-blank pixels) and the ground was NOT culled (no flat blue frame).
import { launchBrowser, openGame, waitShotReady, startServer, stopServer } from './browser.mjs';
import { writeFileSync } from 'node:fs';

const PORT = 8901;
const failures = [];
function check(name, ok, detail) {
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail != null ? ' — ' + detail : ''));
  if (!ok) failures.push(name);
}

let server = null;
let browser = null;
try {
  server = await startServer(PORT);
  browser = await launchBrowser();
  const { page, errors, consoleErrors } = await openGame(browser, PORT, 'shot=cover&staging=1&seed=1');
  await waitShotReady(page, 45000);
  await page.waitForTimeout(1500);
  await page.waitForFunction(() => {
    const g = window.__solmar;
    return g && g.world && g.traffic && g.traffic.cars.length >= 1;
  }, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(500);
  check('page loaded without page errors', errors.length === 0, errors.join(' | ').slice(0, 500));
  check('no console errors', consoleErrors.length === 0, consoleErrors.join(' | ').slice(0, 500));
  const info = await page.evaluate(() => {
    const g = window.__solmar;
    const r = g.renderer.renderer;
    const gl = r.getContext();
    return {
      webgl: !!gl,
      calls: r.info.render.calls,
      triangles: r.info.render.triangles,
      geometries: r.info.memory.geometries,
      textures: r.info.memory.textures,
      hour: g.world.hour,
      cash: g.world.cash,
      wanted: g.world.wanted,
      screen: g.screen,
      policeUnits: g.police.units.length,
      heli: !!g.police.heli,
      peds: g.npcs.peds.length,
      traffic: g.traffic.cars.length,
    };
  });
  console.log('renderer info: ' + JSON.stringify(info));
  check('WebGL context exists', info.webgl === true);
  check('draw calls < 100', info.calls < 100, 'calls=' + info.calls);
  check('triangles < 200k', info.triangles < 200000, 'triangles=' + info.triangles);
  check('cover hour is golden 18.6', Math.abs(info.hour - 18.6) < 0.01, 'hour=' + info.hour);
  check('staging cash in HUD range', info.cash >= 10000, 'cash=' + info.cash);
  check('wanted 4 in cover', info.wanted === 4, 'wanted=' + info.wanted);
  check('police units present', info.policeUnits >= 2, 'units=' + info.policeUnits);
  check('heli present', info.heli === true);
  check('pedestrians present', info.peds >= 2, 'peds=' + info.peds);
  check('traffic present', info.traffic >= 1, 'traffic=' + info.traffic);
  const shot = await page.screenshot({ path: '/tmp/check3d-cover.png' });
  const pixels = await page.evaluate(async (b64) => {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = 'data:image/png;base64,' + b64;
    });
    const off = document.createElement('canvas');
    off.width = 160;
    off.height = 90;
    const ctx = off.getContext('2d');
    ctx.drawImage(img, 0, 0, 160, 90);
    const data = ctx.getImageData(0, 0, 160, 90).data;
    let sum = 0;
    let blue = 0;
    let n = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      sum += (r + g + b) / 3;
      if (b > 150 && r < 90 && g < 110) blue++;
      n++;
    }
    return { meanLuma: sum / n / 255, blueFrac: blue / n };
  }, shot.toString('base64'));
  console.log('frame pixels: ' + JSON.stringify(pixels));
  check('frame is not blank', pixels.meanLuma > 0.05, 'luma=' + pixels.meanLuma.toFixed(3));
  check('frame is not flat blue (ground culled)', pixels.blueFrac < 0.5, 'blueFrac=' + pixels.blueFrac.toFixed(3));
  check('cover luma floor 0.35', pixels.meanLuma >= 0.35, 'luma=' + pixels.meanLuma.toFixed(3));
  await browser.close();
} catch (e) {
  console.log('FAIL check3d exception — ' + e.message);
  failures.push('exception');
} finally {
  if (browser) await browser.close().catch(() => {});
  stopServer(server);
}
console.log(failures.length === 0 ? 'CHECK3D PASS' : 'CHECK3D FAIL (' + failures.length + ')');
process.exit(failures.length === 0 ? 0 : 1);

import { launchBrowser, openGame, waitShotReady, startServer, stopServer } from './browser.mjs';
const PORT = 8908;
let server = null, browser = null;
try {
  server = await startServer(PORT);
  browser = await launchBrowser();
  const { page } = await openGame(browser, PORT, 'shot=cover&staging=1&seed=1');
  await waitShotReady(page, 45000);
  await page.waitForTimeout(1500);
  const shot = await page.screenshot({ path: '/tmp/lumaregions.png' });
  const regions = await page.evaluate(async (b64) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + b64; });
    const off = document.createElement('canvas');
    off.width = 160; off.height = 90;
    const ctx = off.getContext('2d');
    ctx.drawImage(img, 0, 0, 160, 90);
    const data = ctx.getImageData(0, 0, 160, 90).data;
    const bands = [0, 0, 0, 0];
    const counts = [0, 0, 0, 0];
    for (let y = 0; y < 90; y++) {
      const band = Math.min(3, Math.floor(y / 22.5));
      for (let x = 0; x < 160; x++) {
        const i = (y * 160 + x) * 4;
        bands[band] += (data[i] + data[i + 1] + data[i + 2]) / 3;
        counts[band]++;
      }
    }
    return bands.map((s, i) => +(s / counts[i] / 255).toFixed(3));
  }, shot.toString('base64'));
  console.log('luma bands top->bottom (4 bands):', JSON.stringify(regions));
} catch (e) { console.log('ERR ' + e.message); }
finally { if (browser) await browser.close().catch(()=>{}); stopServer(server); }

// Diagnostic: sample the game canvas pixels of the race shot in a
// grid, so the dark frame can be diagnosed by numbers, not guesses.
import { startServer, launchBrowser, openPage, waitShot } from './browser.mjs';

const server = await startServer(8901);
const browser = await launchBrowser();
try {
  const { context, page } = await openPage(browser, server.base, 'index.html?shot=race&seed=1');
  try {
    const result = await waitShot(page);
    const samples = await page.evaluate(() => {
      const game = document.getElementById('game');
      const off = document.createElement('canvas');
      off.width = 128;
      off.height = 72;
      const ctx = off.getContext('2d');
      ctx.drawImage(game, 0, 0, 128, 72);
      const data = ctx.getImageData(0, 0, 128, 72).data;
      const rows = {};
      for (const [name, y0, y1] of [['top', 0, 18], ['upper-mid', 18, 36], ['lower-mid', 36, 54], ['bottom', 54, 72]]) {
        let r = 0, g = 0, b = 0, n = 0;
        for (let y = y0; y < y1; y++) {
          for (let x = 0; x < 128; x++) {
            const i = (y * 128 + x) * 4;
            r += data[i]; g += data[i + 1]; b += data[i + 2]; n += 1;
          }
        }
        rows[name] = [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
      }
      // Centre column (the road ahead) vs left/right edges.
      const col = (x0, x1) => {
        let r = 0, g = 0, b = 0, n = 0;
        for (let y = 20; y < 60; y++) {
          for (let x = x0; x < x1; x++) {
            const i = (y * 128 + x) * 4;
            r += data[i]; g += data[i + 1]; b += data[i + 2]; n += 1;
          }
        }
        return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
      };
      return { rows, centre: col(56, 72), left: col(0, 16), right: col(112, 128) };
    });
    console.log('luma', result.luma.toFixed(3));
    console.log(JSON.stringify(samples, null, 2));
  } finally {
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

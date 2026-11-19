// browser.mjs — shared Playwright harness for the browser gates.
// Serves game/ with the repo's own serve.ts (Node stdlib only) and
// launches the restored playwright-core (1.65.1) against the cached
// Chromium. Everything runs on 127.0.0.1; nothing reaches the network.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const PW_CORE = fileURLToPath(new URL('../../pw/tools/node_modules/playwright-core', import.meta.url));
const { chromium } = require(PW_CORE);

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export async function startServer(port = 8901) {
  const proc = spawn(process.execPath, ['serve.ts', '--port', String(port)], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const base = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 15000;
  for (;;) {
    try {
      const res = await fetch(`${base}/index.html`);
      if (res.ok) break;
    } catch {
      // Not up yet.
    }
    if (Date.now() > deadline) {
      proc.kill();
      throw new Error(`serve.ts did not come up on port ${port}`);
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return {
    base,
    close() { proc.kill(); },
  };
}

export async function launchBrowser() {
  return chromium.launch({
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--no-sandbox'],
  });
}

export async function openPage(browser, base, query) {
  const context = await browser.newContext({
    viewport: { width: GAME_WIDTH, height: GAME_HEIGHT },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on('pageerror', (err) => {
    console.log(`PAGEERROR ${query}: ${err.message}`);
  });
  await page.goto(`${base}/${query}`, { waitUntil: 'load', timeout: 30000 });
  return { context, page };
}

// Wait for the shot harness (window.__shotReady) and return its result.
export async function waitShot(page, timeoutMs = 90000) {
  await page.waitForFunction(() => window.__shotReady === true, null, { timeout: timeoutMs });
  return page.evaluate(() => window.__shotResult);
}

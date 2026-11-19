// SOLMAR 3D — shared headless-browser helper for the browser gates.
// Playwright-core + the cached Chromium build, SwiftShader WebGL, local
// serve.ts. Collects console errors + page errors for fail-loud gates.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export function findChromium() {
  const base = join(homedir(), '.cache', 'ms-playwright');
  if (!existsSync(base)) return null;
  const dirs = readdirSync(base).filter((d) => d.startsWith('chromium-') && !d.includes('headless'));
  dirs.sort().reverse();
  for (const d of dirs) {
    const p = join(base, d, 'chrome-linux', 'chrome');
    if (existsSync(p)) return p;
  }
  const shells = readdirSync(base).filter((d) => d.startsWith('chromium_headless_shell-'));
  shells.sort().reverse();
  for (const d of shells) {
    const p = join(base, d, 'chrome-linux', 'headless_shell');
    if (existsSync(p)) return p;
  }
  return null;
}

export async function startServer(port) {
  const proc = spawn('node', ['serve.ts', '--port', String(port)], {
    cwd: new URL('..', import.meta.url).pathname,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const url = `http://127.0.0.1:${port}/health`;
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return proc;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  proc.kill();
  throw new Error('serve.ts did not come up on port ' + port);
}

export async function launchBrowser() {
  const executablePath = findChromium();
  if (!executablePath) throw new Error('no cached Chromium found under ~/.cache/ms-playwright');
  const browser = await chromium.launch({
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--disable-gpu-sandbox',
      '--mute-audio',
    ],
  });
  return browser;
}

export async function openGame(browser, port, query, width = 1280, height = 720) {
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  const consoleErrors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  const url = `http://127.0.0.1:${port}/index.html?${query}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  return { page, errors, consoleErrors };
}

export async function waitShotReady(page, timeoutMs = 30000) {
  await page.waitForFunction(() => window.__solmar && window.__solmar.shotReady, null, { timeout: timeoutMs });
}

export function stopServer(proc) {
  if (proc && !proc.killed) proc.kill();
}

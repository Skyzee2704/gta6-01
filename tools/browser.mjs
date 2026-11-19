// The browser driver: headless Chromium over the DevTools protocol, with
// Node's built-in WebSocket and no other dependency. It starts the local
// server, opens a page, evaluates code in it, takes screenshots, and
// collects console errors and page exceptions — everything the 3D gates
// need, with nothing to install.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';

export const GAME_PORT = 8901;
export const CDP_PORT = 9333;

export function freePort() {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

export async function startServer(repoRoot, port) {
  const proc = spawn('node', ['serve.ts', '--port', String(port)], { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'] });
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/index.html`);
      if (res.ok) return proc;
    } catch {
      // Not up yet.
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  proc.kill();
  throw new Error(`serve.ts did not answer on port ${port}`);
}

/** Chromium that actually exists here: /usr/bin/chromium-browser is a snap
 * stub, so use the Playwright cache (Chrome 140), falling back to the
 * headless shell. */
export const CHROMIUM_CANDIDATES = [
  `${process.env.HOME}/.cache/ms-playwright/chromium-1187/chrome-linux/chrome`,
  `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell`,
  'chromium-browser',
  'chromium',
  'google-chrome',
];

export async function launchBrowser(cdpPort) {
  const args = [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
    '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
    `--remote-debugging-port=${cdpPort}`, '--window-size=1280,720', '--hide-scrollbars',
    '--autoplay-policy=no-user-gesture-required', 'about:blank',
  ];
  const proc = spawn(CHROMIUM_CANDIDATES[0], args, { stdio: ['ignore', 'pipe', 'pipe'] });
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${cdpPort}/json/version`);
      if (res.ok) return proc;
    } catch {
      // Not up yet.
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  proc.kill();
  throw new Error(`chromium did not answer on CDP port ${cdpPort}`);
}

export class Page {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.nextId = 1;
    this.pending = new Map();
    this.consoleErrors = [];
    this.exceptions = [];
    this.ws = null;
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    this.ws.onmessage = (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${msg.error.code}: ${msg.error.message}`));
        else resolve(msg.result);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        this.exceptions.push(msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text || 'exception');
      } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        this.consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
      }
    };
    await this.send('Runtime.enable');
    await this.send('Page.enable');
    await this.send('Log.enable');
  }

  send(method, params, timeoutMs) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params: params || {} }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP timeout on ${method}`));
        }
      }, timeoutMs || 60000);
    });
  }

  async navigate(url) {
    await this.send('Page.navigate', { url });
  }

  async evaluate(expression, timeoutMs) {
    const result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, timeoutMs);
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || 'evaluate failed');
    return result.result?.value;
  }

  async waitFor(expression, timeoutMs) {
    const deadline = Date.now() + (timeoutMs || 30000);
    while (Date.now() < deadline) {
      try {
        const value = await this.evaluate(expression);
        if (value) return value;
      } catch {
        // Page still loading.
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error(`waitFor timed out: ${expression}`);
  }

  async screenshot() {
    const result = await this.send('Page.captureScreenshot', { format: 'png' });
    return Buffer.from(result.data, 'base64');
  }

  close() {
    try { this.ws.close(); } catch { /* already closed */ }
  }
}

export async function newPage(cdpPort) {
  const res = await fetch(`http://127.0.0.1:${cdpPort}/json/new?about:blank`, { method: 'PUT' });
  const target = await res.json();
  const page = new Page(target.webSocketDebuggerUrl);
  await page.connect();
  return page;
}

/** Open the game at a URL and wait for the shot flag or the boot flag. */
export async function openGame(cdpPort, gamePort, query) {
  const page = await newPage(cdpPort);
  await page.navigate(`http://127.0.0.1:${gamePort}/${query}`);
  return page;
}

export function stop(proc) {
  try { proc.kill('SIGTERM'); } catch { /* already dead */ }
}

// SOLMAR 3D — perf3d gate. Two layers:
// (1) Node sim timing: runs the real sim (autopilot drive + police + traffic
//     + NPCs + race + world clock) for 600 steps and measures ms per step.
//     Gate: average < 8 ms/step (the design sim budget).
// (2) Browser render stats: loads the cover shot in headless Chromium and
//     reads renderer.info. Gate: draw calls < 100, triangles < 200k.
// Frame time in SwiftShader is reported but NOT gated (SwiftShader is ~10x
// slower than a real GPU; the real-GPU check happens in Sky's preview).
import { stageShot } from '../game/src/shots.js';
import { updatePolice } from '../game/src/police.js';
import { updateNpcs } from '../game/src/npc.js';
import { updateTraffic } from '../game/src/traffic.js';
import { updateRace } from '../game/src/races.js';
import { advanceWorld } from '../game/src/world.js';
import { launchBrowser, openGame, waitShotReady, startServer, stopServer } from './browser.mjs';

const failures = [];
function check(name, ok, detail) {
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail != null ? ' — ' + detail : ''));
  if (!ok) failures.push(name);
}

// ---- (1) Node sim timing ----
const state = stageShot('cover', 1);
const steps = 600;
const dt = 1 / 60;
const t0 = performance.now();
for (let s = 0; s < steps; s++) {
  updatePolice(state.police, state.city, state.world.player, state.world, dt);
  updateTraffic(state.traffic, state.city, state.world.player, dt);
  updateNpcs(state.npcs, state.world.player, dt, state.city);
  updateRace(state.race, state.world.player, dt);
  advanceWorld(state.world, dt);
  state.seconds += dt;
}
const t1 = performance.now();
const avgMs = (t1 - t0) / steps;
console.log(`sim: ${steps} steps in ${(t1 - t0).toFixed(1)} ms, avg ${avgMs.toFixed(3)} ms/step`);
check('sim budget < 8 ms/step', avgMs < 8, `avg=${avgMs.toFixed(3)} ms`);

// ---- (2) Browser render stats ----
const PORT = 8903;
let server = null;
let browser = null;
try {
  server = await startServer(PORT);
  browser = await launchBrowser();
  const { page, errors, consoleErrors } = await openGame(browser, PORT, 'shot=cover&staging=1&seed=1');
  await waitShotReady(page, 45000);
  await page.waitForTimeout(1000);
  check('page loaded without page errors', errors.length === 0, errors.join(' | ').slice(0, 300));
  check('no console errors', consoleErrors.length === 0, consoleErrors.join(' | ').slice(0, 300));
  const info = await page.evaluate(() => {
    const g = window.__solmar;
    const r = g.renderer.renderer;
    return {
      calls: r.info.render.calls,
      triangles: r.info.render.triangles,
      geometries: r.info.memory.geometries,
      textures: r.info.memory.textures,
    };
  });
  console.log('renderer info: ' + JSON.stringify(info));
  check('draw calls < 100', info.calls < 100, 'calls=' + info.calls);
  check('triangles < 200k', info.triangles < 200000, 'triangles=' + info.triangles);
  const frameTimes = await page.evaluate(() => new Promise((resolve) => {
    const times = [];
    let last = performance.now();
    let n = 0;
    function tick(t) {
      times.push(t - last);
      last = t;
      n += 1;
      if (n < 30) requestAnimationFrame(tick);
      else resolve(times);
    }
    requestAnimationFrame(tick);
  }));
  const meanFrame = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
  console.log(`frame time (SwiftShader, informational): mean ${meanFrame.toFixed(1)} ms over ${frameTimes.length} frames`);
} finally {
  if (browser) await browser.close().catch(() => {});
  stopServer(server);
}

if (failures.length > 0) {
  console.log('PERF3D FAIL — ' + failures.join(', '));
  process.exit(1);
}
console.log('PERF3D PASS');

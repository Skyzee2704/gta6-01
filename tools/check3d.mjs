// check3d: the game boots in a real browser, WebGL renders, the world is
// on screen, and nothing throws. The renderer never silently falls back:
// a WebGL failure is a red screen and a failed gate.
import { freePort, startServer, launchBrowser, openGame, stop } from './browser.mjs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok: !!ok, detail: detail || '' });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

let server = null;
let browser = null;
try {
  const gamePort = await freePort();
  const cdpPort = await freePort();
  server = await startServer(repoRoot, gamePort);
  browser = await launchBrowser(cdpPort);
  const page = await openGame(cdpPort, gamePort, 'index.html');
  await page.waitFor('window.__solmar && window.__frameInfo', 30000);
  await new Promise((r) => setTimeout(r, 3000));

  const boot = await page.evaluate(`(() => {
    const s = window.__solmar;
    const f = window.__frameInfo;
    return {
      hasWorld: !!s.world, hasRenderer: !!s.renderer,
      failed: s.renderer.failed, calls: f.calls, tris: f.tris,
      canvas: !!document.querySelector('#game'),
      webgl: (() => { try { return !!document.querySelector('#game').getContext('webgl2'); } catch { return false; } })(),
    };
  })()`);
  check('game boots with world and renderer', boot.hasWorld && boot.hasRenderer, '');
  check('renderer did not fail', !boot.failed, boot.failed || '');
  check('WebGL context exists', boot.webgl, '');
  check('the renderer draws', boot.calls > 0 && boot.tris > 1000, `${boot.calls} calls, ${boot.tris} tris`);
  // Regression: vehicle and pedestrian meshes must actually be in the
  // scene graph. Groups created but never scene.add'ed render nothing —
  // the city looked complete while every car and person was invisible.
  const sceneGroups = await page.evaluate(`(() => {
    const s = window.__solmar;
    let groups = 0;
    s.renderer.scene.traverse((o) => { if (o.type === 'Group') groups += 1; });
    return groups;
  })()`);
  check('vehicles and people are in the scene graph', sceneGroups >= 10, `${sceneGroups} groups`);

  // The player, a car and a pedestrian must all be on screen in NDC —
  // the shot scripts' fail-loud check, run live here too. (The helicopter
  // NDC is checked in the cover shot staging, where it flies next to the
  // player; on the title screen it sits 200 m away, off camera.)
  const ndc = await page.evaluate(`(() => {
    const s = window.__solmar;
    const w = s.world.state;
    const r = s.renderer;
    const car = w.vehicles[0];
    // Any pedestrian on screen counts: peds spawn in a ring, and the first
    // one in the list may be standing behind the camera.
    const pedsOnScreen = w.peds.filter((p) => {
      const v = r.projectToNDC(p.x, 1.2, p.z);
      return v.visible && Math.abs(v.x) <= 0.95 && Math.abs(v.y) <= 0.95;
    }).length;
    return {
      player: r.projectToNDC(w.player.x, 1.2, w.player.z),
      car: r.projectToNDC(car.x, 1, car.z),
      pedsOnScreen,
    };
  })()`);
  for (const [name, v] of [['player', ndc.player], ['car', ndc.car]]) {
    check(`NDC: ${name} on screen`, v.visible && Math.abs(v.x) <= 0.95 && Math.abs(v.y) <= 0.95,
      `x=${v.x.toFixed(2)} y=${v.y.toFixed(2)} visible=${v.visible}`);
  }
  check('NDC: a pedestrian on screen', ndc.pedsOnScreen >= 1, `${ndc.pedsOnScreen} peds visible`);

  // Golden-hour lighting: the hour is inside the 17.8-19.4 window and the
  // sun sits near the horizon (elevation between -0.3 and 0.45). At 18.6
  // the formula gives -0.156: just past sunset, civil twilight, the sky
  // still golden — that is the look the cover is shot in.
  const light = await page.evaluate(`(() => {
    const s = window.__solmar;
    const w = s.world.state;
    const day = (w.hour - 6) / 12;
    return { hour: w.hour, sun: Math.sin(day * Math.PI), golden: w.hour >= 17.8 && w.hour <= 19.4 };
  })()`);
  check('golden hour 18.6 in the browser', Math.abs(light.hour - 18.6) < 0.5, `hour=${light.hour.toFixed(2)}`);
  check('sun is low, near the horizon', light.golden && light.sun > -0.3 && light.sun < 0.45, `elevation=${light.sun.toFixed(3)} golden=${light.golden}`);

  check('no console errors', page.consoleErrors.length === 0, page.consoleErrors.slice(0, 3).join(' | '));
  check('no uncaught exceptions', page.exceptions.length === 0, page.exceptions.slice(0, 3).join(' | '));
  page.close();
} finally {
  if (browser) stop(browser);
  if (server) stop(server);
}

const failed = checks.filter((c) => !c.ok);
console.log(`\ncheck3d: ${checks.length - failed.length}/${checks.length} PASS`);
process.exit(failed.length ? 1 : 0);

// SOLMAR 3D — playtest gate (11/11 steps from the design). Drives the REAL
// game in headless Chromium: clicks NEW GAME on the title screen, then uses
// real keyboard input where the input system is the path and the game's own
// exposed functions where the UI calls them. Fails loud on any page error.
import { launchBrowser, openGame, startServer, stopServer } from './browser.mjs';

const PORT = 8904;
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
  const { page, errors, consoleErrors } = await openGame(browser, PORT, 'seed=1');
  await page.waitForSelector('#btn-new', { timeout: 30000 });
  await page.waitForTimeout(800);
  await page.click('#btn-new');
  await page.waitForTimeout(1000);
  const screen = await page.evaluate(() => window.__solmar.screen);
  check('0 title -> play', screen === 'play', 'screen=' + screen);
  check('page loaded without page errors', errors.length === 0, errors.join(' | ').slice(0, 300));
  check('no console errors', consoleErrors.length === 0, consoleErrors.join(' | ').slice(0, 300));

  // 1. story job
  const job = await page.evaluate(() => {
    const g = window.__solmar;
    const res = g.triggerMission();
    return { ok: res && res.ok, mission: g.world.mission };
  });
  check('1 story job starts', job.ok === true && job.mission.active === true, JSON.stringify(job.mission));

  // 2. theft — enter the nearest traffic car
  const theft = await page.evaluate(() => {
    const g = window.__solmar;
    const car = g.traffic.cars[0];
    if (!car) return { ok: false, reason: 'no traffic car' };
    g.world.player.x = car.x + 2;
    g.world.player.y = car.y;
    const v = g.enterVehicle({ def: car.def });
    return { ok: !!v, onFoot: g.world.player.onFoot, stolen: g.world.stats.carsStolen };
  });
  check('2 theft (enter car)', theft.ok === true && theft.onFoot === false, JSON.stringify(theft));

  // 3. driving — real keyboard, hold W until the car has moved 10+ units
  // (SwiftShader runs ~1 fps and dt is clamped to 0.05 s/frame, so poll
  // instead of a fixed wall-clock wait).
  const before = await page.evaluate(() => {
    const g = window.__solmar;
    return { x: g.world.player.x, y: g.world.player.y };
  });
  await page.keyboard.down('KeyW');
  await page.waitForFunction(
    (b) => {
      const g = window.__solmar;
      return Math.hypot(g.world.player.x - b.x, g.world.player.y - b.y) > 10;
    },
    before,
    { timeout: 90000 },
  );
  await page.keyboard.up('KeyW');
  const after = await page.evaluate(() => {
    const g = window.__solmar;
    return { x: g.world.player.x, y: g.world.player.y, speed: g.world.player.speed };
  });
  const moved = Math.hypot(after.x - before.x, after.y - before.y);
  check('3 driving (W moves car)', moved > 10 && after.speed > 3, `moved=${moved.toFixed(1)} speed=${after.speed.toFixed(1)}`);

  // 4. pursuit — wanted 3, police must spawn
  await page.evaluate(() => {
    const g = window.__solmar;
    g.world.wanted = 3;
    g.world.wantedHeat = 100;
  });
  await page.waitForFunction(() => window.__solmar.police.units.length >= 1, null, { timeout: 60000 });
  const pursuit = await page.evaluate(() => {
    const g = window.__solmar;
    return { units: g.police.units.length, heli: !!g.police.heli, wanted: g.world.wanted };
  });
  check('4 pursuit (police spawn at wanted 3)', pursuit.units >= 1, JSON.stringify(pursuit));

  // 5. weapon purchase — test cash, buy SMG
  const buy = await page.evaluate(() => {
    const g = window.__solmar;
    g.world.cash = 50000;
    const res = g.buyWeaponNow('smg');
    return { res, owned: g.world.owned.weapons, ammo: g.world.ammo.smg };
  });
  check('5 weapon purchase (SMG)', buy.res.ok === true && buy.owned.includes('smg') && buy.ammo > 0, JSON.stringify(buy));

  // 6. interiors — diner at (300, 80)
  const interior = await page.evaluate(() => {
    const g = window.__solmar;
    g.world.player.x = 300;
    g.world.player.y = 80;
    const def = g.enterInteriorNow();
    const entered = g.world.interior;
    const back = g.exitInteriorNow();
    return { def: def && def.id, entered, exited: g.world.interior };
  });
  check('6 interiors (enter + exit diner)', interior.def === 'diner' && interior.entered === 'diner' && interior.exited == null, JSON.stringify(interior));

  // 7. save / load round-trip
  const saveLoad = await page.evaluate(() => {
    const g = window.__solmar;
    g.world.cash = 42424;
    const saved = g.saveNow();
    g.world.cash = 1;
    const loaded = g.loadNow();
    return { saved, loadedCash: loaded && loaded.cash };
  });
  check('7 save/load round-trip', saveLoad.saved === true && saveLoad.loadedCash === 42424, JSON.stringify(saveLoad));

  // 8. race — rivals move after countdown (countdown is sim-time: 3 s of
  // sim = ~60 frames at SwiftShader speed, so poll). Rivals must have real
  // x/y positions that advance along the route.
  const race = await page.evaluate(() => {
    const g = window.__solmar;
    g.triggerRace();
    return { active: g.race.active, phase: g.race.phase, rivals: g.race.rivals.length };
  });
  await page.waitForFunction(() => window.__solmar.race.phase === 'racing', null, { timeout: 120000 });
  const racePos1 = await page.evaluate(() => window.__solmar.race.rivals.map((r) => ({ x: r.x, y: r.y })));
  await page.waitForTimeout(5000);
  const raceAfter = await page.evaluate(() => {
    const g = window.__solmar;
    return { phase: g.race.phase, elapsed: g.race.elapsed, rivals: g.race.rivals.map((r) => ({ x: r.x, y: r.y })) };
  });
  const rivalsMoved = raceAfter.rivals.every((r, i) => typeof r.x === 'number' && Math.hypot(r.x - racePos1[i].x, r.y - racePos1[i].y) > 0.5);
  check('8 race (rivals move)', race.active === true && raceAfter.phase === 'racing' && raceAfter.elapsed > 0 && rivalsMoved, JSON.stringify({ race, racePos1, raceAfter }));

  // 9. radio — ] switches station
  const radioBefore = await page.evaluate(() => window.__solmar.audio.stationIndex);
  await page.keyboard.press('BracketRight');
  await page.waitForFunction((b) => window.__solmar.audio.stationIndex !== b, radioBefore, { timeout: 30000 });
  const radioAfter = await page.evaluate(() => window.__solmar.audio.stationIndex);
  check('9 radio (] switches station)', radioAfter !== radioBefore, `station ${radioBefore} -> ${radioAfter}`);

  // 10. pause — Esc toggles (wait between presses so each lands in its own
  // frame at SwiftShader speed).
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__solmar.screen === 'paused', null, { timeout: 30000 });
  const paused = await page.evaluate(() => window.__solmar.screen);
  await page.waitForTimeout(2000);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__solmar.screen === 'play', null, { timeout: 30000 });
  const resumed = await page.evaluate(() => window.__solmar.screen);
  check('10 pause (Esc toggles)', paused === 'paused' && resumed === 'play', `paused=${paused} resumed=${resumed}`);

  // 11. top-down view — V lifts the camera
  await page.keyboard.press('KeyV');
  await page.waitForFunction(() => window.__solmar.renderer.camera.position.y > 100, null, { timeout: 30000 });
  const camY = await page.evaluate(() => window.__solmar.renderer.camera.position.y);
  check('11 top-down view (V lifts camera)', camY > 100, 'cameraY=' + camY.toFixed(1));
} finally {
  if (browser) await browser.close().catch(() => {});
  stopServer(server);
}

if (failures.length > 0) {
  console.log('PLAYTEST FAIL — ' + failures.join(', '));
  process.exit(1);
}
console.log('PLAYTEST PASS 11/11');

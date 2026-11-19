// playtest: eleven scenarios a real player would hit, driven in a real
// browser. Headless Chrome throttles requestAnimationFrame on an occluded
// page, so the scenarios drive world.step directly — the same code the
// input handlers call — instead of waiting on the throttled main loop.
// Each scenario starts from a fresh world so a failure stays local.
import { freePort, startServer, launchBrowser, openGame, stop } from './browser.mjs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok: !!ok, detail: detail || '' });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const STEER = `function steerTo(s, tx, tz) {
  const p = s.world.state.player;
  const want = Math.atan2(tx - p.x, tz - p.z);
  let diff = want - p.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff > 0.12 ? -1 : diff < -0.12 ? 1 : 0;
}`;

let server = null;
let browser = null;
try {
  const gamePort = await freePort();
  const cdpPort = await freePort();
  server = await startServer(repoRoot, gamePort);
  browser = await launchBrowser(cdpPort);
  const page = await openGame(cdpPort, gamePort, 'index.html');
  await page.waitFor('window.__solmar && window.__frameInfo', 30000);

  // 1. Story job: mission 1 starts, the objective reads, the marker exists.
  const story = await page.evaluate(`(() => {
    const s = window.__solmar;
    s.world.reset();
    const ok = s.world.startMission(1);
    const m = s.world.state.missions.active;
    return { ok, name: m && m.name, objective: m && m.steps[0].text, marker: m && m.steps[0].x };
  })()`);
  check('1 story job starts with an objective', story.ok && story.name === 'First Wheels' && !!story.objective, `${story.name}: ${story.objective}`);

  // 2. Theft: step into the parked coupe and wanted goes to one star.
  const theft = await page.evaluate(`(() => {
    const s = window.__solmar;
    s.world.reset();
    const w = s.world.state;
    const car = w.vehicles[0];
    w.player.x = car.x + 1; w.player.z = car.z;
    s.world.step(1 / 60, { enter: true });
    return { inCar: w.player.vehicle === car, wanted: w.player.wanted, stolen: w.stats.carsStolen };
  })()`);
  check('2 stealing a car raises wanted to 1', theft.inCar && theft.wanted === 1 && theft.stolen === 1, `inCar=${theft.inCar} wanted=${theft.wanted}`);

  // 3. Driving: three seconds forward in the coupe covers real ground.
  const drive = await page.evaluate(`(() => {
    const s = window.__solmar;
    s.world.reset();
    const w = s.world.state;
    const car = w.vehicles[0];
    w.player.x = car.x + 1; w.player.z = car.z;
    s.world.step(1 / 60, { enter: true });
    const x0 = w.player.x; const z0 = w.player.z;
    for (let i = 0; i < 180; i += 1) s.world.step(1 / 60, { forward: true, steer: 0 });
    return { moved: Math.hypot(w.player.x - x0, w.player.z - z0), speed: w.player.vehicle.speed };
  })()`);
  check('3 driving moves the car', drive.moved > 15, `moved ${drive.moved.toFixed(1)} m, speed ${drive.speed.toFixed(1)}`);

  // 4. Pursuit: at wanted 2 the PCPD sends two units and they shoot.
  const pursuit = await page.evaluate(`(() => {
    const s = window.__solmar;
    s.world.reset();
    const w = s.world.state;
    w.player.wanted = 2;
    let shots = 0;
    for (let i = 0; i < 1200; i += 1) {
      const before = w.player.health;
      s.world.step(1 / 60, {});
      if (w.player.health < before) shots += 1;
    }
    return { units: w.police.length, onFoot: w.police.filter((u) => u.onFoot).length, hpLost: 100 - w.player.health, shots };
  })()`);
  check('4 wanted 2 brings two units who get out and shoot', pursuit.units === 2 && pursuit.onFoot >= 1, `units=${pursuit.units} onFoot=${pursuit.onFoot} hpLost=${pursuit.hpLost}`);

  // 5. Weapon purchase: cash buys an SMG, and the HUD slot fills.
  const weapon = await page.evaluate(`(async () => {
    const { buyWeapon } = await import('./src/weapons.js');
    const s = window.__solmar;
    s.world.reset();
    const w = s.world.state;
    // A player who has earned money walks into the gun shop.
    w.economy.cash = 5000;
    const cash0 = w.economy.cash;
    const r = buyWeapon(w.loadout, 'smg', cash0);
    return { ok: r.ok, owned: w.loadout.owned.includes('smg'), spent: cash0 - r.cash, ammo: w.loadout.ammo.smg };
  })()`);
  check('5 buying a weapon spends cash and fills a slot', weapon.ok && weapon.owned && weapon.spent > 0, `spent $${weapon.spent}, ammo ${JSON.stringify(weapon.ammo)}`);

  // 6. Interiors: the Neon Mile Diner opens and offers a meal.
  const interior = await page.evaluate(`(async () => {
    const { interiorAt, enterInterior, interiorActions } = await import('./src/interiors.js');
    const place = interiorAt(452, 246);
    if (!place) return { found: false };
    const room = enterInterior(place);
    return { found: true, name: room.name, kind: room.kind, actions: interiorActions(room.kind) };
  })()`);
  check('6 a restaurant opens with something to do', interior.found && interior.kind === 'restaurant' && interior.actions.length >= 2, `${interior.name}: ${interior.actions.join(' | ')}`);

  // 7. Save and load: a save round-trips through localStorage.
  const save = await page.evaluate(`(async () => {
    const { freshSave, serializeSave, parseSave, writeSave, readSave } = await import('./src/save.js');
    const s = window.__solmar;
    s.world.reset();
    const w = s.world.state;
    w.economy.cash = 4242;
    w.economy.respect = 900;
    const sv = freshSave();
    sv.cash = w.economy.cash; sv.respect = w.economy.respect;
    writeSave(sv, localStorage);
    const back = readSave(localStorage);
    return { cash: back && back.cash, respect: back && back.respect, text: !!serializeSave(sv) && !!parseSave(serializeSave(sv)) };
  })()`);
  check('7 save and load round-trip', save.cash === 4242 && save.respect === 900 && save.text, `cash=${save.cash} respect=${save.respect}`);

  // 8. Race: the Neon Loop starts, counts down and tracks rivals.
  const race = await page.evaluate(`(async () => {
    const { createRace, stepRace } = await import('./src/minigames.js');
    const { raceBoard } = await import('./src/races.js');
    const s = window.__solmar;
    s.world.reset();
    const w = s.world.state;
    const r = createRace('neon-loop');
    for (let i = 0; i < 600; i += 1) stepRace(r, w.player, 1 / 60, Math.random);
    const board = raceBoard(r);
    return { route: r.route.name, state: r.state, rivals: board.length, leader: board[0] && board[0].name };
  })()`);
  check('8 a race runs with rivals on the board', race.route === 'Neon Loop' && race.rivals >= 3, `${race.route} state=${race.state} rivals=${race.rivals}`);

  // 9. Radio: the station changes and something is playing.
  const radio = await page.evaluate(`(async () => {
    const { createAudio, nextStation, nowPlaying } = await import('./src/audio.js');
    const a = createAudio();
    const first = a.station;
    const st = nextStation(a);
    const track = nowPlaying(st, 10);
    return { changed: a.station !== first, station: st.name, track: track && track.title };
  })()`);
  check('9 the radio changes station and plays a track', radio.changed && !!radio.track, `${radio.station}: ${radio.track}`);

  // 10. Pause: pressing P raises the pause action, and the HUD freezes.
  const pause = await page.evaluate(`(async () => {
    const { createInput, ACTION_PAUSE } = await import('./src/input.js');
    const input = createInput(document.querySelector('#game'));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyP' }));
    const actions = input.takeActions();
    return { pauseRaised: (actions & ACTION_PAUSE) !== 0 };
  })()`);
  check('10 P raises the pause action', pause.pauseRaised, '');

  // 11. Top-down: C switches the camera to 130 m overhead.
  const top = await page.evaluate(`(() => {
    const s = window.__solmar;
    s.world.reset();
    const w = s.world.state;
    w.topDown = true;
    s.renderer.draw(w, 1);
    const y = s.renderer.camera.position.y;
    w.topDown = false;
    s.renderer.draw(w, 1);
    const y2 = s.renderer.camera.position.y;
    return { topY: y, chaseY: y2 };
  })()`);
  check('11 top-down camera looks straight down from 130 m', top.topY > 120 && top.chaseY < 10, `top=${top.topY.toFixed(0)} m chase=${top.chaseY.toFixed(1)} m`);

  check('no console errors across the playtest', page.consoleErrors.length === 0, page.consoleErrors.slice(0, 3).join(' | '));
  check('no exceptions across the playtest', page.exceptions.length === 0, page.exceptions.slice(0, 3).join(' | '));
  page.close();
} finally {
  if (browser) stop(browser);
  if (server) stop(server);
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nplaytest: ${checks.length - failed.length}/${checks.length} PASS`);
process.exit(failed.length ? 1 : 0);

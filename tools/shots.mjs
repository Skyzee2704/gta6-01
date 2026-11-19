// SOLMAR 3D — shots gate: renders the 4 staged shots from shots.json,
// NDC-checks every required element per shot, measures mean luma, and
// encodes each frame to JPEG in the 180-256 KB band via an ffmpeg quality
// loop. Writes screenshots/<name>. Exits non-zero if any shot fails its
// NDC-check, luma floor, or the 262144-byte cap. Deterministic per seed:
// the game freezes the sim + sea time in shot mode, so two runs produce
// byte-identical JPEGs (verified by the --twice flag).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser, openGame, waitShotReady, startServer, stopServer } from './browser.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..');
const spec = JSON.parse(readFileSync(join(repo, 'shots.json'), 'utf8'));
const PORT = 8910;
const twice = process.argv.includes('--twice');

function lumaOf(page, b64) {
  return page.evaluate(async (data) => {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = 'data:image/png;base64,' + data;
    });
    const off = document.createElement('canvas');
    off.width = 160;
    off.height = 90;
    const ctx = off.getContext('2d');
    ctx.drawImage(img, 0, 0, 160, 90);
    const d = ctx.getImageData(0, 0, 160, 90).data;
    let sum = 0;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      sum += (d[i] + d[i + 1] + d[i + 2]) / 3;
      n++;
    }
    return sum / n / 255;
  }, b64);
}

function encodeJpeg(pngPath, jpgPath) {
  let q = 2;
  let size = 0;
  for (; q <= 12; q++) {
    execSync(`ffmpeg -hide_banner -loglevel error -y -i "${pngPath}" -q:v ${q} "${jpgPath}"`);
    size = Number(execSync(`stat -c %s "${jpgPath}"`, { encoding: 'utf8' }).trim());
    if (size <= spec.size.maxBytes) break;
  }
  return { q, size };
}

async function ndcCheck(page, required) {
  return page.evaluate((req) => {
    const g = window.__solmar;
    const proj = g.renderer.projectNDC;
    const at = (x, y, h) => proj(new THREE.Vector3(x, h, y));
    const out = {};
    const p = g.world.player;
    if (req.includes('playerCar')) out.playerCar = at(p.x, p.y, 1);
    if (req.includes('player')) out.player = at(p.x, p.y, 1);
    if (req.includes('cruiser')) {
      const u = g.police.units[0];
      out.cruiser = u ? at(u.x, u.y, 1) : { visible: false };
    }
    if (req.includes('heli')) {
      const h = g.police.heli;
      out.heli = h ? at(h.x, h.y, h.z) : { visible: false };
    }
    if (req.includes('pedestrian')) {
      const pd = g.npcs.peds[0];
      out.pedestrian = pd ? at(pd.x, pd.y, 1) : { visible: false };
    }
    if (req.includes('rival1') || req.includes('rival2') || req.includes('rival3')) {
      for (let i = 0; i < 3; i++) {
        const r = g.race.rivals[i];
        out['rival' + (i + 1)] = r ? at(r.x, r.y, 1) : { visible: false };
      }
    }
    if (req.includes('vulture1') || req.includes('vulture2')) {
      for (let i = 0; i < 2; i++) {
        const v = g.npcs.vultures[i];
        out['vulture' + (i + 1)] = v ? at(v.x, v.y, 1) : { visible: false };
      }
    }
    if (req.includes('map')) {
      out.map = {
        visible: g.screen === 'paused' && !!document.getElementById('pause-map-canvas'),
        x: 0,
        y: 0,
      };
    }
    return out;
  }, required);
}

async function runOnce(outDir) {
  const server = await startServer(PORT);
  const browser = await launchBrowser();
  const results = [];
  mkdirSync(outDir, { recursive: true });
  try {
    for (const shot of spec.shots) {
      const { page, errors, consoleErrors } = await openGame(browser, PORT, `shot=${shot.query}&staging=1&seed=${spec.seed}`);
      let fail = '';
      try {
        await waitShotReady(page, 45000);
      } catch (e) {
        fail = 'shotReady timeout';
      }
      await page.waitForTimeout(1500);
      const ndc = fail ? {} : await ndcCheck(page, shot.require);
      const pngPath = `/tmp/shots-${shot.name}.png`;
      const shotBuf = await page.screenshot({ path: pngPath });
      const luma = await lumaOf(page, shotBuf.toString('base64'));
      const jpgPath = join(outDir, shot.name);
      const { q, size } = encodeJpeg(pngPath, jpgPath);
      const ndcFail = shot.require.filter((r) => !ndc[r] || !ndc[r].visible);
      const ok = !fail && errors.length === 0 && consoleErrors.length === 0 && ndcFail.length === 0 && luma >= shot.lumaFloor && size <= spec.size.maxBytes;
      if (fail) console.log(`FAIL ${shot.name} — ${fail}`);
      if (errors.length) console.log(`FAIL ${shot.name} — page errors: ${errors.join(' | ')}`);
      if (consoleErrors.length) console.log(`FAIL ${shot.name} — console errors: ${consoleErrors.join(' | ')}`);
      if (ndcFail.length) console.log(`FAIL ${shot.name} — NDC out of frame: ${ndcFail.join(', ')} (${JSON.stringify(ndc)})`);
      if (luma < shot.lumaFloor) console.log(`FAIL ${shot.name} — luma ${luma.toFixed(3)} < floor ${shot.lumaFloor}`);
      if (size > spec.size.maxBytes) console.log(`FAIL ${shot.name} — size ${size} > ${spec.size.maxBytes}`);
      if (size < spec.size.minBytes) console.log(`WARN ${shot.name} — size ${size} < target min ${spec.size.minBytes}`);
      console.log(`${ok ? 'PASS' : 'FAIL'} ${shot.name} — luma=${luma.toFixed(3)} size=${size} q=${q} ndc=${JSON.stringify(ndc)}`);
      results.push({ name: shot.name, ok, luma, size, q, ndc });
      await page.close();
    }
  } finally {
    await browser.close().catch(() => {});
    stopServer(server);
  }
  return results;
}

const first = await runOnce(join(repo, 'screenshots'));
let allOk = first.every((r) => r.ok);
if (twice) {
  const second = await runOnce('/tmp/shots-run2');
  for (let i = 0; i < first.length; i++) {
    const a = readFileSync(join(repo, 'screenshots', first[i].name));
    const b = readFileSync(join('/tmp/shots-run2', first[i].name));
    const stable = a.equals(b);
    console.log(`${stable ? 'PASS' : 'FAIL'} determinism ${first[i].name} — byte-identical=${stable} size=${a.length}`);
    if (!stable) allOk = false;
  }
}
console.log(allOk ? 'SHOTS PASS' : 'SHOTS FAIL');
process.exit(allOk ? 0 : 1);

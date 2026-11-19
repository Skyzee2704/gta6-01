// SOLMAR 3D — Streets of Gold, gta6-01 entry (Node 22, standard library
// only). The game is this directory's game/ folder: plain static files a
// desktop browser loads offline (game/index.html and its ES modules, the
// vendored three.js UMD build, no network request). The program hands it
// in: it copies game/ and screenshots/ from beside this file to /output
// and writes /output/dossier.json, the summary the judge reads, with the
// vendored make.fun library. SOLMAR 3D is a golden-hour open-world crime
// game: drive, steal, race, fight the Vultures, outrun the PCPD, and take
// the crown of Solmar across 6 story jobs.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// Fail loud when the entry has no screenshots: a submission without the
// four staged shots is not submittable, and a silent empty folder would
// only be caught by the judge.
const shotDir = join(out, 'screenshots');
const shots = existsSync(shotDir) ? readdirSync(shotDir).filter((f) => /\.(jpg|jpeg|png)$/i.test(f)) : [];
if (shots.length !== 4) {
  console.error(`expected exactly 4 screenshots, found ${shots.length}: ${shots.join(', ')}`);
  process.exit(1);
}
for (const f of shots) {
  const size = statSync(join(shotDir, f)).size;
  if (size > 262144) {
    console.error(`screenshot ${f} is ${size} bytes, over the 262144 cap`);
    process.exit(1);
  }
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log(`SOLMAR 3D v4 dossier written: ${shots.length} screenshots, game/ + dossier.json in ${out}`);

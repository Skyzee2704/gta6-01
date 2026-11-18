// SOLMAR 3D — hand-in program (Node 22, standard library only).
// Copies game/ and screenshots/ beside this file to /output and writes
// /output/dossier.json with the vendored make.fun library.
//
// Gate (refuses a bad hand-in, exit 1, message "refusing to hand in"):
//   - game/index.html, game/src/main.js, game/src/render.js, game/src/city.js exist
//   - screenshots/ holds 3-4 images, nothing else, cover starts with "1-"
//   - dossier caps, written in the comment below, are enforced by buildDossier:
//     dossier text 163840 bytes; screenshots max 4, each max 262144 bytes;
//     game/ max 993 files and 48 MiB; any game/ path max 1000 bytes;
//     /output total max 1000 entries and 64 MiB.
//
// Run it outside the grader with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function refuse(reason) {
  console.error(`refusing to hand in: ${reason}`);
  process.exit(1);
}

const required = ['game/index.html', 'game/src/main.js', 'game/src/render.js', 'game/src/city.js', 'game/src/world.js', 'game/src/data.js'];
for (const file of required) {
  if (!existsSync(join(here, file))) refuse(`missing required file ${file}`);
}

const shotsDir = join(here, 'screenshots');
if (!existsSync(shotsDir)) refuse('missing screenshots/ directory');
const shots = readdirSync(shotsDir).filter((name) => !name.startsWith('.')).sort();
if (shots.length < 3 || shots.length > 4) refuse(`screenshots/ holds ${shots.length} images, need 3-4`);
for (const name of shots) {
  const full = join(shotsDir, name);
  if (!statSync(full).isFile()) refuse(`screenshots/${name} is not a regular file`);
  if (!/\.(png|jpe?g)$/i.test(name)) refuse(`screenshots/${name} is not a PNG or JPEG`);
  if (statSync(full).size > 262144) refuse(`screenshots/${name} is over 256 KiB`);
}
if (!shots[0].startsWith('1-')) refuse(`cover screenshot ${shots[0]} does not start with 1-`);

// The last submit was rejected partly because artifacts/shots.json and
// artifacts/video.json held stale prototype content the builder never
// wrote. This rebuild commits no artifacts/*.json at all — refuse the
// hand-in if either file is present, so a stale metadata file can never
// reach the scorer again.
for (const bad of ['artifacts/shots.json', 'artifacts/video.json']) {
  if (existsSync(join(here, bad))) refuse(`${bad} must not exist (stale metadata killed the last submit)`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

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
console.log(`handed in SOLMAR 3D: ${shots.length} screenshots, dossier written to ${join(out, 'dossier.json')}`);

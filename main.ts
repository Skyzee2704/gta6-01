// SOLMAR — Streets of Gold, handed in for make.fun's gta6-01 bounty.
// Node 22, standard library only: nothing is installed before this runs.
// It gathers the entry — game/ and screenshots/ from beside this file —
// into the output directory and writes the dossier the judge reads, using
// the vendored make.fun library so the dossier is byte for byte the one
// the gate rebuilds itself.
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR standing in for
// /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Play the game locally first with `node serve.ts`, then open
// http://localhost:8080.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps (gate.json): text_max_bytes shapes the dossier's
// text; the rest refuse an entry the scorer would refuse — more than four
// screenshots or one over 256 KiB, more than 993 files or 48 MiB under
// game/, or a path under game/ over 1000 bytes. game/ counts beside
// /output's own 1000-entry cap, its screenshots/ and dossier.json.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copyTree(from, to) {
  cpSync(from, to, { recursive: true });
}

function stageEntry() {
  mkdirSync(outputDir, { recursive: true });
  const gameOut = join(outputDir, 'game');
  const shotsOut = join(outputDir, 'screenshots');
  if (existsSync(gameOut)) rmSync(gameOut, { recursive: true, force: true });
  if (existsSync(shotsOut)) rmSync(shotsOut, { recursive: true, force: true });
  copyTree(join(repoRoot, 'game'), gameOut);
  mkdirSync(shotsOut, { recursive: true });
  const shotsIn = join(repoRoot, 'screenshots');
  if (existsSync(shotsIn)) copyTree(shotsIn, shotsOut);
}

function writeDossier() {
  const dossier = buildDossier(outputDir, DOSSIER_CAPS);
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
}

stageEntry();
writeDossier();

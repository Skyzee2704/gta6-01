import { cpSync, existsSync, mkdirSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Text: 160 KiB; screenshots: four, each at most 256 KiB.
const TEXT_MAX_BYTES = 163840;
const SCREENSHOTS_MAX = 4;
const SCREENSHOT_MAX_BYTES = 262144;
// Game: 993 entries, 48 MiB total, paths at most 1000 UTF-8 bytes.
const GAME_MAX_FILES = 993;
const GAME_MAX_BYTES = 50331648;
const GAME_PATH_MAX_BYTES = 1000;
const root = fileURLToPath(new URL('.', import.meta.url));
const output = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function refuse(reason: string): never {
  console.error(`refusing to hand in: ${reason}`);
  process.exit(1);
}

function gate() {
  const required = [
    'index.html', 'src/main.js', 'src/render.js', 'src/city.js',
    'src/buildings.js', 'src/materials.js', 'src/props.js',
  ];
  for (const name of required) {
    const path = join(root, 'game', name);
    if (!existsSync(path) || !statSync(path).isFile()) {
      refuse(`game/${name} is missing or is not a regular file`);
    }
  }
  const directory = join(root, 'screenshots');
  if (!existsSync(directory) || !statSync(directory).isDirectory()) {
    refuse('screenshots/ is missing or is not a directory');
  }
  const names = readdirSync(directory).sort();
  if (names.length < 3 || names.length > SCREENSHOTS_MAX) {
    refuse(`screenshots/ must contain 3 to 4 images; found ${names.length}`);
  }
  if (!names[0].startsWith('1-')) refuse('first screenshot name must start with 1-');
  for (const name of names) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._ -]{0,127}$/.test(name) || !/\.(png|jpe?g)$/i.test(name)) {
      refuse(`screenshots/${name} must have a valid PNG or JPEG filename`);
    }
    const info = statSync(join(directory, name));
    if (!info.isFile()) refuse(`screenshots/${name} is not an image file`);
    if (info.size > SCREENSHOT_MAX_BYTES) {
      refuse(`screenshots/${name} exceeds ${SCREENSHOT_MAX_BYTES} bytes`);
    }
  }
}

try {
  gate();
} catch (error) {
  refuse(error instanceof Error ? error.message : String(error));
}
mkdirSync(output, { recursive: true });
cpSync(join(root, 'game'), join(output, 'game'), { recursive: true });
mkdirSync(join(output, 'screenshots'), { recursive: true });
cpSync(join(root, 'screenshots'), join(output, 'screenshots'), { recursive: true });
writeFileSync(join(output, 'dossier.json'), buildDossier(output, {
  text_max_bytes: TEXT_MAX_BYTES,
  screenshots: { max: SCREENSHOTS_MAX, max_bytes: SCREENSHOT_MAX_BYTES },
  game_max_files: GAME_MAX_FILES,
  game_max_bytes: GAME_MAX_BYTES,
  game_path_max_bytes: GAME_PATH_MAX_BYTES,
}));

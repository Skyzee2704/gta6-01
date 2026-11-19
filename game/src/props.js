// Street furniture: kiosks, billboards, bus shelters with lit ads, beach
// umbrellas and sun loungers, surfboards, mast-arm traffic signals, benches,
// hydrants and bins. Placed along roads and the beach, never on a road.
import { WORLD } from './config.js';
import { createRandom, floatBetween, intBetween, pick, dist2d } from './random.js';

export function generateProps(city, seed) {
  const random = createRandom(seed * 31 + 7);
  const props = [];
  const cx = WORLD.centreX;
  const cz = WORLD.centreY;

  function add(kind, x, z, extra) {
    props.push({ kind, x, z, ...extra });
  }

  // Marina Boulevard furniture: the cover frame gets a kiosk and a billboard.
  for (let x = 160; x <= 500; x += 42) {
    add('bench', x + 3, 402, { rot: 0 });
    if (random() < 0.6) add('bin', x + 8, 401, {});
  }
  add('kiosk', 356, 404, { rot: 0.1, color: '#e8b400' });
  add('billboard', 420, 406, { rot: 0, text: 'SOLMAR', neon: '#ff4fd8' });
  add('billboard', 240, 406, { rot: 0, text: 'GOLDEN HOUR', neon: '#37e6ff' });
  add('shelter', 300, 404, { rot: 0, ad: 'VISIT PALMA BEACH' });
  add('shelter', 460, 404, { rot: 0, ad: 'FUEGO 101.2' });

  // Beach furniture on the south shore.
  for (let i = 0; i < 14; i += 1) {
    const x = 150 + random() * 340;
    const z = 408 + random() * 14;
    add('umbrella', x, z, { color: pick(random, ['#ff4fd8', '#37e6ff', '#ffb02e', '#f0f0e8']) });
    if (random() < 0.7) add('lounger', x + 2.5, z + 1.5, { rot: random() * 0.6 });
    if (random() < 0.4) add('surfboard', x - 3, z + 2, { color: pick(random, ['#c22e2e', '#2e5fa3', '#e8b400']) });
  }

  // Mast-arm traffic signals at the ring-road crossings.
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2 + 0.26;
    add('signal', cx + Math.cos(a) * 150, cz + Math.sin(a) * 150 * 0.75, { rot: a });
  }

  // Hydrants and bins scattered through downtown.
  for (let i = 0; i < 22; i += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 30 + random() * 120;
    const x = cx + Math.cos(angle) * radius;
    const z = cz + Math.sin(angle) * radius * 0.75;
    if (dist2d(x, z, cx, cz) > WORLD.landRadius - 20) continue;
    add(random() < 0.5 ? 'hydrant' : 'bin', x, z, {});
  }

  // Neon Mile shopfront signs.
  for (let i = 0; i < 8; i += 1) {
    add('neon-sign', 430 + floatBetween(random, -14, 14), 226 + floatBetween(random, -14, 14), {
      text: pick(random, ['DINER', 'BAR', 'TATTOO', 'ARCADE', 'HOTEL', 'CLUB']),
      neon: pick(random, ['#ff4fd8', '#37e6ff', '#ffb02e']),
    });
  }

  return props;
}

/** How many furniture pieces of each kind exist (for the cityCheck gate). */
export function propCounts(props) {
  const counts = {};
  for (const p of props) counts[p.kind] = (counts[p.kind] || 0) + 1;
  return counts;
}

export function countKind(props, kind) {
  let n = 0;
  for (const p of props) if (p.kind === kind) n += 1;
  return n;
}

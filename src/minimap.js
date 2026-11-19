// The minimap: a round radar that turns with the player's heading, with
// a health arc and an armour arc on its rim, a respect ring, mission blips
// that stick to the edge when they are out of range, and the police search
// zone as a shaded area while wanted is active. Round, like the island;
// the radar is a map of the disc, not a square window onto it.
import { WORLD } from './config.js';
import { districtAt } from './city.js';
import { dist2d } from './random.js';

export function createMinimap(canvas) {
  return { canvas, ctx: canvas.getContext('2d'), range: 130 };
}

/** Draw the radar. `blips` is a list of {x, z, color, kind}. */
export function drawMinimap(map, state, blips) {
  const { ctx, canvas, range } = map;
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) / 2 - 4;
  const player = state.player;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  // Ground: land disc, sea ring, roads as faint lines.
  ctx.fillStyle = '#1d4e6b';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#3a5a3a';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,200,200,0.5)';
  ctx.lineWidth = 2;
  for (const road of state.city.roads) {
    const ax = cx + ((road.x1 - player.x) / range) * r;
    const ay = cy + ((road.z1 - player.z) / range) * r;
    const bx = cx + ((road.x2 - player.x) / range) * r;
    const by = cy + ((road.z2 - player.z) / range) * r;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }

  // Police search zone: a shaded circle while wanted is active.
  if (player.wanted > 0) {
    ctx.fillStyle = 'rgba(255,59,48,0.18)';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,59,48,0.7)';
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Blips, clamped to the rim when they are out of range.
  for (const blip of blips || []) {
    let dx = (blip.x - player.x) / range;
    let dz = (blip.z - player.z) / range;
    const d = Math.hypot(dx, dz);
    if (d > 0.92) { dx = (dx / d) * 0.92; dz = (dz / d) * 0.92; }
    ctx.fillStyle = blip.color || '#ffd23e';
    ctx.beginPath();
    ctx.arc(cx + dx * r, cy + dz * r, blip.kind === 'mission' ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // The player is a white arrow in the middle, pointing up the heading.
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 8);
  ctx.lineTo(cx + 5, cy + 6);
  ctx.lineTo(cx - 5, cy + 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Rim: health arc in green, armour arc in blue, respect ring in gold.
  const rim = r + 2;
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#2ecc71';
  ctx.beginPath();
  ctx.arc(cx, cy, rim, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * player.health) / 100);
  ctx.stroke();
  ctx.strokeStyle = '#3a7bff';
  ctx.beginPath();
  ctx.arc(cx, cy, rim + 5, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * (player.armor || 0)) / 100);
  ctx.stroke();
  ctx.strokeStyle = '#ffb02e';
  ctx.beginPath();
  ctx.arc(cx, cy, rim + 10, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * Math.min(1, (state.economy.respect || 0) / 3800)));
  ctx.stroke();

  // District name under the radar.
  const district = districtAt(player.x, player.z);
  ctx.fillStyle = '#f5efe4';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(district.name, cx, h - 6);
  return district;
}

/** Blips for the current frame: mission, police, postcards, shops. */
export function minimapBlips(state) {
  const blips = [];
  const step = state.missions.active ? state.missions.active.steps[state.missions.stepIndex] : null;
  if (step) blips.push({ x: step.x, z: step.y, color: '#ffd23e', kind: 'mission' });
  for (const unit of state.police) blips.push({ x: unit.x, z: unit.z, color: '#3a7bff', kind: 'police' });
  for (const card of (state.postcardsFound || []).length < 20 ? [] : []) blips.push({ x: card.x, z: card.y, color: '#37e6ff', kind: 'postcard' });
  return blips;
}

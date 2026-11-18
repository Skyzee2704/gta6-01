// Minimap + city map: GTA San Andreas style round island. Ellipse coastline
// (rx 400, rz 300) with a deterministic sine-wobble, radial sea-depth
// gradient, sand beach ring, coastal ring road with a dashed centre line,
// road hierarchy, district labels drawn AFTER restore (never clipped).
import { DISTRICTS, RACES } from './data.js';
import { ROAD_X, ROAD_Z } from './city.js';

const SEA = ['#2a7a9e', '#1f6f8a', '#0e4a66'];
const LAND = '#c9d6b8';
const SAND = '#e8d29a';

// Wobbled island outline centred at (cx, cy) with radii (rx, rz), scaled by k.
export function islandOutline(ctx, cx, cy, rx, rz, k) {
  ctx.beginPath();
  for (let a = 0; a <= Math.PI * 2 + 0.001; a += Math.PI / 48) {
    const wob = 1 + 0.02 * Math.sin(a * 5) + 0.012 * Math.sin(a * 9 + 1.7);
    const x = cx + Math.cos(a) * rx * wob * k;
    const y = cy + Math.sin(a) * rz * wob * k;
    if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function drawCityMap(ctx, state, city, w, h, rotate) {
  const cx = w / 2, cy = h / 2;
  const s = Math.min(w / 860, h / 660);
  const X = x => cx + x * s, Z = z => cy + z * s;
  // Rotating radar: the whole map turns so the player's heading is up.
  if (rotate) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(rotate); ctx.translate(-cx, -cy); }
  // Sea: radial depth gradient (shallow teal near the island, deep navy out).
  const sea = ctx.createRadialGradient(cx, cy, 60 * s, cx, cy, Math.max(w, h) * 0.62);
  sea.addColorStop(0, SEA[0]); sea.addColorStop(0.55, SEA[1]); sea.addColorStop(1, SEA[2]);
  ctx.fillStyle = sea; ctx.fillRect(0, 0, w, h);
  // Land: sand beach ring (outer) + land (inner).
  islandOutline(ctx, cx, cy, 400 * s, 300 * s, 1); ctx.fillStyle = SAND; ctx.fill();
  islandOutline(ctx, cx, cy, 400 * s, 300 * s, 0.965); ctx.fillStyle = LAND; ctx.fill();
  // Terrain patches (deterministic, 6).
  const patches = [[-180, -120, 90, 60, '#b8c89a'], [120, 100, 110, 70, '#d8cba0'], [40, -160, 80, 50, '#b8c89a'], [-240, 80, 70, 50, '#cbb98a'], [200, -80, 90, 55, '#b8c89a'], [-60, 160, 100, 55, '#d8cba0']];
  ctx.save();
  islandOutline(ctx, cx, cy, 400 * s, 300 * s, 0.965); ctx.clip();
  for (const [px, pz, prx, prz, col] of patches) {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(X(px), Z(pz), prx * s, prz * s, 0, 0, Math.PI * 2); ctx.fill();
  }
  // Coastal ring road (0.94) with a dashed centre line.
  islandOutline(ctx, cx, cy, 400 * s, 300 * s, 0.94);
  ctx.strokeStyle = '#4a4a52'; ctx.lineWidth = Math.max(2, 4 * s); ctx.stroke();
  islandOutline(ctx, cx, cy, 400 * s, 300 * s, 0.94);
  ctx.strokeStyle = '#f5ead2'; ctx.lineWidth = Math.max(1, 1.2 * s);
  ctx.setLineDash([6 * s, 6 * s]); ctx.stroke(); ctx.setLineDash([]);
  // Road hierarchy: arterials thick, streets thin.
  ctx.strokeStyle = '#555'; ctx.lineCap = 'round';
  for (const x of ROAD_X) { ctx.lineWidth = Math.abs(x) % 120 === 0 ? Math.max(2, 3.5 * s) : Math.max(1.5, 2.2 * s); ctx.beginPath(); ctx.moveTo(X(x), Z(-240)); ctx.lineTo(X(x), Z(240)); ctx.stroke(); }
  for (const z of ROAD_Z) { ctx.lineWidth = Math.abs(z) % 120 === 0 ? Math.max(2, 3.5 * s) : Math.max(1.5, 2.2 * s); ctx.beginPath(); ctx.moveTo(X(-320), Z(z)); ctx.lineTo(X(320), Z(z)); ctx.stroke(); }
  // Buildings.
  for (const b of city.buildings) {
    ctx.fillStyle = b.district === 'downtown' ? '#5a6a7a' : '#3a3f46';
    ctx.fillRect(X(b.x - b.w / 2), Z(b.z - b.d / 2), Math.max(1, b.w * s), Math.max(1, b.d * s));
  }
  // Search zone (blinking).
  const wz = state.wanted;
  if (wz.level > 0 && Math.floor(state.time * 2) % 2 === 0) {
    ctx.strokeStyle = '#ff4f4f'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(X(wz.searchX), Z(wz.searchZ), wz.searchR * s, 0, Math.PI * 2); ctx.stroke();
  }
  // Mission waypoint.
  if (state.mission.active) {
    const def = { 1: [-180, 60], 2: [120, -160], 3: [-260, 200], 4: [-180, 60], 5: [-200, -180], 6: [-260, 190] }[state.mission.id];
    if (def) { ctx.fillStyle = '#ffc94d'; ctx.beginPath(); ctx.arc(X(def[0]), Z(def[1]), Math.max(3, 6 * s), 0, Math.PI * 2); ctx.fill(); }
  }
  for (const c of state.cops) { ctx.fillStyle = '#4a7ad8'; ctx.beginPath(); ctx.arc(X(c.x), Z(c.z), Math.max(2, 4 * s), 0, Math.PI * 2); ctx.fill(); }
  for (const t of city.tapes) if (!t.taken) { ctx.fillStyle = '#ff4fa3'; ctx.fillRect(X(t.x) - 2, Z(t.z) - 2, 4, 4); }
  // Race checkpoints (lit gates) when a race is active.
  if (state.race.active) {
    const def = RACES.find(q => q.id === state.race.id);
    if (def) {
      ctx.fillStyle = '#2ee6c8';
      for (const cp of def.checkpoints) {
        ctx.beginPath(); ctx.arc(X(cp[0]), Z(cp[1]), Math.max(2, 4 * s), 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  ctx.restore();
  // Player arrow + heading tick (never clipped).
  const p = state.player;
  ctx.fillStyle = '#ffc94d';
  ctx.beginPath(); ctx.arc(X(p.x), Z(p.z), Math.max(3, 6 * s), 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1.5, 2 * s);
  ctx.beginPath(); ctx.moveTo(X(p.x), Z(p.z)); ctx.lineTo(X(p.x) + Math.sin(p.heading) * 12 * s, Z(p.z) + Math.cos(p.heading) * 12 * s); ctx.stroke();
  // District labels AFTER restore (never clipped).
  const labels = { marina: [-80, 200], old: [-220, 0], neon: [180, 20], harbor: [260, -60], palm: [-220, -160], downtown: [0, -170] };
  ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.max(10, Math.round(11 * s * 1.6))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  for (const d of DISTRICTS) {
    const lb = labels[d.id];
    if (lb) ctx.fillText(d.name, X(lb[0]), Z(lb[1]));
  }
  if (rotate) ctx.restore();
}

export function createMinimap(state, city) {
  const canvas = document.getElementById('minimap');
  const ctx = canvas.getContext('2d');
  function draw() {
    // Heading-up rotating radar: the map turns so the player's heading is up.
    drawCityMap(ctx, state, city, canvas.width, canvas.height, -state.player.heading);
    // Health / armor arcs + respect ring around the radar edge.
    const cx = canvas.width / 2, cy = canvas.height / 2, r = Math.min(canvas.width, canvas.height) / 2 - 4;
    const p = state.player;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#2ee66b';
    ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, p.health / 100))); ctx.stroke();
    ctx.strokeStyle = '#4a9ad8';
    ctx.beginPath(); ctx.arc(cx, cy, r - 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, (p.armor || 0) / 100))); ctx.stroke();
    ctx.strokeStyle = '#ffc94d'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r - 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, (state.respect || 0) / 100))); ctx.stroke();
  }
  return { draw };
}

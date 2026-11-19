// SOLMAR 3D — the minimap. Round, like the island; it rotates so the
// player's heading is always up. Water ring, roads, the mission marker,
// police dots, the search zone — and the P1 fix: label collision
// resolution. Each label tries an offset ladder [0, ±16, ±32, ±48,
// ±64] and takes the first spot that does not overlap a label already
// placed, so "Penthouse Tower" is never hidden under "Downtown Bank"
// again.
import { drawPortrait } from './portraits.js';

const OFFSET_LADDER = [0, 16, -16, 32, -32, 48, -48, 64, -64];

export function drawMinimap(ctx, state, cx, cy, radius) {
  const p = state.player;
  const view = 110; // world units visible across the radius
  const scale = radius / view;
  ctx.save();
  // Round clip.
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  // Water background, then the island disc.
  ctx.fillStyle = '#1a3a55';
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-p.heading);
  ctx.scale(scale, scale);
  ctx.translate(-p.x, -p.z);
  // Island.
  ctx.fillStyle = '#4a6a3f';
  ctx.beginPath();
  ctx.arc(0, 0, 232, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d8c48f';
  ctx.beginPath();
  ctx.arc(0, 0, 232, 0, Math.PI * 2);
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#d8c48f';
  ctx.stroke();
  // Roads.
  ctx.strokeStyle = '#232326';
  ctx.lineWidth = 10;
  ctx.lineJoin = 'round';
  for (const road of state.city.roads) {
    ctx.beginPath();
    road.points.forEach(([x, z], i) => {
      if (i === 0) ctx.moveTo(x, z);
      else ctx.lineTo(x, z);
    });
    ctx.stroke();
  }
  // Search zone, when the police are hunting.
  if (state.police.searchZone) {
    const sz = state.police.searchZone;
    ctx.fillStyle = 'rgba(216,58,42,0.25)';
    ctx.beginPath();
    ctx.arc(sz.x, sz.z, sz.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d83a2a';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // Mission marker.
  if (state.missions.marker) {
    const m = state.missions.marker;
    ctx.fillStyle = '#ffd34a';
    ctx.save();
    ctx.translate(m.x, m.z);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-6, -6, 12, 12);
    ctx.restore();
  }
  // Police units: blue dots. Heli: red dot.
  for (const u of state.police.units) {
    ctx.fillStyle = '#4a8ad8';
    ctx.beginPath();
    ctx.arc(u.x, u.z, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  if (state.police.heli) {
    ctx.fillStyle = '#ff4a4a';
    ctx.beginPath();
    ctx.arc(state.police.heli.x, state.police.heli.z, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Postcards not yet found.
  ctx.fillStyle = '#ffd34a';
  for (const pc of state.city.postcards) {
    if (state.postcardsFound.has(pc.id)) continue;
    ctx.beginPath();
    ctx.arc(pc.x, pc.z, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // The player arrow, always pointing up in the middle.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 10);
  ctx.lineTo(cx - 7, cy + 7);
  ctx.lineTo(cx + 7, cy + 7);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#16121a';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Rim + north tick.
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(242,234,216,0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#ffd34a';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('N', cx, cy - radius + 14);
  // Labels, in screen space, collision-resolved.
  drawMinimapLabels(ctx, state, cx, cy, radius, scale, view);
  ctx.restore();
}

function worldToMinimap(state, x, z, cx, cy, scale) {
  const p = state.player;
  const dx = x - p.x;
  const dz = z - p.z;
  const cos = Math.cos(-p.heading);
  const sin = Math.sin(-p.heading);
  const rx = dx * cos - dz * sin;
  const rz = dx * sin + dz * cos;
  return { x: cx + rx * scale, y: cy + rz * scale };
}

function drawMinimapLabels(ctx, state, cx, cy, radius, scale, view) {
  ctx.font = 'bold 11px Arial';
  ctx.textAlign = 'left';
  const placed = [];
  const labels = [];
  for (const lm of state.city.landmarks) {
    labels.push({ name: lm.name, x: lm.x, z: lm.z, priority: lm.id === 'penthouse' ? 0 : 1 });
  }
  labels.push({ name: 'Marina Boulevard', x: 182, z: 40, priority: 2 });
  labels.push({ name: 'Neon Mile', x: -60, z: 40, priority: 2 });
  labels.push({ name: 'Gold Street', x: -8, z: -60, priority: 2 });
  labels.sort((a, b) => a.priority - b.priority);
  for (const lb of labels) {
    const pos = worldToMinimap(state, lb.x, lb.z, cx, cy, scale);
    if (Math.hypot(pos.x - cx, pos.y - cy) > radius - 8) continue;
    const w = ctx.measureText(lb.name).width;
    const h = 12;
    let placedRect = null;
    for (const off of OFFSET_LADDER) {
      const rect = { x: pos.x + 8, y: pos.y - 6 + off, w: w + 4, h };
      // Clamp inside the minimap CIRCLE before the overlap test, so a
      // placed label is guaranteed both visible and non-overlapping.
      // The circle narrows toward its top and bottom, so the allowed
      // width is the circle's half-width at the label's own height —
      // a square (cx±radius) clamp let "The Lighthouse" sit at the
      // top where the circle is only ~41 px wide, and the clip cut
      // it mid-word. An offset whose height cannot fit the label is
      // skipped, and the ladder tries a lower one where the circle
      // is wider.
      const midY = rect.y + rect.h / 2;
      const dy = midY - cy;
      if (Math.abs(dy) >= radius - 4) continue;
      const hw = Math.sqrt(radius * radius - dy * dy);
      if (rect.w > 2 * hw - 8) continue;
      rect.x = Math.max(cx - hw + 4, Math.min(rect.x, cx + hw - rect.w - 4));
      rect.y = Math.max(cy - radius + 4, Math.min(rect.y, cy + radius - rect.h - 4));
      const overlaps = placed.some((r) =>
        rect.x < r.x + r.w && rect.x + rect.w > r.x &&
        rect.y < r.y + r.h && rect.y + rect.h > r.y);
      if (!overlaps) {
        placedRect = rect;
        break;
      }
    }
    if (!placedRect) continue;
    placed.push(placedRect);
    ctx.fillStyle = 'rgba(16,14,24,0.75)';
    ctx.fillRect(placedRect.x - 2, placedRect.y - 1, placedRect.w, placedRect.h);
    ctx.fillStyle = '#f2ead8';
    ctx.fillText(lb.name, placedRect.x, placedRect.y + 10);
  }
}

export function drawMinimapPortrait(ctx, state, x, y, size) {
  drawPortrait(ctx, 'milo', x, y, size);
}

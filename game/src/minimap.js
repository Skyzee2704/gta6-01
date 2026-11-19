// SOLMAR 3D — round rotating radar minimap. Roads, district blocks,
// mission blip clamped to the edge, police search zone shaded, health
// green arc + armor blue arc on the rim, respect ring. Canvas 2D.
import { WORLD_W, WORLD_H } from './config.js';

export function drawMinimap(canvas, state) {
  const ctx = canvas.getContext('2d');
  const S = canvas.width;
  const C = S / 2;
  const R = C - 4;
  ctx.clearRect(0, 0, S, S);
  ctx.save();
  ctx.beginPath();
  ctx.arc(C, C, R, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#101418';
  ctx.fillRect(0, 0, S, S);
  const scale = (S - 16) / Math.max(WORLD_W, WORLD_H);
  const heading = state.heading || 0;
  ctx.translate(C, C);
  ctx.rotate(-heading);
  ctx.translate(-state.x * scale, -state.y * scale);
  if (state.searchZone) {
    ctx.fillStyle = 'rgba(255, 46, 46, 0.25)';
    ctx.beginPath();
    ctx.arc(state.searchZone.x * scale, state.searchZone.y * scale, state.searchZone.r * scale, 0, Math.PI * 2);
    ctx.fill();
  }
  if (state.city) {
    ctx.strokeStyle = '#3a4048';
    ctx.lineWidth = 5;
    for (const s of state.city.streets) {
      ctx.beginPath();
      if (s.axis === 'h') {
        ctx.moveTo(0, s.at * scale);
        ctx.lineTo(WORLD_W * scale, s.at * scale);
      } else {
        ctx.moveTo(s.at * scale, 0);
        ctx.lineTo(s.at * scale, WORLD_H * scale);
      }
      ctx.stroke();
    }
    ctx.fillStyle = '#2a3542';
    for (const b of state.city.buildings) {
      ctx.fillRect((b.x - b.w / 2) * scale, (b.y - b.d / 2) * scale, b.w * scale, b.d * scale);
    }
  }
  ctx.fillStyle = '#2a7a8c';
  ctx.fillRect(0, WORLD_H * scale, WORLD_W * scale, 40 * scale);
  if (state.missionBlip) {
    const bx = state.missionBlip.x * scale;
    const by = state.missionBlip.y * scale;
    ctx.fillStyle = '#ffd27a';
    ctx.beginPath();
    ctx.arc(bx, by, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const u of state.police || []) {
    ctx.fillStyle = '#4da6ff';
    ctx.beginPath();
    ctx.arc(u.x * scale, u.y * scale, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const v of state.vultures || []) {
    ctx.fillStyle = '#ff2e2e';
    ctx.beginPath();
    ctx.arc(v.x * scale, v.y * scale, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(C, C, R, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffd27a';
  ctx.lineWidth = 3;
  ctx.stroke();
  const health = Math.max(0, Math.min(1, (state.health || 100) / 100));
  ctx.beginPath();
  ctx.arc(C, C, R - 5, -Math.PI / 2, -Math.PI / 2 + health * Math.PI * 2);
  ctx.strokeStyle = '#2ee85c';
  ctx.lineWidth = 5;
  ctx.stroke();
  const armor = Math.max(0, Math.min(1, (state.armor || 0) / 100));
  if (armor > 0) {
    ctx.beginPath();
    ctx.arc(C, C, R - 11, -Math.PI / 2, -Math.PI / 2 + armor * Math.PI * 2);
    ctx.strokeStyle = '#4da6ff';
    ctx.lineWidth = 5;
    ctx.stroke();
  }
  const respect = Math.max(0, Math.min(1, (state.respect || 0) / 3000));
  ctx.beginPath();
  ctx.arc(C, C, R - 17, -Math.PI / 2, -Math.PI / 2 + respect * Math.PI * 2);
  ctx.strokeStyle = '#e0a030';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#ffd27a';
  ctx.beginPath();
  ctx.moveTo(C, C - 8);
  ctx.lineTo(C - 5, C + 6);
  ctx.lineTo(C + 5, C + 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  return canvas;
}

export function clampBlip(x, y, cx, cy, maxR) {
  const dx = x - cx;
  const dy = y - cy;
  const d = Math.hypot(dx, dy);
  if (d <= maxR) return { x, y, clamped: false };
  return { x: cx + (dx / d) * maxR, y: cy + (dy / d) * maxR, clamped: true };
}

export function drawCityMap(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = '#e8e0d0';
  ctx.fillRect(0, 0, W, H);
  const sx = W / WORLD_W;
  const sy = H / WORLD_H;
  ctx.fillStyle = '#e0c890';
  ctx.fillRect(0, 430 * sy, W, 35 * sy);
  ctx.fillStyle = '#7fb8d8';
  ctx.fillRect(0, 465 * sy, W, 15 * sy);
  ctx.fillStyle = '#3f7a3a';
  ctx.fillRect(W * 0.62, H * 0.55, W * 0.2, H * 0.2);
  if (state.city) {
    for (const b of state.city.buildings) {
      ctx.fillStyle = '#7a7568';
      ctx.fillRect((b.x - b.w / 2) * sx, (b.y - b.d / 2) * sy, b.w * sx, b.d * sy);
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    for (const s of state.city.streets) {
      ctx.beginPath();
      if (s.axis === 'h') {
        ctx.moveTo(0, s.at * sy);
        ctx.lineTo(W, s.at * sy);
      } else {
        ctx.moveTo(s.at * sx, 0);
        ctx.lineTo(s.at * sx, H);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = '#b8b0a0';
    ctx.lineWidth = 1;
    for (const s of state.city.streets) {
      ctx.beginPath();
      if (s.axis === 'h') {
        ctx.moveTo(0, s.at * sy - 3);
        ctx.lineTo(W, s.at * sy - 3);
        ctx.moveTo(0, s.at * sy + 3);
        ctx.lineTo(W, s.at * sy + 3);
      } else {
        ctx.moveTo(s.at * sx - 3, 0);
        ctx.lineTo(s.at * sx - 3, H);
        ctx.moveTo(s.at * sx + 3, 0);
        ctx.lineTo(s.at * sx + 3, H);
      }
      ctx.stroke();
    }
    ctx.fillStyle = '#141416';
    ctx.font = 'bold 13px sans-serif';
    // P1-1 (2026-11-19): landmark labels must never overlap. Bank (520,90)
    // and penthouse share a point, diner (300,80) sits 10 units above bank —
    // the old code drew every label on its point and "Downtown Bank Tower"
    // printed over "Neon Mile Diner". Try offsets in order (0, +16, -16,
    // +32, -32, ...) and take the first whose box clears every label placed
    // before it. Deterministic: same order, same font, same result.
    const placedLabels = [];
    for (const lm of state.city.landmarks) {
      const lx = lm.x * sx;
      const baseLy = lm.y * sy;
      const text = '◆ ' + lm.name;
      const w = ctx.measureText(text).width;
      const right = lx > W * 0.72;
      const x0 = right ? lx - 4 - w : lx + 4;
      let ly = baseLy;
      for (const dy of [0, 16, -16, 32, -32, 48, -48, 64, -64]) {
        const tryLy = Math.max(12, Math.min(H - 4, baseLy + dy));
        const box = { x0, y0: tryLy - 11, x1: x0 + w, y1: tryLy + 4 };
        if (!placedLabels.some((p) => box.x0 < p.x1 && box.x1 > p.x0 && box.y0 < p.y1 && box.y1 > p.y0)) {
          ly = tryLy;
          placedLabels.push(box);
          break;
        }
        ly = tryLy;
      }
      if (right) {
        ctx.textAlign = 'right';
        ctx.fillText(text, lx - 4, ly);
        ctx.textAlign = 'left';
      } else {
        ctx.fillText(text, lx + 4, ly);
      }
    }
  }
  ctx.strokeStyle = 'rgba(242, 240, 232, 0.5)';
  ctx.lineWidth = 1;
  ctx.font = '11px sans-serif';
  const cols = ['A', 'B', 'C', 'D', 'E', 'F'];
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = '#ffd27a';
    ctx.fillText(cols[i], (i + 0.5) * (W / 6) - 4, 14);
    ctx.fillText(String(i + 1), 4, (i + 0.5) * (H / 6) + 4);
    ctx.beginPath();
    ctx.moveTo((i + 1) * (W / 6), 0);
    ctx.lineTo((i + 1) * (W / 6), H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, (i + 1) * (H / 6));
    ctx.lineTo(W, (i + 1) * (H / 6));
    ctx.stroke();
  }
  if (state.player) {
    ctx.fillStyle = '#ffd27a';
    ctx.beginPath();
    ctx.arc(state.player.x * sx, state.player.y * sy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#141416';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  return canvas;
}

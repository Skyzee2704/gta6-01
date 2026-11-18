// minimap.js — the round, rotating radar. A circular canvas in the
// corner of the screen. The map rotates so the player's heading is up
// (like GTA), the island is an ellipse, roads are lines, and the player
// is the triangle in the center. Missions, shops, and the race route
// are blips. The same drawing is used by the big map (M key) at a
// larger size.

import { ROAD_XS, ROAD_ZS } from './config.js';

// The island bounds (match city.js).
const MAP_MIN_X = -340;const MAP_MAX_X = 340;
const MAP_MIN_Z = -260;
const MAP_MAX_Z = 260;

function worldToMap(x, z, size, range) {
  const mx = ((x - MAP_MIN_X) / (MAP_MAX_X - MAP_MIN_X)) * size;
  const my = ((z - MAP_MIN_Z) / (MAP_MAX_Z - MAP_MIN_Z)) * size;
  return [mx, my];
}

// Draw the radar. `ctx` is a 2D canvas context, `size` the canvas
// width/height (square). `heading` rotates the map so up = forward.
export function drawRadar(ctx, state, world, size, heading) {
  const cx = size / 2;
  const cy = size / 2;
  const range = 140;
  const scale = size / (range * 2);
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  // Circular clip.
  ctx.beginPath();
  ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
  ctx.clip();
  // Background: dark water.
  ctx.fillStyle = '#0a2a3a';
  ctx.fillRect(0, 0, size, size);
  ctx.translate(cx, cy);
  ctx.rotate(-heading);
  ctx.scale(scale, scale);
  ctx.translate(-state.player.x, -state.player.z);
  // Island ellipse (sand).
  ctx.fillStyle = '#c2a878';
  ctx.beginPath();
  ctx.ellipse(0, 0, 320, 240, 0, 0, Math.PI * 2);
  ctx.fill();
  // Roads.
  ctx.strokeStyle = '#3a3a3a';
  ctx.lineWidth = 6;
  for (const x of ROAD_XS) {
    ctx.beginPath();
    ctx.moveTo(x, -240);
    ctx.lineTo(x, 240);
    ctx.stroke();
  }
  for (const z of ROAD_ZS) {
    ctx.beginPath();
    ctx.moveTo(-320, z);
    ctx.lineTo(320, z);
    ctx.stroke();
  }
  // Shops + landmarks.
  const blips = [
    { x: world.city.diner.x, z: world.city.diner.z, color: '#ffd27a', label: 'D' },
    { x: world.city.gunshop.x, z: world.city.gunshop.z, color: '#ff5555', label: 'G' },
    { x: -180, z: 60, color: '#5ad0ff', label: 'W' },
    { x: 280, z: -80, color: '#ffffff', label: 'H' },
    { x: -260, z: 190, color: '#7dff8a', label: 'S' },
  ];
  for (const b of blips) {
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.z, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Mission target.
  const m = state.mission;
  if (m && m.active && m.target) {
    ctx.fillStyle = '#ff00ff';
    ctx.beginPath();
    ctx.arc(m.target.x, m.target.z, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(m.target.x, m.target.z, 10 + Math.sin((state.time || 0) * 4) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Cops (blue) and enemies (red).
  for (const c of state.cops || []) {
    ctx.fillStyle = '#4488ff';
    ctx.beginPath();
    ctx.arc(c.x, c.z, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const e of state.enemies || []) {
    if (!e.alive) continue;
    ctx.fillStyle = '#ff2222';
    ctx.beginPath();
    ctx.arc(e.x, e.z, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Player triangle in the center (points up = forward).
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 8);
  ctx.lineTo(cx - 6, cy + 6);
  ctx.lineTo(cx + 6, cy + 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Ring border.
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
  ctx.stroke();
}

// The big map (M key): the same island, static, with the player and
// blips. Drawn once per frame while open.
export function drawBigMap(ctx, state, world, w, h) {
  ctx.clearRect(0, 0, w, h);
  // A lighter backdrop so the map reads bright (the luma floor is 0.35).
  ctx.fillStyle = '#2a5a7a';
  ctx.fillRect(0, 0, w, h);
  const size = Math.min(w, h) * 0.86;
  const ox = (w - size) / 2;
  const oy = (h - size) / 2;
  ctx.save();
  ctx.translate(ox, oy);
  // Water.
  ctx.fillStyle = '#3a7a9a';
  ctx.fillRect(0, 0, size, size);
  // Island.
  ctx.fillStyle = '#c2a878';
  ctx.beginPath();
  ctx.ellipse(size / 2, size / 2, size * 0.47, size * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  // Roads.
  ctx.strokeStyle = '#5a5a5a';
  ctx.lineWidth = Math.max(2, size * 0.012);
  for (const x of ROAD_XS) {
    const [mx] = worldToMap(x, 0, size, 0);
    ctx.beginPath();
    ctx.moveTo(mx, 0);
    ctx.lineTo(mx, size);
    ctx.stroke();
  }
  for (const z of ROAD_ZS) {
    const [, my] = worldToMap(0, z, size, 0);
    ctx.beginPath();
    ctx.moveTo(0, my);
    ctx.lineTo(size, my);
    ctx.stroke();
  }
  // District labels (white with a dark outline, readable on sand and
  // on water). Positions are inside the island ellipse.
  ctx.font = `bold ${Math.round(size * 0.035)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 3;
  ctx.fillStyle = '#ffffff';
  const labels = [
    { x: -160, z: 200, t: 'MARINA' },
    { x: 0, z: 0, t: 'DOWNTOWN' },
    { x: -220, z: -130, t: 'HILLS' },
    { x: 180, z: 150, t: 'DOCKS' },
    { x: 170, z: -150, t: 'BEACH' },
  ];
  for (const l of labels) {
    const [mx, my] = worldToMap(l.x, l.z, size, 0);
    ctx.strokeText(l.t, mx, my);
    ctx.fillText(l.t, mx, my);
  }
  // Blips.
  const blips = [
    { x: world.city.diner.x, z: world.city.diner.z, color: '#ffd27a', label: 'DINER' },
    { x: world.city.gunshop.x, z: world.city.gunshop.z, color: '#ff5555', label: 'GUN SHOP' },
    { x: -180, z: 60, color: '#5ad0ff', label: 'WORKSHOP' },
    { x: 280, z: -80, color: '#ffffff', label: 'HELIPAD' },
    { x: -260, z: 190, color: '#7dff8a', label: 'SAFEHOUSE' },
  ];
  ctx.font = `bold ${Math.round(size * 0.02)}px sans-serif`;
  for (const b of blips) {
    const [mx, my] = worldToMap(b.x, b.z, size, 0);
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(mx, my, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(b.label, mx, my - 12);
  }
  // Player.
  const [px, py] = worldToMap(state.player.x, state.player.z, size, 0);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px, py - 10);
  ctx.lineTo(px - 8, py + 8);
  ctx.lineTo(px + 8, py + 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

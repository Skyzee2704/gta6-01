// Minimal 2D fallback renderer (Tier B, R-28): a top-down Canvas view of
// the same sim state, used when WebGL is absent — roads as lines, buildings
// as boxes, cars and people as dots and arrows. Press V in the 3D game to
// switch to the top-down camera; this module draws the pure 2D canvas
// version used when WebGL is absent.
export function drawTopDown(ctx, state, city, w, h) {
  const sx = w / 660, sz = h / 500;
  const X = x => (x + 330) * sx, Z = z => (z + 250) * sz;
  ctx.fillStyle = '#1a2a1a'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#2a4a6a'; ctx.fillRect(0, Z(240), w, h - Z(240));
  ctx.strokeStyle = '#3a3a40'; ctx.lineWidth = 10;
  for (const x of [-280, -200, -120, -40, 40, 120, 200, 280]) { ctx.beginPath(); ctx.moveTo(X(x), 0); ctx.lineTo(X(x), h); ctx.stroke(); }
  for (const z of [-200, -120, -40, 40, 120, 200]) { ctx.beginPath(); ctx.moveTo(0, Z(z)); ctx.lineTo(w, Z(z)); ctx.stroke(); }
  for (const b of city.buildings) { ctx.fillStyle = '#5a5a60'; ctx.fillRect(X(b.x - b.w / 2), Z(b.z - b.d / 2), b.w * sx, b.d * sz); }
  for (const v of state.vehicles) {
    ctx.fillStyle = v.driver === 'police' ? '#4a7ad8' : v.driver === 'player' ? '#ffc94d' : '#ccc';
    ctx.beginPath(); ctx.arc(X(v.x), Z(v.z), 4, 0, Math.PI * 2); ctx.fill();
  }
  for (const q of state.peds) { if (!q.alive) continue; ctx.fillStyle = '#7fd069'; ctx.fillRect(X(q.x) - 2, Z(q.z) - 2, 4, 4); }
  const p = state.player;
  ctx.fillStyle = '#ffc94d'; ctx.beginPath(); ctx.arc(X(p.x), Z(p.z), 7, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffc94d'; ctx.beginPath(); ctx.moveTo(X(p.x), Z(p.z)); ctx.lineTo(X(p.x) + Math.sin(p.heading) * 16, Z(p.z) + Math.cos(p.heading) * 16); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('SOLMAR 2D — top-down fallback (V to return to 3D)', 12, 20);
}

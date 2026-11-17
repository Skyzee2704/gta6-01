// Minimap: live 2D canvas render of the city, north up. Blips for player,
// police, mission waypoint, cars, search zone (blinking), and tapes.
import { DISTRICTS } from './data.js';

export function createMinimap(state, city) {
  const canvas = document.getElementById('minimap');
  const ctx = canvas.getContext('2d');
  function draw() {
    const w = canvas.width, h = canvas.height;
    const X = x => (x + 330) * (w / 660), Z = z => (z + 250) * (h / 500);
    ctx.fillStyle = '#20242a'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1f6f8a'; ctx.fillRect(0, Z(240), w, h - Z(240));
    ctx.strokeStyle = '#555'; ctx.lineWidth = 4;
    for (const x of [-280, -200, -120, -40, 40, 120, 200, 280]) { ctx.beginPath(); ctx.moveTo(X(x), 0); ctx.lineTo(X(x), h); ctx.stroke(); }
    for (const z of [-200, -120, -40, 40, 120, 200]) { ctx.beginPath(); ctx.moveTo(0, Z(z)); ctx.lineTo(w, Z(z)); ctx.stroke(); }
    for (const b of city.buildings) { ctx.fillStyle = '#3a3f46'; ctx.fillRect(X(b.x - b.w / 2), Z(b.z - b.d / 2), b.w * (w / 660), b.d * (h / 500)); }
    // Search zone (blinking).
    const wz = state.wanted;
    if (wz.level > 0 && Math.floor(state.time * 2) % 2 === 0) {
      ctx.strokeStyle = '#ff4f4f'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(X(wz.searchX), Z(wz.searchZ), wz.searchR * (w / 660), 0, Math.PI * 2); ctx.stroke();
    }
    // Mission waypoint.
    if (state.mission.active) {
      const def = { 1: [-180, 60], 2: [120, -160], 3: [-260, 200], 4: [-180, 60], 5: [-200, -180], 6: [-260, 190] }[state.mission.id];
      if (def) { ctx.fillStyle = '#ffc94d'; ctx.beginPath(); ctx.arc(X(def[0]), Z(def[1]), 6, 0, Math.PI * 2); ctx.fill(); }
    }
    for (const c of state.cops) { ctx.fillStyle = '#4a7ad8'; ctx.beginPath(); ctx.arc(X(c.x), Z(c.z), 4, 0, Math.PI * 2); ctx.fill(); }
    for (const t of city.tapes) if (!t.taken) { ctx.fillStyle = '#ff4fa3'; ctx.fillRect(X(t.x) - 2, Z(t.z) - 2, 4, 4); }
    const p = state.player;
    ctx.fillStyle = '#ffc94d';
    ctx.beginPath(); ctx.arc(X(p.x), Z(p.z), 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(X(p.x), Z(p.z)); ctx.lineTo(X(p.x) + Math.sin(p.heading) * 12, Z(p.z) + Math.cos(p.heading) * 12); ctx.stroke();
    const d = DISTRICTS.find(q => q.id === state.district);
    ctx.fillStyle = '#fff'; ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(d ? d.name : '', 6, 14);
  }
  return { draw };
}

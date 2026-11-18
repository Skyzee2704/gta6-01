// Portraits of the 6 cast members, drawn in code on a 2D canvas — no image
// files. Each portrait is skin + hair + clothes + one signature detail, so
// it reads at a glance in dialogue boxes, the title screen and chapters.
import { CAST } from './data.js';

export function drawPortrait(ctx, castId, x, y, size) {
  const c = CAST.find(q => q.id === castId) || CAST[0];
  const r = size / 2;
  ctx.save();
  ctx.beginPath(); ctx.arc(x + r, y + r, r, 0, Math.PI * 2); ctx.clip();
  // Backdrop gradient: plum at the top fading to deep navy, the same
  // palette as the dialogue boxes so the portrait sits in the frame.
  const grad = ctx.createLinearGradient(x, y, x, y + size);
  grad.addColorStop(0, '#3a2a4a'); grad.addColorStop(1, '#1a2a4a');
  ctx.fillStyle = grad; ctx.fillRect(x, y, size, size);
  // Shoulders / clothes.
  ctx.fillStyle = c.cloth;
  ctx.beginPath(); ctx.arc(x + r, y + size * 1.05, r * 0.95, Math.PI, 0); ctx.fill();
  // Head.
  ctx.fillStyle = c.skin;
  ctx.beginPath(); ctx.arc(x + r, y + r * 0.85, r * 0.52, 0, Math.PI * 2); ctx.fill();
  // Hair.
  ctx.fillStyle = c.hair;
  ctx.beginPath(); ctx.arc(x + r, y + r * 0.55, r * 0.5, Math.PI, 0); ctx.fill();
  ctx.fillRect(x + r * 0.5, y + r * 0.45, r, r * 0.35);
  // Eyes.
  ctx.fillStyle = '#111';
  ctx.fillRect(x + r * 0.68, y + r * 0.8, r * 0.12, r * 0.08);
  ctx.fillRect(x + r * 1.2, y + r * 0.8, r * 0.12, r * 0.08);
  // Signature detail.
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.max(9, size * 0.09)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  if (c.id === 'rosa') { ctx.fillStyle = '#c0392b'; ctx.fillRect(x + r * 0.55, y + r * 0.42, r * 0.9, r * 0.16); }
  if (c.id === 'milo') { ctx.fillStyle = '#ffc94d'; ctx.fillRect(x + r * 0.3, y + size * 0.78, r * 1.4, r * 0.3); }
  if (c.id === 'kane') { ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + r, y + size * 0.85, r * 0.4, 0.2, Math.PI - 0.2); ctx.stroke(); }
  if (c.id === 'juno') { ctx.fillStyle = '#111'; ctx.fillRect(x + r * 0.6, y + r * 0.72, r * 0.35, r * 0.22); ctx.fillRect(x + r * 1.05, y + r * 0.72, r * 0.35, r * 0.22); }
  if (c.id === 'mags') { ctx.fillStyle = '#6b4a2a'; ctx.fillRect(x + r * 0.5, y + r * 0.1, r, r * 0.22); ctx.fillStyle = '#888'; ctx.fillRect(x + r * 0.8, y + r * 1.05, r * 0.4, r * 0.1); }
  if (c.id === 'benning') { ctx.fillStyle = '#2a4a7a'; ctx.fillRect(x + r * 0.5, y + r * 0.12, r, r * 0.24); }
  ctx.restore();
  ctx.fillStyle = '#f5ead2';
  ctx.font = `bold ${Math.max(10, size * 0.11)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(c.name, x + r, y + size + size * 0.14);
  ctx.fillStyle = '#9a938a';
  ctx.font = `${Math.max(9, size * 0.085)}px system-ui, sans-serif`;
  ctx.fillText(c.role, x + r, y + size + size * 0.28);
}
export function castById(id) { return CAST.find(c => c.id === id); }

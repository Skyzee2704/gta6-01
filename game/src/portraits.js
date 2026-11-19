// SOLMAR 3D — portraits. The cast is drawn, not photographed: a boxy,
// readable face per character on a small canvas — skin, hair in the
// character's style, eyes, mouth, jacket shoulders, accent colour.
// The same painter draws the title-screen cast row, the dialog portrait
// and the race nametags, so a character is always the same face.
import { CAST } from './data.js';

export function castById(id) {
  return CAST.find((c) => c.id === id) || CAST[0];
}

export function drawPortrait(ctx, charId, x, y, size) {
  const c = castById(charId);
  const s = size;
  ctx.save();
  ctx.translate(x, y);
  // Backdrop: dark panel with the character's accent edge.
  ctx.fillStyle = '#1c1a26';
  ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = c.accent;
  ctx.fillRect(0, s - 4, s, 4);
  // Shoulders / jacket.
  ctx.fillStyle = c.jacket;
  ctx.fillRect(s * 0.12, s * 0.72, s * 0.76, s * 0.28);
  ctx.fillStyle = c.accent;
  ctx.fillRect(s * 0.46, s * 0.72, s * 0.08, s * 0.28);
  // Head: a box, human proportions, skin tone.
  const hx = s * 0.28;
  const hy = s * 0.16;
  const hw = s * 0.44;
  const hh = s * 0.48;
  ctx.fillStyle = c.skin;
  ctx.fillRect(hx, hy, hw, hh);
  // Hair by style.
  ctx.fillStyle = c.hair;
  if (c.hairStyle === 'short') ctx.fillRect(hx - 1, hy - 2, hw + 2, hh * 0.28);
  else if (c.hairStyle === 'slick') ctx.fillRect(hx - 1, hy - 3, hw + 2, hh * 0.2);
  else if (c.hairStyle === 'ponytail') {
    ctx.fillRect(hx - 1, hy - 2, hw + 2, hh * 0.3);
    ctx.fillRect(hx + hw - 2, hy + hh * 0.2, s * 0.09, hh * 0.7);
  } else if (c.hairStyle === 'grey') ctx.fillRect(hx - 1, hy - 2, hw + 2, hh * 0.22);
  else if (c.hairStyle === 'bob') {
    ctx.fillRect(hx - 2, hy - 2, hw + 4, hh * 0.34);
    ctx.fillRect(hx - 2, hy + hh * 0.2, s * 0.07, hh * 0.6);
    ctx.fillRect(hx + hw - s * 0.05, hy + hh * 0.2, s * 0.07, hh * 0.6);
  } else if (c.hairStyle === 'mohawk') {
    ctx.fillRect(hx + hw * 0.4, hy - s * 0.12, hw * 0.2, hh * 0.5);
  }
  // Eyes: two dark boxes, level and even — the face reads at 64 px.
  ctx.fillStyle = '#16121a';
  ctx.fillRect(hx + hw * 0.16, hy + hh * 0.42, hw * 0.14, hh * 0.07);
  ctx.fillRect(hx + hw * 0.7, hy + hh * 0.42, hw * 0.14, hh * 0.07);
  // Mouth.
  ctx.fillStyle = '#7a3a30';
  ctx.fillRect(hx + hw * 0.34, hy + hh * 0.74, hw * 0.32, hh * 0.06);
  // Vex gets a scar: one diagonal accent line.
  if (c.id === 'vex') {
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = Math.max(1, s * 0.02);
    ctx.beginPath();
    ctx.moveTo(hx + hw * 0.2, hy + hh * 0.3);
    ctx.lineTo(hx + hw * 0.34, hy + hh * 0.52);
    ctx.stroke();
  }
  ctx.restore();
}

// Draw a portrait to an offscreen canvas and return it (for HUD images).
export function portraitCanvas(charId, size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  drawPortrait(ctx, charId, 0, 0, size);
  return canvas;
}

// The six-cast row for the title screen, drawn on one canvas.
export function drawCastRow(ctx, x, y, size, gap) {
  CAST.forEach((c, i) => {
    drawPortrait(ctx, c.id, x + i * (size + gap), y, size);
  });
}

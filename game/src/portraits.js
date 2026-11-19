// SOLMAR 3D — cast portraits: 6 hand-drawn (canvas) portraits for the
// title screen and dialogue boxes. Drawn with flat shapes and bold
// outlines, one per cast member, in the game's gold/dark palette.
import { CAST } from './data.js';

export const PORTRAIT_SIZE = 128;

export function portraitFor(castId) {
  return CAST.find((c) => c.id === castId) || CAST[0];
}

export function drawPortrait(canvas, castId) {
  const c = canvas.getContext('2d');
  const S = PORTRAIT_SIZE;
  canvas.width = S;
  canvas.height = S;
  const cast = portraitFor(castId);
  const bg = cast.bg || '#2a2a3a';
  c.fillStyle = bg;
  c.fillRect(0, 0, S, S);
  const grad = c.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0, 'rgba(255, 210, 122, 0.25)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
  c.fillStyle = grad;
  c.fillRect(0, 0, S, S);
  const skin = cast.skin || '#e8b890';
  const hair = cast.hair || '#2a2018';
  const shirt = cast.shirt || '#c22e2e';
  c.fillStyle = shirt;
  c.fillRect(14, 92, 100, 36);
  c.fillStyle = '#141416';
  c.fillRect(14, 92, 100, 4);
  c.fillStyle = skin;
  c.fillRect(54, 78, 20, 16);
  c.fillStyle = skin;
  c.fillRect(38, 34, 52, 48);
  c.fillStyle = hair;
  c.fillRect(36, 28, 56, 18);
  c.fillRect(36, 28, 10, 30);
  c.fillRect(82, 28, 10, 30);
  if (castId === 'milo') {
    c.fillStyle = '#141416';
    c.fillRect(38, 46, 52, 6);
  }
  if (castId === 'kane') {
    c.fillStyle = '#8a8a8a';
    c.fillRect(40, 76, 48, 6);
    c.fillStyle = '#2a2a2e';
    c.fillRect(38, 40, 52, 8);
  }
  if (castId === 'rosa') {
    c.fillStyle = '#c22e2e';
    c.fillRect(36, 28, 56, 26);
  }
  if (castId === 'vex') {
    c.fillStyle = '#141416';
    c.fillRect(36, 26, 56, 12);
    c.fillStyle = '#8e2e6f';
    c.fillRect(38, 40, 52, 6);
  }
  if (castId === 'dara') {
    c.fillStyle = '#e0a030';
    c.fillRect(36, 28, 56, 20);
  }
  if (castId === 'otto') {
    c.fillStyle = '#8a8a8a';
    c.fillRect(36, 28, 56, 14);
    c.fillStyle = '#8a8a8a';
    c.fillRect(40, 76, 48, 6);
  }
  c.fillStyle = '#141416';
  c.fillRect(48, 54, 8, 4);
  c.fillRect(72, 54, 8, 4);
  c.fillStyle = '#8a3a3a';
  c.fillRect(56, 70, 16, 3);
  c.strokeStyle = '#ffd27a';
  c.lineWidth = 3;
  c.strokeRect(2, 2, S - 4, S - 4);
  return canvas;
}

export function castRow() {
  return CAST.map((c) => ({ id: c.id, name: c.name, role: c.role }));
}

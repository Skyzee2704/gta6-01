// portraits.js — the cast portraits. Six characters, each drawn as a
// flat vector portrait on a canvas (no image files, no network). The
// portraits are used on the title screen and in dialogue boxes.

// Cast (matches data.js CAST).
export const CAST = [
  { id: 'milo', name: 'Milo Cruz', role: 'The driver', color: '#f5c518', bg: '#1a2a3a' },
  { id: 'vera', name: 'Vera Sol', role: 'The fixer', color: '#ff8ad0', bg: '#3a1a2a' },
  { id: 'dante', name: 'Dante Rook', role: 'The arms dealer', color: '#ff5555', bg: '#2a1a1a' },
  { id: 'lena', name: 'Lena Voss', role: 'The racer', color: '#5ad0ff', bg: '#1a2a3a' },
  { id: 'max', name: 'Max Holt', role: 'The mechanic', color: '#7dff8a', bg: '#1a3a1a' },
  { id: 'sable', name: 'Sable', role: 'The boss', color: '#c9a0ff', bg: '#2a1a3a' },
];

// Draw one portrait on a canvas. `style` picks the face: skin tone,
// hair, and a signature accessory (glasses, bandana, cap, etc.).
export function drawPortrait(canvas, castId, size = 128) {
  const cast = CAST.find(c => c.id === castId) || CAST[0];
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const S = size;
  // Background.
  ctx.fillStyle = cast.bg;
  ctx.fillRect(0, 0, S, S);
  // A radial glow behind the head.
  const grad = ctx.createRadialGradient(S / 2, S * 0.45, 4, S / 2, S * 0.45, S * 0.6);
  grad.addColorStop(0, cast.color + '55');
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);
  // Shoulders (jacket).
  ctx.fillStyle = cast.color;
  ctx.beginPath();
  ctx.moveTo(S * 0.15, S);
  ctx.quadraticCurveTo(S * 0.2, S * 0.72, S * 0.5, S * 0.7);
  ctx.quadraticCurveTo(S * 0.8, S * 0.72, S * 0.85, S);
  ctx.closePath();
  ctx.fill();
  // Neck.
  ctx.fillStyle = '#d8a878';
  ctx.fillRect(S * 0.44, S * 0.58, S * 0.12, S * 0.14);
  // Head (an egg shape, like the 3D character).
  ctx.fillStyle = '#e8b98a';
  ctx.beginPath();
  ctx.ellipse(S * 0.5, S * 0.42, S * 0.17, S * 0.21, 0, 0, Math.PI * 2);
  ctx.fill();
  // Hair / signature.
  ctx.fillStyle = '#1a1a1a';
  if (cast.id === 'milo') {
    // Short dark hair + a yellow bandana.
    ctx.beginPath();
    ctx.ellipse(S * 0.5, S * 0.24, S * 0.17, S * 0.09, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#f5c518';
    ctx.fillRect(S * 0.33, S * 0.26, S * 0.34, S * 0.05);
  } else if (cast.id === 'vera') {
    // Long hair falling past the shoulders.
    ctx.beginPath();
    ctx.ellipse(S * 0.5, S * 0.3, S * 0.19, S * 0.14, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(S * 0.31, S * 0.3, S * 0.06, S * 0.35);
    ctx.fillRect(S * 0.63, S * 0.3, S * 0.06, S * 0.35);
  } else if (cast.id === 'dante') {
    // Slicked hair + sunglasses.
    ctx.beginPath();
    ctx.ellipse(S * 0.5, S * 0.25, S * 0.16, S * 0.07, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#111111';
    ctx.fillRect(S * 0.35, S * 0.38, S * 0.12, S * 0.06);
    ctx.fillRect(S * 0.53, S * 0.38, S * 0.12, S * 0.06);
  } else if (cast.id === 'lena') {
    // A cap + ponytail.
    ctx.fillStyle = '#5ad0ff';
    ctx.beginPath();
    ctx.arc(S * 0.5, S * 0.28, S * 0.17, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(S * 0.33, S * 0.26, S * 0.34, S * 0.04);
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(S * 0.68, S * 0.5, S * 0.06, 0, Math.PI * 2);
    ctx.fill();
  } else if (cast.id === 'max') {
    // A beanie + beard.
    ctx.fillStyle = '#7dff8a';
    ctx.beginPath();
    ctx.ellipse(S * 0.5, S * 0.24, S * 0.17, S * 0.1, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath();
    ctx.ellipse(S * 0.5, S * 0.56, S * 0.12, S * 0.08, 0, 0, Math.PI);
    ctx.fill();
  } else {
    // Sable: a wide-brim hat + shades.
    ctx.fillStyle = '#c9a0ff';
    ctx.beginPath();
    ctx.ellipse(S * 0.5, S * 0.26, S * 0.24, S * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(S * 0.4, S * 0.16, S * 0.2, S * 0.12);
    ctx.fillStyle = '#111111';
    ctx.fillRect(S * 0.35, S * 0.38, S * 0.12, S * 0.06);
    ctx.fillRect(S * 0.53, S * 0.38, S * 0.12, S * 0.06);
  }
  // Eyes.
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(S * 0.43, S * 0.42, S * 0.018, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(S * 0.57, S * 0.42, S * 0.018, 0, Math.PI * 2);
  ctx.fill();
  // Mouth.
  ctx.strokeStyle = '#8a5a3a';
  ctx.lineWidth = S * 0.012;
  ctx.beginPath();
  ctx.arc(S * 0.5, S * 0.52, S * 0.05, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  // Name plate.
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, S * 0.86, S, S * 0.14);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(S * 0.07)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(cast.name.toUpperCase(), S / 2, S * 0.93);
  return canvas;
}

// Render all six portraits into a container (title screen cast row).
export function renderCastRow(container) {
  container.innerHTML = '';
  for (const c of CAST) {
    const wrap = document.createElement('div');
    wrap.className = 'cast-card';
    const canvas = document.createElement('canvas');
    drawPortrait(canvas, c.id, 128);
    const label = document.createElement('div');
    label.className = 'cast-role';
    label.textContent = c.role;
    wrap.appendChild(canvas);
    wrap.appendChild(label);
    container.appendChild(wrap);
  }
}

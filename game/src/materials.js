// materials.js — the material library (renderer side).
// Procedural materials only: no texture files, no network. Colors and
// roughness are chosen per district so the city reads differently from
// across the map. One shared material per color keeps draw calls low.

/* global THREE */

// A cache so the same color/roughness always returns the same material.
const cache = new Map();

// A standard material (lit by the sun + lamps) in a color.
export function mat(color, roughness = 0.85, metalness = 0) {
  const key = `${color}|${roughness}|${metalness}`;
  if (!cache.has(key)) {
    cache.set(key, new THREE.MeshStandardMaterial({ color, roughness, metalness }));
  }
  return cache.get(key);
}

// An emissive material (glows: neon, lamps, windows, brake lights).
export function glow(color, intensity = 1.2) {
  const key = `glow|${color}|${intensity}`;
  if (!cache.has(key)) {
    cache.set(key, new THREE.MeshStandardMaterial({
      color: '#111111',
      emissive: color,
      emissiveIntensity: intensity,
      roughness: 0.4,
    }));
  }
  return cache.get(key);
}

// Glass: transparent, a little reflective.
export function glass(color = '#9fd4e8', opacity = 0.55) {
  const key = `glass|${color}|${opacity}`;
  if (!cache.has(key)) {
    cache.set(key, new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity,
      roughness: 0.15,
      metalness: 0.4,
    }));
  }
  return cache.get(key);
}

// A canvas texture with a window grid for a building facade. The grid
// is drawn once per (district, floors, cols) and reused.
const facadeCache = new Map();
export function facadeTexture(district, cols, rows, baseColor) {
  const key = `${district}|${cols}|${rows}|${baseColor}`;
  if (facadeCache.has(key)) return facadeCache.get(key);
  const w = 128;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, w, h);
  // Window grid: dark frames, some lit warm.
  const cw = w / cols;
  const ch = h / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cw + cw * 0.2;
      const y = r * ch + ch * 0.2;
      const ww = cw * 0.6;
      const wh = ch * 0.6;
      const lit = ((c * 7 + r * 13) % 10) < 4;
      ctx.fillStyle = lit ? '#ffd27a' : '#1a2a3a';
      ctx.fillRect(x, y, ww, wh);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.strokeRect(x, y, ww, wh);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  facadeCache.set(key, tex);
  return tex;
}

// A building material with a window-grid facade texture.
export function buildingMaterial(district, cols, rows, baseColor) {
  const key = `bld|${district}|${cols}|${rows}|${baseColor}`;
  if (!cache.has(key)) {
    cache.set(key, new THREE.MeshStandardMaterial({
      map: facadeTexture(district, cols, rows, baseColor),
      roughness: 0.9,
    }));
  }
  return cache.get(key);
}

// Asphalt with a center line, drawn on canvas.
const roadCache = new Map();
export function roadTexture() {
  if (roadCache.has('road')) return roadCache.get('road');
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#55555c';
  ctx.fillRect(0, 0, 128, 128);
  // Speckle.
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.08})`;
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  // Center dashes.
  ctx.fillStyle = '#e8c832';
  for (let y = 0; y < 128; y += 32) {
    ctx.fillRect(62, y, 4, 18);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  roadCache.set('road', tex);
  return tex;
}

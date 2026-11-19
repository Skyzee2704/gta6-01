// SOLMAR 3D — materials. The look rule is simple: nothing glares.
// Asphalt is dark and rough, sidewalks are matte, glass is dim — the
// zebra and the sidewalk never shine in the sun. Neon is the only
// thing allowed to glow, and only at night. One shared material per
// surface keeps the draw calls down.
import * as THREE from 'three';
import { NEON } from './data.js';

export function createMaterials() {
  const std = (color, roughness = 0.9, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const mats = {
    asphalt: std(0x35353a, 0.96, 0), // dark asphalt, NEVER blue — light
    // enough to read as a road under a grazing golden-hour sun (0x232326
    // rendered as a black void and dragged cover/race luma under 0.35)
    sidewalk: std(0x6b6a66, 0.95, 0), // matte — no sun glare
    zebra: std(0xe8e6e0, 0.9, 0),
    grass: std(0x5a7a48, 0.95, 0), // sunlit golden-hour grass
    sand: std(0xd8c48f, 0.95, 0),
    sea: std(0x2a4a68, 0.6, 0.1), // golden-hour sea, warmed by the sky
    sky: new THREE.MeshBasicMaterial({ color: 0xf2a35e, side: THREE.BackSide, fog: false }),
    sun: new THREE.MeshBasicMaterial({ color: 0xffd9a0, fog: false }),
    moon: new THREE.MeshBasicMaterial({ color: 0xe8ecf2, fog: false }),
    cloud: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, fog: false }),
    glass: std(0x2a3a44, 0.25, 0.4),
    concrete: std(0x8a8880, 0.9, 0),
    palmTrunk: std(0x6a4a2a, 0.95, 0),
    palmLeaf: std(0x2a6a2a, 0.9, 0),
    lampPole: std(0x3a3a40, 0.7, 0.4),
    lampHead: new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe9a0, emissiveIntensity: 0.6 }),
    postcard: new THREE.MeshStandardMaterial({ color: 0xffd34a, emissive: 0xffb82a, emissiveIntensity: 0.8 }),
    marker: new THREE.MeshBasicMaterial({ color: 0xffd34a, transparent: true, opacity: 0.9 }),
    windowLit: new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffc060, emissiveIntensity: 0.9 }),
    windowDark: std(0x2a3040, 0.3, 0.3),
    roof: std(0x3a3a42, 0.9, 0),
    crate: std(0x8a6a3a, 0.95, 0),
    barrier: std(0xd83a2a, 0.8, 0),
    carBody: std(0xffffff, 0.4, 0.5),
    carGlass: std(0x1a2430, 0.2, 0.5),
    wheel: std(0x16161a, 0.95, 0),
    tireSmoke: new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.4 }),
    beam: new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.22, depthWrite: false }),
    blood: std(0x6a0a0a, 0.9, 0),
  };
  // One emissive neon material per colour, shared by every sign.
  mats.neon = {};
  for (const [name, hex] of Object.entries(NEON)) {
    mats.neon[name] = new THREE.MeshStandardMaterial({
      color: hex, emissive: hex, emissiveIntensity: 1.2, roughness: 0.4,
    });
  }
  return mats;
}

// Building facade palette — five colours, warm and sun-baked, never grey.
export const FACADE_COLORS = [0xe8d8b8, 0xd8b8a0, 0xc8d8d8, 0xe8c8a8, 0xb8c8b8, 0xd8d8c8, 0xe0b8b8];

// Make a canvas texture with text on it — for building signs and banners.
// Signs sit flat against the wall, never floating, never inside a wall.
export function makeTextTexture(text, opts = {}) {
  const font = opts.font || 'bold 64px Arial, sans-serif';
  const fg = opts.fg || '#ffffff';
  const bg = opts.bg || 'rgba(20,16,28,0.92)';
  const pad = opts.pad || 24;
  const measure = document.createElement('canvas').getContext('2d');
  measure.font = font;
  const tw = measure.measureText(text).width;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(tw) + pad * 2;
  canvas.height = 64 + pad * 2;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = font;
  ctx.fillStyle = fg;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, pad, canvas.height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

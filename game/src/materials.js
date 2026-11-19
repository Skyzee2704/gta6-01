// SOLMAR 3D — shared PBR materials: pastel palette, neon emissive, lit
// windows, asphalt, glass, metal, tire, chrome. Browser only (uses THREE).
const PASTELS = [
  0xe8b4b8, 0xf2d8a0, 0xa8d8c8, 0xb8c8e8, 0xe8c8a0,
  0xd8b8e8, 0xf8e8c8, 0xa8c8a8, 0xe8a0a0, 0x98c8d8,
  0xd8d8b8, 0xc8b8d8, 0xf0c8a0, 0x88b8c8, 0xe8d8d8,
];

export function createMaterials() {
  const mats = {};
  mats.asphalt = new THREE.MeshStandardMaterial({ color: 0x383c3e, roughness: 0.94, metalness: 0.02 });
  mats.asphaltDark = new THREE.MeshStandardMaterial({ color: 0x232528, roughness: 0.96, metalness: 0.02 });
  mats.concrete = new THREE.MeshStandardMaterial({ color: 0x9a938a, roughness: 0.9, metalness: 0.0 });
  mats.sidewalk = new THREE.MeshStandardMaterial({ color: 0x8a8578, roughness: 0.92, metalness: 0.0 });
  mats.glass = new THREE.MeshStandardMaterial({ color: 0x9fd8e8, roughness: 0.12, metalness: 0.4, transparent: true, opacity: 0.55 });
  mats.glassDark = new THREE.MeshStandardMaterial({ color: 0x2a3a4a, roughness: 0.15, metalness: 0.5, transparent: true, opacity: 0.7 });
  mats.chrome = new THREE.MeshStandardMaterial({ color: 0xd8dce2, roughness: 0.18, metalness: 0.9 });
  mats.tire = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.95, metalness: 0.0 });
  mats.metal = new THREE.MeshStandardMaterial({ color: 0x6a7078, roughness: 0.4, metalness: 0.8 });
  mats.wood = new THREE.MeshStandardMaterial({ color: 0x8a6a42, roughness: 0.85, metalness: 0.0 });
  mats.leaf = new THREE.MeshStandardMaterial({ color: 0x3f7a3a, roughness: 0.9, metalness: 0.0 });
  mats.trunk = new THREE.MeshStandardMaterial({ color: 0x6a4a2e, roughness: 0.95, metalness: 0.0 });
  mats.sand = new THREE.MeshStandardMaterial({ color: 0xe0c890, roughness: 0.98, metalness: 0.0 });
  mats.roof = new THREE.MeshStandardMaterial({ color: 0x4a4a52, roughness: 0.9, metalness: 0.05 });
  mats.windowLit = new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xffb35c, emissiveIntensity: 0.9, roughness: 0.4 });
  mats.windowDark = new THREE.MeshStandardMaterial({ color: 0x2a3542, roughness: 0.3, metalness: 0.4 });
  mats.windowNight = new THREE.MeshStandardMaterial({ color: 0xffe9a0, emissive: 0xffc85c, emissiveIntensity: 1.2, roughness: 0.4 });
  mats.neonPink = new THREE.MeshStandardMaterial({ color: 0xff4da6, emissive: 0xff2e88, emissiveIntensity: 1.6, roughness: 0.3 });
  mats.neonCyan = new THREE.MeshStandardMaterial({ color: 0x4de8ff, emissive: 0x00c8e8, emissiveIntensity: 1.6, roughness: 0.3 });
  mats.neonGold = new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xffb35c, emissiveIntensity: 1.6, roughness: 0.3 });
  mats.neonGreen = new THREE.MeshStandardMaterial({ color: 0x7dff8a, emissive: 0x2ee85c, emissiveIntensity: 1.6, roughness: 0.3 });
  mats.awningRed = new THREE.MeshStandardMaterial({ color: 0xc22e2e, roughness: 0.8, metalness: 0.0 });
  mats.awningBlue = new THREE.MeshStandardMaterial({ color: 0x2e6fc2, roughness: 0.8, metalness: 0.0 });
  mats.white = new THREE.MeshStandardMaterial({ color: 0xf2f0e8, roughness: 0.85, metalness: 0.0 });
  mats.black = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.9, metalness: 0.1 });
  mats.skinTones = [
    new THREE.MeshStandardMaterial({ color: 0xe8b890, roughness: 0.75 }),
    new THREE.MeshStandardMaterial({ color: 0xc89066, roughness: 0.75 }),
    new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.75 }),
    new THREE.MeshStandardMaterial({ color: 0xf0c8a0, roughness: 0.75 }),
  ];
  mats.shirtColors = [
    new THREE.MeshStandardMaterial({ color: 0xc22e2e, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0x2e6fc2, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0xe0a030, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0x3f7a3a, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0x8e2e6f, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0xf2f0e8, roughness: 0.85 }),
  ];
  mats.pantsColors = [
    new THREE.MeshStandardMaterial({ color: 0x2a3542, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x4a4a52, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x6a5a42, roughness: 0.9 }),
  ];
  mats.pastels = PASTELS.map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0.02 }),
  );
  mats.pastelAt = function pastelAt(i) {
    return mats.pastels[((i % PASTELS.length) + PASTELS.length) % PASTELS.length];
  };
  mats.neonAt = function neonAt(i) {
    const list = [mats.neonPink, mats.neonCyan, mats.neonGold, mats.neonGreen];
    return list[((i % list.length) + list.length) % list.length];
  };
  return mats;
}

export function box(w, h, d, mat) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

// Merge many coloured boxes into ONE geometry (one draw call) with
// per-vertex colours. Static props, trees, car bodies and character
// torsos all go through here — it is what keeps the frame under the
// 100-draw-call budget with 200 buildings, 150 trees and live traffic.
export function mergeBoxes(parts) {
  const geos = [];
  for (const p of parts) {
    const geo = new THREE.BoxGeometry(p.w, p.h, p.d);
    const m = new THREE.Matrix4();
    m.makeRotationFromEuler(new THREE.Euler(p.rx || 0, p.ry || 0, p.rz || 0));
    m.setPosition(p.x || 0, p.y || 0, p.z || 0);
    geo.applyMatrix4(m);
    const color = new THREE.Color(p.color != null ? p.color : 0xffffff);
    const count = geo.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const flat = geo.toNonIndexed();
    flat.clearGroups();
    geos.push(flat);
  }
  let total = 0;
  for (const g of geos) total += g.attributes.position.count;
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  const col = new Float32Array(total * 3);
  const uv = new Float32Array(total * 2);
  let o = 0;
  for (const g of geos) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    col.set(g.attributes.color.array, o * 3);
    uv.set(g.attributes.uv.array, o * 2);
    o += n;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return out;
}

export function vertexMaterial() {
  return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.05 });
}

export function neonVertexMaterial() {
  return new THREE.MeshBasicMaterial({ vertexColors: true });
}

export function glowSprite(tex, color, scale) {
  const mat = new THREE.SpriteMaterial({
    map: tex,
    color,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(scale, scale, 1);
  return sprite;
}

// Material tables: what each surface is made of, as data. The renderer turns
// these into real materials; the sim never touches them. Matte roads and
// sidewalks on purpose: nothing here is allowed to glare in the sun.
export const MATERIALS = {
  asphalt: { color: '#26262a', roughness: 0.94, metalness: 0.0 },
  sidewalk: { color: '#8a8578', roughness: 0.96, metalness: 0.0 },
  zebra: { color: '#cfcabb', roughness: 0.9, metalness: 0.0 },
  roadLine: { color: '#c9a227', roughness: 0.85, metalness: 0.0 },
  grass: { color: '#4d7a3a', roughness: 1.0, metalness: 0.0 },
  sand: { color: '#d9b380', roughness: 1.0, metalness: 0.0 },
  sea: { color: '#1d4e6b', roughness: 0.25, metalness: 0.1 },
  glass: { color: '#9fc4d8', roughness: 0.12, metalness: 0.35, opacity: 0.55 },
  glassLit: { color: '#ffd27a', roughness: 0.4, metalness: 0.0, emissive: '#ff9a3c' },
  glassDark: { color: '#2a3542', roughness: 0.2, metalness: 0.3 },
  neonPink: { color: '#ff4fd8', emissive: '#ff4fd8', roughness: 0.4, metalness: 0.0 },
  neonCyan: { color: '#37e6ff', emissive: '#37e6ff', roughness: 0.4, metalness: 0.0 },
  neonGold: { color: '#ffb02e', emissive: '#ffb02e', roughness: 0.4, metalness: 0.0 },
  palmTrunk: { color: '#7a5a38', roughness: 1.0, metalness: 0.0 },
  palmLeaf: { color: '#3f7a2e', roughness: 0.9, metalness: 0.0 },
  treeLeaf: { color: '#4d7a3a', roughness: 0.95, metalness: 0.0 },
  trunk: { color: '#5a4632', roughness: 1.0, metalness: 0.0 },
  skinTones: ['#c98d5f', '#8a5a3b', '#d9a066', '#a06a42', '#e8b88a'],
  hairColors: ['#1c1c22', '#3a3a3a', '#4a2c14', '#e8e8e8', '#14141a'],
  shirtColors: ['#2e5fa3', '#b03a8c', '#4a6b3a', '#c22e2e', '#e8b400', '#17a589', '#7a7a72'],
  pantsColors: ['#22303e', '#3a3f4a', '#5a4632', '#14141a'],
  carPaint: ['#c22e2e', '#2e5fa3', '#e8b400', '#1c1c22', '#4a6b3a', '#7a7a72', '#b03a8c', '#14141a', '#d35400', '#17a589', '#2e86c1', '#f0f0e8'],
  tire: { color: '#141414', roughness: 0.95, metalness: 0.0 },
  rim: { color: '#c8c8c8', roughness: 0.3, metalness: 0.8 },
  chrome: { color: '#d8d8d8', roughness: 0.15, metalness: 0.9 },
  wood: { color: '#8a6a42', roughness: 0.9, metalness: 0.0 },
  concrete: { color: '#9a958a', roughness: 0.95, metalness: 0.0 },
};

/** Pick a deterministic variant from a list by index. */
export function variant(list, index) {
  return list[((index % list.length) + list.length) % list.length];
}

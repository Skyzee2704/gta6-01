// Material tables: what each surface is made of, as data. The renderer turns
// these into real materials; the sim never touches them. Matte roads and
// sidewalks on purpose: nothing here is allowed to glare in the sun. Zebra
// paint and curbs are matte too — Sky asked twice for the glare to go away,
// so every ground surface sits above 0.85 roughness and at zero metalness.
// Only glass, chrome and neon are allowed to shine, and neon shines by
// emissive light, not by reflecting the sun.
export const MATERIALS = {
  // Ground: dark asphalt, matte sidewalk, matte zebra, dull yellow lines.
  asphalt: { color: '#26262a', roughness: 0.94, metalness: 0.0 },
  asphaltWet: { color: '#1c1c20', roughness: 0.45, metalness: 0.0 },
  sidewalk: { color: '#8a8578', roughness: 0.96, metalness: 0.0 },
  curb: { color: '#6e6a5e', roughness: 0.95, metalness: 0.0 },
  zebra: { color: '#cfcabb', roughness: 0.9, metalness: 0.0 },
  roadLine: { color: '#c9a227', roughness: 0.85, metalness: 0.0 },
  roadPatch: { color: '#2e2e33', roughness: 0.95, metalness: 0.0 },
  // Land and sea.
  grass: { color: '#4d7a3a', roughness: 1.0, metalness: 0.0 },
  sand: { color: '#d9b380', roughness: 1.0, metalness: 0.0 },
  sea: { color: '#1d4e6b', roughness: 0.25, metalness: 0.1 },
  seaDeep: { color: '#0f3350', roughness: 0.2, metalness: 0.1 },
  foam: { color: '#e8f0f0', roughness: 0.8, metalness: 0.0 },
  // Building glass: three states, so a facade is never one flat colour.
  glass: { color: '#9fc4d8', roughness: 0.12, metalness: 0.35, opacity: 0.55 },
  glassLit: { color: '#ffd27a', roughness: 0.4, metalness: 0.0, emissive: '#ff9a3c' },
  glassDark: { color: '#2a3542', roughness: 0.2, metalness: 0.3 },
  glassGold: { color: '#d8b878', roughness: 0.15, metalness: 0.5, opacity: 0.7 },
  // Facades: pastel, not flat magenta or orange. The generator picks one
  // per building, so the skyline reads as a city, not a toy set.
  facadeCream: { color: '#e8dcc8', roughness: 0.9, metalness: 0.0 },
  facadeSand: { color: '#d9c7a7', roughness: 0.9, metalness: 0.0 },
  facadeLavender: { color: '#c8b8d9', roughness: 0.9, metalness: 0.0 },
  facadeSky: { color: '#a7c8d9', roughness: 0.9, metalness: 0.0 },
  facadeRose: { color: '#d9a7a7', roughness: 0.9, metalness: 0.0 },
  facadeSage: { color: '#b8d9a7', roughness: 0.9, metalness: 0.0 },
  facadeBrick: { color: '#a67c52', roughness: 0.95, metalness: 0.0 },
  facadeSlate: { color: '#5a6a7a', roughness: 0.85, metalness: 0.05 },
  // Neon: emissive only, so signs glow at dusk without a sun to reflect.
  neonPink: { color: '#ff4fd8', emissive: '#ff4fd8', roughness: 0.4, metalness: 0.0 },
  neonCyan: { color: '#37e6ff', emissive: '#37e6ff', roughness: 0.4, metalness: 0.0 },
  neonGold: { color: '#ffb02e', emissive: '#ffb02e', roughness: 0.4, metalness: 0.0 },
  neonRed: { color: '#ff3b30', emissive: '#ff3b30', roughness: 0.4, metalness: 0.0 },
  neonGreen: { color: '#2ecc71', emissive: '#2ecc71', roughness: 0.4, metalness: 0.0 },
  // Vegetation: trunks are brown and rough, leaves are two greens so a
  // palm and a street tree read differently at a glance.
  palmTrunk: { color: '#7a5a38', roughness: 1.0, metalness: 0.0 },
  palmLeaf: { color: '#3f7a2e', roughness: 0.9, metalness: 0.0 },
  treeLeaf: { color: '#4d7a3a', roughness: 0.95, metalness: 0.0 },
  treeLeafDark: { color: '#355c26', roughness: 0.95, metalness: 0.0 },
  trunk: { color: '#5a4632', roughness: 1.0, metalness: 0.0 },
  // People: five skin tones, five hair colours, seven shirt colours, four
  // trouser colours — a crowd of twelve never looks like clones.
  skinTones: ['#c98d5f', '#8a5a3b', '#d9a066', '#a06a42', '#e8b88a'],
  hairColors: ['#1c1c22', '#3a3a3a', '#4a2c14', '#e8e8e8', '#14141a'],
  shirtColors: ['#2e5fa3', '#b03a8c', '#4a6b3a', '#c22e2e', '#e8b400', '#17a589', '#7a7a72'],
  pantsColors: ['#22303e', '#3a3f4a', '#5a4632', '#14141a'],
  // Cars: twelve paints, from taxi yellow to limo black. The same list
  // drives traffic variety, so no two cars in a frame match by accident.
  carPaint: ['#c22e2e', '#2e5fa3', '#e8b400', '#1c1c22', '#4a6b3a', '#7a7a72', '#b03a8c', '#14141a', '#d35400', '#17a589', '#2e86c1', '#f0f0e8'],
  // Car parts.
  tire: { color: '#141414', roughness: 0.95, metalness: 0.0 },
  rim: { color: '#c8c8c8', roughness: 0.3, metalness: 0.8 },
  chrome: { color: '#d8d8d8', roughness: 0.15, metalness: 0.9 },
  headlight: { color: '#fff8d8', emissive: '#ffe9a0', roughness: 0.2, metalness: 0.0 },
  tailLight: { color: '#ff3b30', emissive: '#ff3b30', roughness: 0.3, metalness: 0.0 },
  // Street furniture and building detail.
  wood: { color: '#8a6a42', roughness: 0.9, metalness: 0.0 },
  concrete: { color: '#9a958a', roughness: 0.95, metalness: 0.0 },
  steel: { color: '#7a8288', roughness: 0.4, metalness: 0.7 },
  awningRed: { color: '#c22e2e', roughness: 0.9, metalness: 0.0 },
  awningGreen: { color: '#2e7a4a', roughness: 0.9, metalness: 0.0 },
  awningBlue: { color: '#2e5fa3', roughness: 0.9, metalness: 0.0 },
  umbrellaStripe: { color: '#ff4fd8', roughness: 0.9, metalness: 0.0 },
  umbrellaWhite: { color: '#f0f0e8', roughness: 0.9, metalness: 0.0 },
  // Police: dark navy body, red and blue light bars.
  policeBody: { color: '#22303e', roughness: 0.5, metalness: 0.3 },
  policeLightRed: { color: '#ff3b30', emissive: '#ff3b30', roughness: 0.3, metalness: 0.0 },
  policeLightBlue: { color: '#3a7bff', emissive: '#3a7bff', roughness: 0.3, metalness: 0.0 },
  // Weapons: gunmetal, wood grip, brass.
  gunmetal: { color: '#2a2d33', roughness: 0.35, metalness: 0.75 },
  gunWood: { color: '#6a4a28', roughness: 0.85, metalness: 0.0 },
  brass: { color: '#c9a227', roughness: 0.3, metalness: 0.8 },
};

/** Facade colours as a plain list, for the building generator. */
export const FACADE_MATERIALS = [
  'facadeCream', 'facadeSand', 'facadeLavender', 'facadeSky',
  'facadeRose', 'facadeSage', 'facadeBrick', 'facadeSlate',
];

/** Pick a deterministic variant from a list by index. Negative indices
 *  wrap instead of crashing, so a seed offset can never pick undefined. */
export function variant(list, index) {
  return list[((index % list.length) + list.length) % list.length];
}

/** Look a material up by name, falling back to concrete when the name is
 *  unknown — a typo in a table then greys a building instead of crashing
 *  the whole frame. */
export function materialByName(name) {
  return MATERIALS[name] || MATERIALS.concrete;
}

/** True when a material is meant to glow (emissive set and bright). Used
 *  by the renderer's dynamic light pool to decide what gets a light. */
export function isEmissive(name) {
  const mat = MATERIALS[name];
  return !!mat && typeof mat.emissive === 'string';
}

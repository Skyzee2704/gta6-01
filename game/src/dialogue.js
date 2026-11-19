// SOLMAR 3D — dialogue. Every mission line is written here, spoken by a
// named member of the cast, and shown with that character's portrait.
// Full English, in character, never placeholder text.
import { MISSIONS, CAST } from './data.js';

export function castById(id) {
  return CAST.find((c) => c.id === id) || CAST[0];
}

export function dialogueFor(missionId, stage, phase) {
  const def = MISSIONS.find((m) => m.id === missionId);
  if (!def) return null;
  const giver = castById(def.giver);
  if (phase === 'intro') return { speaker: giver.id, name: giver.name, text: def.intro };
  if (phase === 'outro') return { speaker: giver.id, name: giver.name, text: def.outro };
  const lines = MISSION_STAGE_LINES[missionId] || {};
  const line = lines[stage];
  if (!line) return { speaker: giver.id, name: giver.name, text: def.stages[Math.min(stage, def.stages.length - 1)].hint };
  return line;
}

const MISSION_STAGE_LINES = {
  1: {
    0: { speaker: 'kane', name: 'Kane Doyle', text: 'That coupe by the marina. Take it. Quietly, if you can.' },
    1: { speaker: 'rosa', name: 'Rosa Marin', text: 'Nice. Bring her to my garage — I will make her faster.' },
    2: { speaker: 'rosa', name: 'Rosa Marin', text: 'Roll her in slow. She is yours now, Milo.' },
  },
  2: {
    0: { speaker: 'kane', name: 'Kane Doyle', text: 'Pick the crew up in Old Town. No detours, no heroes.' },
    1: { speaker: 'kane', name: 'Kane Doyle', text: 'Cops on us. Break line of sight — alleys, not highways.' },
    2: { speaker: 'lena', name: 'Lena Kross', text: 'Clear. Safehouse is two blocks east. Bring them home.' },
  },
  3: {
    0: { speaker: 'dario', name: 'Dario Fontana', text: 'First shop, Downtown. The owner knows the drill.' },
    1: { speaker: 'dario', name: 'Dario Fontana', text: 'Neon Mile next. Smile when you ask.' },
    2: { speaker: 'dario', name: 'Dario Fontana', text: 'Last one, Palm Beach. Then bring it all to me.' },
    3: { speaker: 'dario', name: 'Dario Fontana', text: 'Harbor Market. Do not stop for anyone.' },
  },
  4: {
    0: { speaker: 'rosa', name: 'Rosa Marin', text: 'They are inside my garage, Milo. Six Vultures. End it.' },
    1: { speaker: 'rosa', name: 'Rosa Marin', text: 'Use the crates for cover. They shoot first and ask never.' },
  },
  5: {
    0: { speaker: 'lena', name: 'Lena Kross', text: 'Side alley, not the front door. Cameras are already mine.' },
    1: { speaker: 'lena', name: 'Lena Kross', text: 'Vault is open. Hold the room twenty seconds. Count with me.' },
    2: { speaker: 'kane', name: 'Kane Doyle', text: 'Three stars and a bag of cash. Drive like the city is on fire.' },
  },
  6: {
    0: { speaker: 'kane', name: 'Kane Doyle', text: 'Vex set the trap. The whole PCPD is coming. Get to the marina.' },
    1: { speaker: 'kane', name: 'Kane Doyle', text: 'Four stars. Do not stop for anything. The far pier — go!' },
    2: { speaker: 'rosa', name: 'Rosa Marin', text: 'The boat is at the pier. Get on it, Milo. Get on it now.' },
  },
};

// One-liners the world drops when the player does something notable.
export const BARKS = {
  steal: [
    { speaker: 'milo', name: 'Milo Vane', text: 'Borrowed. Permanently.' },
    { speaker: 'milo', name: 'Milo Vane', text: 'She drives like a dream. My dream now.' },
  ],
  wanted: [
    { speaker: 'lena', name: 'Lena Kross', text: 'PCPD is on you. Lose them before they box you in.' },
  ],
  escape: [
    { speaker: 'kane', name: 'Kane Doyle', text: 'You lost them. That is how legends start.' },
  ],
  race: [
    { speaker: 'neri', name: 'Neri Flint', text: 'Flint does not lose on home streets.' },
  ],
};

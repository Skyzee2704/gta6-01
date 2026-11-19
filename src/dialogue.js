// Dialogue: the mission talk, queued line by line, each with its speaker
// and a portrait. All of it is in English, all of it original to Solmar.
// A line lives on screen for four and a half seconds, then the next one
// steps in — the queue never drops a line, and starting a mission clears
// the old queue first so two jobs never talk over each other.
import { CAST } from './data.js';

export function castById(id) {
  return CAST.find((c) => c.id === id) || CAST[0];
}

/** The lines for one mission, in order. Kane plans, Rosa drives, Milo
 *  talks back — three voices, three lines each, every job. */
export const MISSION_LINES = {
  1: [
    { who: 'kane', text: 'Milo. You want in? Prove it. Bring me a coupe off Marina Boulevard.' },
    { who: 'milo', text: 'Any coupe? Or one with the keys in it?' },
    { who: 'kane', text: 'The pretty one. And try not to scratch it. Much.' },
  ],
  2: [
    { who: 'rosa', text: 'I lifted the till and the whole diner is yelling. Drive, Milo. Drive!' },
    { who: 'milo', text: 'Seatbelt on, Rosa. This is going to be loud.' },
    { who: 'rosa', text: 'Loud is my favourite speed.' },
  ],
  3: [
    { who: 'kane', text: 'Three shops owe me. Three doors, three debts. The Vultures are circling — be quick.' },
    { who: 'milo', text: 'And if they pay in attitude instead of cash?' },
    { who: 'kane', text: 'Then you collect the attitude too.' },
  ],
  4: [
    { who: 'rosa', text: 'The Vultures jumped our turf on Neon Mile. Six of them. Send them home.' },
    { who: 'milo', text: 'Six? I was hoping for a challenge.' },
    { who: 'rosa', text: 'Try not to die showing off.' },
  ],
  5: [
    { who: 'kane', text: 'Downtown Bank Tower. One sleepy guard, one vault, one perfect morning.' },
    { who: 'milo', text: 'And after? We split it and vanish?' },
    { who: 'kane', text: 'After, Milo, we do not vanish. We buy the marina.' },
  ],
  6: [
    { who: 'kane', text: 'Last job. The Harbor Cruiser is waiting at the docks. Take it and own this city.' },
    { who: 'milo', text: 'King of Solmar. I like the sound of that.' },
    { who: 'rosa', text: 'Then go be king. I will wave from the pier.' },
  ],
};

/** A first-in, first-out queue of dialogue lines. */
export function createDialogue() {
  return { queue: [], current: null, timer: 0 };
}

/** Queue a mission's lines, in order, with the speaker attached. */
export function queueMissionLines(dialogue, missionId) {
  const lines = MISSION_LINES[missionId] || [];
  for (const line of lines) dialogue.queue.push({ ...line, speaker: castById(line.who) });
  return dialogue.queue.length;
}

/** Queue one free line, outside any mission. */
export function say(dialogue, who, text) {
  dialogue.queue.push({ who, text, speaker: castById(who) });
}

/** Advance the queue; shows each line for a few seconds. Returns the
 *  line on screen now, or null when the queue is quiet. */
export function stepDialogue(dialogue, dt) {
  if (!dialogue.current && dialogue.queue.length > 0) {
    dialogue.current = dialogue.queue.shift();
    dialogue.timer = 4.5;
  }
  if (dialogue.current) {
    dialogue.timer -= dt;
    if (dialogue.timer <= 0) dialogue.current = null;
  }
  return dialogue.current;
}

/** Clear the queue and the line on screen — used when a new mission
 *  starts, so the old job's last line never haunts the new one. */
export function clearDialogue(dialogue) {
  dialogue.queue.length = 0;
  dialogue.current = null;
  dialogue.timer = 0;
  return dialogue;
}

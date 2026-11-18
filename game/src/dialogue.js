// dialogue.js — a queue of spoken lines with a typewriter.
// One line shows at a time; the player can skip. Dialogue never blocks
// the sim: the world keeps moving while Rosa talks.

import { clamp } from './random.js';

// Fresh dialogue state.
export function createDialogue() {
  return { queue: [], current: null, shown: 0, timer: 0 };
}

// Queue a line. `speaker` is a cast name, `text` is English.
export function say(state, speaker, text) {
  state.dialogue.queue.push({ speaker, text, shown: 0 });
}

// Advance the typewriter. Each line reveals over ~1.5 seconds, holds
// for 2.5 seconds, then the next line starts.
export function updateDialogue(state, dt) {
  const d = state.dialogue;
  if (!d.current && d.queue.length) {
    d.current = d.queue.shift();
    d.current.shown = 0;
    d.timer = 0;
  }
  if (!d.current) return;
  d.timer += dt;
  const revealTime = 1.5;
  d.current.shown = clamp(Math.floor((d.timer / revealTime) * d.current.text.length), 0, d.current.text.length);
  if (d.timer > revealTime + 2.5) {
    d.current = null;
    d.timer = 0;
  }
}

// Skip the current line immediately.
export function skipDialogue(state) {
  state.dialogue.current = null;
  state.dialogue.timer = 0;
}

// The text currently on screen (typewriter-revealed prefix).
export function dialogueText(state) {
  const c = state.dialogue.current;
  if (!c) return null;
  return { speaker: c.speaker, text: c.text.slice(0, c.shown) };
}

// Dialogue queue: each line shows long enough to read (1.8s + length x
// 0.045s, max 6.5s). Enter skips the current line.
export function pushDialogue(state, text) {
  state.dialogue.push({ text, t: 0 });
}
export function currentDialogue(state) {
  return state.dialogue[0] || null;
}
export function skipDialogue(state) {
  if (state.dialogue.length) state.dialogue.shift();
}
// Display time: a 1.8 s base + 0.045 s per character (average reading
// speed), capped at 6.5 s so a long line never blocks the next one.
const DIALOGUE_BASE = 1.8, DIALOGUE_PER_CHAR = 0.045, DIALOGUE_MAX = 6.5;
export function dialogueDuration(text) {
  return Math.min(DIALOGUE_MAX, DIALOGUE_BASE + text.length * DIALOGUE_PER_CHAR);
}
export function updateDialogue(state, dt) {
  for (const d of state.dialogue) d.t += dt;
  state.dialogue = state.dialogue.filter(d => d.t < dialogueDuration(d.text));
}

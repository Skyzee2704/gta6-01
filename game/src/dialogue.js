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
export function dialogueDuration(text) {
  return Math.min(6.5, 1.8 + text.length * 0.045);
}
export function updateDialogue(state, dt) {
  for (const d of state.dialogue) d.t += dt;
  state.dialogue = state.dialogue.filter(d => d.t < dialogueDuration(d.text));
}

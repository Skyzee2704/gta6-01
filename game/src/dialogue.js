import { registerSystem } from './world.js';
export const dialogueActive=w=>!!w.dialogue.current||w.dialogue.queue.length>0;
export function stepDialogue(w,input,dt){const d=w.dialogue;if(!d.current&&d.queue.length){d.current=d.queue.shift();d.charT=0;}if(!d.current)return;d.charT=Math.min(d.current.text.length,d.charT+30*dt);if(input.pressed?.interact||input.pressed?.shoot){if(d.charT>=d.current.text.length){d.current=null;d.charT=0;}else d.charT=d.current.text.length;}if(d.current)d.current.visibleChars=Math.floor(d.charT);}
registerSystem('dialogue',stepDialogue);

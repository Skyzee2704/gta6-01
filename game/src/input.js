// Keyboard + mouse. Held keys give movement; one-shot presses queue as bit
// flags and are taken once by the loop, so a press between frames is never
// lost or counted twice.
import { emptyInput } from './world.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MAP = 4;
export const ACTION_TOPDOWN = 8;

export function createInput(canvas) {
  const held = new Set();
  let actions = 0, mouseDX = 0, mouseDY = 0, wheel = 0, fireHeld = false;
  let locked = false;
  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    held.add(event.code);
    if (event.code === 'Space' || event.code === 'Enter') actions |= ACTION_CONFIRM;
    if (event.code === 'Escape') actions |= ACTION_PAUSE;
    if (event.code === 'KeyM') actions |= ACTION_MAP;
    if (event.code === 'KeyV') actions |= ACTION_TOPDOWN;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => held.clear());
  canvas.addEventListener('mousedown', (e) => { if (e.button === 0) fireHeld = true; if (e.button === 2) held.add('Aim'); });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) fireHeld = false; if (e.button === 2) held.delete('Aim'); });
  canvas.addEventListener('mousemove', (e) => { mouseDX += e.movementX || 0; mouseDY += e.movementY || 0; });
  canvas.addEventListener('wheel', (e) => { wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  function read() {
    const input = emptyInput();
    input.forward = held.has('KeyW') || held.has('ArrowUp');
    input.back = held.has('KeyS') || held.has('ArrowDown');
    input.left = held.has('KeyA') || held.has('ArrowLeft');
    input.right = held.has('KeyD') || held.has('ArrowRight');
    input.run = held.has('ShiftLeft') || held.has('ShiftRight');
    input.jump = held.has('Space');
    input.handbrake = held.has('Space');
    input.interact = held.has('KeyE');
    input.enterVehicle = held.has('KeyE');
    input.reload = held.has('KeyR');
    input.aim = held.has('Aim');
    input.fire = fireHeld;
    input.mouseDX = mouseDX; input.mouseDY = mouseDY;
    input.wheel = wheel;
    input.radioNext = held.has('KeyQ') && !held.has('ShiftLeft');
    mouseDX = 0; mouseDY = 0; wheel = 0;
    return input;
  }
  return {
    read,
    takeActions() { const t = actions; actions = 0; return t; },
    isHeld(code) { return held.has(code); },
    press(code) { held.add(code); },
    release(code) { held.delete(code); },
  };
}

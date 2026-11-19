// SOLMAR 3D — keyboard + mouse. A/D move the player LEFT/RIGHT on screen
// (never mirrored), mouse look turns the camera the way the mouse moves.
// One-shot presses are edge-triggered flags: radio next/prev, weapon
// switch and pause never spin from a held key.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RADIO_NEXT = 4;
export const ACTION_RADIO_PREV = 8;
export const ACTION_WEAPON_NEXT = 16;
export const ACTION_WEAPON_PREV = 32;
export const ACTION_ENTER = 64;
export const ACTION_HORN = 128;
export const ACTION_RELOAD = 256;
export const ACTION_MAP = 512;
export const ACTION_EXIT = 1024;

export const KEYMAP = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
  Space: 'handbrake',
};

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let lookDX = 0;
  let lookDY = 0;
  let locked = false;

  function press(code) {
    if (code === 'Space' || code === 'Enter') actions |= ACTION_CONFIRM;
    else if (code === 'KeyP' || code === 'Escape') actions |= ACTION_PAUSE;
    else if (code === 'BracketRight') actions |= ACTION_RADIO_NEXT;
    else if (code === 'BracketLeft') actions |= ACTION_RADIO_PREV;
    else if (code === 'Digit1') actions |= ACTION_WEAPON_NEXT;
    else if (code === 'Digit2') actions |= ACTION_WEAPON_PREV;
    else if (code === 'KeyE') actions |= ACTION_ENTER;
    else if (code === 'KeyH') actions |= ACTION_HORN;
    else if (code === 'KeyR') actions |= ACTION_RELOAD;
    else if (code === 'KeyM') actions |= ACTION_MAP;
    else if (code === 'KeyQ') actions |= ACTION_EXIT;
  }

  window.addEventListener('keydown', (event) => {
    if (KEYMAP[event.code]) held.add(KEYMAP[event.code]);
    if (!event.repeat) press(event.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (KEYMAP[event.code]) held.delete(KEYMAP[event.code]);
  });
  window.addEventListener('blur', () => held.clear());
  document.addEventListener('mousemove', (event) => {
    if (!locked) return;
    // Mouse right -> look right; mouse up -> look up. No inversion, no mirror.
    lookDX += event.movementX;
    lookDY += event.movementY;
  });
  canvas.addEventListener('click', () => {
    if (canvas.requestPointerLock) canvas.requestPointerLock();
  });
  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === canvas;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) held.add('fire');
    if (event.button === 2) held.add('aim');
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) held.delete('fire');
    if (event.button === 2) held.delete('aim');
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    // -1..1 strafe (A = -1 left, D = +1 right), -1..1 forward (W = +1).
    move() {
      const x = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
      const z = (held.has('forward') ? 1 : 0) - (held.has('back') ? 1 : 0);
      return { x, z };
    },
    run() {
      return held.has('run');
    },
    handbrake() {
      return held.has('handbrake');
    },
    firing() {
      return held.has('fire');
    },
    aiming() {
      return held.has('aim');
    },
    // Mouse look deltas since last take, consumed once.
    takeLook() {
      const out = { dx: lookDX, dy: lookDY };
      lookDX = 0;
      lookDY = 0;
      return out;
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    isLocked() {
      return locked;
    },
  };
}

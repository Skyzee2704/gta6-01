// Keyboard, mouse and touch input. A is left, D is right, and the mouse
// look is not mirrored: moving the mouse right turns the view right.
// One-shot actions (enter a car, pause, switch radio station) are
// edge-triggered — one press, one action — so the radio never spins and a
// held key never enters and exits a car twenty times a second.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_RADIO_NEXT = 8;
export const ACTION_RADIO_PREV = 16;
export const ACTION_WEAPON_NEXT = 32;
export const ACTION_RELOAD = 64;
export const ACTION_HORN = 128;
export const ACTION_CAMERA = 256;

const KEYMAP = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
  Space: 'handbrake',
};

export function createInput(target) {
  const held = { forward: false, back: false, left: false, right: false, run: false, handbrake: false, fire: false, aim: false };
  let actions = 0;
  let mouseDX = 0;
  let locked = false;

  function press(action) {
    actions |= action;
  }

  window.addEventListener('keydown', (event) => {
    const name = KEYMAP[event.code];
    if (name) {
      held[name] = true;
      event.preventDefault();
      return;
    }
    // One-shot keys only fire on the first press, never on auto-repeat.
    if (event.repeat) return;
    if (event.code === 'KeyE') press(ACTION_ENTER);
    else if (event.code === 'KeyP' || event.code === 'Escape') press(ACTION_PAUSE);
    else if (event.code === 'Space' || event.code === 'Enter') press(ACTION_CONFIRM);
    else if (event.code === 'BracketRight') press(ACTION_RADIO_NEXT);
    else if (event.code === 'BracketLeft') press(ACTION_RADIO_PREV);
    else if (event.code === 'KeyQ') press(ACTION_WEAPON_NEXT);
    else if (event.code === 'KeyR') press(ACTION_RELOAD);
    else if (event.code === 'KeyH') press(ACTION_HORN);
    else if (event.code === 'KeyC') press(ACTION_CAMERA);
  });
  window.addEventListener('keyup', (event) => {
    const name = KEYMAP[event.code];
    if (name) held[name] = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of
  // everything on blur, or the player drives into a wall forever.
  window.addEventListener('blur', () => {
    for (const key of Object.keys(held)) held[key] = false;
  });

  // Mouse look: pointer lock, right is right. The delta is never negated,
  // never scaled by anything but the sensitivity in main.js.
  target.addEventListener('click', () => {
    if (target.requestPointerLock) target.requestPointerLock();
  });
  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === target;
  });
  document.addEventListener('mousemove', (event) => {
    if (locked) mouseDX += event.movementX;
  });
  target.addEventListener('mousedown', (event) => {
    if (event.button === 0) held.fire = true;
    if (event.button === 2) held.aim = true;
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) held.fire = false;
    if (event.button === 2) held.aim = false;
  });
  target.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    held,
    /** -1 for left (A), +1 for right (D). Never mirrored. */
    steer() {
      return (held.right ? 1 : 0) - (held.left ? 1 : 0);
    },
    /** Mouse look delta since the last read, in pixels, right positive. */
    takeMouseDX() {
      const dx = mouseDX;
      mouseDX = 0;
      return dx;
    },
    /** One-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}

/** A synthetic input for headless tests and the autopilot: every field
 *  present, every field false, unless the caller overrides it. */
export function stubInput(overrides) {
  return {
    steer: 0, forward: false, back: false, run: false,
    handbrake: false, fire: false, enter: false,
    climbUp: false, climbDown: false, ...overrides,
  };
}

/** Merge a held-keys object into a step input: forward/back/run plus the
 *  steering direction, so the world never has to read the keyboard itself. */
export function heldToInput(held) {
  return {
    steer: (held.right ? 1 : 0) - (held.left ? 1 : 0),
    forward: !!held.forward, back: !!held.back, run: !!held.run,
    handbrake: !!held.handbrake, fire: !!held.fire, enter: false,
    climbUp: !!held.forward, climbDown: !!held.back,
  };
}

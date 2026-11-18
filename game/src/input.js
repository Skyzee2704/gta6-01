// input.js — keyboard + mouse input, with edge-triggered actions.
// The sim reads a plain input object each step; the browser builds it
// from real keys, the tests build it by hand. An "action" fires once per
// key press (edge), not once per step while held — that is what stops
// the radio from spinning when ] is held down.

import { clamp } from './random.js';

// A fresh input object: every control released, no actions queued.
export function emptyInput() {
  return {
    forward: false,
    back: false,
    left: false,
    right: false,
    handbrake: false,
    jump: false,
    run: false,
    enterVehicle: false,
    interact: false,
    fire: false,
    reload: false,
    weaponNext: false,
    weaponPrev: false,
    radioNext: false,
    radioPrev: false,
    pause: false,
    map: false,
    topDown: false,
    mouseDX: 0,
    mouseDY: 0,
  };
}

// The live keyboard state the browser maintains. `pressed` is the set of
// keys currently down; `tapped` is the set pressed since the last step
// (cleared after each step, so one press = one action).
export function createKeyboard() {
  return {
    pressed: new Set(),
    tapped: new Set(),
    mouseDX: 0,
    mouseDY: 0,
    // Call from a keydown handler. Returns nothing; the press is recorded.
    down(code) {
      if (!this.pressed.has(code)) this.tapped.add(code);
      this.pressed.add(code);
    },
    up(code) {
      this.pressed.delete(code);
    },
    // Build the sim input for this step from the live key state.
    read() {
      const p = this.pressed;
      const t = this.tapped;
      const inp = emptyInput();
      inp.forward = p.has('KeyW') || p.has('ArrowUp');
      inp.back = p.has('KeyS') || p.has('ArrowDown');
      inp.left = p.has('KeyA') || p.has('ArrowLeft');
      inp.right = p.has('KeyD') || p.has('ArrowRight');
      inp.handbrake = p.has('Space');
      inp.jump = p.has('Space');
      inp.run = p.has('ShiftLeft') || p.has('ShiftRight');
      inp.enterVehicle = t.has('KeyE');
      inp.interact = t.has('KeyE');
      inp.fire = p.has('Mouse0');
      inp.reload = t.has('KeyR');
      inp.weaponNext = t.has('KeyQ');
      inp.radioNext = t.has('BracketRight');
      inp.radioPrev = t.has('BracketLeft');
      inp.pause = t.has('Escape');
      inp.map = t.has('KeyM');
      inp.topDown = t.has('KeyV');
      inp.mouseDX = this.mouseDX;
      inp.mouseDY = this.mouseDY;
      this.mouseDX = 0;
      this.mouseDY = 0;
      this.tapped.clear();
      return inp;
    },
  };
}

// Mouse look: turning right (positive mouseDX) decreases yaw, so the
// camera swings the way the hand moves. The sim applies this to the
// player heading when aiming on foot.
export function applyMouseLook(state, mouseDX, sensitivity = 0.003) {
  if (!state.player.onFoot) return;
  state.player.heading -= mouseDX * sensitivity;
}

// Clamp a value into a range (re-exported for input users).
export { clamp };

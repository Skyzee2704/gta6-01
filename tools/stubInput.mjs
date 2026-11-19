// Shared headless input stub for the Node gates: the same shape
// createInput() returns in the browser, driven by fields the test sets.
export function stubInput(overrides = {}) {
  const s = {
    _move: { x: 0, z: 0 },
    _brake: false,
    _fire: false,
    _run: false,
    _aim: false,
    _look: { dx: 0, dy: 0 },
    _actions: 0,
    move() { return this._move; },
    run() { return this._run; },
    handbrake() { return this._brake; },
    firing() { return this._fire; },
    aiming() { return this._aim; },
    takeLook() {
      const l = this._look;
      this._look = { dx: 0, dy: 0 };
      return l;
    },
    takeActions() {
      const a = this._actions;
      this._actions = 0;
      return a;
    },
    isLocked() { return false; },
    ...overrides,
  };
  return s;
}

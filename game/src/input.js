// SOLMAR 3D — keyboard + mouse input with edge triggering. Held keys give
// a direction; pressed-this-frame is consumed once, so a press between two
// frames is never lost and never counted twice. No DOM creation here.
export const KEYMAP = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  run: ['ShiftLeft', 'ShiftRight'],
  jump: ['Space'],
  interact: ['KeyE'],
  shoot: ['Mouse0', 'KeyF'],
  reload: ['KeyR'],
  wheel: ['KeyQ'],
  nextStation: ['BracketRight'],
  prevStation: ['BracketLeft'],
  weapon1: ['Digit1'],
  weapon2: ['Digit2'],
  weapon3: ['Digit3'],
  weapon4: ['Digit4'],
  weapon5: ['Digit5'],
  crouch: ['KeyC'],
  horn: ['KeyH'],
  map: ['KeyM'],
  topdown: ['KeyV'],
  pause: ['Escape'],
};

export function createInput() {
  const held = new Set();
  const pressed = new Set();
  const released = new Set();
  let mouseX = 0;
  let mouseY = 0;
  let mouseDX = 0;
  let mouseDY = 0;
  let attached = false;

  function codeOf(e) {
    if (e.type.startsWith('mouse')) return 'Mouse' + e.button;
    return e.code;
  }

  function onDown(e) {
    const code = codeOf(e);
    if (!held.has(code)) pressed.add(code);
    held.add(code);
    if (code === 'Space' || code.startsWith('Arrow')) e.preventDefault();
  }

  function onUp(e) {
    const code = codeOf(e);
    held.delete(code);
    released.add(code);
  }

  function onMove(e) {
    mouseDX += e.movementX || 0;
    mouseDY += e.movementY || 0;
    mouseX = e.clientX;
    mouseY = e.clientY;
  }

  return {
    held,
    pressed,
    released,
    attach() {
      if (attached || typeof window === 'undefined') return;
      attached = true;
      window.addEventListener('keydown', onDown);
      window.addEventListener('keyup', onUp);
      window.addEventListener('mousedown', onDown);
      window.addEventListener('mouseup', onUp);
      window.addEventListener('mousemove', onMove);
    },
    detach() {
      if (!attached || typeof window === 'undefined') return;
      attached = false;
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
    },
    beginFrame() {
      pressed.clear();
      released.clear();
      mouseDX = 0;
      mouseDY = 0;
    },
    endFrame() {
      pressed.clear();
      released.clear();
    },
    isDown(action) {
      const codes = KEYMAP[action] || [];
      return codes.some((c) => held.has(c));
    },
    wasPressed(action) {
      const codes = KEYMAP[action] || [];
      return codes.some((c) => pressed.has(c));
    },
    wasReleased(action) {
      const codes = KEYMAP[action] || [];
      return codes.some((c) => released.has(c));
    },
    axis() {
      let x = 0;
      let y = 0;
      if (this.isDown('left')) x -= 1;
      if (this.isDown('right')) x += 1;
      if (this.isDown('up')) y -= 1;
      if (this.isDown('down')) y += 1;
      return { x, y };
    },
    get mouse() {
      return { x: mouseX, y: mouseY, dx: mouseDX, dy: mouseDY };
    },
  };
}

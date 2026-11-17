// Keyboard and mouse input. Held keys are read every frame; one-shot
// presses (interact, attack, reload, weapon switch, pause) are queued and
// taken once by the loop, so a press between two frames is never lost and
// never counted twice. The mouse position is kept in screen pixels and the
// loop converts it to world coordinates with the camera.
export function createInput(canvas) {
  const down = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false, pressed: false };

  function codeOf(event) {
    return event.code;
  }

  window.addEventListener('keydown', (event) => {
    const code = codeOf(event);
    if (code === 'Space' || code.startsWith('Arrow')) event.preventDefault();
    if (!event.repeat) pressed.add(code);
    down.add(code);
  });
  window.addEventListener('keyup', (event) => {
    down.delete(codeOf(event));
  });
  // A key released while the tab is hidden never sends keyup: let go of
  // everything on blur so the player never drives off on their own.
  window.addEventListener('blur', () => {
    down.clear();
    mouse.down = false;
  });
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
      mouse.down = true;
      mouse.pressed = true;
    }
  });
  window.addEventListener('mouseup', () => {
    mouse.down = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  // Read the current state into the plain object the world consumes. The
  // one-shot presses are NOT cleared here: they survive until a fixed
  // step (or a menu screen) has consumed them, so a press that lands on
  // a frame with no step is never lost. The loop clears them with
  // clearPresses() once they have been handled.
  function read(aimX, aimY) {
    const state = {
      up: down.has('KeyW') || down.has('ArrowUp'),
      down: down.has('KeyS') || down.has('ArrowDown'),
      upPressed: pressed.has('KeyW') || pressed.has('ArrowUp'),
      downPressed: pressed.has('KeyS') || pressed.has('ArrowDown'),
      left: down.has('KeyA') || down.has('ArrowLeft'),
      right: down.has('KeyD') || down.has('ArrowRight'),
      run: down.has('ShiftLeft') || down.has('ShiftRight'),
      handbrake: down.has('Space'),
      interactPressed: pressed.has('KeyE'),
      attackPressed: mouse.pressed,
      attackHeld: mouse.down,
      reloadPressed: pressed.has('KeyR'),
      weaponPistol: pressed.has('Digit2'),
      weaponFists: pressed.has('Digit1'),
      pausePressed: pressed.has('Escape') || pressed.has('KeyP'),
      confirmPressed: pressed.has('Enter') || pressed.has('Space'),
      aimX,
      aimY,
      mouseX: mouse.x,
      mouseY: mouse.y,
    };
    return state;
  }

  // Drop the one-shot presses after the frame that handled them.
  function clearPresses() {
    pressed.clear();
    mouse.pressed = false;
  }

  return { read, clearPresses, mouse };

  return { read, mouse };
}

const CONTROL_CODES = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyE",
  "KeyQ",
  "Space",
  "ShiftLeft",
  "ShiftRight",
  "Digit1",
  "Digit2",
  "Digit3",
  "Digit4",
  "Digit5",
  "Digit6",
  "Digit7",
  "Digit8",
  "Digit9",
  "Numpad1",
  "Numpad2",
  "Numpad3",
  "Numpad4",
  "Numpad5",
  "Numpad6",
  "Numpad7",
  "Numpad8",
  "Numpad9",
]);

export class InputManager {
  constructor(targetElement) {
    this.targetElement = targetElement;
    this.keysDown = new Set();
    this.keysPressed = new Set();
    this.mousePressed = new Set();
    this.mouseDown = new Set();
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.wheelSteps = 0;
    this.locked = false;
    this.mouseBuffer = { x: 0, y: 0 };

    this.onClick = () => {
      if (!this.locked) {
        this.requestPointerLock();
      }
    };

    this.onPointerLockChange = () => {
      this.locked = document.pointerLockElement === this.targetElement;
      document.body.classList.toggle("locked", this.locked);
      if (!this.locked) {
        this.mousePressed.clear();
        this.mouseDown.clear();
      }
    };

    this.onKeyDown = (event) => {
      this.keysDown.add(event.code);
      if (!event.repeat) {
        this.keysPressed.add(event.code);
      }
      if (CONTROL_CODES.has(event.code)) {
        event.preventDefault();
      }
    };

    this.onKeyUp = (event) => {
      this.keysDown.delete(event.code);
      if (CONTROL_CODES.has(event.code)) {
        event.preventDefault();
      }
    };

    this.onMouseMove = (event) => {
      if (!this.locked) {
        return;
      }
      this.mouseDeltaX += event.movementX;
      this.mouseDeltaY += event.movementY;
    };

    this.onMouseDown = (event) => {
      if (!this.locked) {
        return;
      }
      this.mouseDown.add(event.button);
      this.mousePressed.add(event.button);
      event.preventDefault();
    };

    this.onMouseUp = (event) => {
      this.mouseDown.delete(event.button);
    };

    this.onContextMenu = (event) => {
      if (this.locked) {
        event.preventDefault();
      }
    };

    this.onWheel = (event) => {
      if (!this.locked) {
        return;
      }
      const direction = Math.sign(event.deltaY);
      if (direction !== 0) {
        this.wheelSteps += direction;
      }
      event.preventDefault();
    };

    this.onWindowBlur = () => {
      this.keysDown.clear();
      this.keysPressed.clear();
      this.mousePressed.clear();
      this.mouseDown.clear();
    };

    this.targetElement.addEventListener("click", this.onClick);
    document.addEventListener("pointerlockchange", this.onPointerLockChange);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("contextmenu", this.onContextMenu);
    window.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("blur", this.onWindowBlur);
  }

  requestPointerLock() {
    if (!this.locked) {
      this.targetElement.requestPointerLock();
    }
  }

  isKeyDown(code) {
    return this.keysDown.has(code);
  }

  consumeKeyPress(code) {
    if (!this.keysPressed.has(code)) {
      return false;
    }
    this.keysPressed.delete(code);
    return true;
  }

  consumeMouseButton(button) {
    if (!this.mousePressed.has(button)) {
      return false;
    }
    this.mousePressed.delete(button);
    return true;
  }

  isMouseDown(button) {
    return this.mouseDown.has(button);
  }

  consumeMouseDelta() {
    this.mouseBuffer.x = this.mouseDeltaX;
    this.mouseBuffer.y = this.mouseDeltaY;
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    return this.mouseBuffer;
  }

  consumeWheelSteps() {
    const steps = this.wheelSteps;
    this.wheelSteps = 0;
    return steps;
  }

  destroy() {
    this.targetElement.removeEventListener("click", this.onClick);
    document.removeEventListener("pointerlockchange", this.onPointerLockChange);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mouseup", this.onMouseUp);
    window.removeEventListener("contextmenu", this.onContextMenu);
    window.removeEventListener("wheel", this.onWheel);
    window.removeEventListener("blur", this.onWindowBlur);
  }
}

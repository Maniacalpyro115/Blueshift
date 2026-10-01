(() => {
  "use strict";

  window.SoulBattle = window.SoulBattle || {};

  const VIRTUAL_KEY_DOWN_EVENT = "soulbattle:virtual-keydown";
  const VIRTUAL_KEY_UP_EVENT = "soulbattle:virtual-keyup";
  const coarsePointer = window.matchMedia("(hover: none) and (pointer: coarse)");
  const activeKeys = new Set();
  const buttonPointers = new Map();
  const joystick = document.getElementById("mobile-joystick");
  const joystickKnob = document.getElementById("mobile-joystick-knob");
  let joystickPointer = null;
  let joystickKeys = new Set();

  function dispatchVirtualKey(type, key) {
    window.dispatchEvent(new CustomEvent(type, {
      detail: { key, source: "mobile-controls" }
    }));
  }

  function pressKey(key) {
    if (activeKeys.has(key)) return;
    activeKeys.add(key);
    dispatchVirtualKey(VIRTUAL_KEY_DOWN_EVENT, key);
  }

  function releaseKey(key) {
    if (!activeKeys.delete(key)) return;
    dispatchVirtualKey(VIRTUAL_KEY_UP_EVENT, key);
  }

  function setJoystickKeys(nextKeys) {
    for (const key of joystickKeys) {
      if (!nextKeys.has(key)) releaseKey(key);
    }
    for (const key of nextKeys) {
      if (!joystickKeys.has(key)) pressKey(key);
    }
    joystickKeys = nextKeys;
  }

  function joystickDirection(dx, dy, deadZone) {
    if (Math.hypot(dx, dy) < deadZone) return new Set();
    const octant = (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8;
    return new Set([
      ["ArrowRight"],
      ["ArrowRight", "ArrowDown"],
      ["ArrowDown"],
      ["ArrowLeft", "ArrowDown"],
      ["ArrowLeft"],
      ["ArrowLeft", "ArrowUp"],
      ["ArrowUp"],
      ["ArrowRight", "ArrowUp"]
    ][octant]);
  }

  function updateJoystick(event) {
    if (!joystick || !joystickKnob) return;
    const bounds = joystick.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    const distance = Math.hypot(dx, dy);
    const travel = bounds.width * 0.27;
    const scale = distance > travel ? travel / distance : 1;
    const knobX = dx * scale;
    const knobY = dy * scale;
    joystickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
    setJoystickKeys(joystickDirection(dx, dy, bounds.width * 0.14));
  }

  function resetJoystick() {
    joystickPointer = null;
    setJoystickKeys(new Set());
    if (joystickKnob) joystickKnob.style.transform = "translate(-50%, -50%)";
  }

  function releaseAllControls() {
    resetJoystick();
    for (const { key, element } of buttonPointers.values()) {
      releaseKey(key);
      element.classList.remove("is-pressed");
      element.removeAttribute("aria-pressed");
    }
    buttonPointers.clear();
    for (const key of [...activeKeys]) releaseKey(key);
  }

  function bindActionButton(id, key) {
    const element = document.getElementById(id);
    if (!element) return;

    element.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      if (buttonPointers.has(event.pointerId)) return;
      try { element.setPointerCapture(event.pointerId); } catch (_error) {}
      buttonPointers.set(event.pointerId, { key, element });
      element.classList.add("is-pressed");
      element.setAttribute("aria-pressed", "true");
      pressKey(key);
    });

    const release = (event) => {
      const active = buttonPointers.get(event.pointerId);
      if (!active || active.element !== element) return;
      event.preventDefault();
      buttonPointers.delete(event.pointerId);
      element.classList.remove("is-pressed");
      element.removeAttribute("aria-pressed");
      releaseKey(active.key);
    };

    element.addEventListener("pointerup", release);
    element.addEventListener("pointercancel", release);
    element.addEventListener("lostpointercapture", release);
  }

  function updateMobileMode() {
    const enabled = coarsePointer.matches && navigator.maxTouchPoints > 0;
    document.documentElement.classList.toggle("mobile-input-enabled", enabled);
    if (!enabled) releaseAllControls();
  }

  bindActionButton("mobile-a-button", "Enter");
  bindActionButton("mobile-b-button", "Escape");

  if (joystick) {
    joystick.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      if (joystickPointer !== null) return;
      joystickPointer = event.pointerId;
      try { joystick.setPointerCapture(event.pointerId); } catch (_error) {}
      updateJoystick(event);
    });
    joystick.addEventListener("pointermove", (event) => {
      if (event.pointerId !== joystickPointer) return;
      event.preventDefault();
      updateJoystick(event);
    });
    const releaseJoystick = (event) => {
      if (event.pointerId !== joystickPointer) return;
      event.preventDefault();
      resetJoystick();
    };
    joystick.addEventListener("pointerup", releaseJoystick);
    joystick.addEventListener("pointercancel", releaseJoystick);
    joystick.addEventListener("lostpointercapture", releaseJoystick);
  }

  document.getElementById("mobile-controls")?.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });
  coarsePointer.addEventListener?.("change", updateMobileMode);
  window.addEventListener("blur", releaseAllControls);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) releaseAllControls();
  });
  updateMobileMode();

  window.SoulBattle.mobileControls = {
    VIRTUAL_KEY_DOWN_EVENT,
    VIRTUAL_KEY_UP_EVENT,
    releaseAll: releaseAllControls
  };
})();

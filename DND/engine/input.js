(() => {
  "use strict";

  window.SoulBattle = window.SoulBattle || {};

  const USABLE_KEYS = [
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "w",
    "a",
    "s",
    "d",
    "Enter",
    " ",
    "Spacebar",
    "z",
    "Z",
    "x",
    "X",
    "Escape"
  ];

  function createInput({ canvas, width, height }) {
    const keys = new Set();
    const justPressed = new Set();
    let mouseClick = null;
    let mousePosition = null;

    function pointerPosition(e) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * width,
        y: ((e.clientY - rect.top) / rect.height) * height,
      };
    }

    function pressKey(key) {
      if (typeof key !== "string") return;
      if (!keys.has(key)) justPressed.add(key);
      keys.add(key);
    }

    function releaseKey(key) {
      keys.delete(key);
    }

    window.addEventListener("keydown", (e) => {
      if (USABLE_KEYS.includes(e.key)) e.preventDefault();
      pressKey(e.key);
    });

    window.addEventListener("keyup", (e) => releaseKey(e.key));
    window.addEventListener("soulbattle:virtual-keydown", (e) => pressKey(e.detail?.key));
    window.addEventListener("soulbattle:virtual-keyup", (e) => releaseKey(e.detail?.key));
    window.addEventListener("blur", () => {
      keys.clear();
      justPressed.clear();
    });

    canvas.addEventListener("pointermove", (e) => {
      mousePosition = pointerPosition(e);
    });

    canvas.addEventListener("pointerleave", () => {
      mousePosition = null;
    });

    canvas.addEventListener("pointerdown", (e) => {
      mousePosition = pointerPosition(e);
      mouseClick = mousePosition;
    });

    return {
      get mouseClick() {
        return mouseClick;
      },
      get mousePosition() {
        return mousePosition;
      },
      get confirm() {
        return justPressed.has("Enter") ||
          justPressed.has(" ") ||
          justPressed.has("Spacebar") ||
          justPressed.has("z") ||
          justPressed.has("Z") ||
          mouseClick;
      },
      get enter() {
        return justPressed.has("Enter");
      },
      get escape() {
        return justPressed.has("Escape");
      },
      get cancel() {
        return justPressed.has("Escape") ||
          justPressed.has("x") ||
          justPressed.has("X");
      },
      get left() {
        return justPressed.has("ArrowLeft") ||
          justPressed.has("a") ||
          justPressed.has("A");
      },
      get right() {
        return justPressed.has("ArrowRight") ||
          justPressed.has("d") ||
          justPressed.has("D");
      },
      get up() {
        return justPressed.has("ArrowUp") ||
          justPressed.has("w") ||
          justPressed.has("W");
      },
      get down() {
        return justPressed.has("ArrowDown") ||
          justPressed.has("s") ||
          justPressed.has("S");
      },
      isHeld(key) {
        return keys.has(key);
      },
      consume() {
        mouseClick = null;
        justPressed.clear();
      }
    };
  }

  window.SoulBattle.input = {
    createInput
  };
})();

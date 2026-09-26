(() => {
  "use strict";

  if (typeof window.SoulBattle?.createGame !== "function") {
    throw new Error("Soul Battle runtime failed to load.");
  }

  const encounters = window.SoulBattle.encounters;
  const requestedId = new URLSearchParams(window.location.search).get("fight")?.toLowerCase();
  const requestedEncounter = encounters?.get(requestedId);

  function navigateToEncounter(id) {
    const url = new URL(window.location.href);
    url.searchParams.set("fight", id);
    window.location.assign(url.href);
  }

  function navigateToSelection() {
    const url = new URL(window.location.href);
    url.searchParams.delete("fight");
    window.location.assign(url.href);
  }

  function startEncounter(id, definition) {
    document.body.dataset.screen = "battle";
    document.body.dataset.encounter = id;
    window.SoulBattle.game = window.SoulBattle.createGame({
      encounterId: id,
      enemy: definition,
      onRequestEncounterSelection: navigateToSelection
    });
  }

  function createEncounterSelector() {
    const choices = (encounters?.list() || []).sort((left, right) => {
      const leftOrder = Number.isFinite(left.definition?.selectorOrder)
        ? left.definition.selectorOrder
        : Number.MAX_SAFE_INTEGER;
      const rightOrder = Number.isFinite(right.definition?.selectorOrder)
        ? right.definition.selectorOrder
        : Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder;
    });
    const cards = [
      ...choices.map((choice) => ({ ...choice, selectable: true })),
      { id: "coming-soon-1", name: "UNKNOWN", selectable: false, placeholder: true },
      { id: "coming-soon-2", name: "UNKNOWN", selectable: false, placeholder: true }
    ];
    const canvas = document.getElementById("game");
    const ctx = canvas.getContext("2d");
    const menuMoveSound = window.SoulBattle.assets.loadSound("sounds/snd_select.wav");
    const visibleCardCount = 4;
    const cardWidth = 168;
    const cardHeight = 332;
    const cardGap = 18;
    const cardY = 176;
    const stripWidth = visibleCardCount * cardWidth + (visibleCardCount - 1) * cardGap;
    const stripX = (canvas.width - stripWidth) / 2;
    const leftArrow = { x: 37, y: 300, w: 38, h: 86 };
    const rightArrow = { x: canvas.width - 75, y: 300, w: 38, h: 86 };
    const selectorSprites = new Map();
    const silhouettes = new WeakMap();
    let focused = 0;
    let hovered = -1;
    let carouselStart = 0;
    document.body.dataset.screen = "encounter-select";
    delete document.body.dataset.encounter;

    function cardRect(slot) {
      return {
        x: stripX + slot * (cardWidth + cardGap),
        y: cardY,
        w: cardWidth,
        h: cardHeight
      };
    }

    function pointInRect(x, y, rect) {
      return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
    }

    function defaultFrames(card) {
      const configured = card.definition?.defaultAnimation?.frames;
      if (Array.isArray(configured) && configured.length) return configured;
      return typeof card.definition?.sprite === "string" ? [card.definition.sprite] : [];
    }

    function selectorImage(src) {
      if (selectorSprites.has(src)) return selectorSprites.get(src);
      const image = new Image();
      image.src = src;
      selectorSprites.set(src, image);
      return image;
    }

    for (const card of cards) {
      for (const src of defaultFrames(card)) selectorImage(src);
    }

    function spriteFor(card, now) {
      const frames = defaultFrames(card);
      if (!frames.length) return null;
      const configuredFps = card.definition?.defaultAnimation?.fps;
      const fps = Number.isFinite(configuredFps) && configuredFps > 0 ? configuredFps : 6;
      const frameIndex = Math.floor(now / (1000 / fps)) % frames.length;
      return selectorImage(frames[frameIndex]);
    }

    function silhouetteFor(image) {
      if (silhouettes.has(image)) return silhouettes.get(image);
      const silhouette = document.createElement("canvas");
      silhouette.width = image.naturalWidth;
      silhouette.height = image.naturalHeight;
      const silhouetteCtx = silhouette.getContext("2d");
      silhouetteCtx.drawImage(image, 0, 0);
      silhouetteCtx.globalCompositeOperation = "source-in";
      silhouetteCtx.fillStyle = "#000";
      silhouetteCtx.fillRect(0, 0, silhouette.width, silhouette.height);
      silhouettes.set(image, silhouette);
      return silhouette;
    }

    function drawSpriteGlow(x, y, radius, strong) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(0.78, 1.08);
      const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, radius);
      glow.addColorStop(0, strong ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.24)");
      glow.addColorStop(0.5, strong ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.12)");
      glow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
      ctx.restore();
    }

    function drawEnemySprite(card, rect, now) {
      const image = spriteFor(card, now);
      if (!image?.complete || !image.naturalWidth || !image.naturalHeight) return;
      const maxWidth = rect.w - 24;
      const maxHeight = 196;
      const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      const x = rect.x + (rect.w - width) / 2;
      const y = rect.y + 18 + (maxHeight - height) / 2;
      const flip = card.definition?.spriteFlips?.default;
      const flipX = flip && typeof flip === "object" && flip.x === true;
      const flipY = flip === true || (flip && typeof flip === "object" && flip.y === true);
      drawSpriteGlow(rect.x + rect.w / 2, rect.y + 115, Math.max(68, Math.min(94, height * 0.52)), card.isNew);
      ctx.save();
      ctx.translate(x + (flipX ? width : 0), y + (flipY ? height : 0));
      ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
      ctx.drawImage(card.isNew ? silhouetteFor(image) : image, 0, 0, width, height);
      ctx.restore();
    }

    function drawNewLabel(rect, active) {
      const badgeSize = 36;
      const badgeX = rect.x + rect.w - badgeSize - 13;
      const badgeY = rect.y + 13;
      ctx.fillStyle = "#000";
      ctx.strokeStyle = active ? "#ffcc33" : "#fff";
      ctx.lineWidth = 3;
      ctx.fillRect(badgeX, badgeY, badgeSize, badgeSize);
      ctx.strokeRect(badgeX, badgeY, badgeSize, badgeSize);
      ctx.fillStyle = active ? "#ffcc33" : "#fff";
      ctx.font = "bold 29px Courier New";
      ctx.fillText("!", badgeX + badgeSize / 2, badgeY + 28);
      ctx.font = "bold 14px Courier New";
      ctx.fillText("NEW CHALLENGER", rect.x + rect.w / 2, rect.y + 258);
      ctx.fillText("APPROACHING", rect.x + rect.w / 2, rect.y + 279);
    }

    function drawPlaceholder(rect, emphasized) {
      ctx.fillStyle = emphasized ? "#d7d7d7" : "#555";
      ctx.font = "bold 112px Courier New";
      ctx.fillText("?", rect.x + rect.w / 2, rect.y + 166);
      ctx.font = "bold 18px Courier New";
      ctx.fillText("UNKNOWN", rect.x + rect.w / 2, rect.y + 268);
      ctx.font = "13px Courier New";
      ctx.fillText("NOT YET AVAILABLE", rect.x + rect.w / 2, rect.y + 302);
    }

    function drawCarouselArrow(rect, direction, enabled, hot) {
      ctx.fillStyle = hot && enabled ? "rgba(242,140,40,0.16)" : "rgba(255,255,255,0.02)";
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeStyle = enabled ? (hot ? "#ffcc33" : "#f28c28") : "#353535";
      ctx.lineWidth = hot ? 4 : 3;
      ctx.beginPath();
      const inset = direction < 0 ? 23 : 15;
      ctx.moveTo(rect.x + inset, rect.y + 22);
      ctx.lineTo(rect.x + (direction < 0 ? 12 : 26), rect.y + rect.h / 2);
      ctx.lineTo(rect.x + inset, rect.y + rect.h - 22);
      ctx.stroke();
    }

    function draw(now = performance.now()) {
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#5b2118";
      ctx.lineWidth = 3;
      ctx.strokeRect(32, 38, canvas.width - 64, canvas.height - 76);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = "42px Courier New";
      ctx.fillText("Select a Fight", canvas.width / 2, 96);
      ctx.fillStyle = "#f28c28";
      ctx.font = "18px Courier New";
      ctx.fillText("Choose an encounter", canvas.width / 2, 132);

      const visibleCards = cards.slice(carouselStart, carouselStart + visibleCardCount);
      visibleCards.forEach((card, slot) => {
        const index = carouselStart + slot;
        const rect = cardRect(slot);
        const active = index === focused;
        const isHovered = index === hovered;
        const emphasized = active || isHovered;
        ctx.fillStyle = card.placeholder
          ? (emphasized ? "#101010" : "#050505")
          : "#050505";
        ctx.strokeStyle = card.placeholder
          ? (emphasized ? "#aaa" : "#343434")
          : (active ? "#ffcc33" : isHovered ? "#fff" : "#f28c28");
        ctx.lineWidth = active ? 4 : 2;
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

        if (card.placeholder) {
          drawPlaceholder(rect, emphasized);
          return;
        }

        drawEnemySprite(card, rect, now);
        ctx.fillStyle = active ? "#ffcc33" : "#fff";
        if (card.isNew) {
          drawNewLabel(rect, active);
        } else {
          ctx.font = "bold 25px Courier New";
          ctx.fillText(card.name, rect.x + rect.w / 2, rect.y + 270);
        }
        ctx.fillStyle = active ? "#fff" : "#888";
        ctx.font = "14px Courier New";
        ctx.fillText(active ? "SELECT" : "AVAILABLE", rect.x + rect.w / 2, rect.y + 308);
      });

      if (choices.length === 0) {
        ctx.fillStyle = "#ff1e35";
        ctx.font = "20px Courier New";
        ctx.fillText("No encounters are registered.", canvas.width / 2, 320);
      }

      const maxStart = Math.max(0, cards.length - visibleCardCount);
      drawCarouselArrow(leftArrow, -1, carouselStart > 0, hovered === -2);
      drawCarouselArrow(rightArrow, 1, carouselStart < maxStart, hovered === -3);
    }

    function choose() {
      const card = cards[focused];
      if (!card?.selectable) return;
      window.SoulBattle.assets.playSound(menuMoveSound);
      navigateToEncounter(card.id);
    }

    function keepFocusedCardVisible() {
      if (focused < carouselStart) carouselStart = focused;
      if (focused >= carouselStart + visibleCardCount) {
        carouselStart = focused - visibleCardCount + 1;
      }
    }

    function moveFocus(direction) {
      if (cards.length <= 1) return;
      const nextFocus = Math.max(0, Math.min(cards.length - 1, focused + direction));
      if (nextFocus === focused) return;
      focused = nextFocus;
      keepFocusedCardVisible();
      window.SoulBattle.assets.playSound(menuMoveSound);
    }

    function moveCarousel(direction) {
      const maxStart = Math.max(0, cards.length - visibleCardCount);
      const nextStart = Math.max(0, Math.min(maxStart, carouselStart + direction));
      if (nextStart === carouselStart) return;
      carouselStart = nextStart;
      if (focused < carouselStart) focused = carouselStart;
      if (focused >= carouselStart + visibleCardCount) focused = carouselStart + visibleCardCount - 1;
      window.SoulBattle.assets.playSound(menuMoveSound);
    }

    function onKeyDown(event) {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "a", "A", "d", "D", "w", "W", "s", "S"].includes(event.key)) {
        event.preventDefault();
        const direction = ["ArrowLeft", "ArrowUp", "a", "A", "w", "W"].includes(event.key) ? -1 : 1;
        moveFocus(direction);
      } else if (["Enter", " ", "Spacebar", "z", "Z"].includes(event.key)) {
        event.preventDefault();
        choose();
      }
    }

    function canvasPoint(event) {
      const bounds = canvas.getBoundingClientRect();
      return {
        x: (event.clientX - bounds.left) / bounds.width * canvas.width,
        y: (event.clientY - bounds.top) / bounds.height * canvas.height
      };
    }

    function hitTestCard(x, y) {
      const visibleCards = cards.slice(carouselStart, carouselStart + visibleCardCount);
      const slot = visibleCards.findIndex((_card, visibleIndex) => {
        return pointInRect(x, y, cardRect(visibleIndex));
      });
      return slot === -1 ? -1 : carouselStart + slot;
    }

    function onPointerMove(event) {
      const { x, y } = canvasPoint(event);
      const maxStart = Math.max(0, cards.length - visibleCardCount);
      if (carouselStart > 0 && pointInRect(x, y, leftArrow)) hovered = -2;
      else if (carouselStart < maxStart && pointInRect(x, y, rightArrow)) hovered = -3;
      else hovered = hitTestCard(x, y);
      canvas.style.cursor = hovered === -1 ? "default" : "pointer";
    }

    function onPointerLeave() {
      hovered = -1;
      canvas.style.cursor = "default";
    }

    function onPointerDown(event) {
      const { x, y } = canvasPoint(event);
      if (pointInRect(x, y, leftArrow)) {
        moveCarousel(-1);
        return;
      }
      if (pointInRect(x, y, rightArrow)) {
        moveCarousel(1);
        return;
      }
      const hit = hitTestCard(x, y);
      if (hit === -1) return;
      if (!cards[hit].selectable) return;
      if (hit === focused) choose();
      else {
        focused = hit;
        window.SoulBattle.assets.playSound(menuMoveSound);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("pointerdown", onPointerDown);
    function animationLoop(now) {
      draw(now);
      requestAnimationFrame(animationLoop);
    }
    requestAnimationFrame(animationLoop);

    return {
      mode: "encounterSelect",
      get selectedEncounter() { return cards[focused]?.selectable ? cards[focused].id : null; },
      get focusedCard() { return cards[focused]?.id || null; },
      get hoveredCard() { return hovered >= 0 ? cards[hovered]?.id || null : null; },
      get carouselStart() { return carouselStart; },
      get visibleCards() { return cards.slice(carouselStart, carouselStart + visibleCardCount).map((card) => card.id); },
      get cardCount() { return cards.length; },
      selectEncounter: navigateToEncounter
    };
  }

  if (requestedEncounter) startEncounter(requestedId, requestedEncounter);
  else window.SoulBattle.game = createEncounterSelector();
})();

(() => {
  "use strict";

  window.SoulBattle = window.SoulBattle || {};

  function createPresentation(api) {
    const {
      canvas, ctx, state, enemyData, sounds, sprites, width: W, height: H,
      PHASE, ATTACK_TYPE, BOX_RECT, menuItems,
      COMMAND_OPTION_ORANGE, COMMAND_OPTION_HIGHLIGHT, HUD_MAROON,
      clamp, lerp, easeInOutCubic, currentBossData, getPartyActions,
      getActMenuLayout,
      getAttackMeterBounds, getCommandOptionRect, getItemMenuLayout,
      getItemTargetLayout, getPartyCommandCardRect, getPurpleLineYs,
      greenShieldRect, partySelectionCardRect, partySelectionBackRect, getEncounterRuntime
    } = api;
    const encounterRuntime = new Proxy({}, {
      get(_target, key) { return getEncounterRuntime()?.[key]; }
    });
    const currentActorActs = (...args) => getPartyActions().currentActorActs(...args);
    const canAffordAct = (...args) => getPartyActions().canAffordAct(...args);
    const canMercyCurrentEnemy = (...args) => getPartyActions().canMercyCurrentEnemy(...args);
    const damageSpellActorCenter = (...args) => getPartyActions().damageSpellActorCenter(...args);
    const damageSpellEnemyCenter = (...args) => getPartyActions().damageSpellEnemyCenter(...args);
    const fightQteLayoutForRow = (...args) => getPartyActions().fightQteLayoutForRow(...args);
    const partyMemberParticipates = (...args) => getPartyActions().partyMemberParticipates(...args);

  function draw() {
    const ox = state.shake ? (Math.random() - 0.5) * state.shake : 0;
    const oy = state.shake ? (Math.random() - 0.5) * state.shake : 0;

    ctx.save();
    ctx.translate(ox, oy);
    ctx.clearRect(-20, -20, W + 40, H + 40);
    if (state.phase === PHASE.LOSE) {
      drawPlayerDeath();
      ctx.restore();
      return;
    }

    drawBackground();
    encounterRuntime.drawBackgroundDistortion?.();
    if (state.phase === PHASE.SCENE) {
      drawScene();
    } else {
      drawEnemy();
    }
    drawFightDamagePopups();
    drawUI();
    encounterRuntime.drawHudDistortion?.();
    if (state.phase === PHASE.PLAYER_EFFECT) drawPlayerEffect();
    if (state.phase === PHASE.SPELL_ACTION) drawDamageSpellEffect();
    if (state.phase === PHASE.PERSISTENT_EFFECT) drawPersistentEffectAction();
    if (
      state.phase === PHASE.ENEMY_DIALOG ||
      (state.phase === PHASE.TURN_EVENT && state.turnEvent.step && state.turnEvent.step.type === "enemyDialog") ||
      (
        state.phase === PHASE.DEFEAT_DISSOLVE &&
        (
          state.defeatDissolve.custom
            ? !!state.enemyDialogMessage
            : state.defeatDissolve.timer < state.defeatDissolve.dialogDuration
        )
      )
    ) drawEnemySpeechBubble();

    if (state.phase === PHASE.DAMAGE_RESULT) drawDamageResult();
    if (state.phase === PHASE.ENEMY) drawDefenseBox();
    if (state.phase === PHASE.TURN_EVENT && state.turnEvent.step && state.turnEvent.step.type === "flash") drawTurnEventFlash();
    if (state.phase === PHASE.TURN_EVENT) drawCustomTurnEvent();
    if (state.phase === PHASE.LAST_STAND_EVENT) drawLastStandFlash();
    if (state.phase === PHASE.INTRO || state.phase === PHASE.WIN || state.phase === PHASE.SPARED || state.phase === PHASE.LOSE) drawStartOverlay();

    ctx.restore();
  }

  function drawBackground() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    const bossData = currentBossData();
    const background = bossData.background || { pattern: "slantedLines" };

    if (background.pattern === "confetti") {
      drawConfettiBackground(background.confetti);
    } else {
      drawSlantedLinesBackground(background.slantedLines);
    }

    for (const effect of background.effects || []) {
      if (effect.type === "stageCircle") drawStageCircleBackgroundEffect(effect);
      if (effect.type === "spotlights") drawSpotlightBackgroundEffect(effect);
    }

    if (state.ultimate.transformed && typeof bossData.backgroundModifier === "function") {
      bossData.backgroundModifier({
        ctx,
        state,
        width: W,
        height: H
      });
    }
  }

  function backgroundNoise(seed) {
    const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return value - Math.floor(value);
  }

  function drawSlantedLinesBackground(config = {}) {
    const spacing = config.spacing || 40;
    const drift = state.frame % spacing;

    ctx.save();
    ctx.globalAlpha = config.alpha ?? 0.16;
    ctx.strokeStyle = config.color || "#fff";
    ctx.lineWidth = config.lineWidth || 1;

    for (let x = -80; x < W + 80; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x + drift, 0);
      ctx.lineTo(x - 220 + drift, H);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawConfettiBackground(config = {}) {
    const count = config.count || 48;
    const alpha = config.alpha ?? 0.1;
    const colors = Array.isArray(config.colors) && config.colors.length > 0
      ? config.colors
      : [config.color || "#fff"];
    const speed = config.speed ?? 0.18;
    const minLength = config.minLength || 3;
    const maxLength = Math.max(minLength, config.maxLength || 7);
    const verticalSpan = H + 48;

    ctx.save();
    for (let index = 0; index < count; index += 1) {
      const xSeed = backgroundNoise(index * 5.21 + 1.7);
      const ySeed = backgroundNoise(index * 8.47 + 4.2);
      const motionSeed = backgroundNoise(index * 11.73 + 9.4);
      const rotationSeed = backgroundNoise(index * 14.19 + 3.1);
      const length = lerp(minLength, maxLength, backgroundNoise(index * 6.37 + 2.8));
      const y = ((ySeed * verticalSpan + state.frame * speed * lerp(0.65, 1.35, motionSeed)) % verticalSpan) - 24;
      const sway = Math.sin(state.frame / 75 + rotationSeed * Math.PI * 2) * 6;
      const x = xSeed * W + sway;
      const angle = rotationSeed * Math.PI + state.frame * lerp(0.001, 0.004, motionSeed);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.globalAlpha = alpha * lerp(0.55, 1, motionSeed);
      ctx.fillStyle = colors[index % colors.length];
      ctx.fillRect(-length / 2, -0.75, length, 1.5);
      ctx.restore();
    }

    ctx.restore();
  }

  function drawStageCircleBackgroundEffect(effect) {
    const x = effect.x ?? W / 2;
    const y = effect.y ?? H / 2;
    const radiusX = effect.radiusX || 84;
    const radiusY = effect.radiusY || 22;

    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${effect.fillAlpha ?? 0.025})`;
    ctx.strokeStyle = `rgba(255, 255, 255, ${effect.strokeAlpha ?? 0.13})`;
    ctx.lineWidth = effect.lineWidth || 1.5;
    ctx.beginPath();
    ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function spotlightSweepOffset(cycle, beamIndex, effect) {
    const seed = cycle * 31.17 + beamIndex * 107.31 + 13.7;
    const isWideSweep = backgroundNoise(seed) < (effect.sweepChance ?? 0.32);
    const distance = isWideSweep ? (effect.sweepDistance || 140) : (effect.idleDrift || 16);
    return (backgroundNoise(seed + 41.3) * 2 - 1) * distance;
  }

  function drawSpotlightBackgroundEffect(effect) {
    const anchorX = effect.anchorX ?? W / 2;
    const targetY = effect.targetY ?? H / 2;
    const cycleFrames = Math.max(120, effect.cycleFrames || 360);
    const cycle = Math.floor(state.frame / cycleFrames);
    const cycleProgress = easeInOutCubic((state.frame % cycleFrames) / cycleFrames);
    const beamCount = Number.isFinite(effect.count)
      ? Math.max(1, Math.floor(effect.count))
      : backgroundNoise(cycle * 19.7 + 5.3) < (effect.secondBeamChance ?? 0.58) ? 2 : 1;
    const separation = effect.separation || 48;
    const topSpacing = effect.topSpacing || 140;
    const topWidth = effect.topWidth || 18;
    const bottomWidth = effect.bottomWidth || 70;
    const alpha = effect.alpha ?? 0.065;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for (let index = 0; index < beamCount; index += 1) {
      const centeredIndex = beamCount === 1 ? 0 : index - 0.5;
      const baseOffset = centeredIndex * separation;
      const fromOffset = spotlightSweepOffset(cycle, index, effect);
      const toOffset = spotlightSweepOffset(cycle + 1, index, effect);
      const targetX = anchorX + baseOffset + lerp(fromOffset, toOffset, cycleProgress);
      const topX = anchorX + centeredIndex * topSpacing;
      const gradient = ctx.createLinearGradient(0, 0, 0, targetY);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.2})`);
      gradient.addColorStop(1, `rgba(255, 255, 255, ${alpha})`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(topX - topWidth, 0);
      ctx.lineTo(topX + topWidth, 0);
      ctx.lineTo(targetX + bottomWidth, targetY);
      ctx.lineTo(targetX - bottomWidth, targetY);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  function drawEnemy() {
    if (state.phase === PHASE.WIN) return;
    if (
      state.phase === PHASE.TURN_EVENT &&
      state.turnEvent.step?.type === "enemyTransform" &&
      state.turnEvent.transformation
    ) {
      drawTurnEventEnemyTransformation();
      return;
    }

    const transitionVisual = getPhaseTransitionVisual();
    const enemySprite = enemySpriteForKey(transitionVisual.spriteKey);
    const spriteSize = enemySpriteSize(transitionVisual.spriteKey);
    const spritePosition = enemySpritePosition(spriteSize, transitionVisual.spriteKey);
    const diagonalFlicker = encounterRuntime.diagonalSpriteFlickerOffset?.() || { x: 0, y: 0 };
    const spriteX = spritePosition.x + diagonalFlicker.x;
    const spriteTop = spritePosition.y + enemySpriteBobOffset() + diagonalFlicker.y;

    if (state.attack.flash > 0) {
      ctx.save();
      ctx.globalAlpha = state.attack.flash / 22;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    if (state.phase === PHASE.DEFEAT_DISSOLVE) {
      drawDefeatDissolve();
      return;
    }

    if (transitionVisual.alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = transitionVisual.alpha * enemyAttackVisibilityAlpha();
    drawPositionedEnemyBody(ctx, enemySprite, spriteX, spriteTop, spriteSize, transitionVisual.spriteKey);
    encounterRuntime.drawSpriteFlicker?.(ctx, enemySprite, spriteX, spriteTop, spriteSize, transitionVisual.spriteKey);
    if (transitionVisual.spriteKey === "lightbulb") {
      drawEnemyLightbulb(spriteX + spriteSize / 2, spriteTop - 3);
    }

    ctx.restore();
  }

  function drawEnemyLightbulb(x, y) {
    const pulse = 0.82 + Math.sin(state.frame / 8) * 0.18;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha *= pulse;
    ctx.fillStyle = "#fff36a";
    ctx.strokeStyle = "#ffd52a";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#fff04a";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#c28b2c";
    ctx.fillRect(-4, 8, 8, 5);
    ctx.restore();
  }

  function drawScene() {
    const scene = state.scene.config;

    if (!scene || typeof scene.draw !== "function") {
      drawEnemy();
      return;
    }

    scene.draw({
      ctx,
      state,
      timer: state.scene.timer,
      sprites,
      width: W,
      height: H,
      clamp,
      lerp,
      easeInOutCubic,
      drawSharedBox,
      wrapText,
      drawEnemyBody,
      drawDefeatDissolveParticles
    });
  }

  function enemyAttackVisibilityAlpha() {
    const fadedAlpha = 0.3;
    const fadeFrames = 30;

    if (state.phase === PHASE.ENEMY) {
      return fadedAlpha;
    }

    if (
      state.phase === PHASE.BOX_MORPH &&
      (
        state.boxMorph.nextPhase === PHASE.ENEMY ||
        state.boxMorph.nextPhase === PHASE.MENU
      ) &&
      state.attackType !== ATTACK_TYPE.NORMAL
    ) {
      const progress = clamp(state.boxMorph.timer / fadeFrames, 0, 1);

      if (state.boxMorph.nextPhase === PHASE.ENEMY) {
        return lerp(1, fadedAlpha, progress);
      }

      return lerp(fadedAlpha, 1, progress);
    }

    return 1;
  }

  function drawEnemyBody(renderCtx, enemySprite, x, y, size) {
    if (enemySprite.ready) {
      renderCtx.drawImage(enemySprite, x, y, size, size);
      return;
    }

    renderCtx.save();
    renderCtx.translate(x + size / 2, y + size * 0.6);
    renderCtx.scale(size / 200, size / 200);
    renderCtx.fillStyle = "#111";
    renderCtx.strokeStyle = "#fff";
    renderCtx.lineWidth = 4;

    renderCtx.beginPath();
    renderCtx.ellipse(0, 15, 72, 48, 0, 0, Math.PI * 2);
    renderCtx.fill();
    renderCtx.stroke();

    renderCtx.beginPath();
    renderCtx.ellipse(-35, -18, 28, 42, -0.25, 0, Math.PI * 2);
    renderCtx.ellipse(35, -18, 28, 42, 0.25, 0, Math.PI * 2);
    renderCtx.fill();
    renderCtx.stroke();

    renderCtx.fillStyle = "#fff";
    renderCtx.fillRect(-30, 4, 14, 6);
    renderCtx.fillRect(16, 4, 14, 6);
    renderCtx.fillRect(-20, 35, 40, 5);
    renderCtx.restore();
  }

  function drawPositionedEnemyBody(renderCtx, enemySprite, x, y, size, spriteKey) {
    const flip = enemySpriteFlip(spriteKey);
    const aspectRatioRoles = currentBossData().preserveSpriteAspectRatio || enemyData.preserveSpriteAspectRatio;
    const spriteRole = spriteKey === "enemy" ? "default" : spriteKey;
    const preserveAspectRatio = enemySprite.ready && (
      aspectRatioRoles === true ||
      (Array.isArray(aspectRatioRoles) && aspectRatioRoles.includes(spriteRole))
    );
    const nativeWidth = enemySprite.naturalWidth || enemySprite.width;
    const nativeHeight = enemySprite.naturalHeight || enemySprite.height;
    const renderWidth = preserveAspectRatio && nativeWidth > 0 && nativeHeight > 0
      ? size * nativeWidth / nativeHeight
      : size;
    const renderX = (size - renderWidth) / 2;

    function drawAt(localX, localY) {
      if (preserveAspectRatio && nativeWidth > 0 && nativeHeight > 0) {
        renderCtx.drawImage(enemySprite, localX + renderX, localY, renderWidth, size);
        return;
      }
      drawEnemyBody(renderCtx, enemySprite, localX, localY, size);
    }

    if (!flip.x && !flip.y) {
      drawAt(x, y);
      return;
    }

    renderCtx.save();
    renderCtx.translate(x + (flip.x ? size : 0), y + (flip.y ? size : 0));
    renderCtx.scale(flip.x ? -1 : 1, flip.y ? -1 : 1);
    drawAt(0, 0);
    renderCtx.restore();
  }

  function captureEnemySprite(spriteKey, size) {
    const source = document.createElement("canvas");
    const sourceCtx = source.getContext("2d");
    const enemySprite = enemySpriteForKey(spriteKey);

    source.width = size;
    source.height = size;
    sourceCtx.imageSmoothingEnabled = false;
    drawPositionedEnemyBody(sourceCtx, enemySprite, 0, 0, size, spriteKey);
    return source;
  }

  function enemySpriteForKey(spriteKey) {
    const animation = currentBossData().spriteAnimations?.[spriteKey] || enemyData.spriteAnimations?.[spriteKey];
    if (Array.isArray(animation?.frames)) {
      const frames = animation.frames
        .map((src, index) => typeof src === "string" ? sprites[`enemyAnimation:${spriteKey}:${index}`] : null)
        .filter((sprite) => sprite && sprite.ready);

      if (frames.length > 0) {
        const fps = Number.isFinite(animation.fps) && animation.fps > 0 ? animation.fps : 2;
        const frameDuration = 60 / fps;
        return frames[Math.floor(state.frame / frameDuration) % frames.length];
      }
    }

    if (spriteKey === "enemy" && Array.isArray(enemyData.defaultAnimation?.frames)) {
      const frames = enemyData.defaultAnimation.frames
        .map((src, index) => typeof src === "string" ? sprites[`enemyDefaultAnimation:${index}`] : null)
        .filter((sprite) => sprite && sprite.ready);

      if (frames.length > 0) {
        const fps = Number.isFinite(enemyData.defaultAnimation.fps) && enemyData.defaultAnimation.fps > 0
          ? enemyData.defaultAnimation.fps
          : 2;
        const frameDuration = 60 / fps;
        return frames[Math.floor(state.frame / frameDuration) % frames.length];
      }
    }

    return sprites[spriteKey] || sprites.enemy;
  }

  function enemySpriteBobOffset() {
    const bobAmount = Number.isFinite(currentBossData().spriteBob)
      ? currentBossData().spriteBob
      : 4;
    return Math.sin(state.frame / 24) * bobAmount;
  }

  function drawDefeatDissolve() {
    const dissolve = state.defeatDissolve;
    if (dissolve.custom?.draw) {
      dissolve.custom.draw({
        ctx,
        state,
        dissolve,
        timer: dissolve.timer,
        sprites,
        sounds,
        width: W,
        height: H,
        clamp,
        lerp,
        easeInOutCubic,
        drawPositionedEnemyBody,
        drawDefeatDissolveParticles,
        enemySpriteForKey,
        enemySpritePosition,
        enemySpriteSize
      });
      return;
    }

    const x = dissolve.spriteX;
    const y = dissolve.spriteTop;
    const dissolveTimer = Math.max(0, dissolve.timer - dissolve.dialogDuration);
    const progress = clamp(dissolveTimer / dissolve.dissolveDuration, 0, 1);
    const removedHeight = Math.floor(easeInOutCubic(progress) * dissolve.spriteSize);
    const remainingHeight = dissolve.spriteSize - removedHeight;

    if (dissolve.source && remainingHeight > 0) {
      ctx.drawImage(
        dissolve.source,
        0,
        removedHeight,
        dissolve.spriteSize,
        remainingHeight,
        x,
        y + removedHeight,
        dissolve.spriteSize,
        remainingHeight
      );
    }

    drawDefeatDissolveParticles(dissolve.particles, x, y);
  }

  function drawTurnEventEnemyTransformation() {
    const transformation = state.turnEvent.transformation;
    const step = state.turnEvent.step;
    if (!transformation || !step) return;

    const duration = Number.isFinite(step.duration) ? step.duration : 112;
    const progress = clamp(state.turnEvent.timer / duration, 0, 1);
    const removedHeight = Math.floor(easeInOutCubic(progress) * transformation.spriteSize);
    const remainingHeight = transformation.spriteSize - removedHeight;

    if (transformation.targetSource && removedHeight > 0) {
      ctx.drawImage(
        transformation.targetSource,
        0,
        0,
        transformation.spriteSize,
        removedHeight,
        transformation.x,
        transformation.y,
        transformation.spriteSize,
        removedHeight
      );
    }

    if (transformation.source && remainingHeight > 0) {
      ctx.drawImage(
        transformation.source,
        0,
        removedHeight,
        transformation.spriteSize,
        remainingHeight,
        transformation.x,
        transformation.y + removedHeight,
        transformation.spriteSize,
        remainingHeight
      );
    }
    drawDefeatDissolveParticles(
      transformation.particles,
      transformation.x,
      transformation.y
    );
  }

  function drawDefeatDissolveParticles(particles, x, y) {
    for (const particle of particles) {
      ctx.save();
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.fillRect(x + particle.x, y + particle.y, particle.size, particle.size);
      ctx.restore();
    }
  }

  function activeEnemySpriteKey() {
    const defaultSpriteKey = state.enemyDefaultSpriteKey ||
      (state.ultimate.transformed ? "ultimateEnemy" : state.bossPhase === 2 ? "phase2Enemy" : "enemy");
    if (state.enemyDefaultSpriteLocked) return defaultSpriteKey;

    const hitSpriteKey = currentBossData().hitSprite || enemyData.hitSprite;
    if (
      state.frame < state.enemyHitSpriteUntil &&
      typeof hitSpriteKey === "string" &&
      sprites[hitSpriteKey]
    ) {
      return hitSpriteKey;
    }

    if (state.enemySpriteKey) return state.enemySpriteKey;
    if (state.ultimate.transformed) return "ultimateEnemy";
    return defaultSpriteKey;
  }

  function triggerEnemyHitSprite(duration = 60) {
    if (state.enemyDefaultSpriteLocked) return;
    const hitSpriteKey = currentBossData().hitSprite || enemyData.hitSprite;
    if (typeof hitSpriteKey !== "string" || !sprites[hitSpriteKey]) return;

    state.enemyHitSpriteUntil = Math.max(state.enemyHitSpriteUntil, state.frame + duration);
  }

  function enemySpriteSize(spriteKey) {
    const sizes = currentBossData().spriteSizes || enemyData.spriteSizes;
    const fallback = Number.isFinite(enemyData.spriteSize) ? enemyData.spriteSize : 280;

    if (!sizes || typeof sizes !== "object") return fallback;
    if (Number.isFinite(sizes[spriteKey])) return sizes[spriteKey];
    if (spriteKey === "enemy" && Number.isFinite(sizes.default)) return sizes.default;
    if (spriteKey === "phase2Enemy" && Number.isFinite(sizes.phase2)) return sizes.phase2;
    if (spriteKey === "ultimateEnemy" && Number.isFinite(sizes.ultimate)) return sizes.ultimate;

    if (typeof spriteKey === "string" && spriteKey.startsWith("attackSprite:")) {
      const spritePath = spriteKey.slice("attackSprite:".length);
      return Number.isFinite(sizes[spritePath]) ? sizes[spritePath] : fallback;
    }

    return fallback;
  }

  function enemySpritePosition(spriteSize, spriteKey) {
    const positions = currentBossData().spritePositions || enemyData.spritePositions;
    const defaultPosition = {
      x: W - spriteSize - 42,
      y: 72
    };

    if (!positions || typeof positions !== "object") return defaultPosition;

    const position = positions[spriteKey] ||
      (spriteKey === "enemy" ? positions.default : null) ||
      (spriteKey === "phase2Enemy" ? positions.phase2 : null) ||
      (spriteKey === "ultimateEnemy" ? positions.ultimate : null);

    if (!position || typeof position !== "object") return defaultPosition;

    return {
      x: Number.isFinite(position.x) ? position.x : defaultPosition.x,
      y: Number.isFinite(position.y) ? position.y : defaultPosition.y
    };
  }

  function enemyDamagePopupPosition(actorIndex = 0) {
    const spriteKey = activeEnemySpriteKey();
    const size = enemySpriteSize(spriteKey);
    const position = enemySpritePosition(size, spriteKey);
    const offsets = [
      { x: 28, y: -26 },
      { x: -32, y: 0 },
      { x: 22, y: 28 }
    ];
    const offset = offsets[actorIndex] || offsets[0];

    return {
      x: position.x + size / 2 + offset.x,
      y: position.y + size / 2 + offset.y
    };
  }

  function enemySpriteFlip(spriteKey) {
    const flips = currentBossData().spriteFlips || enemyData.spriteFlips;
    const defaultFlip = { x: false, y: false };

    if (!flips || typeof flips !== "object") return defaultFlip;

    const flip = flips[spriteKey] ||
      (spriteKey === "enemy" ? flips.default : null) ||
      (spriteKey === "phase2Enemy" ? flips.phase2 : null) ||
      (spriteKey === "ultimateEnemy" ? flips.ultimate : null);

    if (flip === true) return { x: false, y: true };
    if (!flip || typeof flip !== "object") return defaultFlip;

    return {
      x: flip.x === true,
      y: flip.y === true
    };
  }

  function attackSpriteKey(sprite) {
    if (typeof sprite !== "string" || !sprite) {
      return state.bossPhase === 2 ? "phase2Enemy" : "enemy";
    }

    if (sprites[sprite]) return sprite;
    if (currentBossData().spriteAnimations?.[sprite] || enemyData.spriteAnimations?.[sprite]) return sprite;

    const generatedKey = `attackSprite:${sprite}`;
    return sprites[generatedKey] ? generatedKey : state.bossPhase === 2 ? "phase2Enemy" : "enemy";
  }

  function getPhaseTransitionVisual() {
    if (state.phase === PHASE.MERCY_FADE) {
      return {
        alpha: clamp(1 - state.mercy.timer / state.mercy.fadeDuration, 0, 1),
        spriteKey: activeEnemySpriteKey()
      };
    }

    if (state.phase === PHASE.SPARED) {
      return {
        alpha: 0,
        spriteKey: activeEnemySpriteKey()
      };
    }

    if (state.phase === PHASE.ULTIMATE_TRANSITION) {
      const transition = state.ultimate;
      const swapTime = transition.fadeOutDuration + transition.holdDuration;

      if (transition.timer < transition.fadeOutDuration) {
        return {
          alpha: 1 - transition.timer / transition.fadeOutDuration,
          spriteKey: state.bossPhase === 2 ? "phase2Enemy" : "enemy"
        };
      }

      if (transition.timer < swapTime) {
        return {
          alpha: 0,
          spriteKey: "ultimateEnemy"
        };
      }

      return {
        alpha: clamp((transition.timer - swapTime) / transition.fadeInDuration, 0, 1),
        spriteKey: "ultimateEnemy"
      };
    }

    if (state.phase !== PHASE.PHASE_TRANSITION) {
      return {
        alpha: 1,
        spriteKey: activeEnemySpriteKey()
      };
    }

    const transition = state.phaseTransition;
    const t = transition.timer;
    const refillStart = transition.fadeOutDuration + transition.holdDuration;

    if (t < transition.fadeOutDuration) {
      return {
        alpha: 1 - t / transition.fadeOutDuration,
        spriteKey: activeEnemySpriteKey()
      };
    }

    if (t < refillStart) {
      return {
        alpha: 0,
        spriteKey: activeEnemySpriteKey()
      };
    }

    return {
      alpha: clamp((t - refillStart) / transition.fadeInDuration, 0, 1),
      spriteKey: activeEnemySpriteKey()
    };
  }

  function drawHpBar(x, y, w, h, hp, maxHP) {
    const fillWidth = Math.max(0, ((w - 6) * hp) / maxHP);

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = "#fff";
    ctx.fillRect(x + 3, y + 3, fillWidth, h - 6);
  }

  function currentDamageDisplayHP() {
    const result = state.damageResult;
    const dropDuration = Math.max(1, result.duration - result.dropStart);
    const progress = clamp((result.timer - result.dropStart) / dropDuration, 0, 1);
    const eased = easeInOutCubic(progress);

    return lerp(result.fromHP, result.toHP, eased);
  }

  function drawDamageResult() {
    const barX = 330;
    const barY = 228;
    const shake = Math.max(0, 7 - state.damageResult.timer / 12);
    const textX = W / 2 + (Math.random() - 0.5) * shake;
    const textY = barY - 22 + (Math.random() - 0.5) * shake;

    ctx.fillStyle = "#ff2a2a";
    ctx.font = "44px Courier New";
    ctx.textAlign = "center";
    ctx.fillText(`${state.damageResult.damage}`, textX, textY);

    drawHpBar(barX, barY, 240, 18, currentDamageDisplayHP(), state.enemyMaxHP);
  }

  function drawUI() {
    if (
      state.phase === PHASE.INTRO ||
      state.phase === PHASE.WIN ||
      (state.phase === PHASE.MERCY_FADE && !state.mercy.keepUiDuringFade) ||
      state.phase === PHASE.SPARED ||
      state.phase === PHASE.ULTIMATE_TRANSITION ||
      state.phase === PHASE.SCENE
    ) return;

    drawStats();
    drawTextPanel();

    if (state.phase === PHASE.FIGHT_TARGET) {
      drawFightTargetMenu();
    } else if (state.phase === PHASE.ACT) {
      drawActMenu();
    } else if (state.phase === PHASE.ACT_TARGET) {
      drawActTargetMenu();
    } else if (state.phase === PHASE.ACT_ENEMY_TARGET) {
      drawActEnemyTargetMenu();
    } else if (state.phase === PHASE.FIGHT_QTE) {
      drawFightQte();
    } else if (state.phase === PHASE.PLAYER_EFFECT) {
      // Player-effect feedback renders over the cleared text panel.
    } else if (state.phase === PHASE.SPELL_ACTION) {
      // The scripted spell renders over the cleared text panel.
    } else if (state.phase === PHASE.PERSISTENT_EFFECT) {
      // Persistent effects render over the cleared text panel.
    } else if (state.phase === PHASE.DEFEAT_DISSOLVE) {
      // Keep the party visible while the enemy gives their final line and dissolves.
    } else if (state.phase === PHASE.ITEM) {
      drawItemMenu();
    } else if (state.phase === PHASE.ITEM_TARGET) {
      drawItemTargetMenu();
    } else if (state.phase === PHASE.MERCY_TARGET) {
      drawMercyTargetMenu();
    } else if (state.phase === PHASE.ATTACK || state.phase === PHASE.DAMAGE_RESULT || (state.phase === PHASE.ENEMY_DIALOG && state.attack.result)) {
      drawAttackMeter();
    } else if (state.phase === PHASE.BOX_MORPH) {
      if (state.boxMorph.nextPhase === PHASE.ENEMY) drawBattlefieldSpin();
    } else if (state.phase !== PHASE.ENEMY) {
      drawDialogueBox();
    }

    if (shouldShowPartyCommandCards()) {
      drawMenu();
    }
  }

  function shouldShowPartyCommandCards() {
    return state.phase === PHASE.MENU ||
      state.phase === PHASE.MESSAGE ||
      state.phase === PHASE.ENEMY_DIALOG ||
      (state.phase === PHASE.MERCY_FADE && state.mercy.keepUiDuringFade) ||
      state.phase === PHASE.TURN_EVENT ||
      state.phase === PHASE.PLAYER_EFFECT ||
      state.phase === PHASE.SPELL_ACTION ||
      state.phase === PHASE.PERSISTENT_EFFECT ||
      state.phase === PHASE.BOX_MORPH ||
      shouldShowCollapsedCardsDuringAttack();
  }

  function shouldShowCollapsedCardsDuringAttack() {
    return state.phase === PHASE.ENEMY && !state.lastStand.activeAttack;
  }

  function drawDialogueBox() {
    const { x, y, w } = state.box;

    drawSharedBox(state.box);

    ctx.fillStyle = "#fff";
    ctx.font = "24px Courier New";
    ctx.textAlign = "left";

    const isLastStandFlash = state.phase === PHASE.LAST_STAND_EVENT && state.lastStand.timer < state.lastStand.flashDuration;
    const message = isLastStandFlash
      ? ""
      : typeof state.message === "string" ? state.message : "* ...";
    const textTimer = state.phase === PHASE.LAST_STAND_EVENT
      ? Math.max(0, state.lastStand.timer - state.lastStand.flashDuration)
      : state.textTimer;
    const visible = message.slice(0, Math.min(message.length, Math.floor(textTimer * 1.25)));

    wrapText(visible, x + 28, y + 38, w - 56, 30);
  }

  function drawEnemySpeechBubble() {
    const w = 264;
    const h = 103;
    const r = 13;
    const spriteKey = state.phase === PHASE.DEFEAT_DISSOLVE
      ? state.defeatDissolve.speechSpriteKey || state.defeatDissolve.spriteKey
      : activeEnemySpriteKey();
    const spriteSize = enemySpriteSize(spriteKey);
    const enemyPosition = enemySpritePosition(spriteSize, spriteKey);
    const x = clamp(enemyPosition.x - w - 26, 20, W - w - 20);
    const y = clamp(enemyPosition.y - h - 17, 20, BOX_RECT.TEXT.y - h - 20);
    const tailBaseY = y + h;
    const message = typeof state.enemyDialogMessage === "string" ? state.enemyDialogMessage : "";
    const timer = state.phase === PHASE.TURN_EVENT
      ? state.turnEvent.timer
      : state.phase === PHASE.DEFEAT_DISSOLVE
        ? state.defeatDissolve.custom
          ? state.enemyDialogTimer
          : state.defeatDissolve.timer
        : state.enemyDialogTimer;
    const visible = message.slice(0, Math.min(message.length, Math.floor(timer * 1.25)));

    ctx.save();
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;

    drawRoundedRect(x, y, w, h, r);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + w - 48, tailBaseY);
    ctx.lineTo(x + w + 14, tailBaseY + 20);
    ctx.lineTo(x + w - 20, tailBaseY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.font = "16px Courier New";
    ctx.textAlign = "left";
    wrapText(visible, x + 18, y + 28, w - 36, 22);
    ctx.restore();
  }

  function drawTurnEventFlash() {
    const step = state.turnEvent.step;
    const duration = Number.isFinite(step.duration) ? step.duration : 42;
    const progress = clamp(state.turnEvent.timer / duration, 0, 1);

    ctx.save();
    ctx.globalAlpha = Math.sin(progress * Math.PI) * 0.92;
    ctx.fillStyle = step.color;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function drawCustomTurnEvent() {
    const step = state.turnEvent.step;
    if (step?.type !== "custom" || typeof step.draw !== "function") return;
    step.draw({
      state, ctx, sprites, sounds, clamp, lerp, easeInOutCubic,
      width: W, height: H, timer: state.turnEvent.timer
    });
  }

  function drawLastStandFlash() {
    if (state.lastStand.timer >= state.lastStand.flashDuration) return;

    const progress = clamp(state.lastStand.timer / state.lastStand.flashDuration, 0, 1);

    ctx.save();
    ctx.globalAlpha = Math.sin(progress * Math.PI) * 0.88;
    ctx.fillStyle = "#d00018";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function drawSharedBox(box) {
    if (
      box.x === BOX_RECT.TEXT.x &&
      box.y === BOX_RECT.TEXT.y &&
      box.w === BOX_RECT.TEXT.w &&
      box.h === BOX_RECT.TEXT.h
    ) {
      drawTextPanel();
      return;
    }

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.fillStyle = "#000";
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.strokeRect(box.x, box.y, box.w, box.h);
  }

  function drawTextPanel() {
    const box = BOX_RECT.TEXT;

    ctx.fillStyle = "#000";
    ctx.fillRect(box.x, box.y, box.w, box.h);
  }

  function drawRoundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawStats() {
    drawTPBar();
    state.party.forEach((player, actorIndex) => {
      if (!partyMemberParticipates(player, actorIndex)) return;
      player.runtime?.drawPartyLayer?.({
        layer: "behind", state, player, actorIndex, ctx, clamp, playerSpriteForRole
      });
    });
    drawPartySprites();
    state.party.forEach((player, actorIndex) => {
      if (!partyMemberParticipates(player, actorIndex)) return;
      player.runtime?.drawPartyLayer?.({
        layer: "front", state, player, actorIndex, ctx, clamp, playerSpriteForRole
      });
    });
  }

  function drawTPBar() {
    const x = 24;
    const y = 78;
    const w = 24;
    const h = 205;
    const fillH = Math.round(h * state.tp / 100);

    ctx.save();
    drawTPBarPath(x, y, w, h);
    ctx.fillStyle = HUD_MAROON;
    ctx.fill();

    ctx.save();
    drawTPBarPath(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = COMMAND_OPTION_ORANGE;
    ctx.fillRect(x, y + h - fillH, w, fillH);
    ctx.restore();

    drawTPBarPath(x, y, w, h);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.font = "18px Courier New";
    ctx.textAlign = "center";
    ctx.fillText("TP", x + w / 2, y - 14);
    ctx.fillText(`${Math.round(state.tp)}%`, x + w / 2, y + h + 24);
    ctx.restore();
  }

  function drawTPBarPath(x, y, w, h) {
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w, y + h - w);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + w);
    ctx.closePath();
  }

  function drawPartySprites() {
    for (let i = 0; i < state.party.length; i++) {
      const player = state.party[i];
      const x = 93;
      const y = 78 + i * 124;

      drawPartySprite(player, x, y);
    }
  }

  function persistentCompanionPosition(actorIndex) {
    const actor = state.party[actorIndex];
    const partySpriteSize = 78;
    const actorSize = partySpriteSize * (actor?.spriteScale || 1);
    const actorTop = 78 + actorIndex * 124 + (partySpriteSize - actorSize) / 2;
    const size = 105;

    return {
      x: 111,
      y: actorTop + actorSize - size,
      size
    };
  }

  function playerSpriteForRole(player, role) {
    if (!player || typeof role !== "string") return null;

    const animation = player.spriteAnimations?.[role] || (role === "default" ? player.defaultAnimation : null);
    const frameCount = Array.isArray(animation?.spriteKeys)
      ? animation.spriteKeys.length
      : Array.isArray(animation?.frames)
        ? animation.frames.length
        : 5;
    const animationKeys = Array.isArray(animation?.spriteKeys)
      ? animation.spriteKeys
      : Array.from({ length: frameCount }, (_, index) => `${player.name}:${role}Animation:${index}`);
    const frames = animationKeys.map((key) => sprites[key]).filter((sprite) => sprite && sprite.ready);

    if (frames.length > 0) {
      const fps = Number.isFinite(animation?.fps) && animation.fps > 0 ? animation.fps : 2;
      const frameDuration = 60 / fps;
      return frames[Math.floor(state.frame / frameDuration) % frames.length];
    }

    const spriteKey = player.spriteKeys?.[role] || `${player.name}:${role}`;
    const sprite = sprites[spriteKey];
    return sprite && sprite.ready ? sprite : null;
  }

  function drawPartySprite(player, x, y) {
    const size = 78;
    const idleRole = player.temporaryDamageBuffTurns > 0 ? "starshot" : "default";
    let actionRole = player.actionSpriteRole;
    const runtimeRole = player.runtime?.spriteRole?.({ player, idleRole, actionRole, state });
    const encounterRole = encounterRuntime.playerSpriteRole?.({ player, idleRole, actionRole, state });
    const role = player.hp > 0 ? encounterRole || runtimeRole || actionRole || idleRole : "down";
    const sprite = playerSpriteForRole(player, role) ||
      playerSpriteForRole(player, idleRole) ||
      playerSpriteForRole(player, "default");
    const alpha = player.hp > 0 ? 1 : 0.35;

    ctx.save();
    ctx.globalAlpha = alpha;

    if (sprite && sprite.ready) {
      const scaledSize = size * player.spriteScale;
      let drawWidth = scaledSize;
      let drawHeight = scaledSize;
      const sourceWidth = sprite.naturalWidth || sprite.width;
      const sourceHeight = sprite.naturalHeight || sprite.height;

      if (
        player.preserveBattleSpriteAspectRatio &&
        Number.isFinite(sourceWidth) && sourceWidth > 0 &&
        Number.isFinite(sourceHeight) && sourceHeight > 0
      ) {
        const aspectRatio = sourceWidth / sourceHeight;

        if (aspectRatio > 1) {
          drawHeight = scaledSize / aspectRatio;
        } else {
          drawWidth = scaledSize * aspectRatio;
        }
      }

      const roleScale = Number.isFinite(player.battleSpriteRoleScales?.[role])
        ? player.battleSpriteRoleScales[role]
        : 1;
      drawWidth *= roleScale;
      drawHeight *= roleScale;

      const drawX = x + (size - drawWidth) / 2;
      const scaledAreaTop = y + (size - scaledSize) / 2;
      const drawY = scaledAreaTop + scaledSize - drawHeight;
      ctx.drawImage(sprite, drawX, drawY, drawWidth, drawHeight);
    } else {
      ctx.fillStyle = "#111";
      ctx.strokeStyle = player.cardColor;
      ctx.lineWidth = 4;
      ctx.fillRect(x, y, size, size);
      ctx.strokeRect(x, y, size, size);
      ctx.fillStyle = player.cardColor;
      ctx.fillRect(x + 18, y + 18, size - 36, size - 24);
      ctx.fillStyle = "#000";
      ctx.fillRect(x + 28, y + 32, 7, 7);
      ctx.fillRect(x + 43, y + 32, 7, 7);
    }

    ctx.restore();
  }

  function drawMenu() {
    drawPerformingHudLayer();
    drawCardRules();

    for (let i = 0; i < state.party.length; i++) {
      drawPartyCommandCard(i);
    }
  }

  function performingHudGroups() {
    const groups = [];

    for (let index = 0; index < state.party.length; index++) {
      if (!state.party[index]?.dandelionPerforming) continue;

      const card = getPartyCommandCardRect(index, false);
      const previous = groups[groups.length - 1];

      if (previous && previous.lastIndex === index - 1) {
        previous.lastIndex = index;
        previous.w = card.x + card.w - previous.x;
      } else {
        groups.push({
          x: card.x,
          y: card.y,
          w: card.w,
          h: card.h,
          lastIndex: index
        });
      }
    }

    return groups;
  }

  function drawPerformingHudLayer() {
    const groups = performingHudGroups();
    if (groups.length === 0) return;

    const base = getPartyCommandCardRect(0, false);
    const travelWidth = W + 120;
    const noteCount = 15;

    ctx.save();
    ctx.fillStyle = "#000";
    ctx.fillRect(0, base.y, W, base.h);

    ctx.beginPath();
    for (const group of groups) {
      ctx.rect(group.x, group.y, group.w, group.h);
    }
    ctx.clip();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let index = 0; index < noteCount; index++) {
      const speed = 1.35 + index % 4 * 0.12;
      const travel = (state.frame * speed + index * 73) % travelWidth;
      const x = W + 42 - travel;
      const lane = index % 3;
      const y = base.y + 10 + lane * 12 + Math.sin((state.frame + index * 19) / 11) * 2;

      ctx.globalAlpha = 0.72 + (index % 3) * 0.14;
      ctx.fillStyle = index % 4 === 0 ? "#ff4fc7" : "#ff9de2";
      ctx.font = `${index % 3 === 0 ? 24 : 20}px Courier New`;
      ctx.fillText(index % 4 === 0 ? "♫" : "♪", x, y);
    }

    ctx.restore();
  }

  function drawCardRules() {
    const base = getPartyCommandCardRect(0, false);

    ctx.save();
    ctx.strokeStyle = HUD_MAROON;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, base.y);
    ctx.lineTo(W, base.y);
    ctx.moveTo(0, base.y + base.h);
    ctx.lineTo(W, base.y + base.h);
    ctx.stroke();
    ctx.restore();
  }

  function drawPartyCommandCard(index) {
    const player = state.party[index];
    if (player?.dandelionPerforming) return;

    const active = state.phase === PHASE.MENU && index === state.partyTurnIndex &&
      player.hp > 0 && partyMemberParticipates(player, index);
    const card = getPartyCommandCardRect(index, active);
    const hpRatio = player.maxHP > 0 ? player.hp / player.maxHP : 0;

    ctx.save();
    ctx.fillStyle = active ? "#050505" : "#000";
    ctx.fillRect(card.x, card.y, card.w, card.h);
    if (active) {
      drawActiveCardScanLines(player, card);

      ctx.strokeStyle = player.hp > 0 ? player.cardColor : "#555";
      ctx.lineWidth = 4;
      ctx.strokeRect(card.x, card.y, card.w, card.h);

      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(card.x, card.y + 44);
      ctx.lineTo(card.x + card.w, card.y + 44);
      ctx.stroke();
    }

    drawPartyCardSummary(player, card, active, hpRatio, state.partyCommands[index]);

    if (active) drawCommandIcons(card);

    ctx.restore();
  }

  function drawActiveCardScanLines(player, card) {
    const spawnInterval = 30;
    const lifetime = 60;
    const elapsed = Math.max(0, state.frame - state.commandHudAnimationStartFrame);
    const latestSpawn = Math.floor(elapsed / spawnInterval);
    const firstVisibleSpawn = Math.max(0, latestSpawn - 1);
    const fightOption = getCommandOptionRect(card, 0);
    const defendOption = getCommandOptionRect(card, menuItems.length - 1);

    ctx.save();
    ctx.strokeStyle = player.cardColor;
    ctx.lineWidth = 2;

    for (let spawn = firstVisibleSpawn; spawn <= latestSpawn; spawn++) {
      const age = elapsed - spawn * spawnInterval;
      if (age < 0 || age >= lifetime) continue;

      const timeProgress = age / lifetime;
      const travelProgress = 0.8 * timeProgress + 0.2 * timeProgress * timeProgress;
      const leftX = card.x + (fightOption.x - card.x) * travelProgress;
      const rightX = card.x + card.w + (defendOption.x + defendOption.w - card.x - card.w) * travelProgress;

      ctx.globalAlpha = 1 - timeProgress;
      ctx.beginPath();
      ctx.moveTo(leftX, card.y + card.h);
      ctx.lineTo(leftX, card.y + 44);
      ctx.moveTo(rightX, card.y + card.h);
      ctx.lineTo(rightX, card.y + 44);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawPartyCardSummary(player, card, active, hpRatio, command) {
    const summaryY = card.y + 6;
    const iconSize = 28;
    const iconX = card.x + 12;
    const iconY = summaryY;
    const nameX = card.x + 48;
    const barX = card.x + 190;
    const barY = summaryY + 18;
    const labelY = summaryY + 24;
    const barW = card.w - 204;
    const barH = 11;

    drawPartyMiniIcon(player, iconX, iconY, iconSize);

    ctx.fillStyle = player.hp > 0 ? "#fff" : "#777";
    ctx.font = "20px Courier New";
    ctx.textAlign = "left";
    ctx.fillText(player.name, nameX, labelY);

    ctx.fillStyle = "#fff";
    ctx.font = "12px Courier New";
    ctx.fillText("HP", barX - 25, labelY);

    ctx.fillStyle = "#3b0000";
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = player.hp > 0 ? player.cardColor : "#555";
    ctx.fillRect(barX, barY, Math.max(0, barW * hpRatio), barH);

    ctx.fillStyle = "#fff";
    ctx.font = "14px Courier New";
    ctx.textAlign = "right";
    ctx.fillText(`${player.hp}/${player.maxHP}`, barX + barW, barY - 2);

  }

  function drawPartyMiniIcon(player, x, y, size) {
    const sprite = playerSpriteForRole(player, "icon");

    ctx.save();
    ctx.fillStyle = "#050505";
    ctx.fillRect(x, y, size, size);

    if (sprite && sprite.ready) {
      ctx.drawImage(sprite, x, y, size, size);
    } else {
      ctx.strokeStyle = player.hp > 0 ? player.cardColor : "#555";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, size, size);
      ctx.fillStyle = player.hp > 0 ? player.cardColor : "#555";
      ctx.fillRect(x + 8, y + 8, size - 16, size - 10);
      ctx.fillStyle = "#000";
      ctx.fillRect(x + 12, y + 15, 4, 4);
      ctx.fillRect(x + 19, y + 15, 4, 4);
    }

    ctx.restore();
  }

  function drawCommandIcons(card) {
    for (let i = 0; i < menuItems.length; i++) {
      const option = getCommandOptionRect(card, i);
      const selected = i === state.selected;
      const disabled = encounterRuntime.isCommandDisabled?.({
        state,
        partyIndex: state.partyTurnIndex,
        commandIndex: i
      }) === true;
      const glitchColor = (state.frame + i + state.partyTurnIndex) % 4 < 2
        ? "#22d8ff"
        : "#ff2bd6";

      ctx.fillStyle = disabled ? "#100014" : selected ? "#2a2100" : "#050505";
      ctx.strokeStyle = disabled ? glitchColor : selected ? COMMAND_OPTION_HIGHLIGHT : COMMAND_OPTION_ORANGE;
      ctx.lineWidth = selected ? 3 : 2;
      ctx.fillRect(option.x, option.y, option.w, option.h);
      ctx.strokeRect(option.x, option.y, option.w, option.h);

      const iconX = option.x + option.w / 2;
      const iconY = option.y + option.h / 2;
      ctx.save();
      ctx.translate(iconX, iconY);
      ctx.scale(0.8, 0.8);
      ctx.translate(-iconX, -iconY);
      if (disabled) {
        ctx.globalAlpha = 0.72;
        drawCommandIcon(menuItems[i], iconX - 2, iconY - 1, "#22d8ff");
        drawCommandIcon(menuItems[i], iconX + 2, iconY + 1, "#ff2bd6");
      } else {
        drawCommandIcon(menuItems[i], iconX, iconY, selected ? COMMAND_OPTION_HIGHLIGHT : COMMAND_OPTION_ORANGE);
      }
      ctx.restore();

      if (disabled) {
        const sliceY = option.y + 6 + (state.frame * 3 + i * 7) % 21;
        ctx.fillStyle = "#000";
        ctx.fillRect(option.x + 2, sliceY, option.w - 4, 3);
        ctx.fillStyle = glitchColor;
        ctx.fillRect(option.x + 5, sliceY + 1, option.w - 10, 1);
        ctx.strokeStyle = "#ff2bd6";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(option.x + 6, option.y + 5);
        ctx.lineTo(option.x + option.w - 6, option.y + option.h - 5);
        ctx.moveTo(option.x + option.w - 6, option.y + 5);
        ctx.lineTo(option.x + 6, option.y + option.h - 5);
        ctx.stroke();
      }

      if (selected) {
        ctx.fillStyle = disabled ? glitchColor : COMMAND_OPTION_HIGHLIGHT;
        ctx.font = "11px Courier New";
        ctx.textAlign = "center";
        ctx.fillText(disabled ? "LOCKED" : menuItems[i], option.x + option.w / 2, option.y + option.h + 13);
      }
    }
  }

  function drawCommandIcon(command, cx, cy, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (command === "FIGHT") {
      ctx.lineCap = "square";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx - 12, cy - 12);
      ctx.lineTo(cx + 6, cy + 6);
      ctx.stroke();

      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 12);
      ctx.lineTo(cx + 12, cy);
      ctx.stroke();
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx + 7, cy + 7);
      ctx.lineTo(cx + 13, cy + 13);
      ctx.stroke();
      ctx.fillRect(cx + 10, cy + 10, 6, 6);
    } else if (command === "ACT") {
      ctx.font = "bold 25px Courier New";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("ACT", cx, cy + 1);
    } else if (command === "ITEM") {
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy - 9);
      ctx.lineTo(cx - 9, cy - 4);
      ctx.quadraticCurveTo(cx - 16, cy + 2, cx - 11, cy + 12);
      ctx.quadraticCurveTo(cx, cy + 17, cx + 11, cy + 12);
      ctx.quadraticCurveTo(cx + 16, cy + 2, cx + 9, cy - 4);
      ctx.lineTo(cx + 5, cy - 9);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - 8, cy - 9);
      ctx.lineTo(cx + 8, cy - 9);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - 5, cy - 13);
      ctx.lineTo(cx, cy - 9);
      ctx.lineTo(cx + 5, cy - 13);
      ctx.stroke();
    } else if (command === "DEFEND") {
      ctx.beginPath();
      ctx.moveTo(cx, cy - 15);
      ctx.lineTo(cx + 14, cy - 8);
      ctx.lineTo(cx + 10, cy + 9);
      ctx.lineTo(cx, cy + 15);
      ctx.lineTo(cx - 10, cy + 9);
      ctx.lineTo(cx - 14, cy - 8);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy - 9);
      ctx.lineTo(cx, cy + 8);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawItemMenu() {
    const menu = state.box;
    const layout = getItemMenuLayout(menu);

    drawSharedBox(menu);

    if (state.inventory.length === 0) {
      ctx.fillStyle = "#fff";
      ctx.font = "22px Courier New";
      ctx.textAlign = "left";
      ctx.fillText("No items left.", menu.x + 28, menu.y + 52);
      return;
    }

    for (let i = 0; i < state.inventory.length; i++) {
      const item = state.inventory[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cellX = col === 0 ? layout.leftX : layout.middleX;
      const textX = cellX + layout.textInset;
      const rowY = layout.startY + row * layout.rowHeight;

      ctx.fillStyle = "#fff";
      ctx.font = "18px Courier New";
      ctx.textAlign = "left";
      ctx.fillText(item.name, textX, rowY);

      if (i === state.selectedItem) {
        drawRedHeart(cellX + layout.cursorInset, rowY - 7);
      }
    }

    const selectedItem = state.inventory[state.selectedItem];

    if (selectedItem) {
      ctx.fillStyle = "#8f8f8f";
      ctx.font = "18px Courier New";
      ctx.textAlign = "left";
      wrapText(selectedItem.description, layout.descriptionX, layout.startY, layout.descriptionWidth, 24);
    }
  }

  function drawItemTargetMenu() {
    const menu = state.box;
    const layout = getItemTargetLayout(menu);

    drawSharedBox(menu);

    for (let i = 0; i < state.party.length; i++) {
      const player = state.party[i];
      const participates = partyMemberParticipates(player, i);
      const rowY = layout.startY + i * layout.rowHeight;
      const hpRatio = player.maxHP > 0 ? player.hp / player.maxHP : 0;

      ctx.fillStyle = player.hp > 0 && participates ? "#fff" : "#777";
      ctx.font = "20px Courier New";
      ctx.textAlign = "left";
      ctx.fillText(player.name, layout.nameX, rowY);

      drawHpBar(layout.barX, rowY - layout.barH + 2, layout.barW, layout.barH, player.hp, player.maxHP);

      ctx.fillStyle = player.hp > 0 && participates ? player.cardColor : "#555";
      ctx.fillRect(layout.barX + 3, rowY - layout.barH + 5, Math.max(0, (layout.barW - 6) * hpRatio), layout.barH - 6);

      if (i === state.selectedItemTarget && participates) {
        drawRedHeart(layout.nameX - 28, rowY - 7);
      }
    }
  }

  function drawActMenu() {
    const menu = state.box;
    const acts = currentActorActs();
    const layout = getActMenuLayout(menu);

    drawSharedBox(menu);

    if (acts.length === 0) {
      ctx.fillStyle = "#fff";
      ctx.font = "22px Courier New";
      ctx.textAlign = "left";
      ctx.fillText("No ACTs available.", menu.x + 28, menu.y + 52);
      return;
    }

    for (let i = 0; i < acts.length; i++) {
      const act = acts[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cellX = col === 0 ? layout.leftX : layout.middleX;
      const rowY = layout.startY + row * layout.rowHeight;
      const affordable = canAffordAct(act);

      if (act.teamAction) {
        drawTeamActName(act, cellX + layout.textInset, rowY, affordable);
      } else {
        ctx.save();
        ctx.fillStyle = act.menuColor || (affordable ? "#fff" : "#777");
        if (!affordable && act.menuColor) ctx.globalAlpha = 0.5;
        if (act.menuGlowColor) {
          ctx.shadowColor = act.menuGlowColor;
          ctx.shadowBlur = affordable ? 8 : 3;
        }
        ctx.font = "18px Courier New";
        ctx.textAlign = "left";
        ctx.fillText(act.name, cellX + layout.textInset, rowY);
        ctx.restore();
      }

      if (i === state.selectedAct) {
        drawRedHeart(cellX + layout.cursorInset, rowY - 7);
      }
    }

    const selectedAct = acts[state.selectedAct];

    if (selectedAct) {
      ctx.fillStyle = "#8f8f8f";
      ctx.font = "18px Courier New";
      ctx.textAlign = "left";
      const descriptionBottom = wrapText(
        selectedAct.description,
        layout.descriptionX,
        layout.startY,
        layout.descriptionWidth,
        24
      );

      ctx.fillStyle = selectedAct.hpCost > 0 ? "#ff4545" : "#c68a42";
      ctx.font = "18px Courier New";
      const costText = selectedAct.hpCost > 0
        ? `${selectedAct.hpCost} HP`
        : `${selectedAct.tpCost}% TP`;
      ctx.fillText(costText, layout.descriptionX, descriptionBottom + 24);
    }
  }

  function drawTeamActName(act, x, y, affordable) {
    const members = state.party.filter((_, index) => index !== state.partyTurnIndex);
    const iconSize = 18;
    const iconGap = 3;
    const iconY = y - 16;

    for (let index = 0; index < members.length; index++) {
      drawPartyMiniIcon(members[index], x + index * (iconSize + iconGap), iconY, iconSize);
    }

    const textX = x + members.length * (iconSize + iconGap) + 4;
    const glitch = (state.frame % 6) - 3;
    ctx.save();
    ctx.font = "18px Courier New";
    ctx.textAlign = "left";
    ctx.fillStyle = affordable ? "#22d8ff" : "#555";
    ctx.fillText(act.name, textX + glitch, y - 1);
    ctx.fillStyle = affordable ? "#ff2bd6" : "#777";
    ctx.fillText(act.name, textX - glitch, y + 1);
    ctx.fillStyle = affordable ? "#fff" : "#777";
    ctx.fillText(act.name, textX, y);
    ctx.restore();
  }

  function drawActTargetMenu() {
    const menu = state.box;
    const layout = getItemTargetLayout(menu);

    drawSharedBox(menu);

    for (let i = 0; i < state.party.length; i++) {
      const player = state.party[i];
      const participates = partyMemberParticipates(player, i);
      const rowY = layout.startY + i * layout.rowHeight;
      const hpRatio = player.maxHP > 0 ? player.hp / player.maxHP : 0;

      ctx.fillStyle = player.hp > 0 && participates ? "#fff" : "#777";
      ctx.font = "20px Courier New";
      ctx.textAlign = "left";
      ctx.fillText(player.name, layout.nameX, rowY);

      drawHpBar(layout.barX, rowY - layout.barH + 2, layout.barW, layout.barH, player.hp, player.maxHP);

      ctx.fillStyle = player.hp > 0 && participates ? player.cardColor : "#555";
      ctx.fillRect(layout.barX + 3, rowY - layout.barH + 5, Math.max(0, (layout.barW - 6) * hpRatio), layout.barH - 6);

      if (i === state.selectedActTarget && participates) {
        drawRedHeart(layout.nameX - 28, rowY - 7);
      }
    }
  }

  function drawActEnemyTargetMenu() {
    const menu = state.box;
    const hpX = menu.x + menu.w - 245;
    const hpY = menu.y + 22;

    drawSharedBox(menu);

    ctx.fillStyle = "#fff";
    ctx.font = "22px Courier New";
    ctx.textAlign = "left";
    ctx.fillText(state.enemyName, menu.x + 58, menu.y + 38);

    if (state.selectedActEnemyTarget === 0) {
      drawRedHeart(menu.x + 34, menu.y + 31);
    }

    drawHpBar(hpX, hpY, 210, 18, state.enemyHP, state.enemyMaxHP);
  }

  function drawFightTargetMenu() {
    const menu = state.box;
    const hpX = menu.x + menu.w - 245;
    const hpY = menu.y + 22;

    drawSharedBox(menu);

    ctx.fillStyle = "#fff";
    ctx.font = "22px Courier New";
    ctx.textAlign = "left";
    ctx.fillText(state.enemyName, menu.x + 58, menu.y + 38);

    if (state.selectedFightTarget === 0) {
      drawRedHeart(menu.x + 34, menu.y + 31);
    }

    drawHpBar(hpX, hpY, 210, 18, state.enemyHP, state.enemyMaxHP);
  }

  function drawMercyTargetMenu() {
    const menu = state.box;

    drawSharedBox(menu);

    ctx.fillStyle = canMercyCurrentEnemy() ? "#ffcc33" : "#fff";
    ctx.font = "22px Courier New";
    ctx.textAlign = "left";
    ctx.fillText(state.enemyName, menu.x + 58, menu.y + 38);

    if (state.selectedMercyTarget === 0) {
      drawRedHeart(menu.x + 34, menu.y + 31);
    }
  }

  function drawAttackMeter() {
    const { y, h, trackStart, trackEnd, center } = getAttackMeterBounds();
    const trackH = 26;
    const trackY = y + h / 2 - trackH / 2;
    const trackW = trackEnd - trackStart;

    drawSharedBox(state.box);

    ctx.fillStyle = "#333";
    ctx.fillRect(trackStart, trackY, trackW, trackH);

    const zones = [
      { width: trackW * 0.47, alpha: 0.18 },
      { width: trackW * 0.25, alpha: 0.35 },
      { width: trackW * 0.07, alpha: 0.85 },
    ];

    for (const z of zones) {
      ctx.globalAlpha = z.alpha;
      ctx.fillStyle = "#fff";
      ctx.fillRect(center - z.width / 2, trackY - 6, z.width, trackH + 12);
    }

    ctx.globalAlpha = 1;

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(center, trackY - 14);
    ctx.lineTo(center, trackY + trackH + 14);
    ctx.stroke();

    ctx.fillStyle = "#ff3333";
    ctx.fillRect(state.attack.markerX - 5, trackY - 14, 10, trackH + 28);
  }

  function drawFightQte() {
    drawSharedBox(BOX_RECT.TEXT);
    const fightingPlayers = new Set(state.fightQte.actions.map((action) => action.actorIndex));

    for (let i = 0; i < state.party.length; i++) {
      if (!fightingPlayers.has(i)) continue;

      const player = state.party[i];
      const layout = fightQteLayoutForRow(i);
      ctx.save();
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, layout.rowY);
      ctx.lineTo(W, layout.rowY);
      ctx.stroke();

      drawPartyMiniIcon(player, layout.iconX, layout.iconY, 34);

      ctx.fillStyle = "#fff";
      ctx.font = "18px Courier New";
      ctx.textAlign = "left";
      ctx.fillText("PRESS", layout.pressX, layout.pressY);

      ctx.fillStyle = "#050505";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.fillRect(layout.trackX, layout.trackY, layout.trackW, layout.trackH);
      ctx.strokeRect(layout.trackX, layout.trackY, layout.trackW, layout.trackH);

      ctx.strokeStyle = player.secondaryColor || player.cardColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(
        layout.targetX - 1.5,
        layout.targetY - 1.5,
        layout.targetW + 3,
        layout.targetH + 3
      );
      ctx.restore();
    }

    for (const bar of state.fightQte.activeBars) {
      const player = state.party[bar.actorIndex];
      const layout = fightQteLayoutForRow(bar.actorIndex);

      ctx.save();
      if (bar.locked) {
        const progress = clamp(bar.lockAge / 30, 0, 1);
        const width = 8 * (1 + progress * 1.4);
        const height = layout.trackH * (1 + progress * 0.6);
        const green = Math.round(255 - 51 * progress);
        const blue = Math.round(255 - 204 * progress);

        ctx.fillStyle = `rgb(255,${green},${blue})`;
        ctx.globalAlpha = 1 - progress;
        ctx.fillRect(bar.x - width / 2, layout.trackY + (layout.trackH - height) / 2, width, height);
      } else {
        const fadeStartX = layout.trackX - 4;
        const stopX = layout.trackX - 24;
        const fadeProgress = clamp((fadeStartX - bar.x) / (fadeStartX - stopX), 0, 1);

        ctx.fillStyle = "#fff";
        ctx.globalAlpha = 1 - fadeProgress;
        ctx.fillRect(bar.x - 4, layout.trackY, 8, layout.trackH);
      }
      ctx.restore();
    }
  }

  function drawFightDamagePopups() {
    const popups = state.fightQte && Array.isArray(state.fightQte.damagePopups)
      ? state.fightQte.damagePopups
      : [];

    if (popups.length === 0) return;

    for (const popup of popups) {
      const bounceDuration = 12;
      const holdDuration = 60;
      const fadeDuration = 24;
      const fadeAge = popup.age - bounceDuration - holdDuration;
      const fadeProgress = clamp(fadeAge / fadeDuration, 0, 1);
      const bounceProgress = clamp(popup.age / bounceDuration, 0, 1);
      const bounceOffset = popup.age < bounceDuration
        ? -Math.sin(bounceProgress * Math.PI) * 7
        : 0;
      const riseOffset = fadeAge > 0 ? fadeProgress * 28 : 0;
      const alpha = fadeAge > 0 ? (1 - fadeProgress) * (1 - fadeProgress) : 1;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = popup.color;
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 5;
      ctx.lineJoin = "round";
      ctx.font = "bold 38px Courier New";
      ctx.textAlign = "center";
      ctx.strokeText(popup.text, popup.x, popup.y + bounceOffset - riseOffset);
      ctx.fillText(popup.text, popup.x, popup.y + bounceOffset - riseOffset);
      if (popup.bonusDamage > 0) {
        ctx.fillStyle = "#fff2a8";
        ctx.font = "bold 27px Courier New";
        ctx.strokeText(`${popup.bonusDamage}`, popup.x + 48, popup.y - 25 + bounceOffset - riseOffset);
        ctx.fillText(`${popup.bonusDamage}`, popup.x + 48, popup.y - 25 + bounceOffset - riseOffset);
      }
      ctx.restore();
    }
  }

  function drawDamageSpellEffect() {
    const spell = state.spellAction;
    const action = spell.action;
    if (!action) return;

    const actor = state.party[action.actorIndex];
    const color = actor?.secondaryColor || actor?.cardColor || "#fff";
    const customEffect = action.act.customEffect && typeof action.act.drawEffect === "function";
    const fadeIn = clamp(spell.timer / 30, 0, 1);
    const fadeOut = clamp((spell.timer - 66) / 30, 0, 1);
    const darkness = action.act.darken ? 0.55 * fadeIn * (1 - fadeOut) : 0;

    if (darkness > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(0,0,0,${darkness})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    if (!customEffect && spell.timer >= 30 && spell.timer < 66) {
      const start = damageSpellActorCenter(action.actorIndex);
      const end = damageSpellEnemyCenter();
      const progress = easeInOutCubic(clamp((spell.timer - 30) / 36, 0, 1));
      const x = lerp(start.x, end.x, progress);
      const y = lerp(start.y, end.y, progress);
      const angle = Math.atan2(end.y - start.y, end.x - start.x);

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = color;
      ctx.fillStyle = "#fff";
      ctx.shadowColor = color;
      ctx.shadowBlur = 22;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(lerp(start.x, x, 0.72), lerp(start.y, y, 0.72));
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(13, 0);
      ctx.lineTo(-7, -8);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-7, 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    action.act.drawEffect?.({
      ctx, state, action, timer: spell.timer, clamp, lerp, easeInOutCubic,
      damageSpellActorCenter, damageSpellEnemyCenter, playerSpriteForRole
    });

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    for (const particle of spell.particles) {
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.strokeStyle = particle.color;
      ctx.beginPath();
      ctx.moveTo(particle.x, particle.y);
      ctx.lineTo(particle.x - particle.vx * 5, particle.y - particle.vy * 5);
      ctx.stroke();
    }
    ctx.restore();

    if (spell.damageApplied) {
      const popupAge = spell.timer - 66;
      const bounceDuration = 12;
      const holdDuration = 60;
      const fadeDuration = 24;
      const fadeAge = popupAge - bounceDuration - holdDuration;
      const fadeProgress = clamp(fadeAge / fadeDuration, 0, 1);
      const bounceProgress = clamp(popupAge / bounceDuration, 0, 1);
      const bounceOffset = popupAge < bounceDuration ? -Math.sin(bounceProgress * Math.PI) * 7 : 0;
      const riseOffset = fadeAge > 0 ? fadeProgress * 28 : 0;
      const alpha = fadeAge > 0 ? (1 - fadeProgress) * (1 - fadeProgress) : 1;
      const popup = enemyDamagePopupPosition(action.actorIndex);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 5;
      ctx.lineJoin = "round";
      ctx.font = "bold 38px Courier New";
      ctx.textAlign = "center";
      ctx.strokeText(`${spell.damage}`, popup.x, popup.y + bounceOffset - riseOffset);
      ctx.fillText(`${spell.damage}`, popup.x, popup.y + bounceOffset - riseOffset);
      if (spell.bonusDamage > 0) {
        ctx.fillStyle = "#fff2a8";
        ctx.font = "bold 27px Courier New";
        ctx.strokeText(`${spell.bonusDamage}`, popup.x + 48, popup.y - 25 + bounceOffset - riseOffset);
        ctx.fillText(`${spell.bonusDamage}`, popup.x + 48, popup.y - 25 + bounceOffset - riseOffset);
      }
      ctx.restore();
    }
  }

  function drawPlayerEffect() {
    const resolution = state.playerEffectAction;
    const action = resolution.action;
    if (!action) return;

    const targetIndex = Number.isInteger(action.targetIndex) ? action.targetIndex : action.actorIndex;
    const timer = resolution.timer;
    const enterProgress = clamp(timer / 12, 0, 1);
    const exitProgress = clamp((timer - 60) / 30, 0, 1);
    const x = 132 - 38 * (1 - enterProgress) + 52 * exitProgress;
    const y = 55 + targetIndex * 124;
    const alpha = enterProgress * (1 - exitProgress);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = "bold 27px Courier New";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#000";
    ctx.fillStyle = action.act.popupColor || "#42f56f";
    if (action.act.popupGlowColor) {
      ctx.shadowColor = action.act.popupGlowColor;
      ctx.shadowBlur = 12;
    }
    ctx.strokeText(action.act.popupText, x, y);
    ctx.fillText(action.act.popupText, x, y);
    ctx.restore();
  }

  function drawPersistentEffectAction() {
    const persistent = state.persistentEffectAction;
    const effect = persistent.effect;
    if (!effect) return;

    const actor = state.party[effect.actorIndex];
    const color = actor?.secondaryColor || actor?.cardColor || "#fff";
    const enemyCenter = damageSpellEnemyCenter();

    if (effect.displayAsCompanion && effect.mode === "damage") {
      const archer = persistentCompanionPosition(effect.actorIndex);
      const start = { x: archer.x + archer.size * 0.78, y: archer.y + archer.size * 0.43 };
      const progress = easeInOutCubic(clamp(persistent.timer / 30, 0, 1));
      const x = lerp(start.x, enemyCenter.x, progress);
      const y = lerp(start.y, enemyCenter.y, progress);

      if (persistent.timer <= 30) {
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 210, 0.55)";
        ctx.lineWidth = 3;
        ctx.shadowColor = "#fffbd1";
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (
      !effect.displayAsCompanion &&
      effect.mode !== "retaliate" &&
      persistent.timer <= 30
    ) {
      const progress = easeInOutCubic(clamp(persistent.timer / 30, 0, 1));
      const start = { x: enemyCenter.x - 68, y: enemyCenter.y + 20 };
      const end = { x: enemyCenter.x + 76, y: enemyCenter.y - 42 };
      const x = lerp(start.x, end.x, progress);
      const y = lerp(start.y, end.y, progress);
      const sprite = actor ? playerSpriteForRole(actor, effect.sprite) : null;
      const size = 72;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.28);
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
      if (sprite && sprite.ready) {
        ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
      } else {
        ctx.fillStyle = color;
        ctx.fillRect(-size / 2, -8, size, 16);
      }
      ctx.restore();
    }

    if (effect.mode === "retaliate") {
      for (const popup of persistent.hitPopups) {
        const bounceProgress = clamp(popup.age / 10, 0, 1);
        const fadeProgress = clamp((popup.age - 38) / 26, 0, 1);
        const bounceOffset = popup.age < 10 ? -Math.sin(bounceProgress * Math.PI) * 7 : 0;
        const riseOffset = fadeProgress * 24;
        const alpha = (1 - fadeProgress) * (1 - fadeProgress);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 5;
        ctx.lineJoin = "round";
        ctx.font = "bold 38px Courier New";
        ctx.textAlign = "center";
        ctx.strokeText(`${popup.damage}`, popup.x, popup.y + bounceOffset - riseOffset);
        ctx.fillText(`${popup.damage}`, popup.x, popup.y + bounceOffset - riseOffset);
        if (popup.bonusDamage > 0) {
          ctx.fillStyle = "#fff2a8";
          ctx.font = "bold 27px Courier New";
          ctx.strokeText(`${popup.bonusDamage}`, popup.x + 30, popup.y - 22 + bounceOffset - riseOffset);
          ctx.fillText(`${popup.bonusDamage}`, popup.x + 30, popup.y - 22 + bounceOffset - riseOffset);
        }
        ctx.restore();
      }
    } else if (persistent.damageApplied && effect.mode === "healLowest") {
      const popupAge = persistent.timer - 30;
      const enterProgress = clamp(popupAge / 12, 0, 1);
      const exitProgress = clamp((popupAge - 60) / 30, 0, 1);
      const x = 132 - 38 * (1 - enterProgress) + 52 * exitProgress;
      const y = 55 + effect.targetIndex * 124;
      const alpha = enterProgress * (1 - exitProgress);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = "bold 27px Courier New";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#000";
      ctx.fillStyle = "#42f56f";
      ctx.strokeText("+hp", x, y);
      ctx.fillText("+hp", x, y);
      ctx.restore();
    } else if (persistent.damageApplied) {
      const popupAge = persistent.timer - 30;
      const bounceDuration = 12;
      const holdDuration = 60;
      const fadeDuration = 24;
      const fadeAge = popupAge - bounceDuration - holdDuration;
      const fadeProgress = clamp(fadeAge / fadeDuration, 0, 1);
      const bounceProgress = clamp(popupAge / bounceDuration, 0, 1);
      const bounceOffset = popupAge < bounceDuration ? -Math.sin(bounceProgress * Math.PI) * 7 : 0;
      const riseOffset = fadeAge > 0 ? fadeProgress * 28 : 0;
      const alpha = fadeAge > 0 ? (1 - fadeProgress) * (1 - fadeProgress) : 1;
      const popup = enemyDamagePopupPosition(effect.actorIndex);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 5;
      ctx.lineJoin = "round";
      ctx.font = "bold 38px Courier New";
      ctx.textAlign = "center";
      ctx.strokeText(`${persistent.damage}`, popup.x, popup.y + bounceOffset - riseOffset);
      ctx.fillText(`${persistent.damage}`, popup.x, popup.y + bounceOffset - riseOffset);
      if (persistent.bonusDamage > 0) {
        ctx.fillStyle = "#fff2a8";
        ctx.font = "bold 27px Courier New";
        ctx.strokeText(`${persistent.bonusDamage}`, popup.x + 48, popup.y - 25 + bounceOffset - riseOffset);
        ctx.fillText(`${persistent.bonusDamage}`, popup.x + 48, popup.y - 25 + bounceOffset - riseOffset);
      }
      ctx.restore();
    }
  }

  function drawDefenseBox() {
    const box = state.box;

    if (encounterRuntime.drawDefaultDefenseBox?.({ state, box }) !== false) {
      drawSharedBox(box);
    }
    const encounterDefense = encounterRuntime.drawDefense?.({ state, box }) || null;

    if (state.attackType === ATTACK_TYPE.PURPLE) {
      if (!encounterDefense?.handledPurple) {
        drawPurpleLines();
      }
    }

    for (const b of state.bullets) {
      drawBullet(b);
    }

    if (encounterDefense?.drawSoul !== false) {
      drawSoul();
    }

    if (state.attackType === ATTACK_TYPE.GREEN) {
      drawGreenShield();
    }

    encounterRuntime.drawShieldGlitchOut?.();
    drawShieldShatter();

  }

  function drawBattlefieldSpin() {
    const morph = state.boxMorph;
    const box = morph.to;
    const progress = clamp(morph.timer / Math.max(1, morph.duration), 0, 1);
    const eased = easeInOutCubic(progress);
    const scale = lerp(0.05, 1, eased);
    const angle = (1 - eased) * Math.PI * 1.5;

    ctx.save();
    ctx.translate(box.x + box.w / 2, box.y + box.h / 2);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    drawSharedBox({ x: -box.w / 2, y: -box.h / 2, w: box.w, h: box.h });
    ctx.restore();
  }

  function drawPurpleLines() {
    const box = state.box;
    const lineYs = getPurpleLineYs();

    ctx.save();
    ctx.lineWidth = 1;

    if (encounterRuntime.drawPurpleLines?.({ state, box, lineYs })) {
      ctx.restore();
      return;
    }

    ctx.strokeStyle = "#b8b8b8";
    ctx.globalAlpha = 0.48;

    for (const y of lineYs) {
      ctx.beginPath();
      ctx.moveTo(box.x + 12, y);
      ctx.lineTo(box.x + box.w - 12, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawSoul() {
    const s = state.soul;

    if (state.soul.invuln > 0 && Math.floor(state.frame / 4) % 2 === 0) {
      return;
    }

    if (state.grazeGlow > 0) {
      ctx.save();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.lineJoin = "miter";
      ctx.globalAlpha = clamp(state.grazeGlow / 18, 0, 1);
      ctx.beginPath();
      ctx.moveTo(s.x - 3, s.y + 19);
      ctx.lineTo(s.x + 3, s.y + 19);
      ctx.lineTo(s.x + 22, s.y);
      ctx.lineTo(s.x + 22, s.y - 11);
      ctx.lineTo(s.x + 15, s.y - 18);
      ctx.lineTo(s.x + 7, s.y - 18);
      ctx.lineTo(s.x + 2, s.y - 16);
      ctx.lineTo(s.x - 2, s.y - 16);
      ctx.lineTo(s.x - 7, s.y - 18);
      ctx.lineTo(s.x - 15, s.y - 18);
      ctx.lineTo(s.x - 22, s.y - 11);
      ctx.lineTo(s.x - 22, s.y);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    if (encounterRuntime.drawSoul?.(s)) return;

    if (state.attackType === ATTACK_TYPE.PURPLE) {
      drawHeartShape(s.x, s.y, "#9d5cff");
      return;
    }
    if (state.attackType === ATTACK_TYPE.BLUE) {
      drawHeartShape(s.x, s.y, "#39a7ff");
      return;
    }
    if (state.attackType === ATTACK_TYPE.GREEN) {
      drawHeartShape(s.x, s.y, "#25d65f");
      return;
    }
    drawRedHeart(s.x, s.y);
  }

  function drawRedHeart(x, y) {
    if (sprites.heart.ready) {
      ctx.drawImage(sprites.heart, x - 11, y - 11, 22, 22);
      return;
    }

    drawHeartShape(x, y, "#ff1e35");
  }

  function drawHeartShape(x, y, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;

    ctx.beginPath();
    ctx.moveTo(0, 9);
    ctx.bezierCurveTo(-16, -4, -9, -14, 0, -6);
    ctx.bezierCurveTo(9, -14, 16, -4, 0, 9);
    ctx.fill();

    ctx.restore();
  }

  function drawPlayerDeath() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    if (state.death.timer < 60) {
      drawHeartShape(state.death.x, state.death.y, state.death.color);
      return;
    }

    if (state.death.timer < 150) {
      drawCrackedDeathHeart();
      return;
    }

    drawDeathHeartPieces();

    if (state.death.timer >= 225) {
      drawGameOverText();
    }
  }

  function drawCrackedDeathHeart() {
    const x = state.death.x;
    const y = state.death.y;
    const color = state.death.color;
    const split = Math.min(9, (state.death.timer - 60) * 0.28);

    drawHeartHalf(x - split, y, color, "left");
    drawHeartHalf(x + split, y, color, "right");

    ctx.save();
    ctx.strokeStyle = "#050505";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y - 11);
    ctx.lineTo(x - 2, y - 5);
    ctx.lineTo(x + 2, y + 1);
    ctx.lineTo(x - 1, y + 7);
    ctx.lineTo(x, y + 12);
    ctx.stroke();
    ctx.restore();
  }

  function drawHeartHalf(x, y, color, side) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(side === "left" ? x - 24 : x, y - 24, 24, 48);
    ctx.clip();
    drawHeartShape(x, y, color);
    ctx.restore();
  }

  function drawDeathHeartPieces() {
    for (const piece of state.death.pieces) {
      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.rotation);
      ctx.fillStyle = piece.color;
      ctx.beginPath();
      piece.points.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawGameOverText() {
    const titleAlpha = clamp((state.death.timer - 225) / 28, 0, 1);
    const promptAlpha = clamp((state.death.timer - 285) / 24, 0, 1);

    ctx.save();
    ctx.globalAlpha = titleAlpha;
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.font = "bold 104px Courier New";
    ctx.textAlign = "center";
    ctx.strokeText("GAME", W / 2, 120);
    ctx.fillText("GAME", W / 2, 120);
    ctx.strokeText("OVER", W / 2, 220);
    ctx.fillText("OVER", W / 2, 220);
    ctx.restore();

    if (promptAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = promptAlpha;
      ctx.fillStyle = "#fff";
      ctx.font = "22px Courier New";
      ctx.textAlign = "center";
      ctx.fillText("Stay determined, gamer! Press Enter to try again,", W / 2, H - 88);
      ctx.fillText("or Escape to change your party.", W / 2, H - 58);
      ctx.restore();
    }
  }

  function drawGreenShield() {
    const shield = greenShieldRect();

    ctx.save();
    ctx.fillStyle = "#25d65f";
    ctx.strokeStyle = "#b8ffd0";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#25d65f";
    ctx.shadowBlur = 10;
    ctx.fillRect(shield.x, shield.y, shield.w, shield.h);
    ctx.shadowBlur = 0;
    ctx.strokeRect(shield.x, shield.y, shield.w, shield.h);

    if (state.redShieldGlow > 0) {
      const glow = state.redShieldGlow / 18;

      ctx.globalAlpha = glow * 0.42;
      ctx.fillStyle = "#ff2d2d";
      ctx.shadowColor = "#ff2d2d";
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(shield.x + shield.w / 2, shield.y + shield.h / 2, 13 + (1 - glow) * 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  function drawShieldShatter() {
    if (state.shieldShatter.particles.length === 0) return;

    const alpha = clamp(1 - state.shieldShatter.timer / state.shieldShatter.duration, 0, 1);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#61ff93";
    ctx.strokeStyle = "#d5ffe0";
    ctx.lineWidth = 1;

    for (const particle of state.shieldShatter.particles) {
      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.spin * state.shieldShatter.timer);
      ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
      ctx.strokeRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
      ctx.restore();
    }

    ctx.restore();
  }

  function drawBullet(b) {
    if (sprites.projectile.ready && b.type === "dot") {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);
      ctx.drawImage(sprites.projectile, -b.r, -b.r, b.r * 2, b.r * 2);
      ctx.restore();
      return;
    }

    if (encounterRuntime.drawBullet?.(b)) return;

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);

    ctx.strokeStyle = "#fff";
    ctx.fillStyle = "#fff";
    ctx.lineWidth = 2;

    if (b.type === "spikeFloor") {
      ctx.fillStyle = "#000";
      ctx.strokeStyle = b.glitchy ? "#d9f8ff" : "#fff";
      const spikeWidth = 18;

      for (let x = -b.width / 2; x < b.width / 2; x += spikeWidth) {
        ctx.beginPath();
        ctx.moveTo(x, b.height);
        ctx.lineTo(x + spikeWidth / 2, 0);
        ctx.lineTo(Math.min(x + spikeWidth, b.width / 2), b.height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      if (b.glitchy) encounterRuntime.drawGeometryGlitchFragments?.(b, b.width, b.height, true);
    } else if (b.type === "platform") {
      ctx.fillStyle = "#000";
      ctx.strokeStyle = b.glitchy ? "#d9f8ff" : "#fff";
      ctx.lineWidth = 2;
      ctx.fillRect(-b.width / 2, 0, b.width, b.height);
      ctx.strokeRect(-b.width / 2, 0, b.width, b.height);
      if (b.glitchy) encounterRuntime.drawGeometryGlitchFragments?.(b, b.width, b.height, false);




    } else if (b.type === "diamond") {
      ctx.beginPath();
      ctx.moveTo(0, -b.r);
      ctx.lineTo(b.r, 0);
      ctx.lineTo(0, b.r);
      ctx.lineTo(-b.r, 0);
      ctx.closePath();
      ctx.stroke();
    } else if (b.type === "bone") {
      ctx.fillRect(-b.r * 1.8, -3, b.r * 3.6, 6);

      ctx.beginPath();
      ctx.arc(-b.r * 1.8, -4, 5, 0, Math.PI * 2);
      ctx.arc(-b.r * 1.8, 4, 5, 0, Math.PI * 2);
      ctx.arc(b.r * 1.8, -4, 5, 0, Math.PI * 2);
      ctx.arc(b.r * 1.8, 4, 5, 0, Math.PI * 2);
      ctx.fill();

    } else if (b.type === "star") {
      ctx.beginPath();

      for (let i = 0; i < 10; i++) {
        const radius = i % 2 === 0 ? b.r : b.r * 0.45;
        const angle = -Math.PI / 2 + i * Math.PI / 5;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.closePath();
      ctx.stroke();












    } else {
      ctx.beginPath();
      ctx.arc(0, 0, b.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawStartOverlay() {
    if (state.phase === PHASE.INTRO) {
      drawPartySelectionOverlay();
      return;
    }

    let title = "SOUL BATTLE";
    let sub = "Press Enter";

    if (state.phase === PHASE.WIN) {
      title = "OBISCWTPDNDWMFT";
      sub = "Press Enter / Z / Click to restart";
    }

    if (state.phase === PHASE.SPARED) {
      title = "MERCY";
      sub = typeof state.message === "string" ? state.message : "You won without fighting.";
    }

    if (state.phase === PHASE.LOSE) {
      title = "GAME OVER";
      sub = "Press Enter / Z / Click to retry";
    }

    ctx.fillStyle = "rgba(0,0,0,0.68)";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.strokeRect(185, 230, 530, 165);

    ctx.fillStyle = "#fff";
    ctx.font = "46px Courier New";
    ctx.textAlign = "center";
    ctx.fillText(title, W / 2, 298);

    ctx.font = "20px Courier New";
    ctx.fillText(sub, W / 2, 345);

    if (state.phase === PHASE.WIN || state.phase === PHASE.SPARED || state.phase === PHASE.LOSE) {
      ctx.fillStyle = "#aaa";
      ctx.font = "14px Courier New";
      ctx.fillText("ESC / X: choose another fight", W / 2, 375);
    }
  }

  function drawPartySelectionOverlay() {
    const roster = Array.isArray(window.PLAYER_DATA) ? window.PLAYER_DATA : [];
    const picks = state.partySelection.picks;
    const hoveredIndex = state.partySelection.hovered;
    const previewIndex = hoveredIndex >= 0 ? hoveredIndex : state.partySelection.cursor;
    const previewPlayer = roster[previewIndex] || roster[0];

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.94)";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#080808";
    ctx.strokeStyle = HUD_MAROON;
    ctx.lineWidth = 3;
    ctx.fillRect(32, 38, W - 64, H - 76);
    ctx.strokeRect(32, 38, W - 64, H - 76);

    const back = partySelectionBackRect();
    ctx.fillStyle = state.partySelection.backHovered ? "rgba(242,140,40,0.16)" : "#020202";
    ctx.strokeStyle = HUD_MAROON;
    ctx.lineWidth = state.partySelection.backHovered ? 3 : 2;
    ctx.fillRect(back.x, back.y, back.w, back.h);
    ctx.strokeRect(back.x, back.y, back.w, back.h);
    ctx.fillStyle = state.partySelection.backHovered ? COMMAND_OPTION_HIGHLIGHT : "#fff";
    ctx.font = "bold 15px Courier New";
    ctx.textAlign = "center";
    ctx.fillText("\u2190 BACK", back.x + back.w / 2, back.y + 23);

    ctx.fillStyle = "#fff";
    ctx.font = "42px Courier New";
    ctx.textAlign = "center";
    ctx.fillText("Select your Party", W / 2, 100);

    ctx.fillStyle = COMMAND_OPTION_ORANGE;
    ctx.font = "18px Courier New";
    ctx.fillText(`Choose party member ${Math.min(3, picks.length + 1)} of 3`, W / 2, 139);

    for (let i = 0; i < roster.length; i++) {
      const player = roster[i];
      const card = partySelectionCardRect(i);
      const pickedSlot = picks.indexOf(i);
      const picked = pickedSlot !== -1;
      const previewed = i === previewIndex;
      const icon = playerSpriteForRole(player, "icon");

      ctx.save();
      if (picked) {
        const flagWidth = 42;
        const flagHeight = card.h;
        const startedAt = Number.isFinite(state.partySelection.pickFrames?.[i])
          ? state.partySelection.pickFrames[i]
          : state.frame;
        const progress = clamp((state.frame - startedAt) / 18, 0, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const hiddenX = card.x + card.w - flagWidth + 2;
        const shownX = card.x + card.w - 2;
        const flagX = lerp(hiddenX, shownX, eased);
        const flagY = card.y;

        ctx.fillStyle = player.cardColor;
        ctx.fillRect(flagX, flagY, flagWidth, flagHeight);
        ctx.fillStyle = "#000";
        ctx.font = "bold 18px Courier New";
        ctx.textAlign = "center";
        ctx.fillText(String(pickedSlot + 1), flagX + flagWidth / 2, flagY + 34);
      }

      ctx.globalAlpha = picked ? (previewed ? 0.7 : 0.38) : 1;
      ctx.fillStyle = "#020202";
      ctx.strokeStyle = previewed ? COMMAND_OPTION_HIGHLIGHT : player.cardColor;
      ctx.lineWidth = previewed ? 4 : 2;
      ctx.fillRect(card.x, card.y, card.w, card.h);
      ctx.strokeRect(card.x, card.y, card.w, card.h);

      if (icon && icon.ready) {
        const iconSize = 36;
        ctx.drawImage(icon, card.x + 13, card.y + 9, iconSize, iconSize);
      }

      ctx.fillStyle = previewed ? COMMAND_OPTION_HIGHLIGHT : player.cardColor;
      ctx.font = "bold 21px Courier New";
      ctx.textAlign = "left";
      ctx.fillText(player.name, card.x + 64, card.y + 34);
      ctx.restore();
    }

    if (previewPlayer) {
      const detail = { x: 316, y: 156, w: 526, h: 400 };
      ctx.fillStyle = "#020202";
      ctx.strokeStyle = previewPlayer.cardColor;
      ctx.lineWidth = 3;
      ctx.fillRect(detail.x, detail.y, detail.w, detail.h);
      ctx.strokeRect(detail.x, detail.y, detail.w, detail.h);

      ctx.fillStyle = previewPlayer.cardColor;
      ctx.font = "bold 24px Courier New";
      ctx.textAlign = "center";
      ctx.fillText(previewPlayer.name, detail.x + detail.w / 2, detail.y + 31);

      ctx.strokeStyle = "#3d3d3d";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(detail.x + 18, detail.y + 44);
      ctx.lineTo(detail.x + detail.w - 18, detail.y + 44);
      ctx.moveTo(detail.x + 258, detail.y + 56);
      ctx.lineTo(detail.x + 258, detail.y + 214);
      ctx.moveTo(detail.x + 18, detail.y + 224);
      ctx.lineTo(detail.x + detail.w - 18, detail.y + 224);
      ctx.stroke();

      const maxHP = Math.max(1, ...roster.map((player) => Number.isFinite(player.maxHP) ? player.maxHP : 0));
      const maxDefendTP = Math.max(1, ...roster.map((player) => Number.isFinite(player.defendTP) ? player.defendTP : 0));
      const maxAttack = Math.max(1, ...roster.map((player) => Number.isFinite(player.damage) ? player.damage : 0));
      const statX = detail.x + 26;
      const statWidth = 204;

      function drawSelectionStat(label, value, maximum, y) {
        const ratio = clamp(value / maximum, 0, 1);
        ctx.fillStyle = "#ddd";
        ctx.font = "bold 15px Courier New";
        ctx.textAlign = "left";
        ctx.fillText(label, statX, y);
        ctx.fillStyle = previewPlayer.cardColor;
        ctx.textAlign = "right";
        ctx.fillText(String(value), statX + statWidth, y);

        const barY = y + 10;
        ctx.fillStyle = "#242424";
        ctx.fillRect(statX, barY, statWidth, 7);
        ctx.fillStyle = previewPlayer.cardColor;
        ctx.fillRect(statX, barY, Math.max(3, statWidth * ratio), 7);
        ctx.strokeStyle = "rgba(255,255,255,0.18)";
        ctx.lineWidth = 1;
        ctx.strokeRect(statX, barY, statWidth, 7);
        for (let tick = 1; tick < 4; tick++) {
          const tickX = statX + statWidth * tick / 4;
          ctx.beginPath();
          ctx.moveTo(tickX, barY);
          ctx.lineTo(tickX, barY + 7);
          ctx.stroke();
        }
      }

      ctx.fillStyle = "#888";
      ctx.font = "13px Courier New";
      ctx.textAlign = "left";
      ctx.fillText("STATS", statX, detail.y + 68);
      drawSelectionStat("HP", previewPlayer.maxHP || 0, maxHP, detail.y + 96);
      drawSelectionStat("DEFEND TP", previewPlayer.defendTP || 0, maxDefendTP, detail.y + 145);
      drawSelectionStat("ATTACK", previewPlayer.damage || 0, maxAttack, detail.y + 194);

      const sprite = playerSpriteForRole(previewPlayer, "default");
      const spriteCenterX = detail.x + 390;
      const spriteCenterY = detail.y + 134;
      ctx.save();
      ctx.translate(spriteCenterX, spriteCenterY);
      ctx.scale(0.8, 1.08);
      const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 90);
      glow.addColorStop(0, "rgba(255,255,255,0.24)");
      glow.addColorStop(0.52, "rgba(255,255,255,0.12)");
      glow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(-90, -90, 180, 180);
      ctx.restore();

      if (sprite && sprite.ready) {
        const sourceWidth = sprite.naturalWidth || sprite.width;
        const sourceHeight = sprite.naturalHeight || sprite.height;
        const spriteScale = Math.min(190 / sourceWidth, 166 / sourceHeight);
        const spriteWidth = sourceWidth * spriteScale;
        const spriteHeight = sourceHeight * spriteScale;
        ctx.drawImage(
          sprite,
          spriteCenterX - spriteWidth / 2,
          spriteCenterY - spriteHeight / 2,
          spriteWidth,
          spriteHeight
        );
      }

      ctx.fillStyle = "#888";
      ctx.font = "13px Courier New";
      ctx.textAlign = "left";
      ctx.fillText("OVERVIEW", detail.x + 24, detail.y + 250);
      ctx.fillStyle = "#eee";
      ctx.font = "15px Courier New";
      const featuredActs = Array.isArray(previewPlayer.acts)
        ? previewPlayer.acts.filter((act) => act?.name && act.name !== "Check").slice(0, 3).map((act) => act.name)
        : [];
      const fallbackSummary = featuredActs.length
        ? `${previewPlayer.name} can use ${featuredActs.join(", ")} to support the party.`
        : `${previewPlayer.name} is ready to join the party.`;
      wrapText(
        typeof previewPlayer.selectionSummary === "string" ? previewPlayer.selectionSummary : fallbackSummary,
        detail.x + 24,
        detail.y + 277,
        detail.w - 48,
        21
      );

    }
    ctx.restore();
  }

  function wrapText(text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";
    let yy = y;

    for (const word of words) {
      const test = line + word + " ";

      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, yy);
        line = word + " ";
        yy += lineHeight;
      } else {
        line = test;
      }
    }

    ctx.fillText(line, x, yy);
    return yy;
  }


    return {
      draw, drawBullet, drawHeartShape, drawRedHeart, drawPositionedEnemyBody, enemySpriteForKey,
      activeEnemySpriteKey, attackSpriteKey, captureEnemySprite,
      enemyDamagePopupPosition, enemySpriteBobOffset, enemySpritePosition,
      enemySpriteSize, triggerEnemyHitSprite
    };
  }

  window.SoulBattle.presentation = { createPresentation };
})();

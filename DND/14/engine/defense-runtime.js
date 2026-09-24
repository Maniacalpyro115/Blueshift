(() => {
  "use strict";

  window.SoulBattle = window.SoulBattle || {};

  function createDefenseRuntime(api) {
    const {
      state, enemyData, sounds, input, width: W, height: H,
      PHASE, ATTACK_TYPE, BOX_RECT, defense, clamp, lerp, easeInOutCubic,
      playSound, playMusic, getMusicElapsed, currentAttackConfig,
      currentAttackDamage, currentTurns, spawnBullet, beginChainedEnemyTurn,
      beginDamageResult, beginMenu, beginPlayerDeath, beginTurnEvent,
      consumePartyDamageGuard, currentTurnEventWithoutRepeatedDialog,
      damageRandomLivingPlayer, finishBoxMorph, finishDamageResult,
      finishPhase2Transition, partyIsDefeated, getEncounterRuntime,
      normalizeTurnEvent
    } = api;
    const encounterRuntime = new Proxy({}, {
      get(_target, key) { return getEncounterRuntime()?.[key]; }
    });

  function updateEnemyAttack() {
    const t = state.enemyTimer++;
    const box = state.box;
    const turns = currentTurns();

    if (t < 0) {
      return;
    }

    const previousSoulX = state.soul.x;
    const previousSoulY = state.soul.y;

    encounterRuntime.updateDefenseMechanic?.();
    moveSoul();
    encounterRuntime.judgeDefenseMechanic?.();
    updateGreenShieldDirection();

    const soulIsMoving = state.soul.x !== previousSoulX || state.soul.y !== previousSoulY;

    if (Array.isArray(turns)) {
      const attackConfig = currentAttackConfig();
      const attackPattern = attackConfig.pattern;

      if (typeof attackPattern === "function") {
        const activeMusic = state.bossPhase === 2 ? sounds.phase2Theme : sounds.battleTheme;
        const musicElapsed = getMusicElapsed(activeMusic);
        const musicBeat = Number.isFinite(musicElapsed) && Number.isFinite(activeMusic.bpm)
          ? (musicElapsed - activeMusic.loopStart) / (60 / activeMusic.bpm)
          : null;
        attackPattern({
          t,
          box,
          state,
          musicElapsed,
          musicBeat,
          purpleLineYs: state.attackType === ATTACK_TYPE.PURPLE ? getPurpleLineYs() : null,
          spawnBullet,
          playSound,
          sounds
        });
      }
    } else {
      if (state.pattern === 0) {
        if (t % 34 === 0) {
          const y = box.y + 18 + Math.random() * (box.h - 36);
          spawnBullet({ x: box.x - 12, y, vx: 2 + t / 430, r: 7 });
        }

        if (t % 52 === 20) {
          const y = box.y + 18 + Math.random() * (box.h - 36);
          spawnBullet({ x: box.x + box.w + 12, y, vx: -2 - t / 470, r: 7 });
        }
      }

      if (state.pattern === 1) {
        if (t % 26 === 0) {
          const x = box.x + 14 + Math.random() * (box.w - 28);
          spawnBullet({ x, y: box.y - 14, vy: 2.5, r: 6 });
        }

        if (t % 118 === 0) {
          const gap = box.x + 60 + Math.random() * (box.w - 120);
          for (let x = box.x + 18; x < box.x + box.w - 10; x += 26) {
            if (Math.abs(x - gap) > 34) {
              spawnBullet({ x, y: box.y - 18, vy: 2, r: 8, type: "diamond", spin: 0.06 });
            }
          }
        }
      }

      if (state.pattern === 2) {
        if (t % 46 === 0) {
          const fromLeft = Math.random() > 0.5;
          const x = fromLeft ? box.x - 20 : box.x + box.w + 20;
          const targetY = box.y + 20 + Math.random() * (box.h - 40);
          spawnBullet({ x, y: targetY, vx: fromLeft ? 2.5 : -2.5, vy: Math.sin(t) * 0.7, r: 9, type: "bone" });
        }

        if (t % 72 === 14) {
          const cx = box.x + box.w / 2;
          const cy = box.y + box.h / 2;

          for (let i = 0; i < 8; i++) {
            const a = (Math.PI * 2 * i) / 8 + t * 0.02;
            spawnBullet({ x: cx, y: cy, vx: Math.cos(a) * 2.2, vy: Math.sin(a) * 2.2, r: 5 });
          }
        }
      }

      if (state.pattern === 3) {
        if (t % 160 === 0) {
          const gapY = box.y + 45 + Math.random() * (box.h - 90);

          for (let y = box.y + 18; y < box.y + box.h - 12; y += 22) {
            if (Math.abs(y - gapY) > 30) {
              spawnBullet({ x: box.x - 18, y, vx: 1.2, r: 8, type: "diamond", spin: 0.12 });
              spawnBullet({
                x: box.x + box.w + 18,
                y: box.y + box.h - (y - box.y),
                vx: -1.2,
                r: 8,
                type: "diamond",
                spin: -0.12
              });
            }
          }
        }

        if (t % 35 === 10) {
          spawnBullet({
            x: box.x + box.w / 2,
            y: box.y - 18,
            vx: Math.sin(t * 0.08) * 1.2,
            vy: 1.2,
            r: 6
          });
        }
      }

      if (state.pattern === 4) {
        const cx = box.x + box.w / 2;
        const cy = box.y + box.h / 2;

        if (t % 12 === 0) {
          const a = t * 0.16;
          const radius = 18 + (t % 96);

          spawnBullet({
            x: cx + Math.cos(a) * radius,
            y: cy + Math.sin(a) * radius,
            vx: Math.cos(a + Math.PI / 2) * 1,
            vy: Math.sin(a + Math.PI / 2) * 1,
            r: 5,
            type: "diamond",
            spin: 0.18
          });

          spawnBullet({
            x: cx + Math.cos(a + Math.PI) * radius,
            y: cy + Math.sin(a + Math.PI) * radius,
            vx: Math.cos(a - Math.PI / 2) * 1,
            vy: Math.sin(a - Math.PI / 2) * 1,
            r: 5,
            type: "diamond",
            spin: -0.18
          });
        }

        if (t % 70 === 24) {
          const fromTop = Math.random() > 0.5;

          spawnBullet({
            x: box.x + 20 + Math.random() * (box.w - 40),
            y: fromTop ? box.y - 20 : box.y + box.h + 20,
            vy: fromTop ? 2 : -2,
            vx: Math.random() * 1.4 - 0.7,
            r: 9,
            type: "bone"
          });
        }
      }
    }

    for (const b of state.bullets) {
      b.age++;

      if (typeof b.update === "function") {
        b.update({
          bullet: b,
          t,
          box,
          state,
          spawnBullet
        });
      } else {
        b.x += b.vx;
        b.y += b.vy;
      }

      b.angle += b.spin;
      b.life--;

      let bulletIsColliding = false;
      let bulletIsGrazing = false;
      if (!b.harmless) {
        const customCollision = encounterRuntime.bulletCollision?.({
          state,
          soul: state.soul,
          bullet: b
        });
        bulletIsColliding = typeof customCollision?.collides === "boolean"
          ? customCollision.collides
          : collides(state.soul, b);
        bulletIsGrazing = typeof customCollision?.grazes === "boolean"
          ? customCollision.grazes
          : grazes(state.soul, b);
      }

      if (!b.harmless && !b.grazed && bulletIsGrazing && !bulletIsColliding) {
        b.grazed = true;
        state.tp = clamp(state.tp + 1, 0, 100);
        state.grazeGlow = 18;
        playSound(sounds.graze);
      }

      if (state.attackType === ATTACK_TYPE.GREEN && shieldBlocksBullet(b)) {
        playSound(sounds.shieldBlock);
        if (b.red) {
          state.redShieldGlow = 18;
        }
        if (b.shatterShield) {
          shatterGreenShield(b, { damagePlayer: false });
        }
        b.life = 0;
        continue;
      }

      if (
        !b.harmless &&
        (!b.damageOnlyWhileMoving || soulIsMoving) &&
        (!b.damageOnlyWhileStill || !soulIsMoving) &&
        bulletIsColliding &&
        state.soul.invuln <= 0
      ) {
        const damageGuarded = consumePartyDamageGuard();
        if (!b.shatterShield) {
          if (!damageGuarded) damageRandomLivingPlayer(currentAttackDamage());
        }
        if (!damageGuarded) playSound(sounds.playerHurt);
        state.soul.invuln = 50;
        if (!damageGuarded) state.shake = 10;
        if (!damageGuarded && state.attackType === ATTACK_TYPE.BLUE && b.superBounce) {
          state.soul.y = Math.min(state.soul.y, b.y - state.soul.r);
          state.soul.vy = Number.isFinite(b.bounceVelocity) ? b.bounceVelocity : -18.8;
          state.soul.pitBounce = true;
        }
        if (b.shatterShield) {
          shatterGreenShield(b, { damagePlayer: !damageGuarded });
        }

        if (partyIsDefeated()) {
          beginPlayerDeath();
        }
      }
    }

    state.bullets = state.bullets.filter((b) =>
      b.life > 0 &&
      (
        b.noCull ||
        (
          b.x > box.x - 80 &&
          b.x < box.x + box.w + 80 &&
          b.y > box.y - 80 &&
          b.y < box.y + box.h + 80
        )
      )
    );

    if (state.soul.invuln > 0) state.soul.invuln--;
    if (state.grazeGlow > 0) state.grazeGlow--;
    updateShieldShatter();

    if (state.enemyTimer >= state.enemyDuration && state.phase === PHASE.ENEMY) {
      encounterRuntime.onAttackEnd?.({ state, turnIndex: state.currentTurn?.index,
        turnCount: currentTurns()?.length || 0 });
      state.bullets = [];
      state.lastStand.activeAttack = false;

      if (state.currentTurn && state.currentTurn.postAttackEvent) {
        const event = currentTurnEventWithoutRepeatedDialog(state.currentTurn.postAttackEvent);
        state.box = { ...BOX_RECT.TEXT };
        if (event) {
          beginTurnEvent(event, beginChainedEnemyTurn);
        } else {
          beginChainedEnemyTurn();
        }
        return;
      }

      const interlude = normalizeTurnEvent(encounterRuntime.afterEnemyTurn?.({
        state,
        turn: state.currentTurn,
        turnIndex: state.currentTurn?.index
      }));
      if (interlude) {
        state.box = { ...BOX_RECT.TEXT };
        beginTurnEvent(interlude, beginMenu);
      } else {
        beginMenu();
      }
    }
  }

  function updatePhaseTransition() {
    const phase2 = enemyData.phase2 || {};
    const transition = state.phaseTransition;
    const refillStart = transition.fadeOutDuration + transition.holdDuration;
    const fadeInEnd = refillStart + transition.fadeInDuration;

    transition.timer++;

    if (transition.timer < refillStart) {
      return;
    }

    if (!transition.refillStarted) {
      transition.refillStarted = true;
      state.bossPhase = 2;
      state.enemyMaxHP = Number.isFinite(phase2.maxHP) ? phase2.maxHP : enemyData.maxHP;
      state.enemyName = phase2.name || enemyData.name;
      state.actConditionIndex = 0;
      state.dialogIndex = 0;
      state.enemyDialogIndex = 0;
      state.enemyDialogMessage = "";
      state.message = phase2.refillMessage || "* The HP bar starts crawling back.";
      state.textTimer = 0;
    }

    transition.refillMessageTimer++;

    if (state.enemyHP < state.hpFillTarget) {
      state.enemyHP = Math.min(state.hpFillTarget, state.enemyHP + state.hpFillSpeed);
      return;
    }

    if (transition.timer < fadeInEnd) {
      return;
    }

    if (transition.refillMessageTimer < transition.refillMessageMinDuration) {
      return;
    }

    finishPhase2Transition();
  }

  function moveSoul() {
    const soul = state.soul;
    const box = state.box;
    const movementSpeed = encounterRuntime.movementSpeed?.({ state, base: soul.speed }) ?? soul.speed;
    const delayedInput = soulInputWithDelay();
    let dx = 0;
    let dy = 0;

    if (delayedInput.left) dx--;
    if (delayedInput.right) dx++;
    if (delayedInput.up) dy--;
    if (delayedInput.down) dy++;

    ({ dx, dy } = encounterRuntime.transformMovement?.({ state, dx, dy }) || { dx, dy });

    if (state.attackType === ATTACK_TYPE.GREEN) {
      soul.x = box.x + box.w / 2;
      soul.y = box.y + box.h / 2;
      soul.vy = 0;
      return;
    }

    if (state.attackType === ATTACK_TYPE.PURPLE) {
      if (encounterRuntime.moveSoul?.({ state, input: delayedInput })) return;
      const laneYs = getPurpleLineYs();
      const upPressed = delayedInput.upPressed;
      const downPressed = delayedInput.downPressed;

      if (upPressed && !downPressed) {
        soul.lane = clamp(soul.lane - 1, 0, laneYs.length - 1);
      } else if (downPressed && !upPressed) {
        soul.lane = clamp(soul.lane + 1, 0, laneYs.length - 1);
      }

      soul.x = clamp(soul.x + dx * movementSpeed, box.x + soul.r, box.x + box.w - soul.r);
      soul.y = laneYs[soul.lane] || box.y + box.h / 2;
      return;
    }

    if (state.attackType === ATTACK_TYPE.BLUE) {
      const floorY = box.y + box.h - soul.r;
      const upHeld = delayedInput.up;
      const support = soul.vy >= 0 ? bluePlatformBelowSoul(soul, 3) : null;
      const grounded = !soul.pitBounce && (soul.y >= floorY - 0.01 || support !== null);

      if (grounded) {
        soul.y = support ? support.y - soul.r : floorY;
        soul.vy = 0;

        if (delayedInput.upPressed) {
          soul.vy = -7.7;
        }
      }

      const carriedX = support && soul.vy === 0 ? support.vx : 0;
      soul.x = clamp(soul.x + dx * movementSpeed + carriedX, box.x + soul.r, box.x + box.w - soul.r);

      if (!soul.pitBounce && !grounded && !upHeld && soul.vy < -2.8) {
        soul.vy = -2.8;
      }

      soul.vy += soul.pitBounce
        ? 0.55
        : upHeld && soul.vy < 0
          ? 0.24
          : 0.55;
      if (soul.pitBounce && soul.vy >= 0) soul.pitBounce = false;
      const nextY = clamp(soul.y + soul.vy, box.y + soul.r, floorY);
      const landingPlatform = soul.vy >= 0 ? blueLandingPlatform(soul, nextY) : null;

      soul.y = landingPlatform ? landingPlatform.y - soul.r : nextY;

      if (landingPlatform) {
        soul.vy = 0;
      }

      if (soul.y >= floorY) {
        soul.y = floorY;
        soul.vy = 0;
      }

      return;
    }

    if (dx && dy) {
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }

    soul.x = clamp(soul.x + dx * movementSpeed, box.x + soul.r, box.x + box.w - soul.r);
    soul.y = clamp(soul.y + dy * movementSpeed, box.y + soul.r, box.y + box.h - soul.r);
  }

  function soulInputWithDelay() {
    const current = {
      left: input.isHeld("ArrowLeft") || input.isHeld("a") || input.isHeld("A"),
      right: input.isHeld("ArrowRight") || input.isHeld("d") || input.isHeld("D"),
      up: input.isHeld("ArrowUp") || input.isHeld("w") || input.isHeld("W"),
      down: input.isHeld("ArrowDown") || input.isHeld("s") || input.isHeld("S"),
      upPressed: input.up,
      downPressed: input.down
    };
    return encounterRuntime.transformSoulInput?.({ state, current }) || current;
  }

  function updateGreenShieldDirection() {
    if (state.attackType !== ATTACK_TYPE.GREEN) return;

    const click = input.mouseClick;

    const applyDirection = (direction) => {
      state.shieldDirection = encounterRuntime.transformShieldDirection?.({ state, direction }) || direction;
    };

    if (click) {
      const dx = click.x - state.soul.x;
      const dy = click.y - state.soul.y;

      if (Math.abs(dx) > Math.abs(dy)) {
        applyDirection(dx < 0 ? "left" : "right");
      } else if (Math.abs(dy) > 0 || Math.abs(dx) > 0) {
        applyDirection(dy < 0 ? "up" : "down");
      }
    } else if (input.left) {
      applyDirection("left");
    } else if (input.right) {
      applyDirection("right");
    } else if (input.up) {
      applyDirection("up");
    } else if (input.down) {
      applyDirection("down");
    }
  }

  function bluePlatformBelowSoul(soul, tolerance) {
    return state.bullets.find((b) =>
      b.solidPlatform &&
      soul.x + soul.r > b.x - b.width / 2 &&
      soul.x - soul.r < b.x + b.width / 2 &&
      Math.abs(soul.y + soul.r - b.y) <= Math.max(tolerance, b.platformCarryTolerance || 0)
    ) || null;
  }

  function blueLandingPlatform(soul, nextY) {
    const currentFeet = soul.y + soul.r;
    const nextFeet = nextY + soul.r;

    return state.bullets
      .filter((b) =>
        b.solidPlatform &&
        soul.x + soul.r > b.x - b.width / 2 &&
        soul.x - soul.r < b.x + b.width / 2 &&
        currentFeet <= b.y &&
        nextFeet >= b.y
      )
      .sort((a, b) => a.y - b.y)[0] || null;
  }

  function getPurpleLineYs() {
    const box = state.box;

    return [
      box.y + box.h * 0.18,
      box.y + box.h * 0.5,
      box.y + box.h * 0.82
    ];
  }

  function updateBoxMorph() {
    const morph = state.boxMorph;
    morph.timer++;

    const progress = clamp(morph.timer / morph.duration, 0, 1);
    const eased = easeInOutCubic(progress);

    state.box = {
      x: lerp(morph.from.x, morph.to.x, eased),
      y: lerp(morph.from.y, morph.to.y, eased),
      w: lerp(morph.from.w, morph.to.w, eased),
      h: lerp(morph.from.h, morph.to.h, eased),
    };

    if (progress >= 1) {
      finishBoxMorph();
    }
  }

  function updateDamageResult() {
    state.damageResult.timer++;

    if (state.attack.flash > 0) {
      state.attack.flash--;
    }

    if (state.damageResult.timer >= state.damageResult.duration) {
      finishDamageResult();
    }
  }

  function updateLastStandEvent() {
    state.lastStand.timer++;

    if (state.attack.flash > 0) {
      state.attack.flash--;
    }

    if (state.lastStand.timer >= state.lastStand.flashDuration + state.lastStand.messageDuration) {
      beginDamageResult({
        fromHP: state.lastStand.fromHP,
        toHP: state.lastStand.toHP,
        damage: state.lastStand.damage
      });
    }
  }

  function updatePlayerDeath() {
    state.death.timer++;

    if (state.death.timer === 60) {
      playSound(sounds.break1);
    }

    if (state.death.timer === 150) {
      playSound(sounds.break2);
      spawnDeathHeartPieces();
    }

    if (state.death.timer >= 225 && !state.death.determinationStarted) {
      state.death.determinationStarted = true;
      playMusic(sounds.determination);
    }

    for (const piece of state.death.pieces) {
      piece.x += piece.vx;
      piece.y += piece.vy;
      piece.vy += 0.08;
      piece.rotation += piece.spin;
      piece.life++;
    }
  }

  function spawnDeathHeartPieces() {
    const x = state.death.x;
    const y = state.death.y;
    const color = state.death.color;
    const leftPieces = [
      [{ x: -11, y: -12 }, { x: -1, y: -7 }, { x: -2, y: 0 }, { x: -10, y: -1 }],
      [{ x: -10, y: -1 }, { x: -2, y: 0 }, { x: -1, y: 7 }, { x: -8, y: 10 }],
      [{ x: -1, y: 7 }, { x: 0, y: 12 }, { x: -8, y: 10 }]
    ];
    const rightPieces = [
      [{ x: 1, y: -7 }, { x: 11, y: -12 }, { x: 10, y: -1 }, { x: 2, y: 0 }],
      [{ x: 2, y: 0 }, { x: 10, y: -1 }, { x: 8, y: 10 }, { x: 1, y: 7 }],
      [{ x: 1, y: 7 }, { x: 8, y: 10 }, { x: 0, y: 12 }]
    ];

    state.death.pieces = leftPieces.concat(rightPieces).map((points, index) => {
      const side = index < leftPieces.length ? -1 : 1;
      const burst = 2.6 + Math.random() * 2.5;

      return {
        x,
        y,
        points,
        color,
        vx: side * burst + (Math.random() - 0.5) * 1.2,
        vy: -2.2 - Math.random() * 2.4,
        rotation: 0,
        spin: side * (0.05 + Math.random() * 0.09),
        life: 0
      };
    });
  }

  function collides(soul, b) {
    if (Number.isFinite(b.width) && Number.isFinite(b.height)) {
      const nearestX = clamp(soul.x, b.x - b.width / 2, b.x + b.width / 2);
      const nearestY = clamp(soul.y, b.y, b.y + b.height);
      const dx = soul.x - nearestX;
      const dy = soul.y - nearestY;
      return dx * dx + dy * dy < soul.r * soul.r * 0.72;
    }

    const rr = soul.r + b.r;
    const dx = soul.x - b.x;
    const dy = soul.y - b.y;
    return dx * dx + dy * dy < rr * rr * 0.72;
  }

  function grazes(soul, b) {
    const grazeRadius = soul.r + 18;

    if (Number.isFinite(b.width) && Number.isFinite(b.height)) {
      const nearestX = clamp(soul.x, b.x - b.width / 2, b.x + b.width / 2);
      const nearestY = clamp(soul.y, b.y, b.y + b.height);
      const dx = soul.x - nearestX;
      const dy = soul.y - nearestY;
      return dx * dx + dy * dy < grazeRadius * grazeRadius;
    }

    const rr = grazeRadius + b.r;
    const dx = soul.x - b.x;
    const dy = soul.y - b.y;
    return dx * dx + dy * dy < rr * rr;
  }

  function shatterGreenShield(b, { damagePlayer = true } = {}) {
    spawnShieldShatterEffect();
    playSound(sounds.bombsplosion);
    state.attackType = ATTACK_TYPE.NORMAL;
    state.redShieldGlow = 0;
    state.shieldDirection = "up";
    state.shake = Math.max(state.shake, 16);

    if (damagePlayer) {
      damageRandomLivingPlayer(currentAttackDamage());
      state.soul.invuln = Math.max(state.soul.invuln, 50);
    }

    if (b) {
      b.life = 0;
    }

    if (partyIsDefeated()) {
      beginPlayerDeath();
    }
  }

  function spawnShieldShatterEffect() {
    const shield = greenShieldRect();
    const cx = shield.x + shield.w / 2;
    const cy = shield.y + shield.h / 2;

    state.shieldShatter.timer = 0;
    state.shieldShatter.particles = Array.from({ length: 34 }, (_, index) => {
      const angle = index / 34 * Math.PI * 2 + (Math.random() - 0.5) * 0.42;
      const speed = 2.8 + Math.random() * 4.4;

      return {
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        spin: (Math.random() - 0.5) * 0.26
      };
    });
  }

  function updateShieldShatter() {
    if (state.shieldShatter.particles.length === 0) return;

    state.shieldShatter.timer++;

    for (const particle of state.shieldShatter.particles) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vx *= 0.95;
      particle.vy *= 0.95;
      particle.vy += 0.08;
      particle.spin += 0.02;
    }

    if (state.shieldShatter.timer >= state.shieldShatter.duration) {
      state.shieldShatter.particles = [];
    }
  }

  function greenShieldRect() {
    return greenShieldRectAt(state.soul.x, state.soul.y, state.shieldDirection);
  }

  function greenShieldRectAt(soulX, soulY, direction) {
    const length = 38;
    const thickness = 7;
    const offset = 35;

    if (direction === "left") {
      return { x: soulX - offset - thickness, y: soulY - length / 2, w: thickness, h: length };
    }

    if (direction === "right") {
      return { x: soulX + offset, y: soulY - length / 2, w: thickness, h: length };
    }

    if (direction === "down") {
      return { x: soulX - length / 2, y: soulY + offset, w: length, h: thickness };
    }

    return { x: soulX - length / 2, y: soulY - offset - thickness, w: length, h: thickness };
  }

  function shieldBlocksBullet(b) {
    if (b.harmless || b.blockable === false) return false;

    const shield = greenShieldRect();
    const tip = { x: b.x, y: b.y };
    const forgiveness = 7;

    if (state.shieldDirection === "left") {
      const faceX = shield.x;
      return b.vx > 0 &&
        tip.x >= faceX &&
        tip.x <= faceX + forgiveness &&
        tip.y >= shield.y - forgiveness &&
        tip.y <= shield.y + shield.h + forgiveness;
    }

    if (state.shieldDirection === "right") {
      const faceX = shield.x + shield.w;
      return b.vx < 0 &&
        tip.x <= faceX &&
        tip.x >= faceX - forgiveness &&
        tip.y >= shield.y - forgiveness &&
        tip.y <= shield.y + shield.h + forgiveness;
    }

    if (state.shieldDirection === "down") {
      const faceY = shield.y + shield.h;
      return b.vy < 0 &&
        tip.y <= faceY &&
        tip.y >= faceY - forgiveness &&
        tip.x >= shield.x - forgiveness &&
        tip.x <= shield.x + shield.w + forgiveness;
    }

    const faceY = shield.y;
    return b.vy > 0 &&
      tip.y >= faceY &&
      tip.y <= faceY + forgiveness &&
      tip.x >= shield.x - forgiveness &&
      tip.x <= shield.x + shield.w + forgiveness;
  }


    return {
      getPurpleLineYs, greenShieldRect, greenShieldRectAt, updateBoxMorph,
      updateDamageResult, updateEnemyAttack, updateLastStandEvent,
      updatePhaseTransition, updatePlayerDeath
    };
  }

  window.SoulBattle.defenseRuntime = { createDefenseRuntime };
})();

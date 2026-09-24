window.SoulBattle.createGame = function createGame(options) {
  "use strict";

  options = options || {};

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const W = canvas.width;
  const H = canvas.height;
  const {
    FIXED_STEP_MS,
    MAX_FRAME_MS,
    PHASE,
    ATTACK_TYPE,
    PURPLE_LINE_COUNT,
    BOX_RECT,
    MENU_ITEMS: menuItems,
    DEFAULT_ENEMY_DATA
  } = window.SoulBattle.constants;
  const { clamp, lerp, easeInOutCubic } = window.SoulBattle.utils;
  const { normalizeAttackPattern, normalizeTurn, normalizeTurnEvent, chooseTimelineSteps } = window.SoulBattle.flow;
  const {
    createAssets, playSound, playMusic, stopMusic, setMusicVolume, getMusicElapsed
  } = window.SoulBattle.assets;
  const { createInput } = window.SoulBattle.input;
  const defense = window.SoulBattle.defense;
  const { createDefenseRuntime } = window.SoulBattle.defenseRuntime;
  const { createPresentation } = window.SoulBattle.presentation;
  const { createPartyActions } = window.SoulBattle.partyActions;
  const { normalizeActs: createPlayerActs } = window.SoulBattle.playerRuntime;
  const { createExtensionHost } = window.SoulBattle.extensions;
  const COMMAND_OPTION_ORANGE = "#f28c28";
  const COMMAND_OPTION_HIGHLIGHT = "#ffcc33";
  const HUD_MAROON = "#5b2118";
  const PARTY_SESSION_KEY = "soulBattle.selectedParty";
  const PARTY_FLAG_SLIDE_FRAMES = 18;
  const FIGHT_QTE_MIN_DAMAGE_MULTIPLIER = 0.5;
  const FIGHT_QTE_CRIT_RADIUS_RATIO = 0.2;
  const FIGHT_QTE_FALLOFF_TRACK_RATIO = 0.22;
  const FIGHT_QTE_FALLOFF_POWER = 2;
  let lastPartySelectionNames = [];
  const requestEncounterSelection = typeof options.onRequestEncounterSelection === "function"
    ? options.onRequestEncounterSelection
    : () => {};

  const enemyData = {
    ...DEFAULT_ENEMY_DATA,
    ...(options.enemy || window.ENEMY_DATA || {})
  };

  const { sprites, sounds } = createAssets(enemyData);

  function stopCurrentMusic() {
    stopMusic(sounds.battleTheme);
    stopMusic(sounds.phase2Theme);
    stopMusic(sounds.determination);
    setMusicVolume(sounds.battleTheme, 0.45);
    setMusicVolume(sounds.phase2Theme, 0.45);
    setMusicVolume(sounds.determination, 0.45);
    for (const key of Object.keys(enemyData.musicTracks || {})) {
      stopMusic(sounds[key]);
      setMusicVolume(sounds[key], 0.45);
    }
  }

  function currentBossData() {
    return state.bossPhase === 2 && enemyData.phase2
      ? { ...enemyData, ...enemyData.phase2 }
      : enemyData;
  }

  function currentAttackPatterns() {
    const bossData = currentBossData();
    return Array.isArray(bossData.attackPatterns)
      ? bossData.attackPatterns
      : enemyData.attackPatterns;
  }

  function currentTurns() {
    if (state.bossPhase === 2 && enemyData.phase2) {
      if (Array.isArray(enemyData.phase2.turns)) {
        return enemyData.phase2.turns;
      }

      if (Array.isArray(enemyData.phase2.attackPatterns)) {
        return enemyData.phase2.attackPatterns;
      }
    }

    if (Array.isArray(enemyData.turns)) {
      return enemyData.turns;
    }

    const attackPatterns = currentAttackPatterns();
    return Array.isArray(attackPatterns) ? attackPatterns : null;
  }

  function currentAttackConfig() {
    if (state.currentTurn) {
      return state.currentTurn.attack;
    }

    const turns = currentTurns();

    if (!Array.isArray(turns) || turns.length === 0) {
      return {
        type: ATTACK_TYPE.NORMAL,
        duration: null,
        box: null,
        setup: null,
        pattern: null
      };
    }

    return normalizeTurn(turns[state.pattern]).attack;
  }

  function currentAttackDamage() {
    const damage = currentAttackConfig().damage;
    return Number.isFinite(damage) ? damage : 3;
  }

  const input = createInput({ canvas, width: W, height: H });

  function createInventory(items) {
    if (!Array.isArray(items)) return [];

    return items
      .filter((item) => item && typeof item.name === "string")
      .map((item) => {
        const target = item.target === "party" ? "party" : "ally";
        const heal = Number.isFinite(item.heal) ? item.heal : 0;
        const description = typeof item.description === "string"
          ? item.description
          : target === "party"
            ? `Heals party ${heal}HP each`
            : `Heals ${heal}HP`;

        return {
          name: item.name,
          heal,
          target,
          description
        };
      });
  }

  function startingItems() {
    if (window.PARTY_DATA && Array.isArray(window.PARTY_DATA.items)) {
      return window.PARTY_DATA.items;
    }

    return enemyData.items;
  }

  const DEFAULT_PLAYER_DATA = [
    { name: "KRIS", maxHP: 90, hp: 90, cardColor: "#19d7ff", secondaryColor: "#7eeaff", sprites: null, spriteScale: 1, defendTP: 16 },
    { name: "SUSIE", maxHP: 110, hp: 110, cardColor: "#ff42d0", secondaryColor: "#ff9be8", sprites: null, spriteScale: 1, defendTP: 16 },
    { name: "RALSEI", maxHP: 70, hp: 70, cardColor: "#24e45f", secondaryColor: "#82f09e", sprites: null, spriteScale: 1, defendTP: 16 }
  ];

  function createParty(players) {
    const source = Array.isArray(players) && players.length > 0 ? players : DEFAULT_PLAYER_DATA;

    return source.slice(0, 3).map((player, index) => {
      const maxHP = Number.isFinite(player.maxHP) ? player.maxHP : DEFAULT_PLAYER_DATA[index]?.maxHP || 90;
      const hp = Number.isFinite(player.hp) ? player.hp : maxHP;
      const hasSpriteRoles = player.sprites && typeof player.sprites === "object";
      const hasLegacySprite = typeof player.sprite === "string";
      const spriteKeys = {};
      const spriteAnimations = {};

      if (hasSpriteRoles) {
        for (const [role, src] of Object.entries(player.sprites)) {
          if (typeof src === "string") {
            spriteKeys[role] = `${player.name}:${role}`;
            const configuredAnimation = player.spriteAnimations?.[role];
            const legacyDefaultAnimation = role === "default" ? player.defaultAnimation : null;
            const animation = configuredAnimation || legacyDefaultAnimation;
            const frameCount = Array.isArray(animation?.frames) ? animation.frames.length : 5;
            spriteAnimations[role] = {
              fps: Number.isFinite(animation?.fps) && animation.fps > 0 ? animation.fps : 2,
              spriteKeys: Array.from({ length: frameCount }, (_, frameIndex) =>
                `${player.name}:${role}Animation:${frameIndex}`)
            };
          }
        }
      } else if (hasLegacySprite) {
        for (const role of ["default", "down", "icon"]) {
          spriteKeys[role] = `${player.name}:${role}`;
        }
      }

      return {
        name: typeof player.name === "string" ? player.name : DEFAULT_PLAYER_DATA[index]?.name || `ALLY ${index + 1}`,
        maxHP,
        hp: clamp(hp, 0, maxHP),
        cardColor: typeof player.cardColor === "string"
          ? player.cardColor
          : DEFAULT_PLAYER_DATA[index]?.cardColor || "#fff",
        secondaryColor: typeof player.secondaryColor === "string"
          ? player.secondaryColor
          : typeof player.cardColor === "string"
            ? player.cardColor
            : DEFAULT_PLAYER_DATA[index]?.secondaryColor || "#fff",
        spriteScale: Number.isFinite(player.spriteScale) && player.spriteScale > 0
          ? player.spriteScale
          : DEFAULT_PLAYER_DATA[index]?.spriteScale || 1,
        preserveBattleSpriteAspectRatio: player.preserveBattleSpriteAspectRatio === true,
        battleSpriteRoleScales: player.battleSpriteRoleScales && typeof player.battleSpriteRoleScales === "object"
          ? Object.fromEntries(
            Object.entries(player.battleSpriteRoleScales)
              .filter(([, scale]) => Number.isFinite(scale) && scale > 0)
          )
          : {},
        defendTP: Number.isFinite(player.defendTP)
          ? Math.max(0, player.defendTP)
          : DEFAULT_PLAYER_DATA[index]?.defendTP || 16,
        damage: Number.isFinite(player.damage) ? Math.max(1, player.damage) : 18,
        damageMultiplier: Number.isFinite(player.damageMultiplier) ? player.damageMultiplier : 1,
        permanentBaseDamageBonus: 0,
        temporaryDamageMultiplier: 1,
        temporaryDamageBuffTurns: 0,
        runtime: player.runtime && typeof player.runtime === "object" ? player.runtime : {},
        runtimeState: typeof player.runtime?.createState === "function" ? player.runtime.createState() : {},
        usedActs: new Set(),
        actionSpriteRole: null,
        grantedActs: [],
        spriteAnimations,
        acts: createPlayerActs(player.acts),
        spriteKeys
      };
    });
  }

  let encounterRuntime;
  let partyActions;
  const state = {
    phase: PHASE.INTRO,
    bossPhase: 1,
    phase2Started: false,
    selected: 0,
    selectedFightTarget: 0,
    selectedAct: 0,
    selectedActTarget: 0,
    selectedActEnemyTarget: 0,
    selectedItem: 0,
    selectedItemTarget: 0,
    selectedMercyTarget: 0,
    actConditionIndex: 0,
    frame: 0,
    commandHudAnimationStartFrame: 0,
    textTimer: 0,
    dialogIndex: 0,
    enemyDialogIndex: 0,
    enemyDialogTimer: 0,
    enemyDialogDuration: 0,
    enemyDialogMessage: "",
    enemyDialogOnComplete: null,
    currentTurn: null,
    enemyPostFinaleReached: false,
    consumedTurns: new Set(),
    seenTurns: new Set(),
    dialogIndexBeforeAdvance: null,
    turnEvent: {
      steps: [],
      index: -1,
      timer: 0,
      step: null,
      onComplete: null,
      transformation: null
    },
    scene: {
      config: null,
      timer: 0,
      onComplete: null
    },
    message: enemyData.introMessage,

    playerHP: 50,
    maxHP: 50,

    enemyHP: enemyData.maxHP,
    enemyMaxHP: enemyData.maxHP,
    enemyName: enemyData.name,

    party: createParty(window.PLAYER_DATA),
    partySelection: {
      cursor: 0,
      hovered: -1,
      backHovered: false,
      picks: [],
      pickFrames: {},
      completeFrame: null
    },
    partyTurnIndex: 0,
    partyCommands: [],
    tp: 0,
    grazeGlow: 0,
    partyActions: [],

    inventory: createInventory(startingItems()),


    attack: {
      markerX: 205,
      speed: 8,
      direction: 1,
      active: false,
      result: null,
      damage: 0,
      flash: 0,
    },
    damageResult: {
      timer: 0,
      duration: 105,
      dropStart: 20,
      fromHP: enemyData.maxHP,
      toHP: enemyData.maxHP,
      damage: 0,
    },
    fightQte: {
      timer: 0,
      actions: [],
      order: [],
      activeBars: [],
      nextOrderIndex: 0,
      spawnTimer: 60,
      finished: false,
      finishTimer: 0,
      results: [],
      nextPopupIndex: 0,
      popupSpawnTimer: 0,
      damagePopups: []
    },
    playerEffectAction: {
      timer: 0,
      action: null,
      queue: [],
      persistentActions: [],
      damageActions: [],
      fightActions: [],
      messages: []
    },
    spellAction: {
      timer: 0,
      action: null,
      queue: [],
      fightActions: [],
      messages: [],
      damage: 0,
      bonusDamage: 0,
      damageApplied: false,
      particles: []
    },
    persistentEffects: [],
    persistentLayerFades: [],
    persistentEffectAction: {
      timer: 0,
      effect: null,
      queue: [],
      fightActions: [],
      messages: [],
      damage: 0,
      bonusDamage: 0,
      damageApplied: false,
      hitCount: 0,
      hitsApplied: 0,
      hitPopups: []
    },
    enemyDamageMarks: [],
    lastStand: {
      used: false,
      pendingAttack: null,
      activeAttack: false,
      timer: 0,
      flashDuration: 42,
      messageDuration: 135,
      damage: 0,
      fromHP: enemyData.maxHP,
      toHP: 1
    },

    box: { ...BOX_RECT.TEXT },
    soul: { x: 450, y: 420, r: 8, speed: 5.06, invuln: 0, lane: 1, vy: 0 },
    shieldDirection: "up",
    redShieldGlow: 0,
    shieldShatter: {
      timer: 0,
      duration: 36,
      particles: []
    },
    attackType: ATTACK_TYPE.NORMAL,
    bullets: [],
    enemySpriteKey: null,
    enemyDefaultSpriteKey: null,
    enemyDefaultSpriteLocked: false,
    enemyHitSpriteUntil: 0,

    enemyTimer: 0,
    enemyWarmup: 75,
    enemyDuration: 640,
    pattern: -1,
    encounter: {},
    boxMorph: {
      timer: 0,
      duration: 28,
      from: { ...BOX_RECT.TEXT },
      to: { ...BOX_RECT.TEXT },
      nextPhase: PHASE.MENU,
      onComplete: null,
    },
    shake: 0,
    hpFillTarget: 0,
    hpFillSpeed: 1.35,
    phaseTransition: {
      timer: 0,
      fadeOutDuration: 90,
      holdDuration: 150,
      fadeInDuration: 100,
      refillMessageMinDuration: 180,
      refillMessageTimer: 0,
      refillStarted: false,
    },
    ultimate: {
      transformed: false,
      timer: 0,
      fadeOutDuration: 75,
      holdDuration: 25,
      fadeInDuration: 75,
    },
    mercy: {
      timer: 0,
      messageDuration: 135,
      fadeDuration: 90,
      success: false,
      winMessage: null,
      keepUiDuringFade: false,
    },
    defeatDissolve: {
      timer: 0,
      dialogDuration: 180,
      dissolveDuration: 112,
      particleTailDuration: 45,
      pixelSize: 6,
      spriteSize: 150,
      spriteX: 0,
      spriteTop: 0,
      spriteKey: "hit",
      started: false,
      releasedRows: 0,
      particles: [],
      source: null,
      custom: null,
      speechSpriteKey: null,
    },
    death: {
      timer: 0,
      determinationStarted: false,
      x: 450,
      y: 420,
      color: "#ff1e35",
      pieces: []
    },
  };

  const defenseRuntime = createDefenseRuntime({
    state, enemyData, sounds, input, width: W, height: H,
    PHASE, ATTACK_TYPE, BOX_RECT, defense, clamp, lerp, easeInOutCubic,
    playSound, playMusic, getMusicElapsed, currentAttackConfig,
    currentAttackDamage, currentTurns, spawnBullet, beginChainedEnemyTurn,
    beginDamageResult, beginMenu, beginPlayerDeath, beginTurnEvent,
    consumePartyDamageGuard: (...args) => partyActions.consumePartyDamageGuard(...args),
    currentTurnEventWithoutRepeatedDialog,
    damageRandomLivingPlayer: (...args) => partyActions.damageRandomLivingPlayer(...args),
    finishBoxMorph, finishDamageResult, finishPhase2Transition,
    partyIsDefeated: (...args) => partyActions.partyIsDefeated(...args),
    normalizeTurnEvent,
    getEncounterRuntime: () => encounterRuntime
  });
  const {
    getPurpleLineYs, greenShieldRect, greenShieldRectAt, updateBoxMorph,
    updateDamageResult, updateEnemyAttack, updateLastStandEvent,
    updatePhaseTransition, updatePlayerDeath
  } = defenseRuntime;

  const presentation = createPresentation({
    canvas, ctx, state, enemyData, sounds, sprites, width: W, height: H,
    PHASE, ATTACK_TYPE, BOX_RECT, menuItems,
    COMMAND_OPTION_ORANGE, COMMAND_OPTION_HIGHLIGHT, HUD_MAROON,
    clamp, lerp, easeInOutCubic, currentBossData,
    getPartyActions: () => partyActions, getActMenuLayout,
    getAttackMeterBounds, getCommandOptionRect, getItemMenuLayout,
    getItemTargetLayout, getPartyCommandCardRect, getPurpleLineYs,
    greenShieldRect, partySelectionCardRect, partySelectionBackRect,
    getEncounterRuntime: () => encounterRuntime
  });
  const {
    draw, drawBullet, drawHeartShape, drawRedHeart, drawPositionedEnemyBody, enemySpriteForKey,
    activeEnemySpriteKey, attackSpriteKey, captureEnemySprite,
    enemyDamagePopupPosition, enemySpriteBobOffset, enemySpritePosition,
    enemySpriteSize, triggerEnemyHitSprite
  } = presentation;

  partyActions = createPartyActions({
    state, enemyData, sounds, PHASE, BOX_RECT, clamp, createPlayerActs, currentBossData,
    FIGHT_QTE_MIN_DAMAGE_MULTIPLIER, FIGHT_QTE_CRIT_RADIUS_RATIO,
    FIGHT_QTE_FALLOFF_TRACK_RATIO, FIGHT_QTE_FALLOFF_POWER,
    playSound, stopCurrentMusic, activeEnemySpriteKey, enemyDamagePopupPosition,
    enemySpritePosition, enemySpriteSize, triggerEnemyHitSprite,
    advanceBattleDialog, beginDefeatDissolve, beginEnemyTurn, beginMenu,
    beginPhase2Transition, beginTeamMercyResolution,
    getEncounterRuntime: () => encounterRuntime
  });
  const {
    advancePartyTurnOrResolve, canAffordAct, canMercyCurrentEnemy,
    clearPartyCommand, consumePartyDamageGuard, currentActorActs,
    damageRandomLivingPlayer, damageSpellActorCenter, damageSpellEnemyCenter,
    fightQteLayoutForRow, grantEnemyPostFinaleActs, lockNextFightQteBar,
    lockPartyAction, partyIsDefeated, partyMemberParticipates, previousLivingPartyIndex,
    resetPartyCommands, resolveQueuedPartyActions, selectedActorAct,
    syncLegacyPlayerHP, updateDamageSpell, updateFightQte,
    updatePersistentEffect, updatePlayerEffect
  } = partyActions;

  encounterRuntime = createExtensionHost(enemyData, {
    state, enemyData, sounds, sprites, ctx, input, getMusicElapsed,
    playSound, playMusic, stopMusic, setMusicVolume, clamp, lerp, width: W, height: H,
    currentBossData,
    damageRandomLivingPlayer, currentAttackDamage, consumePartyDamageGuard, partyIsDefeated,
    beginPlayerDeath, drawHeartShape, drawRedHeart, drawBullet, drawPositionedEnemyBody,
    greenShieldRectAt, enemySpriteForKey
  });
  state.encounter = encounterRuntime.createState({ state }) || {};
  syncLegacyPlayerHP();
  resetPartyCommands();

  function currentBattleDialog() {
    const bossData = currentBossData();
    const battleDialog = bossData.battleDialog;
    const fallback = `* ${bossData.name} refuses to die.`;

    if (!Array.isArray(battleDialog) || battleDialog.length === 0) return fallback;

    if (!Number.isInteger(state.dialogIndex) || state.dialogIndex < 0) {
      state.dialogIndex = 0;
    }

    const index = Math.min(state.dialogIndex, battleDialog.length - 1);
    return battleDialog[index] || fallback;
  }

  function advanceBattleDialog() {
    const battleDialog = currentBossData().battleDialog;

    if (!Array.isArray(battleDialog) || battleDialog.length === 0) return;

    if (!Number.isInteger(state.dialogIndex) || state.dialogIndex < 0) {
      state.dialogIndex = 0;
    }

    if (!Number.isInteger(state.dialogIndexBeforeAdvance)) {
      state.dialogIndexBeforeAdvance = state.dialogIndex;
    }

    if (state.dialogIndex < battleDialog.length - 1) {
      state.dialogIndex++;
    }
  }

  function currentEnemyDialog() {
    const enemyDialog = currentBossData().enemyDialog;

    if (!Array.isArray(enemyDialog) || enemyDialog.length === 0) return null;
    if (!Number.isInteger(state.enemyDialogIndex) || state.enemyDialogIndex < 0) {
      state.enemyDialogIndex = 0;
    }
    if (state.enemyDialogIndex >= enemyDialog.length) return null;

    return enemyDialog[state.enemyDialogIndex] || null;
  }

  window.setUpcomingAttack = function setUpcomingAttack(number) {
    const turns = currentTurns();

    if (!Array.isArray(turns) || turns.length === 0) {
      console.warn("This enemy has no configured attacks.");
      return false;
    }

    if (!Number.isInteger(number) || number < 1 || number > turns.length) {
      console.warn(`Choose an attack number from 1 to ${turns.length}.`);
      return false;
    }

    const index = number - 1;
    const ultimateIndex = turns.findIndex((turn) =>
      normalizeTurn(turn).attack.type === ATTACK_TYPE.ULTIMATE
    );

    for (let priorIndex = 0; priorIndex < index; priorIndex++) {
      if (!normalizeTurn(turns[priorIndex]).loop) {
        state.consumedTurns.add(priorIndex);
      }
    }

    if (ultimateIndex !== -1 && index > ultimateIndex) {
      state.ultimate.transformed = true;

      for (let priorIndex = 0; priorIndex <= ultimateIndex; priorIndex++) {
        if (!normalizeTurn(turns[priorIndex]).loop) {
          state.consumedTurns.add(priorIndex);
        }
      }
    }

    state.pattern = (index + turns.length - 1) % turns.length;
    state.consumedTurns.delete(index);
    console.info(`Attack ${number} will run on the next enemy turn.`);
    return true;
  };

  window.setPartyTP = function setPartyTP(value) {
    if (!Number.isFinite(value)) {
      console.warn("Party TP must be set to a finite number.");
      return false;
    }

    state.tp = value;
    console.info(`Party TP set to ${value}.`);
    return true;
  };

  window.setEnemyHP = function setEnemyHP(value) {
    if (!Number.isFinite(value)) {
      console.warn("Enemy HP must be set to a finite number.");
      return false;
    }

    state.enemyHP = value;
    console.info(`Enemy HP set to ${value}.`);
    return true;
  };

  function selectNextTurn() {
    const turns = currentTurns();

    if (!Array.isArray(turns) || turns.length === 0) {
      state.pattern = (state.pattern + 1) % 5;
      return { attack: normalizeAttackPattern(null), event: null, loop: true };
    }

    for (let offset = 1; offset <= turns.length; offset++) {
      const index = (state.pattern + offset) % turns.length;

      if (state.consumedTurns.has(index)) continue;

      const rawTurn = turns[index];
      const turn = normalizeTurn(rawTurn);
      const repeated = state.seenTurns.has(index);
      state.pattern = index;
      state.seenTurns.add(index);
      encounterRuntime.onTurnSelected?.({ state, turnIndex: index, turnCount: turns.length,
        finale: rawTurn?.postFinaleTrigger === true });

      if (repeated && Number.isInteger(state.dialogIndexBeforeAdvance)) {
        state.dialogIndex = state.dialogIndexBeforeAdvance;
      }
      state.dialogIndexBeforeAdvance = null;

      if (!turn.loop) {
        state.consumedTurns.add(index);
      }

      return { ...turn, index, repeated };
    }

    return { attack: normalizeAttackPattern(null), event: null, loop: true };
  }

  function beginTurnEvent(event, onComplete) {
    state.turnEvent.steps = event.steps;
    state.turnEvent.index = -1;
    state.turnEvent.timer = 0;
    state.turnEvent.step = null;
    state.turnEvent.transformation = null;
    state.scene.config = null;
    state.scene.timer = 0;
    state.scene.onComplete = null;
    state.turnEvent.onComplete = typeof onComplete === "function" ? onComplete : beginEnemyDialog;
    advanceTurnEvent();
  }

  function currentTurnEventWithoutRepeatedDialog(event) {
    if (!event || !state.currentTurn?.repeated) return event;

    const steps = event.steps.filter((step) => (
      step.type !== "textbox" && step.type !== "enemyDialog"
    ));
    return steps.length > 0 ? { steps } : null;
  }

  function advanceTurnEvent() {
    state.turnEvent.index++;
    state.turnEvent.timer = 0;
    state.turnEvent.step = state.turnEvent.steps[state.turnEvent.index] || null;

    if (!state.turnEvent.step) {
      const onComplete = state.turnEvent.onComplete || beginEnemyDialog;
      state.turnEvent.onComplete = null;
      onComplete();
      return;
    }

    const step = state.turnEvent.step;
    state.phase = PHASE.TURN_EVENT;

    const scripting = () => ({
      state, ctx, sprites, sounds, playSound, spawnBullet, clamp, lerp, easeInOutCubic,
      width: W, height: H, timer: state.turnEvent.timer
    });

    if (step.type === "call") {
      step.run?.(scripting());
      advanceTurnEvent();
      return;
    }
    if (step.type === "choice") {
      const selectedSteps = chooseTimelineSteps(step);
      state.turnEvent.steps.splice(state.turnEvent.index, 1, ...selectedSteps);
      state.turnEvent.index--;
      advanceTurnEvent();
      return;
    }
    if (step.type === "custom") step.enter?.(scripting());

    if (step.type === "textbox") {
      state.box = { ...BOX_RECT.TEXT };
      state.message = step.text;
      state.textTimer = 0;
    } else if (step.type === "enemyDialog") {
      if (typeof step.sprite === "string") setEnemyTemporarySprite(step.sprite);
      state.enemyDialogMessage = step.text;
      state.enemyDialogTimer = 0;
    } else if (step.type === "enemyTransform") {
      beginTurnEventEnemyTransformation(step);
    } else if (step.type === "assignEnemyDefault") {
      assignEnemyDefaultSprite(step.sprite, step.lockDefault);
      advanceTurnEvent();
    }
  }

  function beginTurnEventEnemyTransformation(step) {
    const sourceKey = activeEnemySpriteKey();
    const targetKey = attackSpriteKey(step.sprite);
    const spriteSize = enemySpriteSize(sourceKey);
    const position = enemySpritePosition(spriteSize, sourceKey);

    state.box = { ...BOX_RECT.TEXT };
    state.message = "";
    state.textTimer = 0;
    state.turnEvent.transformation = {
      sourceKey,
      targetKey,
      spriteSize,
      pixelSize: 6,
      x: position.x,
      y: position.y + enemySpriteBobOffset(),
      releasedRows: 0,
      particles: [],
      source: captureEnemySprite(sourceKey, spriteSize),
      targetSource: captureEnemySprite(targetKey, spriteSize)
    };
    playSound(sounds.vaporized);
  }

  function beginEnemyTurn() {
    state.enemyDamageMarks = state.enemyDamageMarks
      .filter((mark) => !mark.active)
      .map((mark) => ({ ...mark, pending: false, active: true }));

    for (const player of state.party) {
      if (player.temporaryDamageBuffTurns <= 0) continue;

      player.temporaryDamageBuffTurns--;
      if (player.temporaryDamageBuffTurns === 0) {
        player.temporaryDamageMultiplier = 1;
      }
    }

    state.currentTurn = selectNextTurn();
    prepareEnemyAnimationForTurn(state.currentTurn.attack);

    if (state.currentTurn.scene) {
      beginTurnScene(state.currentTurn.scene, beginCurrentTurnAfterScene);
      return;
    }

    beginCurrentTurnAfterScene();
  }

  function beginCurrentTurnAfterScene() {
    beginEncounterInterlude(beginCurrentTurnContent);
  }

  function beginEncounterInterlude(onComplete) {
    const event = normalizeTurnEvent(encounterRuntime.beforeEnemyTurn?.({
      state,
      turn: state.currentTurn,
      turnIndex: state.currentTurn?.index
    }));
    if (event) beginTurnEvent(event, onComplete);
    else onComplete();
  }

  function beginCurrentTurnContent() {
    if (state.currentTurn.scene && state.currentTurn.scene.skipEnemyDialog) {
      beginEnemyAttack();
      return;
    }

    const event = currentTurnEventWithoutRepeatedDialog(state.currentTurn.event);
    if (event) {
      beginTurnEvent(
        event,
        state.currentTurn.repeated || state.currentTurn.skipEnemyDialog
          ? beginEnemyAttack
          : beginEnemyDialog
      );
      return;
    }

    if (state.currentTurn.repeated || state.currentTurn.skipEnemyDialog) {
      beginEnemyAttack();
    } else {
      beginEnemyDialog();
    }
  }

  function beginChainedEnemyTurn() {
    state.currentTurn = selectNextTurn();
    prepareEnemyAnimationForTurn(state.currentTurn.attack);

    if (state.currentTurn.scene) {
      beginTurnScene(state.currentTurn.scene, beginChainedTurnAfterScene);
      return;
    }

    beginChainedTurnAfterScene();
  }

  function beginChainedTurnAfterScene() {
    beginEncounterInterlude(beginChainedTurnContent);
  }

  function beginChainedTurnContent() {

    const event = currentTurnEventWithoutRepeatedDialog(state.currentTurn.event);
    if (event) {
      beginTurnEvent(event, beginEnemyAttack);
      return;
    }

    beginEnemyAttack();
  }

  function prepareEnemyAnimationForTurn(attack) {
    if (typeof attack.assignDefaultSprite === "string" && attack.assignDefaultSprite) {
      assignEnemyDefaultSprite(attack.assignDefaultSprite, attack.lockDefaultSprite);
    }

    state.enemySpriteKey = !state.enemyDefaultSpriteLocked && typeof attack.sprite === "string"
      ? attackSpriteKey(attack.sprite)
      : null;
  }

  function setEnemyTemporarySprite(sprite) {
    if (state.enemyDefaultSpriteLocked) return;
    state.enemySpriteKey = sprite === "default" ? null : attackSpriteKey(sprite);
  }

  function assignEnemyDefaultSprite(sprite, locked = false) {
    state.enemyDefaultSpriteKey = attackSpriteKey(sprite);
    state.enemyDefaultSpriteLocked = locked === true;
    state.enemySpriteKey = null;
    state.enemyHitSpriteUntil = 0;
  }

  function beginTurnScene(scene, onComplete) {
    state.phase = PHASE.SCENE;
    state.scene.config = scene;
    state.scene.timer = 0;
    state.scene.onComplete = typeof onComplete === "function" ? onComplete : beginCurrentTurnAfterScene;
    state.box = { ...BOX_RECT.TEXT };
    state.bullets = [];
    state.message = "";
    state.textTimer = 0;

    if (typeof scene.setup === "function") {
      scene.setup({
        state,
        sprites,
        sounds,
        playSound
      });
    }
  }

  function baseEnemyDialogDuration(line) {
    return Math.max(180, Math.ceil(String(line || "").length / 1.25) + 120);
  }

  function beginEnemyDialog() {
    const line = currentEnemyDialog();

    if (!line) {
      beginEnemyAttack();
      return;
    }

    state.phase = PHASE.ENEMY_DIALOG;
    state.box = { ...BOX_RECT.TEXT };
    state.enemyDialogMessage = line;
    state.enemyDialogTimer = 0;
    state.enemyDialogDuration = scaleEnemyDialogDuration(baseEnemyDialogDuration(line));
    state.enemyDialogOnComplete = null;
    state.enemyDialogIndex++;
  }

  function beginAttackEnemyDialog(line, onComplete = beginEnemyAttack) {
    state.phase = PHASE.ENEMY_DIALOG;
    state.box = { ...BOX_RECT.TEXT };
    state.enemyDialogMessage = line;
    state.enemyDialogTimer = 0;
    state.enemyDialogDuration = scaleEnemyDialogDuration(baseEnemyDialogDuration(line));
    state.enemyDialogOnComplete = typeof onComplete === "function" ? onComplete : beginEnemyAttack;
  }

  function scaleEnemyDialogDuration(duration) {
    const multiplier = currentBossData().enemyDialogDurationMultiplier;
    return Math.ceil(duration * (Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1));
  }

  function beginMenu(message, { resetCommands = true } = {}) {
    grantEnemyPostFinaleActs();
    state.phase = PHASE.MENU;
    state.commandHudAnimationStartFrame = state.frame;
    state.box = { ...BOX_RECT.TEXT };
    state.message = typeof message === "string" ? message : currentBattleDialog();
    state.textTimer = 0;
    state.bullets = [];
    state.attackType = ATTACK_TYPE.NORMAL;
    state.enemySpriteKey = null;
    state.attack.active = false;
    state.attack.result = null;
    state.attack.damage = 0;
    state.soul.x = state.box.x + state.box.w / 2;
    state.soul.y = state.box.y + state.box.h / 2;
    state.soul.lane = 1;
    state.soul.vy = 0;
    if (resetCommands) {
      for (const player of state.party) {
        player.runtime?.onRoundStart?.({ player, state });
      }
      resetPartyCommands();
      encounterRuntime.prepareRoundCommands?.({ state, commandCount: menuItems.length });
    }
  }

  function beginBoxMorph(to, nextPhase, onComplete) {
    state.phase = PHASE.BOX_MORPH;
    state.boxMorph = {
      timer: 0,
      duration: nextPhase === PHASE.ENEMY ? 34 : 18,
      from: { ...state.box },
      to: { ...to },
      nextPhase,
      onComplete: typeof onComplete === "function" ? onComplete : null,
    };
  }

  function finishBoxMorph() {
    const morph = state.boxMorph;

    state.box = { ...morph.to };
    state.phase = morph.nextPhase;

    if (typeof morph.onComplete === "function") {
      morph.onComplete();
    }

    morph.onComplete = null;
  }

  function beginItemSelection() {
    state.phase = PHASE.ITEM;
    state.box = { ...BOX_RECT.TEXT };
    state.selectedItem = clamp(state.selectedItem, 0, Math.max(0, state.inventory.length - 1));
    state.selectedItemTarget = state.partyTurnIndex;
    state.textTimer = 0;
  }

  function beginItemTargetSelection() {
    state.phase = PHASE.ITEM_TARGET;
    state.box = { ...BOX_RECT.TEXT };
    state.selectedItemTarget = clamp(state.selectedItemTarget, 0, Math.max(0, state.party.length - 1));
    state.textTimer = 0;
  }

  function beginActSelection() {
    const acts = currentActorActs();

    state.phase = PHASE.ACT;
    state.box = { ...BOX_RECT.TEXT };
    state.selectedAct = clamp(state.selectedAct, 0, Math.max(0, acts.length - 1));
    state.selectedActTarget = state.partyTurnIndex;
    state.selectedActEnemyTarget = 0;
    state.textTimer = 0;
  }

  function beginActTargetSelection() {
    state.phase = PHASE.ACT_TARGET;
    state.box = { ...BOX_RECT.TEXT };
    state.selectedActTarget = clamp(state.selectedActTarget, 0, Math.max(0, state.party.length - 1));
    state.textTimer = 0;
  }

  function beginActEnemyTargetSelection() {
    state.phase = PHASE.ACT_ENEMY_TARGET;
    state.box = { ...BOX_RECT.TEXT };
    state.selectedActEnemyTarget = 0;
    state.textTimer = 0;
  }

  function beginFightTargetSelection() {
    state.phase = PHASE.FIGHT_TARGET;
    state.box = { ...BOX_RECT.TEXT };
    state.selectedFightTarget = 0;
    state.textTimer = 0;
  }

  function beginMercyTargetSelection() {
    state.phase = PHASE.MERCY_TARGET;
    state.box = { ...BOX_RECT.TEXT };
    state.selectedMercyTarget = 0;
    state.textTimer = 0;
  }

  function beginAttack() {
    const meter = getAttackMeterBounds();

    state.phase = PHASE.ATTACK;
    state.box = { ...BOX_RECT.TEXT };
    state.attack.markerX = meter.trackStart;
    state.attack.direction = 1;
    state.attack.speed = 14.72;
    state.attack.active = true;
    state.attack.result = null;
    state.attack.damage = 0;
    state.attack.flash = 0;
  }

  function beginPhase2Transition() {
    const phase2 = enemyData.phase2;

    if (!phase2) return false;

    stopCurrentMusic();

    state.phase = PHASE.PHASE_TRANSITION;
    state.phase2Started = true;
    state.enemyHP = 0;
    state.pattern = -1;
    state.currentTurn = null;
    state.enemyPostFinaleReached = false;
    state.consumedTurns.clear();
    state.seenTurns.clear();
    state.dialogIndexBeforeAdvance = null;
    state.bullets = [];
    state.message = phase2.transitionMessage || "* The music cuts out.";
    state.textTimer = 0;
    state.hpFillTarget = state.enemyMaxHP;
    state.hpFillSpeed = Number.isFinite(phase2.hpFillSpeed) ? phase2.hpFillSpeed : 1.35;
    state.phaseTransition = {
      timer: 0,
      fadeOutDuration: Number.isFinite(phase2.fadeOutDuration) ? phase2.fadeOutDuration : 90,
      holdDuration: Number.isFinite(phase2.holdDuration) ? phase2.holdDuration : 150,
      fadeInDuration: Number.isFinite(phase2.fadeInDuration) ? phase2.fadeInDuration : 100,
      refillMessageMinDuration: Number.isFinite(phase2.refillMessageMinDuration) ? phase2.refillMessageMinDuration : 180,
      refillMessageTimer: 0,
      refillStarted: false,
    };

    return true;
  }

  function finishPhase2Transition() {
    const phase2 = enemyData.phase2 || {};

    state.enemyHP = state.enemyMaxHP;
    state.phase = PHASE.MESSAGE;
    state.message = phase2.startMessage || "* Phase 2 begins.";
    state.textTimer = 0;

    playMusic(sounds.phase2Theme);
    setTimeout(beginEnemyTurn, 2200);
  }

  function resolveAttack() {
    if (!state.attack.active) return;

    const meter = getAttackMeterBounds();
    const center = meter.center;
    const dist = Math.abs(state.attack.markerX - center);
    const maxDist = meter.maxDist;
    const accuracy = Math.max(0, 1 - dist / maxDist);
    const damage = Math.max(1, Math.round(6 + accuracy * accuracy * 28));
    const fromHP = state.enemyHP;
    const toHP = Math.max(0, state.enemyHP - damage);
    const shouldLastStand = !state.lastStand.used && enemyData.lastStandAttack && toHP <= 0 && fromHP > 0;
    const resolvedDamage = shouldLastStand ? Math.max(0, fromHP - 1) : damage;
    const resolvedToHP = shouldLastStand ? 1 : toHP;

    state.attack.damage = resolvedDamage;
    state.attack.result = accuracy > 0.82 ? "CRITICAL" : accuracy > 0.45 ? "HIT" : "WEAK";
    state.attack.active = false;
    state.attack.flash = 22;
    playSound(sounds.attackLand);
    advanceBattleDialog();
    state.message = "";
    state.enemyDialogMessage = "";
    state.textTimer = 0;

    if (shouldLastStand) {
      beginLastStandEvent({
        fromHP,
        toHP: resolvedToHP,
        damage: resolvedDamage,
        attack: enemyData.lastStandAttack
      });
      return;
    }

    beginDamageResult({
      fromHP,
      toHP: resolvedToHP,
      damage: resolvedDamage
    });
  }

  function beginDamageResult({ fromHP, toHP, damage }) {
    state.phase = PHASE.DAMAGE_RESULT;
    state.message = "";
    state.enemyDialogMessage = "";
    state.textTimer = 0;
    state.damageResult = {
      timer: 0,
      duration: 105,
      dropStart: 20,
      fromHP,
      toHP,
      damage,
    };
  }

  function beginLastStandEvent({ fromHP, toHP, damage, attack }) {
    state.phase = PHASE.LAST_STAND_EVENT;
    state.box = { ...BOX_RECT.TEXT };
    state.message = typeof enemyData.lastStandMessage === "string"
      ? enemyData.lastStandMessage
      : "* The enemy refuses to fall.";
    state.textTimer = 0;
    state.lastStand = {
      used: true,
      pendingAttack: normalizeAttackPattern(attack),
      activeAttack: false,
      timer: 0,
      flashDuration: 42,
      messageDuration: 135,
      damage,
      fromHP,
      toHP
    };
  }

  function finishDamageResult() {
    state.enemyHP = state.damageResult.toHP;

    if (state.lastStand.pendingAttack) {
      state.currentTurn = {
        attack: state.lastStand.pendingAttack,
        event: null,
        postAttackEvent: null,
        loop: false
      };
      state.lastStand.pendingAttack = null;
      state.lastStand.activeAttack = true;
      beginEnemyAttack();
      return;
    }

    if (state.enemyHP <= 0) {
      if (!state.phase2Started && beginPhase2Transition()) {
        return;
      }

      stopCurrentMusic();
      beginDefeatDissolve();
      return;
    }

    state.phase = PHASE.MESSAGE;
    state.message = currentBattleDialog();
    state.textTimer = 0;
    beginEnemyTurn();
  }

  function beginPlayerDeath() {
    if (state.phase === PHASE.LOSE) return;

    stopCurrentMusic();
    state.phase = PHASE.LOSE;
    state.message = "";
    state.bullets = [];
    state.attack.active = false;
    state.attack.flash = 0;
    state.box = { ...BOX_RECT.TEXT };
    state.death = {
      timer: 0,
      determinationStarted: false,
      x: state.soul.x,
      y: state.soul.y,
      color: currentSoulColor(),
      pieces: []
    };
  }

  function currentSoulColor() {
    return defense.soulColor(state.attackType);
  }

  function beginEnemyAttack() {
    for (const player of state.party) {
      player.actionSpriteRole = null;
    }

    state.bullets = [];
    state.soul.invuln = 0;
    state.grazeGlow = 0;
    encounterRuntime.resetAttack?.({ state });
    const attackConfig = currentAttackConfig();
    const warmup = Number.isFinite(attackConfig.warmup)
      ? attackConfig.warmup
      : state.enemyWarmup;
    state.enemyTimer = -warmup;

    state.attackType = attackConfig.type;
    state.encounter.defense = null;
    state.enemyDuration = Number.isFinite(attackConfig.duration) ? attackConfig.duration : 640;
    state.message = "";
    state.textTimer = 0;

    if (state.attackType === ATTACK_TYPE.ULTIMATE && !state.ultimate.transformed) {
      state.phase = PHASE.ULTIMATE_TRANSITION;
      state.ultimate.timer = 0;
      return;
    }

    if (
      !state.currentTurn?.repeated &&
      typeof attackConfig.enemyDialog === "string" &&
      attackConfig.enemyDialog
    ) {
      const line = attackConfig.enemyDialog;
      attackConfig.enemyDialog = null;
      beginAttackEnemyDialog(line, beginDefenseBoxMorph);
      return;
    }

    beginDefenseBoxMorph();
  }

  function beginDefenseBoxMorph() {
    const attackConfig = currentAttackConfig();
    const defenseBox = defense.boxFor(state.attackType, attackConfig.box);

    const beginDefense = () => {
      defense.placeSoul(state, getPurpleLineYs());

      const attackConfig = currentAttackConfig();

      if (typeof attackConfig.setup === "function") {
        attackConfig.setup({
          box: state.box,
          state,
          spawnBullet,
          playSound,
          sounds
        });
      }

      if (attackConfig.mechanic) encounterRuntime.beginDefenseMechanic?.(attackConfig.mechanic);
    };

    if (attackConfig.instantBox) {
      state.box = { ...defenseBox };
      state.phase = PHASE.ENEMY;
      beginDefense();
      return;
    }

    beginBoxMorph(defenseBox, PHASE.ENEMY, beginDefense);
  }

  function updateUltimateTransition() {
    const transition = state.ultimate;
    const swapTime = transition.fadeOutDuration + transition.holdDuration;
    const finishTime = swapTime + transition.fadeInDuration;

    transition.timer++;

    if (!transition.transformed && transition.timer >= swapTime) {
      transition.transformed = true;
    }

    if (transition.timer >= finishTime) {
      const attackConfig = currentAttackConfig();

      if (
        !state.currentTurn?.repeated &&
        typeof attackConfig.enemyDialog === "string" &&
        attackConfig.enemyDialog
      ) {
        const line = attackConfig.enemyDialog;
        attackConfig.enemyDialog = null;
        beginAttackEnemyDialog(line, beginDefenseBoxMorph);
        return;
      }

      beginDefenseBoxMorph();
    }
  }

  function useMenuSelection() {
    const command = menuItems[state.selected];
    const actingIndex = state.partyTurnIndex;
    const actingPlayer = state.party[actingIndex];

    if (!actingPlayer || actingPlayer.hp <= 0 || !partyMemberParticipates(actingPlayer, actingIndex)) return;
    if (encounterRuntime.isCommandDisabled?.({ state, partyIndex: actingIndex, commandIndex: state.selected })) {
      state.message = `* ${actingPlayer.name}'s ${command} command is corrupted.`;
      state.textTimer = 0;
      return;
    }

    if (command === "ITEM") {
      beginItemSelection();
      return;
    }

    if (command === "FIGHT") {
      beginFightTargetSelection();
      return;
    }

    if (command === "ACT") {
      beginActSelection();
      return;
    }

    lockPartyAction(actingIndex, command);
    advancePartyTurnOrResolve();
  }

  function useSelectedAct() {
    const act = selectedActorAct();

    if (!act) return;
    if (!canAffordAct(act)) return;

    if (act.target === "ally") {
      beginActTargetSelection();
      return;
    }

    if (act.target === "enemy") {
      beginActEnemyTargetSelection();
      return;
    }

    lockSelectedActAction(null);
  }

  function lockSelectedActAction(targetIndex) {
    const act = selectedActorAct();

    if (!act || !canAffordAct(act)) return;
    if (Number.isInteger(targetIndex) && !partyMemberParticipates(state.party[targetIndex], targetIndex)) return;

    state.tp = clamp(state.tp - act.tpCost, 0, 100);
    const actor = state.party[state.partyTurnIndex];
    if (actor) actor.hp = clamp(actor.hp - act.hpCost, 0, actor.maxHP);

    lockPartyAction(state.partyTurnIndex, "ACT", {
      act,
      tpCost: act.tpCost,
      hpCost: act.hpCost,
      targetIndex: Number.isInteger(targetIndex) ? targetIndex : null
    });

    if (act.teamAction) {
      resolveQueuedPartyActions();
      return;
    }

    advancePartyTurnOrResolve();
  }

  function lockSelectedFightAction(targetIndex) {
    lockPartyAction(state.partyTurnIndex, "FIGHT", {
      targetIndex: Number.isInteger(targetIndex) ? targetIndex : 0
    });

    advancePartyTurnOrResolve();
  }

  function useSelectedItem() {
    if (state.inventory.length === 0) return;

    const item = state.inventory[state.selectedItem];
    if (!item) return;

    if (item.target === "ally") {
      beginItemTargetSelection();
      return;
    }

    lockSelectedItemAction(null);
  }

  function lockSelectedItemAction(targetIndex) {
    const itemIndex = state.selectedItem;
    const item = state.inventory[itemIndex];

    if (!item) return;
    if (Number.isInteger(targetIndex) && !partyMemberParticipates(state.party[targetIndex], targetIndex)) return;

    state.inventory.splice(itemIndex, 1);
    state.selectedItem = clamp(state.selectedItem, 0, Math.max(0, state.inventory.length - 1));

    lockPartyAction(state.partyTurnIndex, "ITEM", {
      item,
      itemIndex,
      itemReserved: true,
      targetIndex: Number.isInteger(targetIndex) ? targetIndex : null
    });

    advancePartyTurnOrResolve();
  }

  function resolveMercy() {
    const bossData = currentBossData();
    const success = canMercyCurrentEnemy();

    state.phase = PHASE.MERCY_MESSAGE;
    state.message = success ? bossData.mercySuccess : bossData.mercyFailure;
    state.textTimer = 0;
    state.mercy.timer = 0;
    state.mercy.success = success;
  }

  function beginTeamMercyResolution() {
    const bossData = currentBossData();
    encounterRuntime.stopSystemGlitching?.({ state });
    state.bullets = [];
    state.phase = PHASE.ENEMY_DIALOG;
    state.box = { ...BOX_RECT.TEXT };
    state.message = bossData.teamMercyMessage || bossData.mercySuccess || "* The party found another way forward.";
    state.textTimer = 0;
    state.enemyDialogMessage = bossData.teamMercyEnemyDialog || bossData.systemPatchEnemyDialog || "...";
    state.enemyDialogTimer = 0;
    state.enemyDialogDuration = 105;
    state.enemyDialogOnComplete = () => {
      stopCurrentMusic();
      state.phase = PHASE.MERCY_FADE;
      state.mercy.timer = 0;
      state.mercy.success = true;
      state.mercy.winMessage = bossData.mercyWinMessage;
      state.mercy.fadeDuration = Number.isFinite(bossData.teamMercyFadeDuration)
        ? bossData.teamMercyFadeDuration
        : Number.isFinite(bossData.systemPatchMercyFadeDuration)
          ? bossData.systemPatchMercyFadeDuration
          : 150;
      state.mercy.keepUiDuringFade = true;
    };
  }

  function updateMercyMessage() {
    state.mercy.timer++;

    if (state.mercy.timer < state.mercy.messageDuration) return;

    if (!state.mercy.success) {
      advanceBattleDialog();
      beginEnemyTurn();
      return;
    }

    stopCurrentMusic();
    state.phase = PHASE.MERCY_FADE;
    state.mercy.timer = 0;
  }

  function updateMercyFade() {
    state.mercy.timer++;

    if (state.mercy.timer < state.mercy.fadeDuration) return;

    state.phase = PHASE.SPARED;
    state.message = state.mercy.winMessage || currentBossData().mercyWinMessage;
    state.mercy.winMessage = null;
    state.mercy.keepUiDuringFade = false;
    state.mercy.fadeDuration = 90;
  }

  function beginDefeatDissolve() {
    const dissolve = state.defeatDissolve;
    const bossData = currentBossData();
    const customSequence = bossData.defeatSequence || enemyData.defeatSequence;
    const configuredInitialSprite = customSequence?.initialSprite;
    const initialSpriteKey = typeof configuredInitialSprite === "string" && sprites[configuredInitialSprite]
      ? configuredInitialSprite
      : activeEnemySpriteKey();
    const configuredHitSprite = currentBossData().hitSprite || enemyData.hitSprite;
    const hitSpriteKey = typeof configuredHitSprite === "string" && sprites[configuredHitSprite]
      ? configuredHitSprite
      : activeEnemySpriteKey();
    const spriteKey = customSequence ? initialSpriteKey : hitSpriteKey;
    const spriteSize = enemySpriteSize(spriteKey);
    const spritePosition = enemySpritePosition(spriteSize, spriteKey);

    state.phase = PHASE.DEFEAT_DISSOLVE;
    state.box = { ...BOX_RECT.TEXT };
    state.message = bossData.winMessage || enemyData.winMessage;
    state.enemyDialogMessage = customSequence
      ? ""
      : bossData.defeatDialog || enemyData.defeatDialog || "...";
    state.enemyDialogTimer = 0;
    dissolve.timer = 0;
    dissolve.spriteSize = spriteSize;
    dissolve.spriteX = spritePosition.x;
    dissolve.spriteTop = spritePosition.y + enemySpriteBobOffset();
    dissolve.spriteKey = spriteKey;
    dissolve.started = false;
    dissolve.releasedRows = 0;
    dissolve.particles = [];
    dissolve.custom = customSequence && typeof customSequence === "object" ? customSequence : null;
    dissolve.speechSpriteKey = spriteKey;
    dissolve.source = dissolve.custom
      ? null
      : captureEnemySprite(dissolve.spriteKey, dissolve.spriteSize);

    dissolve.custom?.setup?.({
      state,
      dissolve,
      sprites,
      sounds,
      playSound,
      width: W,
      height: H
    });
  }

  function updateDefeatDissolve() {
    const dissolve = state.defeatDissolve;
    if (dissolve.custom) {
      dissolve.custom.update?.({
        state,
        dissolve,
        timer: dissolve.timer,
        sprites,
        sounds,
        playSound,
        width: W,
        height: H
      });
      dissolve.timer++;

      const duration = Number.isFinite(dissolve.custom.duration)
        ? dissolve.custom.duration
        : dissolve.dialogDuration;
      if (dissolve.timer >= duration) {
        dissolve.custom = null;
        dissolve.particles = [];
        dissolve.source = null;
        dissolve.speechSpriteKey = null;
        state.enemyDialogMessage = "";
        state.phase = PHASE.WIN;
      }
      return;
    }

    const rowCount = Math.ceil(dissolve.spriteSize / dissolve.pixelSize);
    const dissolveTimer = Math.max(0, dissolve.timer - dissolve.dialogDuration);
    const progress = clamp(dissolveTimer / dissolve.dissolveDuration, 0, 1);
    const targetRows = Math.floor(easeInOutCubic(progress) * rowCount);

    state.enemyDialogTimer = Math.min(dissolve.timer, dissolve.dialogDuration);

    if (!dissolve.started && dissolve.timer >= dissolve.dialogDuration) {
      dissolve.started = true;
      playSound(sounds.vaporized);
    }

    if (dissolve.started) {
      while (dissolve.releasedRows < targetRows) {
        releaseDissolveRow(dissolve.releasedRows);
        dissolve.releasedRows++;
      }
    }

    updateDissolveParticles(dissolve);
    dissolve.timer++;

    if (
      dissolve.timer >=
      dissolve.dialogDuration + dissolve.dissolveDuration + dissolve.particleTailDuration
    ) {
      dissolve.particles = [];
      dissolve.source = null;
      state.enemyDialogMessage = "";
      state.phase = PHASE.WIN;
    }
  }

  function updateDissolveParticles(dissolve) {
    for (const particle of dissolve.particles) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vx += particle.drift;
      particle.vy -= 0.008;
      particle.life--;
    }

    dissolve.particles = dissolve.particles.filter((particle) => particle.life > 0);
  }

  function releaseDissolveRow(row, dissolve = state.defeatDissolve) {
    const source = dissolve.source;
    const size = dissolve.pixelSize;
    const y = row * size;

    if (!source || y >= dissolve.spriteSize) return;

    let pixels;

    try {
      pixels = source.getContext("2d").getImageData(0, y, dissolve.spriteSize, Math.min(size, dissolve.spriteSize - y)).data;
    } catch (err) {
      return;
    }

    for (let x = 0; x < dissolve.spriteSize; x += size) {
      const sampleX = Math.min(dissolve.spriteSize - 1, x + Math.floor(size / 2));
      const sampleY = Math.min(size - 1, Math.floor(size / 2));
      const index = (sampleY * dissolve.spriteSize + sampleX) * 4;
      const alpha = pixels[index + 3];

      if (alpha < 28) continue;

      const life = 32 + Math.floor(Math.random() * 35);

      dissolve.particles.push({
        x,
        y,
        size: size * (0.7 + Math.random() * 0.65),
        color: `rgba(${pixels[index]},${pixels[index + 1]},${pixels[index + 2]},${alpha / 255})`,
        vx: (Math.random() - 0.5) * 1.35,
        vy: -0.18 - Math.random() * 0.8,
        drift: (Math.random() - 0.5) * 0.025,
        life,
        maxLife: life,
      });
    }
  }

  function spawnBullet(b) {
    const bullet = {
      x: b.x,
      y: b.y,
      vx: 0,
      vy: 0,
      r: 7,
      type: "dot",
      life: 999,
      angle: 0,
      spin: 0,
      harmless: false,
      damageOnlyWhileMoving: false,
      damageOnlyWhileStill: false,
      age: 0,
      update: null,
      ...b
    };

    state.bullets.push(bullet);
    return bullet;
  }

  function updateEnemyDialog() {
    state.enemyDialogTimer++;

    if (state.enemyDialogTimer >= state.enemyDialogDuration) {
      finishEnemyDialog();
    }
  }

  function finishEnemyDialog() {
    const onComplete = state.enemyDialogOnComplete || beginEnemyAttack;
    state.enemyDialogOnComplete = null;
    onComplete();
  }

  function skipActiveEnemyDialog() {
    if (state.phase === PHASE.ENEMY_DIALOG) {
      finishEnemyDialog();
      return true;
    }

    if (
      state.phase === PHASE.TURN_EVENT &&
      state.turnEvent.step &&
      state.turnEvent.step.type === "enemyDialog"
    ) {
      advanceTurnEvent();
      return true;
    }

    if (
      state.phase === PHASE.DEFEAT_DISSOLVE &&
      state.defeatDissolve.custom &&
      state.defeatDissolve.custom.advance?.({
        state,
        dissolve: state.defeatDissolve,
        timer: state.defeatDissolve.timer
      }) === true
    ) {
      return true;
    }

    if (
      state.phase === PHASE.DEFEAT_DISSOLVE &&
      state.defeatDissolve.timer < state.defeatDissolve.dialogDuration
    ) {
      state.defeatDissolve.timer = state.defeatDissolve.dialogDuration;
      state.enemyDialogTimer = state.defeatDissolve.dialogDuration;
      return true;
    }

    return false;
  }

  function updateTurnEvent() {
    const step = state.turnEvent.step;

    if (!step) {
      beginEnemyDialog();
      return;
    }

    state.turnEvent.timer++;

    if (step.type === "custom" && step.update?.({
      state, ctx, sprites, sounds, playSound, spawnBullet, clamp, lerp, easeInOutCubic,
      width: W, height: H, timer: state.turnEvent.timer
    }) === true) {
      step.exit?.({ state, timer: state.turnEvent.timer });
      advanceTurnEvent();
      return;
    }

    const defaultDuration = step.type === "enemyDialog"
      ? baseEnemyDialogDuration(step.text)
      : step.type === "flash"
        ? 42
        : step.type === "enemyTransform"
          ? 112
          : step.type === "wait" || step.type === "custom"
            ? 240
            : Math.max(120, Math.ceil(step.text.length / 1.25) + 60);
    const unscaledDuration = Number.isFinite(step.duration) ? step.duration : defaultDuration;
    const duration = step.type === "enemyDialog"
      ? scaleEnemyDialogDuration(unscaledDuration)
      : unscaledDuration;

    if (step.type === "enemyTransform") {
      updateTurnEventEnemyTransformation(duration);
    }

    if (state.turnEvent.timer >= duration) {
      if (step.type === "custom") step.exit?.({ state, timer: state.turnEvent.timer });
      if (step.type === "enemyTransform" && state.turnEvent.transformation) {
        if (step.assignDefault) {
          assignEnemyDefaultSprite(step.sprite, step.lockDefault);
        } else {
          state.enemySpriteKey = state.turnEvent.transformation.targetKey;
        }
        state.turnEvent.transformation = null;
      }
      advanceTurnEvent();
    }
  }

  function updateTurnEventEnemyTransformation(duration) {
    const transformation = state.turnEvent.transformation;
    if (!transformation) return;

    const rowCount = Math.ceil(transformation.spriteSize / transformation.pixelSize);
    const progress = clamp(state.turnEvent.timer / duration, 0, 1);
    const targetRows = Math.floor(easeInOutCubic(progress) * rowCount);
    while (transformation.releasedRows < targetRows) {
      releaseDissolveRow(transformation.releasedRows, transformation);
      transformation.releasedRows++;
    }
    updateDissolveParticles(transformation);
  }

  function updateScene() {
    const scene = state.scene.config;

    if (!scene) {
      beginCurrentTurnAfterScene();
      return;
    }

    if (typeof scene.update === "function") {
      scene.update({
        state,
        timer: state.scene.timer,
        sprites,
        sounds,
        playSound,
        spawnBullet
      });
    }

    state.scene.timer++;

    const duration = Number.isFinite(scene.duration) ? scene.duration : 240;

    if (state.scene.timer >= duration) {
      const onComplete = state.scene.onComplete || beginCurrentTurnAfterScene;
      state.scene.config = null;
      state.scene.onComplete = null;
      state.scene.timer = 0;
      onComplete();
    }
  }

  function partySelectionCardRect(index) {
    return { x: 58, y: 166 + index * 64, w: 202, h: 54 };
  }

  function partySelectionBackRect() {
    return { x: 48, y: 52, w: 104, h: 34 };
  }

  function pointInRect(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  function partySelectionHit(x, y) {
    const roster = Array.isArray(window.PLAYER_DATA) ? window.PLAYER_DATA : [];

    for (let i = 0; i < roster.length; i++) {
      const card = partySelectionCardRect(i);
      if (pointInRect(x, y, card)) return i;
    }

    return -1;
  }

  function movePartySelectionCursor(direction) {
    const roster = Array.isArray(window.PLAYER_DATA) ? window.PLAYER_DATA : [];
    if (roster.length === 0) return;

    let next = state.partySelection.cursor;

    for (let i = 0; i < roster.length; i++) {
      next = (next + direction + roster.length) % roster.length;
      if (!state.partySelection.picks.includes(next)) {
        state.partySelection.cursor = next;
        playSound(sounds.menuMove);
        return;
      }
    }
  }

  function choosePartySelection(index) {
    const roster = Array.isArray(window.PLAYER_DATA) ? window.PLAYER_DATA : [];
    if (!roster[index] || state.partySelection.picks.includes(index)) return;

    state.partySelection.cursor = index;
    state.partySelection.picks.push(index);
    state.partySelection.pickFrames[index] = state.frame;
    playSound(sounds.menuSelect);

    if (state.partySelection.picks.length === 3) {
      state.partySelection.completeFrame = state.frame;
      return;
    }

    movePartySelectionCursor(1);
  }

  function finishPartySelection() {
    const roster = Array.isArray(window.PLAYER_DATA) ? window.PLAYER_DATA : [];
    const selectedPlayers = state.partySelection.picks.map((rosterIndex) => roster[rosterIndex]);
    if (selectedPlayers.length !== 3 || selectedPlayers.some((player) => !player)) return;
    savePartySelection(selectedPlayers);
    state.party = createParty(selectedPlayers);
    canvas.style.cursor = "default";
    syncLegacyPlayerHP();
    resetPartyCommands();
    playMusic(sounds.battleTheme);
    beginMenu();
  }

  function updatePartySelection({ confirm, cancel, left, right, up, down, mouseClick, mousePosition }) {
    const backRect = partySelectionBackRect();
    state.partySelection.hovered = mousePosition
      ? partySelectionHit(mousePosition.x, mousePosition.y)
      : -1;
    state.partySelection.backHovered = Boolean(
      mousePosition && pointInRect(mousePosition.x, mousePosition.y, backRect)
    );
    canvas.style.cursor = state.partySelection.hovered === -1 && !state.partySelection.backHovered
      ? "default"
      : "pointer";

    if (
      Number.isFinite(state.partySelection.completeFrame) &&
      state.frame - state.partySelection.completeFrame >= PARTY_FLAG_SLIDE_FRAMES
    ) {
      finishPartySelection();
      return;
    }

    if (cancel && state.partySelection.picks.length === 0) {
      stopCurrentMusic();
      requestEncounterSelection();
      return;
    }

    if (cancel && state.partySelection.picks.length > 0) {
      const removed = state.partySelection.picks.pop();
      state.partySelection.cursor = removed;
      delete state.partySelection.pickFrames[removed];
      state.partySelection.completeFrame = null;
      playSound(sounds.menuMove);
      return;
    }

    if (mouseClick) {
      if (pointInRect(mouseClick.x, mouseClick.y, backRect)) {
        playSound(sounds.menuSelect);
        stopCurrentMusic();
        requestEncounterSelection();
        return;
      }
      const hit = partySelectionHit(mouseClick.x, mouseClick.y);
      if (hit !== -1) choosePartySelection(hit);
      return;
    }

    if (left || up) movePartySelectionCursor(-1);
    if (right || down) movePartySelectionCursor(1);
    if (confirm) choosePartySelection(state.partySelection.cursor);
  }

  function savePartySelection(players) {
    const names = players.map((player) => player.name);
    lastPartySelectionNames = names;

    try {
      sessionStorage.setItem(PARTY_SESSION_KEY, JSON.stringify(names));
    } catch (error) {
      // The in-memory copy still supports retry when storage is unavailable.
    }
  }

  function loadPartySelection() {
    try {
      const stored = JSON.parse(sessionStorage.getItem(PARTY_SESSION_KEY));
      if (Array.isArray(stored) && stored.length === 3) return stored;
    } catch (error) {
      // Fall back to the in-memory selection below.
    }

    return lastPartySelectionNames;
  }

  function restartWithPreviousParty() {
    const roster = Array.isArray(window.PLAYER_DATA) ? window.PLAYER_DATA : [];
    const names = loadPartySelection();
    const selectedPlayers = names.map((name) => roster.find((player) => player.name === name)).filter(Boolean);

    resetGame();

    if (selectedPlayers.length !== 3 || new Set(selectedPlayers).size !== 3) return;

    state.partySelection.picks = selectedPlayers.map((player) => roster.indexOf(player));
    state.party = createParty(selectedPlayers);
    syncLegacyPlayerHP();
    resetPartyCommands();
    playMusic(sounds.battleTheme);
    beginMenu();
  }

  function update() {
    encounterRuntime.update?.({ state });

    if (state.phase === PHASE.BOX_MORPH) {
      updateBoxMorph();
      input.consume();
      return;
    }

    state.frame++;
    for (const player of state.party) player.runtime?.update?.({ player, state });

    if (state.textTimer < 9999) state.textTimer++;
    if (state.shake > 0) state.shake--;
    if (state.redShieldGlow > 0) state.redShieldGlow--;

    const confirm = input.confirm;
    const cancel = input.cancel;
    const enter = input.enter;
    const escape = input.escape;
    const left = input.left;
    const right = input.right;
    const up = input.up;
    const down = input.down;
    const mouseClick = input.mouseClick;
    const mousePosition = input.mousePosition;

    if (enter && skipActiveEnemyDialog()) {
      playSound(sounds.menuSelect);
    } else if (state.phase === PHASE.INTRO) {
      updatePartySelection({ confirm, cancel, left, right, up, down, mouseClick, mousePosition });
    } else if (state.phase === PHASE.MENU) {
      if (cancel) {
        const previousIndex = previousLivingPartyIndex(state.partyTurnIndex);

        if (previousIndex !== -1) {
          state.partyTurnIndex = previousIndex;
          clearPartyCommand(previousIndex);
          state.selected = 0;
          playSound(sounds.menuMove);
        }
      } else if (left) {
        state.selected = (state.selected + menuItems.length - 1) % menuItems.length;
        playSound(sounds.menuMove);
      }

      if (right) {
        state.selected = (state.selected + 1) % menuItems.length;
        playSound(sounds.menuMove);
      }

      if (mouseClick) {
        const idx = menuHit(mouseClick.x, mouseClick.y);

        if (idx !== -1) {
          if (idx !== state.selected) {
            playSound(sounds.menuMove);
          }

          state.selected = idx;
        }
      }

      if (confirm) {
        playSound(sounds.menuSelect);
        useMenuSelection();
      }
    } else if (state.phase === PHASE.FIGHT_TARGET) {
      if (cancel) {
        beginMenu(undefined, { resetCommands: false });
      } else {
        if (mouseClick) {
          const targetIdx = fightTargetHit(mouseClick.x, mouseClick.y);

          if (targetIdx !== -1) {
            state.selectedFightTarget = targetIdx;
            playSound(sounds.menuSelect);
            lockSelectedFightAction(state.selectedFightTarget);
          }
        } else if (confirm) {
          playSound(sounds.menuSelect);
          lockSelectedFightAction(state.selectedFightTarget);
        }
      }
    } else if (state.phase === PHASE.ACT) {
      if (cancel) {
        beginMenu(undefined, { resetCommands: false });
      } else {
        moveActSelection({ left, right, up, down });

        if (mouseClick) {
          const actIdx = actHit(mouseClick.x, mouseClick.y);

          if (actIdx !== -1) {
            if (actIdx !== state.selectedAct) {
              playSound(sounds.menuMove);
            }

            state.selectedAct = actIdx;

            if (canAffordAct(selectedActorAct())) {
              playSound(sounds.menuSelect);
              useSelectedAct();
            }
          }
        } else if (confirm && canAffordAct(selectedActorAct())) {
          playSound(sounds.menuSelect);
          useSelectedAct();
        }
      }
    } else if (state.phase === PHASE.ACT_TARGET) {
      if (cancel) {
        beginActSelection();
      } else {
        moveActTargetSelection({ up, down });

        if (mouseClick) {
          const targetIdx = itemTargetHit(mouseClick.x, mouseClick.y);

          if (targetIdx !== -1) {
            if (targetIdx !== state.selectedActTarget) {
              playSound(sounds.menuMove);
            }

            state.selectedActTarget = targetIdx;
            playSound(sounds.menuSelect);
            lockSelectedActAction(state.selectedActTarget);
          }
        } else if (confirm) {
          playSound(sounds.menuSelect);
          lockSelectedActAction(state.selectedActTarget);
        }
      }
    } else if (state.phase === PHASE.ACT_ENEMY_TARGET) {
      if (cancel) {
        beginActSelection();
      } else if (mouseClick) {
        const targetIdx = fightTargetHit(mouseClick.x, mouseClick.y);

        if (targetIdx !== -1) {
          state.selectedActEnemyTarget = targetIdx;
          playSound(sounds.menuSelect);
          lockSelectedActAction(state.selectedActEnemyTarget);
        }
      } else if (confirm) {
        playSound(sounds.menuSelect);
        lockSelectedActAction(state.selectedActEnemyTarget);
      }
    } else if (state.phase === PHASE.MERCY_TARGET) {
      if (cancel) {
        beginMenu(undefined, { resetCommands: false });
      } else if (mouseClick) {
        const targetIdx = fightTargetHit(mouseClick.x, mouseClick.y);

        if (targetIdx !== -1) {
          state.selectedMercyTarget = targetIdx;
          playSound(sounds.menuSelect);
          resolveMercy();
        }
      } else if (confirm) {
        playSound(sounds.menuSelect);
        resolveMercy();
      }
    } else if (state.phase === PHASE.ITEM) {
      if (cancel) {
        beginMenu(undefined, { resetCommands: false });
      } else {
        moveItemSelection({ left, right, up, down });

        if (mouseClick) {
          const itemIdx = itemHit(mouseClick.x, mouseClick.y);

          if (itemIdx !== -1) {
            if (itemIdx !== state.selectedItem) {
              playSound(sounds.menuMove);
            }

            state.selectedItem = itemIdx;
            useSelectedItem();
          }
        } else if (confirm && state.inventory.length > 0) {
          useSelectedItem();
        }
      }
    } else if (state.phase === PHASE.ITEM_TARGET) {
      if (cancel) {
        beginItemSelection();
      } else {
        moveItemTargetSelection({ up, down });

        if (mouseClick) {
          const targetIdx = itemTargetHit(mouseClick.x, mouseClick.y);

          if (targetIdx !== -1) {
            if (targetIdx !== state.selectedItemTarget) {
              playSound(sounds.menuMove);
            }

            state.selectedItemTarget = targetIdx;
            playSound(sounds.menuSelect);
            lockSelectedItemAction(state.selectedItemTarget);
          }
        } else if (confirm) {
          playSound(sounds.menuSelect);
          lockSelectedItemAction(state.selectedItemTarget);
        }
      }
    } else if (state.phase === PHASE.ATTACK) {
      if (state.attack.active) {
        const meter = getAttackMeterBounds();

        state.attack.markerX += state.attack.speed * state.attack.direction;

        if (state.attack.markerX < meter.trackStart || state.attack.markerX > meter.trackEnd) {
          state.attack.markerX = clamp(state.attack.markerX, meter.trackStart, meter.trackEnd);
          state.attack.direction *= -1;
        }

        if (confirm) resolveAttack();
      }

      if (state.attack.flash > 0) state.attack.flash--;
    } else if (state.phase === PHASE.FIGHT_QTE) {
      if (confirm) {
        lockNextFightQteBar();
      }

      updateFightQte();
    } else if (state.phase === PHASE.PLAYER_EFFECT) {
      updatePlayerEffect();
    } else if (state.phase === PHASE.SPELL_ACTION) {
      updateDamageSpell();
    } else if (state.phase === PHASE.PERSISTENT_EFFECT) {
      updatePersistentEffect();
    } else if (state.phase === PHASE.DAMAGE_RESULT) {
      updateDamageResult();
    } else if (state.phase === PHASE.LAST_STAND_EVENT) {
      updateLastStandEvent();
    } else if (state.phase === PHASE.DEFEAT_DISSOLVE) {
      updateDefeatDissolve();
    } else if (state.phase === PHASE.MERCY_MESSAGE) {
      updateMercyMessage();
    } else if (state.phase === PHASE.MERCY_FADE) {
      updateMercyFade();
    } else if (state.phase === PHASE.ULTIMATE_TRANSITION) {
      updateUltimateTransition();
    } else if (state.phase === PHASE.TURN_EVENT) {
      updateTurnEvent();
    } else if (state.phase === PHASE.SCENE) {
      updateScene();
    } else if (state.phase === PHASE.ENEMY_DIALOG) {
      updateEnemyDialog();
    } else if (state.phase === PHASE.ENEMY) {
      updateEnemyAttack();
    } else if (state.phase === PHASE.PHASE_TRANSITION) {
      updatePhaseTransition();
    } else if (state.phase === PHASE.LOSE) {
      updatePlayerDeath();

      if (state.death.timer >= 285) {
        if (enter) {
          restartWithPreviousParty();
        } else if (cancel) {
          stopCurrentMusic();
          requestEncounterSelection();
        }
      }
    } else if (state.phase === PHASE.WIN || state.phase === PHASE.SPARED) {
      if (cancel) {
        stopCurrentMusic();
        requestEncounterSelection();
      } else if (confirm) {
        restartWithPreviousParty();
      }
    }

    input.consume();
  }

  function menuHit(x, y) {
    if (state.partyTurnIndex < 0) return -1;
    const card = getPartyCommandCardRect(state.partyTurnIndex, true);

    for (let i = 0; i < menuItems.length; i++) {
      const option = getCommandOptionRect(card, i);
      if (x >= option.x && x <= option.x + option.w && y >= option.y && y <= option.y + option.h) return i;
    }

    return -1;
  }

  function getPartyCommandCardRect(index, expanded = false) {
    const gap = 1;
    const baseW = (W - gap * 2) / 3;
    const baseX = index * (baseW + gap);
    const baseY = BOX_RECT.TEXT.y - 44;
    const baseH = 44;

    if (!expanded) {
      return { x: baseX, y: baseY, w: baseW, h: baseH };
    }

    return {
      x: baseX,
      y: baseY - 58,
      w: baseW,
      h: baseH + 58
    };
  }

  function getCommandOptionRect(card, index) {
    const gap = 8;
    const fullOptionW = (card.w - 24 - gap * (menuItems.length - 1)) / menuItems.length;
    const optionW = fullOptionW * 0.8;
    const groupW = optionW * menuItems.length + gap * (menuItems.length - 1);
    const startX = card.x + (card.w - groupW) / 2;

    return {
      x: startX + index * (optionW + gap),
      y: card.y + card.h - 51,
      w: optionW,
      h: 34
    };
  }

  function getSubmenuGridLayout(menu) {
    const outerInset = 28;
    const columnGap = 40;
    const cellWidth = (menu.w - outerInset * 2 - columnGap) / 2;

    return {
      cellWidth,
      columnGap,
      rowHeight: 38,
      startX: menu.x + outerInset,
      startY: menu.y + 28,
      textInset: 34,
      valueInset: 10,
      cursorInset: 13
    };
  }

  function getItemMenuLayout(menu) {
    return {
      leftX: menu.x + 34,
      middleX: menu.x + 282,
      descriptionX: menu.x + 580,
      itemColumnWidth: 230,
      descriptionWidth: 282,
      rowHeight: 34,
      rows: Math.max(1, Math.ceil(state.inventory.length / 2)),
      startY: menu.y + 34,
      cursorInset: 12,
      textInset: 34
    };
  }

  function getActMenuLayout(menu) {
    return {
      ...getItemMenuLayout(menu),
      rows: 3
    };
  }

  function getItemTargetLayout(menu) {
    return {
      startY: menu.y + 34,
      rowHeight: 42,
      nameX: menu.x + 82,
      barX: menu.x + 260,
      barW: 300,
      barH: 16
    };
  }

  function itemHit(x, y) {
    const menu = BOX_RECT.TEXT;
    const layout = getItemMenuLayout(menu);

    if (y < layout.startY - 22 || y > layout.startY - 22 + layout.rowHeight * layout.rows) return -1;

    const col = x >= layout.leftX && x <= layout.leftX + layout.itemColumnWidth
      ? 0
      : x >= layout.middleX && x <= layout.middleX + layout.itemColumnWidth
        ? 1
        : -1;
    if (col === -1) return -1;

    const row = Math.floor((y - (layout.startY - 22)) / layout.rowHeight);
    const index = row * 2 + col;
    return index >= 0 && index < state.inventory.length ? index : -1;
  }

  function itemTargetHit(x, y) {
    const menu = BOX_RECT.TEXT;
    const layout = getItemTargetLayout(menu);

    if (x < layout.nameX - 34 || x > layout.barX + layout.barW + 18) return -1;

    const row = Math.floor((y - (layout.startY - 22)) / layout.rowHeight);
    return row >= 0 && row < state.party.length && partyMemberParticipates(state.party[row], row)
      ? row
      : -1;
  }

  function actHit(x, y) {
    const menu = BOX_RECT.TEXT;
    const layout = getActMenuLayout(menu);

    if (y < layout.startY - 22 || y > layout.startY - 22 + layout.rowHeight * layout.rows) return -1;

    const col = x >= layout.leftX && x <= layout.leftX + layout.itemColumnWidth
      ? 0
      : x >= layout.middleX && x <= layout.middleX + layout.itemColumnWidth
        ? 1
        : -1;
    if (col === -1) return -1;

    const row = Math.floor((y - (layout.startY - 22)) / layout.rowHeight);
    const index = row * 2 + col;
    return index >= 0 && index < currentActorActs().length ? index : -1;
  }

  function moveActSelection({ left, right, up, down }) {
    const actCount = currentActorActs().length;

    if (actCount === 0) return;

    const current = state.selectedAct;
    let next = current;

    if (left && current % 2 === 1) next = current - 1;
    if (right && current % 2 === 0 && current + 1 < actCount) next = current + 1;
    if (up && current - 2 >= 0) next = current - 2;
    if (down && current + 2 < actCount) next = current + 2;

    if (next !== current) {
      state.selectedAct = next;
      playSound(sounds.menuMove);
    }
  }

  function moveActTargetSelection({ up, down }) {
    const current = state.selectedActTarget;
    let next = current;

    const direction = up ? -1 : down ? 1 : 0;
    if (direction !== 0) {
      for (let index = current + direction; index >= 0 && index < state.party.length; index += direction) {
        if (!partyMemberParticipates(state.party[index], index)) continue;
        next = index;
        break;
      }
    }

    if (next !== current) {
      state.selectedActTarget = next;
      playSound(sounds.menuMove);
    }
  }

  function moveItemSelection({ left, right, up, down }) {
    if (state.inventory.length === 0) return;

    const current = state.selectedItem;
    let next = current;

    if (left && current % 2 === 1) next = current - 1;
    if (right && current % 2 === 0 && current + 1 < state.inventory.length) next = current + 1;
    if (up && current - 2 >= 0) next = current - 2;
    if (down && current + 2 < state.inventory.length) next = current + 2;

    if (next !== current) {
      state.selectedItem = next;
      playSound(sounds.menuMove);
    }
  }

  function moveItemTargetSelection({ up, down }) {
    const current = state.selectedItemTarget;
    let next = current;

    const direction = up ? -1 : down ? 1 : 0;
    if (direction !== 0) {
      for (let index = current + direction; index >= 0 && index < state.party.length; index += direction) {
        if (!partyMemberParticipates(state.party[index], index)) continue;
        next = index;
        break;
      }
    }

    if (next !== current) {
      state.selectedItemTarget = next;
      playSound(sounds.menuMove);
    }
  }

  function fightTargetHit(x, y) {
    const menu = BOX_RECT.TEXT;
    const rowY = menu.y + 30;

    if (x < menu.x + 24 || x > menu.x + menu.w - 24) return -1;
    if (y < rowY - 24 || y > rowY + 8) return -1;

    return 0;
  }

  function getAttackMeterBounds() {
    const box = state.box;
    const padX = 30;
    const trackStart = box.x + padX;
    const trackEnd = box.x + box.w - padX;

    return {
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
      trackStart,
      trackEnd,
      center: box.x + box.w / 2,
      maxDist: (trackEnd - trackStart) / 2,
    };
  }

  function resetGame() {
    stopCurrentMusic();
    stopMusic(sounds.determination);

    state.phase = PHASE.INTRO;
    state.bossPhase = 1;
    state.phase2Started = false;
    state.selected = 0;
    state.selectedFightTarget = 0;
    state.selectedAct = 0;
    state.selectedActTarget = 0;
    state.selectedActEnemyTarget = 0;
    state.selectedItem = 0;
    state.selectedItemTarget = 0;
    state.selectedMercyTarget = 0;
    state.actConditionIndex = 0;
    state.partySelection.cursor = 0;
    state.partySelection.hovered = -1;
    state.partySelection.backHovered = false;
    state.partySelection.picks = [];
    state.partySelection.pickFrames = {};
    state.partySelection.completeFrame = null;
    state.party = createParty(window.PLAYER_DATA);
    syncLegacyPlayerHP();
    state.tp = 0;
    state.grazeGlow = 0;
    resetPartyCommands();
    state.enemyMaxHP = enemyData.maxHP;
    state.enemyHP = enemyData.maxHP;
    state.enemyName = enemyData.name;
    state.enemySpriteKey = null;
    state.enemyDefaultSpriteKey = null;
    state.enemyDefaultSpriteLocked = false;
    state.enemyHitSpriteUntil = 0;
    state.dialogIndex = 0;
    state.enemyDialogIndex = 0;
    state.enemyDialogTimer = 0;
    state.enemyDialogDuration = 0;
    state.enemyDialogMessage = "";
    state.enemyDialogOnComplete = null;
    state.currentTurn = null;
    state.consumedTurns.clear();
    state.seenTurns.clear();
    state.encounter = encounterRuntime.createState({ state }) || {};
    state.dialogIndexBeforeAdvance = null;
    state.turnEvent.steps = [];
    state.turnEvent.index = -1;
    state.turnEvent.timer = 0;
    state.turnEvent.step = null;
    state.turnEvent.transformation = null;
    state.pattern = -1;
    state.box = { ...BOX_RECT.TEXT };
    state.boxMorph.timer = 0;
    state.boxMorph.from = { ...BOX_RECT.TEXT };
    state.boxMorph.to = { ...BOX_RECT.TEXT };
    state.boxMorph.nextPhase = PHASE.MENU;
    state.boxMorph.onComplete = null;
    state.attackType = ATTACK_TYPE.NORMAL;
    state.shieldDirection = "up";
    state.soul.vy = 0;
    state.soul.pitBounce = false;
    state.inventory = createInventory(startingItems());
    for (const player of state.party) player.runtime?.onReset?.({ player, state });
    state.bullets = [];
    state.message = enemyData.introMessage;
    state.textTimer = 0;
    state.damageResult.timer = 0;
    state.damageResult.fromHP = enemyData.maxHP;
    state.damageResult.toHP = enemyData.maxHP;
    state.damageResult.damage = 0;
    state.fightQte.timer = 0;
    state.fightQte.actions = [];
    state.fightQte.order = [];
    state.fightQte.activeBars = [];
    state.fightQte.nextOrderIndex = 0;
    state.fightQte.spawnTimer = 60;
    state.fightQte.finished = false;
    state.fightQte.finishTimer = 0;
    state.fightQte.results = [];
    state.fightQte.nextPopupIndex = 0;
    state.fightQte.popupSpawnTimer = 0;
    state.fightQte.damagePopups = [];
    state.playerEffectAction.timer = 0;
    state.playerEffectAction.action = null;
    state.playerEffectAction.queue = [];
    state.playerEffectAction.persistentActions = [];
    state.playerEffectAction.damageActions = [];
    state.playerEffectAction.fightActions = [];
    state.playerEffectAction.messages = [];
    state.spellAction.timer = 0;
    state.spellAction.action = null;
    state.spellAction.queue = [];
    state.spellAction.fightActions = [];
    state.spellAction.messages = [];
    state.spellAction.damage = 0;
    state.spellAction.bonusDamage = 0;
    state.spellAction.damageApplied = false;
    state.spellAction.particles = [];
    state.persistentEffects = [];
    state.persistentLayerFades = [];
    state.persistentEffectAction.timer = 0;
    state.persistentEffectAction.effect = null;
    state.persistentEffectAction.queue = [];
    state.persistentEffectAction.fightActions = [];
    state.persistentEffectAction.messages = [];
    state.persistentEffectAction.damage = 0;
    state.persistentEffectAction.bonusDamage = 0;
    state.persistentEffectAction.damageApplied = false;
    state.persistentEffectAction.hitCount = 0;
    state.persistentEffectAction.hitsApplied = 0;
    state.persistentEffectAction.hitPopups = [];
    state.enemyDamageMarks = [];
    state.lastStand.used = false;
    state.lastStand.pendingAttack = null;
    state.lastStand.activeAttack = false;
    state.lastStand.timer = 0;
    state.lastStand.damage = 0;
    state.lastStand.fromHP = enemyData.maxHP;
    state.lastStand.toHP = 1;
    state.hpFillTarget = 0;
    state.phaseTransition.timer = 0;
    state.phaseTransition.refillMessageTimer = 0;
    state.phaseTransition.refillStarted = false;
    state.ultimate.transformed = false;
    state.ultimate.timer = 0;
    state.mercy.timer = 0;
    state.mercy.success = false;
    state.mercy.winMessage = null;
    state.mercy.keepUiDuringFade = false;
    state.mercy.fadeDuration = 90;
    state.defeatDissolve.timer = 0;
    state.defeatDissolve.started = false;
    state.defeatDissolve.releasedRows = 0;
    state.defeatDissolve.particles = [];
    state.defeatDissolve.source = null;
    state.defeatDissolve.custom = null;
    state.defeatDissolve.speechSpriteKey = null;
    state.death.timer = 0;
    state.death.determinationStarted = false;
    state.death.pieces = [];
  }

  let lastFrameTime = 0;
  let accumulatedTime = 0;

  function loop(timestamp) {
    if (!lastFrameTime) lastFrameTime = timestamp;

    const elapsed = Math.min(timestamp - lastFrameTime, MAX_FRAME_MS);
    lastFrameTime = timestamp;
    accumulatedTime += elapsed;

    while (accumulatedTime >= FIXED_STEP_MS) {
      update();
      accumulatedTime -= FIXED_STEP_MS;
    }

    draw();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
  return {
    get state() { return state; },
    get enemy() { return enemyData; },
    encounterId: options.encounterId || null,
    setUpcomingAttack: window.setUpcomingAttack,
    setPartyTP: window.setPartyTP,
    setEnemyHP: window.setEnemyHP
  };
};

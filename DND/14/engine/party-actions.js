(() => {
  "use strict";

  window.SoulBattle = window.SoulBattle || {};

  function createPartyActions(api) {
    const {
      state, enemyData, sounds, PHASE, BOX_RECT, clamp, createPlayerActs, currentBossData,
      FIGHT_QTE_MIN_DAMAGE_MULTIPLIER, FIGHT_QTE_CRIT_RADIUS_RATIO,
      FIGHT_QTE_FALLOFF_TRACK_RATIO, FIGHT_QTE_FALLOFF_POWER,
      playSound, stopCurrentMusic, activeEnemySpriteKey, enemyDamagePopupPosition,
      enemySpritePosition, enemySpriteSize, triggerEnemyHitSprite,
      advanceBattleDialog, beginDefeatDissolve, beginEnemyTurn, beginMenu,
      beginPhase2Transition, beginTeamMercyResolution, getEncounterRuntime
    } = api;

  function partyMemberParticipates(player, partyIndex = state.party.indexOf(player)) {
    if (!player) return false;
    return getEncounterRuntime?.()?.isPartyMemberActive?.({ state, player, partyIndex }) !== false;
  }

  function participatingPartyMembers() {
    return state.party.filter((player, index) => partyMemberParticipates(player, index));
  }

  function partyHP() {
    return state.party.reduce((total, player) => total + player.hp, 0);
  }

  function partyMaxHP() {
    return state.party.reduce((total, player) => total + player.maxHP, 0);
  }

  function livingPartyMembers() {
    return state.party.filter((player, index) => player.hp > 0 && partyMemberParticipates(player, index));
  }

  function firstLivingPartyIndex() {
    const index = state.party.findIndex((player, partyIndex) =>
      player.hp > 0 && partyMemberParticipates(player, partyIndex));
    return index === -1 ? 0 : index;
  }

  function nextLivingPartyIndex(fromIndex) {
    for (let i = fromIndex + 1; i < state.party.length; i++) {
      if (state.party[i].hp > 0 && partyMemberParticipates(state.party[i], i)) return i;
    }

    return -1;
  }

  function previousLivingPartyIndex(fromIndex) {
    for (let i = fromIndex - 1; i >= 0; i--) {
      if (state.party[i].hp > 0 && partyMemberParticipates(state.party[i], i)) return i;
    }

    return -1;
  }

  function resetPartyCommands() {
    state.partyTurnIndex = firstLivingPartyIndex();
    state.partyCommands = state.party.map(() => null);
    state.partyCommandTpGains = state.party.map(() => 0);
    state.partyActions = state.party.map(() => null);
    state.selected = 0;
  }

  function clearPartyCommand(index) {
    const tpGain = state.partyCommandTpGains[index] || 0;
    const action = state.partyActions[index];

    if (tpGain > 0) {
      state.tp = clamp(state.tp - tpGain, 0, 100);
    }

    if (action && action.command === "ACT" && Number.isFinite(action.tpCost)) {
      state.tp = clamp(state.tp + action.tpCost, 0, 100);
    }

    if (action && action.command === "ACT" && Number.isFinite(action.hpCost)) {
      const player = state.party[index];
      if (player) player.hp = clamp(player.hp + action.hpCost, 0, player.maxHP);
    }

    if (action && action.command === "ITEM" && action.itemReserved && action.item) {
      const insertIndex = clamp(action.itemIndex, 0, state.inventory.length);
      state.inventory.splice(insertIndex, 0, action.item);
    }

    state.partyCommands[index] = null;
    state.partyCommandTpGains[index] = 0;
    state.partyActions[index] = null;
  }

  function lockPartyCommand(index, command) {
    const player = state.party[index];

    clearPartyCommand(index);
    state.partyCommands[index] = command;

    if (command === "DEFEND" && player) {
      const gain = Math.min(player.defendTP, 100 - state.tp);
      state.tp += gain;
      state.partyCommandTpGains[index] = gain;
    }
  }

  function lockPartyAction(index, command, action = null) {
    lockPartyCommand(index, command);
    state.partyActions[index] = action ? { command, ...action } : { command };
  }

  function advancePartyTurnOrResolve() {
    const nextIndex = nextLivingPartyIndex(state.partyTurnIndex);

    if (nextIndex !== -1) {
      state.partyTurnIndex = nextIndex;
      state.selected = 0;
      state.textTimer = 0;
      beginMenu(undefined, { resetCommands: false });
      return;
    }

    resolveQueuedPartyActions();
  }

  function resolveQueuedPartyActions() {
    const actions = state.partyActions
      .map((action, actorIndex) => action ? { ...action, actorIndex } : null)
      .filter(Boolean);
    const messages = [];

    const teamMercyAction = actions.find((entry) =>
      entry.command === "ACT" && entry.act.effect === "teamMercy"
    );

    if (teamMercyAction) {
      state.partyActions = state.party.map(() => null);
      state.partyCommands = state.party.map(() => null);
      state.partyCommandTpGains = state.party.map(() => 0);
      beginTeamMercyResolution(teamMercyAction);
      return;
    }

    for (let i = 0; i < state.party.length; i++) {
      const action = state.partyActions[i];
      state.party[i].actionSpriteRole = action?.command === "ITEM"
        ? "item"
        : action?.command === "FIGHT"
          ? "attack"
          : null;
    }

    for (const action of actions.filter((entry) => entry.command === "ITEM")) {
      const message = performItemAction(action);

      if (message) messages.push(message);
    }

    const effectActions = actions.filter((entry) =>
      entry.command === "ACT" && !actDealsDamage(entry.act) && entry.act.effect !== "persistent"
    );
    const persistentActions = actions.filter((entry) =>
      entry.command === "ACT" && entry.act.effect === "persistent"
    );
    const damageActions = actions.filter((entry) => entry.command === "ACT" && actDealsDamage(entry.act));
    const fightActions = actions.filter((entry) => entry.command === "FIGHT");

    state.partyActions = state.party.map(() => null);
    state.partyCommands = state.party.map(() => null);
    state.partyCommandTpGains = state.party.map(() => 0);
    advanceBattleDialog();

    if (effectActions.length > 0) {
      beginPlayerEffectSequence(effectActions, persistentActions, damageActions, fightActions, messages);
      return;
    }

    for (const action of persistentActions) registerPersistentEffect(action);

    if (damageActions.length > 0) {
      beginDamageSpellSequence(damageActions, fightActions, messages);
      return;
    }

    continueQueuedPartyResolution(fightActions, messages);
  }

  function beginPlayerEffectSequence(actions, persistentActions, damageActions, fightActions, messages) {
    const resolution = state.playerEffectAction;
    resolution.queue = [...actions];
    resolution.persistentActions = [...persistentActions];
    resolution.damageActions = [...damageActions];
    resolution.fightActions = [...fightActions];
    resolution.messages = [...messages];
    beginNextPlayerEffect();
  }

  function beginNextPlayerEffect() {
    const resolution = state.playerEffectAction;
    const action = resolution.queue.shift();

    if (!action) {
      resolution.action = null;
      for (const persistentAction of resolution.persistentActions) registerPersistentEffect(persistentAction);

      if (resolution.damageActions.length > 0) {
        beginDamageSpellSequence(resolution.damageActions, resolution.fightActions, resolution.messages);
      } else {
        continueQueuedPartyResolution(resolution.fightActions, resolution.messages);
      }
      return;
    }

    const message = performActAction(action);
    if (message) resolution.messages.push(message);

    if (!action.act.popupText) {
      beginNextPlayerEffect();
      return;
    }

    resolution.action = action;
    resolution.timer = 0;
    const actor = state.party[action.actorIndex];
    if (actor) {
      const requestedRole = action.act.sprite || "action";
      actor.actionSpriteRole = actor.spriteKeys[requestedRole] ? requestedRole : "action";
    }
    state.phase = PHASE.PLAYER_EFFECT;
    state.box = { ...BOX_RECT.TEXT };
    state.message = "";
    state.textTimer = 0;
    playSound(action.act.effect === "heal" ? sounds.itemUse : sounds.statChange);
  }

  function updatePlayerEffect() {
    const resolution = state.playerEffectAction;
    if (!resolution.action) return;

    resolution.timer++;
    if (resolution.timer >= 90) {
      const actor = state.party[resolution.action.actorIndex];
      if (actor) actor.actionSpriteRole = null;
      beginNextPlayerEffect();
    }
  }

  function continueQueuedPartyResolution(fightActions, messages, persistentResolved = false) {

    if (state.enemyHP <= 0) {
      state.phase = PHASE.MESSAGE;
      state.box = { ...BOX_RECT.TEXT };
      state.message = messages.join(" ");
      state.textTimer = 0;
      setTimeout(() => {
        if (!state.phase2Started && beginPhase2Transition()) return;
        stopCurrentMusic();
        beginDefeatDissolve();
      }, Math.max(1600, messages.length * 1000));
      return;
    }

    if (getEncounterRuntime?.()?.consumeTeamMercyRequest?.({ state }) === true) {
      beginTeamMercyResolution();
      return;
    }

    if (!persistentResolved && state.persistentEffects.length > 0) {
      beginPersistentEffectSequence(fightActions, messages);
      return;
    }

    if (fightActions.length > 0) {
      beginFightQte(fightActions);
      return;
    }

    if (messages.length > 0) {
      state.phase = PHASE.MESSAGE;
      state.box = { ...BOX_RECT.TEXT };
      state.message = messages.join(" ");
      state.textTimer = 0;
      setTimeout(beginEnemyTurn, Math.max(1800, messages.length * 1200));
      return;
    }

    state.message = "";
    state.textTimer = 0;
    beginEnemyTurn();
  }

  function playerDamageMultiplier(player) {
    const baseMultiplier = Number.isFinite(player?.damageMultiplier) ? player.damageMultiplier : 1;
    const permanentBaseBonus = Number.isFinite(player?.permanentBaseDamageBonus)
      ? player.permanentBaseDamageBonus
      : 0;
    const temporaryMultiplier = Number.isFinite(player?.temporaryDamageMultiplier)
      ? player.temporaryDamageMultiplier
      : 1;

    const modified = player?.runtime?.modifyOutgoingDamage?.({
      player,
      multiplier: baseMultiplier + permanentBaseBonus,
      state
    }) ?? baseMultiplier + permanentBaseBonus;
    return modified * temporaryMultiplier;
  }

  function registerPersistentEffect(action) {
    const actor = state.party[action.actorIndex];
    const id = action.act.persistentId || action.act.script || action.act.name;
    const alreadyActive = state.persistentEffects.some((effect) =>
      effect.id === id && effect.actorName === actor?.name
    );

    if (alreadyActive || !actor) return;

    if (action.act.persistentGroup) {
      state.persistentEffects = state.persistentEffects.filter((effect) =>
        effect.actorName !== actor.name || effect.group !== action.act.persistentGroup
      );
    }

    state.persistentEffects.push({
      id,
      actorIndex: action.actorIndex,
      actorName: actor.name,
      script: action.act.script,
      group: action.act.persistentGroup,
      sprite: action.act.persistentSprite,
      damage: action.act.damage,
      heal: action.act.heal,
      targetIndex: 0,
      pendingHits: 0,
      mode: action.act.persistentMode,
      soundKey: action.act.persistentSoundKey,
      displayAsCompanion: action.act.displayAsCompanion,
      persistsWhenDown: action.act.persistsWhenDown
    });

    if (action.act.once) actor.usedActs.add(action.act.name);
  }

  function beginDamageSpellSequence(actions, fightActions, messages) {
    state.spellAction.queue = [...actions];
    state.spellAction.fightActions = [...fightActions];
    state.spellAction.messages = [...messages];
    beginNextDamageSpell();
  }

  function beginNextDamageSpell() {
    const spell = state.spellAction;
    const action = spell.queue.shift();

    if (!action) {
      continueQueuedPartyResolution(spell.fightActions, spell.messages);
      return;
    }

    const actor = state.party[action.actorIndex];
    const multiplier = playerDamageMultiplier(actor);

    state.phase = PHASE.SPELL_ACTION;
    state.box = { ...BOX_RECT.TEXT };
    state.message = "";
    state.textTimer = 0;
    spell.timer = 0;
    spell.action = action;
    spell.damage = Math.max(1, Math.round(action.act.damage * multiplier));
    spell.bonusDamage = 0;
    spell.damageApplied = false;
    spell.particles = [];

    if (actor) {
      const requestedRole = action.act.sprite || "action";
      actor.actionSpriteRole = actor.spriteKeys[requestedRole] ? requestedRole : "action";
      action.act.beginDamage?.({ state, actor, action, act: action.act });
    }
  }

  function damageSpellActorCenter(actorIndex) {
    return { x: 93 + 39, y: 78 + actorIndex * 124 + 39 };
  }

  function damageSpellEnemyCenter() {
    const spriteKey = activeEnemySpriteKey();
    const size = enemySpriteSize(spriteKey);
    const position = enemySpritePosition(size, spriteKey);
    return { x: position.x + size / 2, y: position.y + size / 2 };
  }

  function applyEnemyDamage(damage, targetIndex = 0) {
    const baseDamage = Math.max(0, Math.round(damage));
    const resolvedTargetIndex = Number.isInteger(targetIndex) ? targetIndex : 0;
    let bonusDamage = 0;

    const markIndex = state.enemyDamageMarks.findIndex((mark) => mark.active && mark.targetIndex === resolvedTargetIndex);
    if (baseDamage > 0 && markIndex >= 0) {
      const mark = state.enemyDamageMarks[markIndex];
      bonusDamage = Math.max(1, Math.round(baseDamage * mark.bonusMultiplier));
      state.enemyDamageMarks.splice(markIndex, 1);
    }

    state.enemyHP = Math.max(0, state.enemyHP - baseDamage - bonusDamage);
    return { baseDamage, bonusDamage };
  }

  function randomLivingEnemyTargetIndex() {
    const targets = state.enemyHP > 0 ? [0] : [];
    return targets.length > 0 ? targets[Math.floor(Math.random() * targets.length)] : -1;
  }

  function spawnDamageSpellImpact(center, color) {
    const particles = state.spellAction.particles;

    for (let i = 0; i < 28; i++) {
      const angle = Math.PI * 2 * i / 28 + Math.random() * 0.16;
      const speed = 2.5 + Math.random() * 4.5;
      particles.push({
        x: center.x,
        y: center.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 34 + Math.floor(Math.random() * 18),
        maxLife: 52,
        color
      });
    }
  }

  function updateDamageSpell() {
    const spell = state.spellAction;
    const action = spell.action;
    if (!action) return;

    spell.timer++;

    if (!spell.damageApplied && spell.timer >= 66) {
      const actor = state.party[action.actorIndex];
      spell.damageApplied = true;
      const result = applyEnemyDamage(spell.damage, action.targetIndex);
      spell.bonusDamage = result.bonusDamage;
      triggerEnemyHitSprite();
      action.act.onDamageApplied?.({ state, actor, action, act: action.act, result });
      spawnDamageSpellImpact(damageSpellEnemyCenter(), actor?.secondaryColor || actor?.cardColor || "#fff");
      playSound(sounds[action.act.soundKey] || sounds.attackLand);
    }

    for (const particle of spell.particles) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vx *= 0.96;
      particle.vy *= 0.96;
      particle.life--;
    }
    spell.particles = spell.particles.filter((particle) => particle.life > 0);

    if (spell.timer >= 162) {
      const actor = state.party[action.actorIndex];
      if (actor) actor.actionSpriteRole = null;
      spell.action = null;
      beginNextDamageSpell();
    }
  }

  function beginPersistentEffectSequence(fightActions, messages) {
    const persistent = state.persistentEffectAction;
    persistent.queue = [...state.persistentEffects];
    persistent.fightActions = [...fightActions];
    persistent.messages = [...messages];
    beginNextPersistentEffect();
  }

  function beginNextPersistentEffect() {
    const persistent = state.persistentEffectAction;

    if (state.enemyHP <= 0) {
      persistent.queue = [];
      continueQueuedPartyResolution(persistent.fightActions, persistent.messages, true);
      return;
    }

    const effect = persistent.queue.shift();

    if (!effect) {
      continueQueuedPartyResolution(persistent.fightActions, persistent.messages, true);
      return;
    }

    const actorIndex = state.party.findIndex((player) => player.name === effect.actorName);
    const actor = state.party[actorIndex];

    if (!actor) {
      state.persistentEffects = state.persistentEffects.filter((entry) => entry !== effect);
      beginNextPersistentEffect();
      return;
    }

    if (actor.hp <= 0) {
      if (!effect.persistsWhenDown) {
        state.persistentEffects = state.persistentEffects.filter((entry) => entry !== effect);
      }
      beginNextPersistentEffect();
      return;
    }

    const multiplier = playerDamageMultiplier(actor);

    if (effect.mode === "retaliate" && effect.pendingHits <= 0) {
      beginNextPersistentEffect();
      return;
    }

    effect.actorIndex = actorIndex === -1 ? effect.actorIndex : actorIndex;
    state.phase = PHASE.PERSISTENT_EFFECT;
    state.box = { ...BOX_RECT.TEXT };
    state.message = "";
    persistent.timer = 0;
    persistent.effect = effect;
    persistent.damage = effect.mode === "healLowest"
      ? 0
      : Math.max(1, Math.round(effect.damage * multiplier));
    persistent.bonusDamage = 0;
    persistent.damageApplied = false;
    persistent.hitCount = effect.mode === "retaliate" ? effect.pendingHits : 0;
    persistent.hitsApplied = 0;
    persistent.hitPopups = [];
    if (effect.mode === "retaliate") effect.pendingHits = 0;
    effect.targetIndex = effect.mode === "healLowest"
      ? randomLowestHpPartyIndex()
      : randomLivingEnemyTargetIndex();

    if (actor && !effect.displayAsCompanion) actor.actionSpriteRole = "action";
    if (effect.soundKey && sounds[effect.soundKey]) playSound(sounds[effect.soundKey]);
  }

  function updatePersistentEffect() {
    const persistent = state.persistentEffectAction;
    const effect = persistent.effect;
    if (!effect) return;

    persistent.timer++;

    if (effect.mode === "retaliate") {
      const firstHitFrame = 18;
      const hitInterval = 8;
      const nextHitFrame = firstHitFrame + persistent.hitsApplied * hitInterval;

      if (
        persistent.hitsApplied < persistent.hitCount &&
        persistent.timer >= nextHitFrame &&
        state.enemyHP > 0
      ) {
        const hitIndex = persistent.hitsApplied;
        const result = applyEnemyDamage(persistent.damage, effect.targetIndex);
        const center = damageSpellEnemyCenter();
        const column = hitIndex % 3;
        const row = Math.floor(hitIndex / 3) % 3;

        persistent.hitPopups.push({
          age: 0,
          damage: persistent.damage,
          bonusDamage: result.bonusDamage,
          x: center.x + (column - 1) * 36,
          y: center.y + (row - 1) * 27
        });
        persistent.hitsApplied++;
        persistent.damageApplied = true;
        triggerEnemyHitSprite(Math.max(36, persistent.hitCount * hitInterval + 20));
        playSound(sounds.attackLand);
      }

      for (const popup of persistent.hitPopups) popup.age++;

      const finalHitFrame = firstHitFrame + Math.max(0, persistent.hitCount - 1) * hitInterval;
      if (persistent.timer >= finalHitFrame + 72 || state.enemyHP <= 0) {
        const actor = state.party[effect.actorIndex];
        if (actor) actor.actionSpriteRole = null;
        persistent.effect = null;
        beginNextPersistentEffect();
      }
      return;
    }

    if (!persistent.damageApplied && persistent.timer >= 30) {
      persistent.damageApplied = true;
      if (effect.mode === "healLowest") {
        healExactPartyMember(effect.targetIndex, effect.heal);
        playSound(sounds.itemUse);
      } else {
        const result = applyEnemyDamage(persistent.damage, effect.targetIndex);
        persistent.bonusDamage = result.bonusDamage;
        triggerEnemyHitSprite();
        playSound(sounds.attackLand);
      }
    }

    if (persistent.timer >= 126) {
      const actor = state.party[effect.actorIndex];
      if (actor) actor.actionSpriteRole = null;
      persistent.effect = null;
      beginNextPersistentEffect();
    }
  }

  function performItemAction(action) {
    const item = action.item;
    const actor = state.party[action.actorIndex];

    if (!item || !actor) return "";

    playSound(sounds.itemUse);

    if (item.target === "party") {
      let totalHeal = 0;

      for (let i = 0; i < state.party.length; i++) {
        totalHeal += healExactPartyMember(i, item.heal);
      }

      return totalHeal > 0
        ? `* ${actor.name} used ${item.name}. The party recovered HP.`
        : `* ${actor.name} used ${item.name}. But everyone's HP was already full.`;
    }

    const targetIndex = Number.isInteger(action.targetIndex) ? action.targetIndex : action.actorIndex;
    const target = state.party[targetIndex] || actor;
    const heal = healExactPartyMember(targetIndex, item.heal);

    return heal > 0
      ? `* ${actor.name} used ${item.name}. ${target.name} recovered ${heal} HP.`
      : `* ${actor.name} used ${item.name}. But ${target.name}'s HP was already full.`;
  }

  function actDealsDamage(act) {
    return act && act.effect === "damage";
  }

  function performActAction(action) {
    const act = action.act;
    const actor = state.party[action.actorIndex];

    if (!act || !actor) return "";

    if (typeof act.resolve === "function") {
      return act.resolve({ state, actor, action, act }) || `* ${actor.name} used ${act.name}.`;
    }

    if (act.effect === "heal") {
      const targetIndex = Number.isInteger(action.targetIndex) ? action.targetIndex : action.actorIndex;
      const target = state.party[targetIndex] || actor;
      const healAmount = target.hp <= 0 && Number.isFinite(act.downHeal) ? act.downHeal : act.heal;
      const heal = healExactPartyMember(targetIndex, healAmount);

      return heal > 0
        ? `* ${actor.name} used ${act.name}. ${target.name} recovered ${heal} HP.`
        : `* ${actor.name} used ${act.name}. But ${target.name}'s HP was already full.`;
    }

    if (act.effect === "damageBuff") {
      const targetIndex = Number.isInteger(action.targetIndex) ? action.targetIndex : action.actorIndex;
      const target = state.party[targetIndex] || actor;
      target.permanentBaseDamageBonus += act.baseDamageBonus;
      if (act.once) actor.usedActs.add(act.name);

      return `* ${actor.name} used ${act.name}. ${target.name}'s damage increased.`;
    }

    if (act.effect === "nextTurnDamageBuff") {
      actor.temporaryDamageMultiplier = act.damageMultiplier;
      actor.temporaryDamageBuffTurns = 2;

      return `* ${actor.name} used ${act.name}. Their next turn's damage doubled.`;
    }

    if (act.effect === "defendTPBuff") {
      const targetIndex = Number.isInteger(action.targetIndex) ? action.targetIndex : action.actorIndex;
      const target = state.party[targetIndex] || actor;
      target.defendTP += act.defendTPBonus;

      return `* ${actor.name} used ${act.name}. ${target.name}'s DEFEND TP gains increased.`;
    }

    if (act.effect === "damage") {
      const multiplier = playerDamageMultiplier(actor);
      const damage = Math.max(1, Math.round(act.damage * multiplier));
      const result = applyEnemyDamage(damage, action.targetIndex);

      return `* ${actor.name} used ${act.name}. ${state.enemyName} took ${damage + result.bonusDamage} damage.`;
    }

    if (act.effect === "check") {
      const bossData = currentBossData();
      return typeof bossData.check === "string"
        ? `* ${bossData.check}`
        : `* ${bossData.actMessage || "Nothing happens."}`;
    }

    return `* ${actor.name} used ${act.name}.`;
  }

  function shuffledIndexes(length) {
    const indexes = Array.from({ length }, (_, index) => index);

    for (let i = indexes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
    }

    return indexes;
  }

  function beginFightQte(actions) {
    const usableActions = actions.filter((action) => state.party[action.actorIndex]);

    state.phase = PHASE.FIGHT_QTE;
    state.box = { ...BOX_RECT.TEXT };
    state.message = "";
    state.textTimer = 0;
    state.fightQte = {
      timer: 0,
      actions: usableActions,
      order: shuffledIndexes(usableActions.length),
      activeBars: [],
      nextOrderIndex: 0,
      spawnTimer: 60,
      finished: usableActions.length === 0,
      finishTimer: 0,
      results: [],
      nextPopupIndex: 0,
      popupSpawnTimer: 0,
      damagePopups: []
    };

    if (usableActions.length === 0) {
      finishFightQte();
    }
  }

  function fightQteLayoutForRow(row) {
    const rowH = BOX_RECT.TEXT.h / 3;
    const y = BOX_RECT.TEXT.y + row * rowH;
    const barH = rowH;
    const trackX = 140;
    const trackW = 225;

    return {
      rowY: y,
      rowH,
      iconX: 24,
      iconY: y + 10,
      pressX: 72,
      pressY: y + rowH / 2 + 8,
      trackX,
      trackY: y,
      trackW,
      trackH: barH,
      targetX: trackX,
      targetY: y + 2,
      targetW: 9.6,
      targetH: barH - 4
    };
  }

  function updateFightQte() {
    const qte = state.fightQte;

    qte.timer++;

    if (!qte.finished && qte.nextOrderIndex < qte.order.length) {
      qte.spawnTimer--;

      if (qte.spawnTimer <= 0) {
        const actionIndex = qte.order[qte.nextOrderIndex];
        const action = qte.actions[actionIndex];
        const actor = state.party[action.actorIndex];

        if (actor) {
          const layout = fightQteLayoutForRow(action.actorIndex);
          qte.activeBars.push({
            actionIndex,
            actorIndex: action.actorIndex,
            targetIndex: Number.isInteger(action.targetIndex) ? action.targetIndex : 0,
            x: layout.trackX + layout.trackW,
            speed: 5.4,
            locked: false
          });
        }

        qte.nextOrderIndex++;
        qte.spawnTimer = 20 + Math.floor(Math.random() * 21);
      }
    }

    for (const bar of qte.activeBars) {
      if (!bar.locked) {
        const layout = fightQteLayoutForRow(bar.actorIndex);
        const stopX = layout.trackX - 24;
        bar.x = Math.max(stopX, bar.x - bar.speed);

        if (bar.x <= stopX) {
          missFightQteBar(bar);
        }
      } else if (bar.justLocked) {
        bar.justLocked = false;
      } else {
        bar.lockAge++;
      }
    }

    qte.damagePopups = qte.damagePopups
      .map((popup) => ({ ...popup, age: popup.age + 1 }))
      .filter((popup) => popup.age < 96);

    const allSpawned = qte.nextOrderIndex >= qte.order.length;
    const allLocked = qte.activeBars.length === qte.actions.length &&
      qte.activeBars.every((bar) => bar.locked);

    const allBurstsFinished = allLocked && qte.activeBars.every((bar) => bar.lockAge >= 30);

    if (!qte.finished && allSpawned && allBurstsFinished) {
      qte.finished = true;
      qte.nextPopupIndex = 0;
      qte.popupSpawnTimer = 0;
    }

    if (qte.finished) {
      if (qte.nextPopupIndex < qte.results.length) {
        qte.popupSpawnTimer--;

        if (qte.popupSpawnTimer <= 0) {
          const popup = { ...qte.results[qte.nextPopupIndex], age: 0 };
          qte.damagePopups.push(popup);
          if (popup.hit) {
            const fightHitCount = qte.results.filter((result) => result.hit).length;
            triggerEnemyHitSprite(fightHitCount > 1 ? 96 : 60);
          }
          qte.nextPopupIndex++;
          qte.popupSpawnTimer = 20;
        }
      }

      if (qte.nextPopupIndex >= qte.results.length && qte.damagePopups.length === 0) {
        finishFightQte();
      }
    }
  }

  function lockNextFightQteBar() {
    const bar = state.fightQte.activeBars.find((entry) => !entry.locked);

    if (!bar) return;

    const actor = state.party[bar.actorIndex];
    const layout = fightQteLayoutForRow(bar.actorIndex);
    const targetCenter = layout.targetX + layout.targetW / 2;
    const distance = Math.abs(bar.x - targetCenter);
    const critRadius = layout.targetW * FIGHT_QTE_CRIT_RADIUS_RATIO;
    const falloffDistance = Math.max(1, layout.trackW * FIGHT_QTE_FALLOFF_TRACK_RATIO);
    const falloffProgress = clamp((distance - critRadius) / falloffDistance, 0, 1);
    const damageQuality = Math.pow(1 - falloffProgress, FIGHT_QTE_FALLOFF_POWER);
    const damageMultiplier = FIGHT_QTE_MIN_DAMAGE_MULTIPLIER +
      (1 - FIGHT_QTE_MIN_DAMAGE_MULTIPLIER) * damageQuality;
    const baseDamage = actor.damage * playerDamageMultiplier(actor);
    const damage = Math.max(1, Math.round(baseDamage * damageMultiplier));
    const popup = enemyDamagePopupPosition(bar.actorIndex);

    bar.locked = true;
    bar.lockAge = 0;
    bar.justLocked = true;
    bar.damage = damage;
    const damageResult = applyEnemyDamage(damage, bar.targetIndex);
    state.fightQte.results.push({
      text: `${damage}`,
      hit: true,
      bonusDamage: damageResult.bonusDamage,
      color: actor.secondaryColor || actor.cardColor || "#fff",
      x: popup.x,
      y: popup.y
    });
    playSound(sounds.attackLand);
  }

  function missFightQteBar(bar) {
    const actor = state.party[bar.actorIndex];
    const popup = enemyDamagePopupPosition(bar.actorIndex);

    bar.locked = true;
    bar.lockAge = 30;
    bar.damage = 0;
    bar.missed = true;
    state.fightQte.results.push({
      text: "MISS",
      color: actor.secondaryColor || actor.cardColor || "#fff",
      x: popup.x,
      y: popup.y
    });
  }

  function finishFightQte() {
    state.fightQte.damagePopups = [];

    if (state.enemyHP <= 0) {
      if (!state.phase2Started && beginPhase2Transition()) return;

      stopCurrentMusic();
      beginDefeatDissolve();
      return;
    }

    beginEnemyTurn();
  }

  function syncLegacyPlayerHP() {
    state.playerHP = partyHP();
    state.maxHP = partyMaxHP();
  }

  function damageRandomLivingPlayer(amount) {
    const living = livingPartyMembers();

    if (living.length === 0) return null;

    const interceptor = living.find((player) => player.runtime?.prioritizesIncomingDamage?.({ player, state }));
    const target = interceptor || living[Math.floor(Math.random() * living.length)];
    const baseDamage = Math.max(0, Number.isFinite(amount) ? amount : 0);
    const damage = baseDamage > 0
      ? target.runtime?.modifyIncomingDamage?.({ player: target, damage: baseDamage, state })
        ?? Math.max(1, Math.round(baseDamage))
      : 0;

    recordPartyStrike();
    target.hp = Math.max(0, target.hp - damage);
    if (target.hp <= 0) resetDownedPlayerEffects(target);
    syncLegacyPlayerHP();
    return target;
  }

  function recordPartyStrike() {
    for (const effect of state.persistentEffects) {
      if (effect.mode !== "retaliate") continue;
      const actor = state.party.find((player) => player.name === effect.actorName);
      if (actor?.hp > 0) effect.pendingHits++;
    }
  }

  function resetDownedPlayerEffects(player) {
    if (!player) return;

    player.runtime?.onDowned?.({ player, state });
    removePersistentLayersForPlayer(player);
  }

  function removePersistentLayersForPlayer(player) {
    if (!player) return;

    for (const effect of state.persistentEffects) {
      if (effect.actorName !== player.name || !effect.displayAsCompanion) continue;

      state.persistentLayerFades.push({
        actorIndex: state.party.indexOf(player),
        actorName: effect.actorName,
        sprite: effect.sprite,
        startedFrame: state.frame
      });
    }

    state.persistentEffects = state.persistentEffects.filter((effect) =>
      effect.actorName !== player.name || !effect.displayAsCompanion
    );
  }

  function randomLowestHpPartyIndex() {
    const participatingIndexes = state.party
      .map((player, index) => partyMemberParticipates(player, index) ? index : -1)
      .filter((index) => index !== -1);
    if (participatingIndexes.length === 0) return -1;

    const injuredIndexes = participatingIndexes
      .map((index) => state.party[index].hp < state.party[index].maxHP ? index : -1)
      .filter((index) => index !== -1);
    const candidateIndexes = injuredIndexes.length > 0
      ? injuredIndexes
      : participatingIndexes;
    const lowestHP = Math.min(...candidateIndexes.map((index) => state.party[index].hp));
    const tiedIndexes = candidateIndexes.filter((index) => state.party[index].hp === lowestHP);

    return tiedIndexes[Math.floor(Math.random() * tiedIndexes.length)];
  }

  function consumePartyDamageGuard() {
    const consumed = state.party.some((player, index) =>
      partyMemberParticipates(player, index) &&
      player.runtime?.consumeDamageGuard?.({ player, state }) === true
    );
    if (consumed) playSound(sounds.shieldBlock);
    return consumed;
  }

  function healPartyMember(index, amount) {
    return healExactPartyMember(index, amount);
  }

  function healExactPartyMember(index, amount) {
    const target = state.party[index];

    if (!target || !partyMemberParticipates(target, index)) return 0;

    const heal = Math.min(amount, target.maxHP - target.hp);
    target.hp += heal;
    syncLegacyPlayerHP();
    return heal;
  }

  function partyIsDefeated() {
    return livingPartyMembers().length === 0;
  }

  function createActs(bossData) {
    if (Array.isArray(bossData.acts)) {
      const acts = bossData.acts
        .filter((act) => act && typeof act.name === "string")
        .map((act) => ({
          name: act.name,
          dialog: typeof act.dialog === "string" ? act.dialog : bossData.actMessage
        }))
        .slice(0, 4);

      if (acts.length > 0) return acts;
    }

    return [{
      name: "Check",
      dialog: typeof bossData.actMessage === "string" ? bossData.actMessage : "* Nothing happens."
    }];
  }

  function currentActs() {
    return createActs(currentBossData());
  }

  function currentActorActs() {
    const actor = state.party[state.partyTurnIndex];
    if (!actor) return [];
    const encounterActs = getEncounterRuntime?.()?.additionalPlayerActs?.({
      state,
      actor,
      partyIndex: state.partyTurnIndex
    });
    return [
      ...(Array.isArray(actor.acts) ? actor.acts : []),
      ...(Array.isArray(actor.grantedActs) ? actor.grantedActs : []),
      ...createPlayerActs(Array.isArray(encounterActs) ? encounterActs : [])
    ];
  }

  function grantEnemyPostFinaleActs() {
    if (!state.enemyPostFinaleReached) return;

    const grants = currentBossData().postFinaleActs;
    const recipient = state.party[0];
    if (!recipient || !Array.isArray(grants)) return;

    for (const act of createPlayerActs(grants)) {
      if (recipient.grantedActs.some((existing) => existing.name === act.name)) continue;
      recipient.grantedActs.push(act);
    }
  }

  function selectedActorAct() {
    const acts = currentActorActs();
    return acts[state.selectedAct] || null;
  }

  function canAffordAct(act) {
    if (!act || state.tp < act.tpCost) return false;
    const actor = state.party[state.partyTurnIndex];
    if (actor && actor.hp < act.hpCost) return false;
    if (act.once && actor?.usedActs.has(act.name)) return false;
    if (typeof act.available === "function" && !act.available({ state, actor, act })) return false;
    if (act.effect === "nextTurnDamageBuff" && actor?.temporaryDamageBuffTurns > 0) return false;
    if (act.requiresAllPartyAlive && livingPartyMembers().length !== participatingPartyMembers().length) return false;
    if (act.effect !== "persistent") return true;

    return !state.persistentEffects.some((effect) =>
      effect.id === act.persistentId && effect.actorName === actor?.name
    );
  }

  function currentActConditions() {
    const acts = currentActs();
    const conditions = currentBossData().actConditions;

    if (!Array.isArray(conditions)) return [];

    return conditions
      .filter((condition) =>
        condition &&
        Number.isInteger(condition.act) &&
        condition.act >= 1 &&
        condition.act <= acts.length &&
        typeof condition.dialog === "string"
      )
      .map((condition) => ({
        act: condition.act,
        dialog: condition.dialog
      }));
  }

  function canMercyCurrentEnemy() {
    const conditions = currentActConditions();
    const defaultValue = state.actConditionIndex >= conditions.length;
    return getEncounterRuntime?.()?.canMercy?.({ state, defaultValue }) ?? defaultValue;
  }


    return {
      advancePartyTurnOrResolve, canAffordAct, canMercyCurrentEnemy,
      clearPartyCommand, consumePartyDamageGuard, currentActorActs,
      damageRandomLivingPlayer, damageSpellActorCenter, damageSpellEnemyCenter,
      fightQteLayoutForRow, grantEnemyPostFinaleActs, lockNextFightQteBar,
      lockPartyAction, partyIsDefeated, previousLivingPartyIndex,
      partyMemberParticipates, resetPartyCommands, resolveQueuedPartyActions, selectedActorAct,
      syncLegacyPlayerHP, updateDamageSpell, updateFightQte,
      updatePersistentEffect, updatePlayerEffect
    };
  }

  window.SoulBattle.partyActions = { createPartyActions };
})();

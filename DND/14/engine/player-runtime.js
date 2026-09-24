(() => {
  "use strict";

  window.SoulBattle = window.SoulBattle || {};

  const definitions = Array.isArray(window.PLAYER_DATA) ? window.PLAYER_DATA : [];
  window.PLAYER_DATA = definitions;

  function register(definition) {
    if (!definition || typeof definition !== "object" || typeof definition.name !== "string") {
      throw new TypeError("Player registration requires a named definition.");
    }
    if (definitions.some((player) => player.name === definition.name)) {
      throw new Error(`Player already registered: ${definition.name}`);
    }
    definitions.push(definition);
    return definition;
  }

  function get(name) {
    return definitions.find((player) => player.name === name) || null;
  }

  function list() {
    return definitions.slice();
  }

  function normalizeActs(acts) {
    if (!Array.isArray(acts)) return [];
    return acts.filter((act) => act && typeof act.name === "string").map((act) => ({
      name: act.name,
      description: typeof act.description === "string" ? act.description : "",
      tpCost: Number.isFinite(act.tpCost) ? Math.max(0, act.tpCost) : 0,
      hpCost: Number.isFinite(act.hpCost) ? Math.max(0, act.hpCost) : 0,
      once: act.once === true,
      target: act.target === "enemy" ? "enemy" : act.target === "none" ? "none" : "ally",
      effect: typeof act.effect === "string" ? act.effect : "none",
      script: typeof act.script === "string" ? act.script : null,
      sprite: typeof act.sprite === "string" ? act.sprite : null,
      persistentId: typeof act.persistentId === "string" ? act.persistentId : null,
      persistentGroup: typeof act.persistentGroup === "string" ? act.persistentGroup : null,
      persistentSprite: typeof act.persistentSprite === "string" ? act.persistentSprite : null,
      heal: Number.isFinite(act.heal) ? act.heal : 0,
      downHeal: Number.isFinite(act.downHeal) ? act.downHeal : null,
      damage: Number.isFinite(act.damage) ? act.damage : 0,
      damageMultiplier: Number.isFinite(act.damageMultiplier) ? act.damageMultiplier : 1,
      baseDamageBonus: Number.isFinite(act.baseDamageBonus) ? act.baseDamageBonus
        : Number.isFinite(act.damageMultiplier) ? Math.max(0, act.damageMultiplier - 1) : 0,
      damageResistance: Number.isFinite(act.damageResistance) ? Math.max(0, Math.min(1, act.damageResistance)) : 0,
      defendTPBonus: Number.isFinite(act.defendTPBonus) ? act.defendTPBonus : 0,
      popupText: typeof act.popupText === "string" ? act.popupText : null,
      menuColor: typeof act.menuColor === "string" ? act.menuColor : null,
      menuGlowColor: typeof act.menuGlowColor === "string" ? act.menuGlowColor : null,
      popupColor: typeof act.popupColor === "string" ? act.popupColor : null,
      popupGlowColor: typeof act.popupGlowColor === "string" ? act.popupGlowColor : null,
      requiresAllPartyAlive: act.requiresAllPartyAlive === true,
      teamAction: act.teamAction === true,
      mercyEnemyDialog: typeof act.mercyEnemyDialog === "string" ? act.mercyEnemyDialog : null,
      mercyFadeDuration: Number.isFinite(act.mercyFadeDuration) ? act.mercyFadeDuration : null,
      persistsWhenDown: act.persistsWhenDown === true,
      persistentMode: typeof act.persistentMode === "string" ? act.persistentMode : "damage",
      persistentSoundKey: typeof act.persistentSoundKey === "string" ? act.persistentSoundKey : null,
      displayAsCompanion: act.displayAsCompanion === true,
      available: typeof act.available === "function" ? act.available : null,
      resolve: typeof act.resolve === "function" ? act.resolve : null,
      beginDamage: typeof act.beginDamage === "function" ? act.beginDamage : null,
      onDamageApplied: typeof act.onDamageApplied === "function" ? act.onDamageApplied : null,
      soundKey: typeof act.soundKey === "string" ? act.soundKey : null,
      customEffect: act.customEffect === true,
      darken: act.darken !== false,
      drawEffect: typeof act.drawEffect === "function" ? act.drawEffect : null
    })).slice(0, 6);
  }

  window.SoulBattle.players = { register, get, list };
  window.SoulBattle.playerRuntime = { normalizeActs };
})();

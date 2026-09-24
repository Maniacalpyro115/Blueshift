(() => {
  "use strict";

  window.SoulBattle = window.SoulBattle || {};
  const { ATTACK_TYPE, BOX_RECT } = window.SoulBattle.constants;

  const soulColors = {
    [ATTACK_TYPE.NORMAL]: "#ff1e35",
    [ATTACK_TYPE.PURPLE]: "#9d5cff",
    [ATTACK_TYPE.BLUE]: "#39a7ff",
    [ATTACK_TYPE.GREEN]: "#25d65f",
    [ATTACK_TYPE.COMPACT]: "#ff1e35",
    [ATTACK_TYPE.ULTIMATE]: "#ff1e35"
  };

  function soulColor(type) {
    return soulColors[type] || soulColors[ATTACK_TYPE.NORMAL];
  }

  function boxFor(type, configuredBox) {
    if (configuredBox) return configuredBox;
    if (type === ATTACK_TYPE.ULTIMATE) return BOX_RECT.FULL;
    if (type === ATTACK_TYPE.GREEN) return BOX_RECT.GREEN;
    if (type === ATTACK_TYPE.COMPACT) return BOX_RECT.COMPACT;
    return BOX_RECT.BATTLE;
  }

  function placeSoul(state, purpleLineYs) {
    state.soul.x = state.box.x + state.box.w / 2;
    state.soul.lane = 1;
    state.soul.vy = 0;
    state.soul.pitBounce = false;
    if (state.attackType === ATTACK_TYPE.PURPLE) state.soul.y = purpleLineYs[state.soul.lane];
    else if (state.attackType === ATTACK_TYPE.BLUE) state.soul.y = state.box.y + state.box.h - state.soul.r;
    else state.soul.y = state.box.y + state.box.h / 2;
    if (state.attackType === ATTACK_TYPE.GREEN) state.shieldDirection = "up";
  }

  window.SoulBattle.defense = { soulColor, boxFor, placeSoul };
})();

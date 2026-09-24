window.SoulBattle.players.register({
  name: "BUCKY",
  maxHP: 50,
  hp: 50,
  cardColor: "#168aad",
  secondaryColor: "#67c9e8",
  sprites: {
    default: "sprites/characters/bucky/default/default_0001.png",
    down: "sprites/characters/bucky/down.png",
    icon: "sprites/characters/bucky/icon.png",
    action: "sprites/characters/bucky/action.png",
    attack: "sprites/characters/bucky/attack.png",
    item: "sprites/characters/bucky/item.png",
    beast_sitting: "sprites/characters/bucky/misc/sitting.png",
    beast_attack: "sprites/characters/bucky/misc/attack.png",
    beast_nap: "sprites/characters/bucky/misc/nap.png"
  },
  defaultAnimation: {
    frames: [
      "sprites/characters/bucky/default/default_0001.png",
      "sprites/characters/bucky/default/default_0002.png",
      "sprites/characters/bucky/default/default_0003.png",
      "sprites/characters/bucky/default/default_0004.png",
      "sprites/characters/bucky/default/default_0005.png"
    ],
    fps: 2
  },
  spriteScale: 1.5,
  defendTP: 14,
  damage: 15,
  selectionSummary: "A versatile summoner who brings a beast into battle, then commands it to charge enemies or block incoming damage.",
  runtime: {
    createState: () => ({ summoned: false, summonedFrame: 0, dodgeArmed: false, dodgePopupTimer: -1 }),
    onRoundStart: ({ player }) => { player.runtimeState.dodgeArmed = false; },
    onReset: ({ player }) => { player.runtimeState = player.runtime.createState(); },
    update: ({ player }) => {
      if (player.runtimeState.dodgePopupTimer < 0) return;
      player.runtimeState.dodgePopupTimer++;
      if (player.runtimeState.dodgePopupTimer >= 90) player.runtimeState.dodgePopupTimer = -1;
    },
    consumeDamageGuard: ({ player }) => {
      const beast = player.runtimeState;
      if (!beast.summoned || !beast.dodgeArmed) return false;
      beast.dodgeArmed = false;
      beast.dodgePopupTimer = 0;
      return true;
    },
    companionPosition: ({ player, actorIndex }) => {
      const baseSize = 78;
      const actorSize = baseSize * player.spriteScale;
      const actorX = 93 + (baseSize - actorSize) / 2;
      const actorY = 78 + actorIndex * 124 + (baseSize - actorSize) / 2;
      const size = 105;
      return { x: actorX + actorSize - 40, napX: actorX + (actorSize - size) / 2,
        y: actorY + actorSize - size, size, actorIndex };
    },
    drawPartyLayer: ({ layer, state, player, actorIndex, ctx, clamp, playerSpriteForRole }) => {
      if (layer !== "front") return;
      const beast = player.runtimeState;
      if (!beast.summoned) return;
      const position = player.runtime.companionPosition({ player, actorIndex });
      let alpha = clamp((state.frame - beast.summonedFrame) / 24, 0, 1);
      const charging = state.phase === "spellAction" && state.spellAction.action?.act?.script === "beastCharge";
      if (charging) alpha = state.spellAction.timer < 78 ? 0 : clamp((state.spellAction.timer - 78) / 24, 0, 1);
      if (alpha <= 0) return;
      const down = player.hp <= 0;
      const sprite = playerSpriteForRole(player, down ? "beast_nap" : "beast_sitting");
      if (!sprite) return;
      const x = down ? position.napX : position.x;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(sprite, x, position.y, position.size, position.size);
      ctx.restore();
      const timer = beast.dodgePopupTimer;
      if (timer < 0) return;
      const enter = clamp(timer / 12, 0, 1);
      const exit = clamp((timer - 60) / 30, 0, 1);
      ctx.save();
      ctx.globalAlpha = enter * (1 - exit);
      ctx.font = "bold 27px Courier New";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#000";
      ctx.fillStyle = "#fff";
      const popupX = x + position.size / 2 - 38 * (1 - enter) + 52 * exit;
      ctx.strokeText("dodge", popupX, position.y - 8);
      ctx.fillText("dodge", popupX, position.y - 8);
      ctx.restore();
    }
  },
  acts: [
    {
      name: "Check",
      description: "Inspect the enemy",
      tpCost: 0,
      target: "none",
      effect: "check"
    },
    {
      name: "Summon Beast",
      description: "Summon powerful beast to command",
      tpCost: 60,
      target: "none",
      effect: "summonBeast",
      available: ({ actor }) => !actor.runtimeState.summoned,
      resolve: ({ state, actor }) => {
        actor.runtimeState.summoned = true;
        actor.runtimeState.summonedFrame = state.frame;
        return `* ${actor.name} summoned a powerful beast.`;
      }
    },
    {
      name: "Command - Charge",
      description: "Command beast to charge enemy",
      tpCost: 0,
      target: "enemy",
      effect: "damage",
      script: "beastCharge",
      damage: 30,
      available: ({ actor }) => actor.runtimeState.summoned,
      customEffect: true,
      darken: false,
      drawEffect: ({ ctx, state, action, timer, clamp, lerp, easeInOutCubic,
        damageSpellEnemyCenter, playerSpriteForRole }) => {
        if (timer >= 66) return;
        const actor = state.party[action.actorIndex];
        const sprite = actor ? playerSpriteForRole(actor, "beast_attack") : null;
        const companion = actor?.runtime?.companionPosition?.({ player: actor, actorIndex: action.actorIndex });
        if (!sprite || !companion) return;
        const start = { x: companion.x + companion.size / 2, y: companion.y + companion.size / 2 };
        const end = damageSpellEnemyCenter();
        const progress = easeInOutCubic(clamp((timer - 8) / 58, 0, 1));
        const x = lerp(start.x, end.x, progress);
        const y = lerp(start.y, end.y, progress) - Math.sin(progress * Math.PI) * 115;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(lerp(-0.08, 0.16, progress));
        ctx.drawImage(sprite, -66, -66, 132, 132);
        ctx.restore();
      }
    },
    {
      name: "Command - Dodge",
      description: "Command beast to block first damage this turn",
      tpCost: 20,
      target: "none",
      effect: "beastDodge",
      available: ({ actor }) => actor.runtimeState.summoned,
      resolve: ({ actor }) => {
        actor.runtimeState.dodgeArmed = true;
        actor.runtimeState.dodgePopupTimer = -1;
        return `* ${actor.name} commanded the beast to guard the party.`;
      }
    }
  ]
});

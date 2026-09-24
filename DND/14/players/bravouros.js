window.SoulBattle.players.register({
  name: "BRAVOURÖS",
  maxHP: 45,
  hp: 45,
  cardColor: "#199428",
  secondaryColor: "#62cf72",
  sounds: { spellCast: "sounds/snd_spellcast.wav" },
  sprites: {
    default: "sprites/characters/bravouros/default.png",
    down: "sprites/characters/bravouros/down.png",
    icon: "sprites/characters/bravouros/icon.png",
    action: "sprites/characters/bravouros/action.png",
    starry_archer: "sprites/characters/bravouros/misc/archer/default_0001.png",
    starry_chalice: "sprites/characters/bravouros/misc/chalice/default_0001.png",
    attack: "sprites/characters/bravouros/attack.png",
    item: "sprites/characters/bravouros/item.png"
  },
  defaultAnimation: {
    frames: [
      "sprites/characters/bravouros/default/default_0001.png",
      "sprites/characters/bravouros/default/default_0002.png",
      "sprites/characters/bravouros/default/default_0003.png",
      "sprites/characters/bravouros/default/default_0004.png",
      "sprites/characters/bravouros/default/default_0005.png"
    ],
    fps: 2
  },
  spriteAnimations: {
    starry_archer: {
      frames: [
        "sprites/characters/bravouros/misc/archer/default_0001.png",
        "sprites/characters/bravouros/misc/archer/default_0002.png",
        "sprites/characters/bravouros/misc/archer/default_0003.png",
        "sprites/characters/bravouros/misc/archer/default_0004.png",
        "sprites/characters/bravouros/misc/archer/default_0005.png"
      ],
      fps: 2
    },
    starry_chalice: {
      frames: [
        "sprites/characters/bravouros/misc/chalice/default_0001.png",
        "sprites/characters/bravouros/misc/chalice/default_0002.png",
        "sprites/characters/bravouros/misc/chalice/default_0003.png",
        "sprites/characters/bravouros/misc/chalice/default_0004.png",
        "sprites/characters/bravouros/misc/chalice/default_0005.png"
      ],
      fps: 2
    }
  },
  spriteScale: 1.5,
  defendTP: 17,
  damage: 14,
  selectionSummary: "A flexible support caster who can heal, sustain the party with a Starry Form, or mark the enemy for amplified follow-up damage.",
  runtime: {
    drawPartyLayer: ({ layer, state, player, actorIndex, ctx, clamp, playerSpriteForRole }) => {
      if (layer !== "behind") return;
      const drawCompanion = (entry, alpha, resolvedIndex = actorIndex) => {
        const baseSize = 78;
        const actorSize = baseSize * player.spriteScale;
        const actorTop = 78 + resolvedIndex * 124 + (baseSize - actorSize) / 2;
        const size = 105;
        const sprite = playerSpriteForRole(player, entry.sprite);
        if (!sprite) return;
        ctx.save();
        ctx.globalAlpha *= alpha;
        ctx.drawImage(sprite, 111, actorTop + actorSize - size, size, size);
        ctx.restore();
      };
      for (const effect of state.persistentEffects) {
        if (!effect.displayAsCompanion || effect.actorName !== player.name || player.hp <= 0) continue;
        drawCompanion(effect, 1);
      }
      state.persistentLayerFades = state.persistentLayerFades.filter((effect) => {
        if (effect.actorName !== player.name) return true;
        const progress = clamp((state.frame - effect.startedFrame) / 45, 0, 1);
        if (progress >= 1) return false;
        drawCompanion(effect, 1 - progress, effect.actorIndex);
        return true;
      });
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
      name: "Cure Wounds",
      description: "Restores 15 HP to one player",
      tpCost: 20,
      target: "ally",
      effect: "heal",
      heal: 15,
      popupText: "+hp"
    },
    {
      name: "Starry Form Archer",
      description: "Attacks every turn. Fades when down. Only one Starry Form may be active.",
      tpCost: 8,
      target: "enemy",
      effect: "persistent",
      script: "starryFormArcher",
      persistentId: "starryFormArcher",
      persistentGroup: "starryForm",
      persistentSprite: "starry_archer",
      displayAsCompanion: true,
      damage: 16
    },
    {
      name: "Starry Form Chalice",
      description: "Heals lowest HP player every turn. Fades when down. Only one Starry Form may be active.",
      tpCost: 8,
      target: "none",
      effect: "persistent",
      script: "starryFormChalice",
      persistentId: "starryFormChalice",
      persistentGroup: "starryForm",
      persistentSprite: "starry_chalice",
      persistentMode: "healLowest",
      displayAsCompanion: true,
      heal: 6
    },
    {
      name: "Guiding Bolt",
      description: "Deal Medium Damage. First attack on target next turn deals 25% more damage",
      tpCost: 32,
      target: "enemy",
      effect: "damage",
      script: "guidingBolt",
      damage: 25,
      soundKey: "spellCast",
      customEffect: true,
      drawEffect: ({ ctx, action, timer, clamp, damageSpellActorCenter, damageSpellEnemyCenter }) => {
        const start = damageSpellActorCenter(action.actorIndex);
        const end = damageSpellEnemyCenter();
        for (let i = 0; i < 4; i++) {
          const progress = clamp((timer - 8 - i * 3) / (58 - i * 3), 0, 1);
          if (progress <= 0 || progress >= 1) continue;
          const spread = (i - 1.5) * 10;
          const control = { x: start.x + 42 + i * 7, y: start.y + (i % 2 === 0 ? -1 : 1) * (72 + i * 9) };
          const pointAt = (t) => {
            const inverse = 1 - t;
            return {
              x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
              y: inverse * inverse * (start.y + spread) + 2 * inverse * t * control.y + t * t * end.y
            };
          };
          const head = pointAt(progress);
          const tail = pointAt(Math.max(0, progress - 0.16));
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = i % 2 === 0 ? "#fffbd1" : "#ffe985";
          ctx.lineWidth = 4;
          ctx.lineCap = "round";
          ctx.shadowColor = "#fff6a8";
          ctx.shadowBlur = 18;
          ctx.beginPath();
          ctx.moveTo(tail.x, tail.y);
          ctx.lineTo(head.x, head.y);
          ctx.stroke();
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(head.x, head.y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      },
      onDamageApplied: ({ state, action }) => {
        state.enemyDamageMarks.push({
          targetIndex: Number.isInteger(action.targetIndex) ? action.targetIndex : 0,
          bonusMultiplier: 0.25,
          pending: true,
          active: false
        });
      }
    }
  ]
});

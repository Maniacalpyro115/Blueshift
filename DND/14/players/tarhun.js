window.SoulBattle.players.register({
  name: "TARHUN",
  maxHP: 65,
  hp: 65,
  cardColor: "#fffdd0",
  secondaryColor: "#fffdd0",
  sprites: {
    default: "sprites/characters/tarhun/default/default_0001.png",
    down: "sprites/characters/tarhun/down.png",
    icon: "sprites/characters/tarhun/icon.png",
    attack: "sprites/characters/tarhun/attack.png",
    rage: "sprites/characters/tarhun/rage/rage-v2_0001.png",
    "rage-item": "sprites/characters/tarhun/rage-item.png",
    "rage-attack": "sprites/characters/tarhun/rage-attack.png",
    reckless: "sprites/characters/tarhun/reckless.png",
    item: "sprites/characters/tarhun/item.png"
  },
  defaultAnimation: {
    frames: [
      "sprites/characters/tarhun/default/default_0001.png",
      "sprites/characters/tarhun/default/default_002.png",
      "sprites/characters/tarhun/default/default_0003.png",
      "sprites/characters/tarhun/default/default_0004.png",
      "sprites/characters/tarhun/default/default_0005.png"
    ],
    fps: 2
  },
  spriteAnimations: {
    rage: {
      frames: [
        "sprites/characters/tarhun/rage/rage-v2_0001.png",
        "sprites/characters/tarhun/rage/rage-v2_0002.png",
        "sprites/characters/tarhun/rage/rage-v2_0003.png",
        "sprites/characters/tarhun/rage/rage-v2_0004.png",
        "sprites/characters/tarhun/rage/rage-v2_0005.png",
        "sprites/characters/tarhun/rage/rage-v2_0006.png",
        "sprites/characters/tarhun/rage/rage-v2_0007.png"
      ],
      fps: 2
    }
  },
  spriteScale: 1.5,
  preserveBattleSpriteAspectRatio: true,
  battleSpriteRoleScales: {
    attack: 1.53,
    "rage-attack": 1.53
  },
  defendTP: 15,
  damage: 13,
  selectionSummary: "A frontline bruiser who grows stronger and tougher with Rage. He can intercept attacks, trade safety for heavy damage, and retaliate when allies are struck.",
  runtime: {
    modifyOutgoingDamage: ({ player, multiplier }) => multiplier +
      (player.rageActive && Number.isFinite(player.rageBaseDamageBonus) ? player.rageBaseDamageBonus : 0),
    modifyIncomingDamage: ({ player, damage }) => Math.max(1, Math.round(
      damage * (player.rageActive ? 1 - player.rageResistance : 1) * (player.recklessVulnerable ? 2 : 1)
    )),
    prioritizesIncomingDamage: ({ player }) => player.intercepting,
    onRoundStart: ({ player }) => {
      player.recklessVulnerable = false;
      player.intercepting = false;
    },
    onDowned: ({ player }) => {
      player.rageActive = false;
      player.rageBaseDamageBonus = 0;
      player.rageResistance = 0;
      player.recklessVulnerable = false;
      player.intercepting = false;
    },
    spriteRole: ({ player, idleRole, actionRole }) => {
      const rageIdle = player.rageActive && player.spriteKeys.rage ? "rage" : idleRole;
      if (player.rageActive && actionRole === "item" && player.spriteKeys["rage-item"]) return "rage-item";
      if (player.rageActive && actionRole === "attack" && player.spriteKeys["rage-attack"]) return "rage-attack";
      return actionRole || rageIdle;
    }
  },
  acts: [
    {
      name: "Rage",
      description: "Gain 20% resistance and 20% base damage until downed",
      tpCost: 0,
      target: "none",
      effect: "rage",
      baseDamageBonus: 0.2,
      damageResistance: 0.2,
      available: ({ actor }) => !actor.rageActive,
      resolve: ({ actor, act }) => {
        actor.rageActive = true;
        actor.rageBaseDamageBonus = act.baseDamageBonus;
        actor.rageResistance = act.damageResistance;
        return `* ${actor.name} used ${act.name}. Their damage and resistance increased.`;
      }
    },
    {
      name: "Reckless Attack",
      description: "High damage slash. Tarhun takes double damage this turn",
      tpCost: 20,
      target: "enemy",
      effect: "damage",
      script: "recklessAttack",
      sprite: "reckless",
      damage: 40,
      beginDamage: ({ actor }) => { actor.recklessVulnerable = true; }
    },
    {
      name: "Interception",
      description: "All attacks target Tarhun first this turn",
      tpCost: 12,
      target: "none",
      effect: "interception",
      resolve: ({ actor, act }) => {
        actor.intercepting = true;
        return `* ${actor.name} used ${act.name}. They moved to protect the party.`;
      }
    },
    {
      name: "Attack of Oppurtunity",
      description: "Whenever a party member is struck, deal damage back the following turn",
      tpCost: 60,
      target: "enemy",
      effect: "persistent",
      script: "attackOfOpportunity",
      persistentId: "attackOfOpportunity",
      persistentMode: "retaliate",
      damage: 5,
      once: true,
      persistsWhenDown: true
    }
  ]
});

window.SoulBattle.players.register({
  name: "THANOS",
  maxHP: 55,
  hp: 55,
  cardColor: "#f57063",
  secondaryColor: "#ff9ca6",
  sounds: { chainsaw: "sounds/snd_chainsaw.mp3" },
  sprites: {
    default: "sprites/characters/thanos/default.png",
    down: "sprites/characters/thanos/down.png",
    icon: "sprites/characters/thanos/icon.png",
    action: "sprites/characters/thanos/action.png",
    holy_chainsaw: "sprites/characters/thanos/misc/holy-chainsaw.png",
    attack: "sprites/characters/thanos/attack.png",
    item: "sprites/characters/thanos/item.png"
  },
  defaultAnimation: {
    frames: [
      "sprites/characters/thanos/default/default_0001.png",
      "sprites/characters/thanos/default/default_0002.png",
      "sprites/characters/thanos/default/default_0003.png",
      "sprites/characters/thanos/default/default_0004.png",
      "sprites/characters/thanos/default/default_0005.png"
    ],
    fps: 2
  },
  spriteScale: 1.5,
  defendTP: 16,
  damage: 14,
  selectionSummary: "A team-focused support who strengthens allies, revives fallen party members, and improves their DEFEND TP. Spiritual Weapon adds lasting damage.",
  acts: [
    {
      name: "Check",
      description: "Inspect the enemy",
      tpCost: 0,
      target: "none",
      effect: "check"
    },
    {
      name: "Bless",
      description: "Permenantly empower target by 25% base damage",
      tpCost: 40,
      target: "ally",
      effect: "damageBuff",
      baseDamageBonus: 0.25,
      popupText: "+dmg"
    },
    {
      name: "Cure Wounds",
      description: "Restore 15 (30 if down) HP to one player",
      tpCost: 20,
      target: "ally",
      effect: "heal",
      heal: 15,
      downHeal: 30,
      popupText: "+hp"
    },
    {
      name: "Shield of Faith",
      description: "Increase TP target player gains from DEFEND",
      tpCost: 0,
      target: "ally",
      effect: "defendTPBuff",
      defendTPBonus: 5,
      popupText: "+tp"
    },
    {
      name: "Spiritual Weapon",
      description: "Spawn a persistent magic weapon",
      tpCost: 80,
      target: "enemy",
      effect: "persistent",
      script: "spiritualWeapon",
      persistentId: "spiritualWeapon",
      persistentSprite: "holy_chainsaw",
      persistentSoundKey: "chainsaw",
      damage: 12
    }
  ]
});

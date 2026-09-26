"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");

function loadEnemy(name) {
  const context = vm.createContext({ window: {}, console, Math });
  const source = fs.readFileSync(path.join(ROOT, "enemies", `${name}.js`), "utf8");
  vm.runInContext(source, context, { filename: `${name}.js` });
  return context.window.ENEMY_DATA;
}

function signature(turn) {
  const attack = turn?.attack || turn;
  return [
    attack.pattern?.name || "anonymous",
    attack.type,
    attack.duration,
    attack.damage,
    turn.loop !== false,
    attack.box ? [attack.box.x, attack.box.y, attack.box.w, attack.box.h] : null,
    turn.postFinaleTrigger === true
  ];
}

const expected = {
  dandelion: [
    ["coloredDaggerSequence","normal",630,10,false,[338,148,224,224],false],
    ["randomDaggerWindowBarrage","normal",590,10,false,[338,148,224,224],false],
    ["radiatingNoteWaves","normal",700,10,true,[338,148,224,224],false],
    ["daggerOnslaught","normal",710,10,true,[338,148,224,224],false],
    ["sineNotePackets","normal",700,10,true,[338,148,224,224],false],
    ["whiteDaggerPlatforms","blue",710,10,true,[338,148,224,224],false],
    ["staggeredDaggerSweeps","normal",645,10,true,[338,148,224,224],false],
    ["escalatingDaggerStorm","normal",630,10,true,[338,148,224,224],false],
    ["whiteDaggerCrossfire","blue",710,10,true,[315.6,148,268.8,224],false],
    ["dreamGuardian","purple",1728,10,false,[4,4,892,642],false],
    ["bouncingNotes","normal",640,10,true,[338,148,224,224],false],
    ["arpeggioClimb","blue",972,10,true,[378,44,144,564],false],
    ["blackDaggerFocalBursts","normal",410,10,true,[338,148,224,224],false],
    ["daggerGridCrossfire","normal",900,10,true,[329,139,242,242],false],
    ["rapidBlackDaggerFocalBursts","normal",470,10,true,[338,148,224,224],false],
    ["advancingDaggerOnslaught","normal",610,10,true,[338,148,224,224],false],
    ["outsideBlackDaggerAmbush","normal",540,10,true,[360.4,170.4,179.2,179.2],false]
  ],
  sable: [
    ["desyncedPacketLoss","normal",620,11,false,[338,148,224,224],false],
    ["corruptedCoordinates","normal",570,11,false,[338,148,224,224],false],
    ["rollback","normal",590,12,false,[338,148,224,224],false],
    ["screenTear","normal",570,12,false,[338,148,224,224],false],
    ["missingTexture","normal",580,12,false,[338,148,224,224],false],
    ["lagSpike","normal",590,12,false,[338,148,224,224],false],
    ["errorWindows","normal",590,12,false,[282,148,336,224],false],
    ["cloneSoul","normal",600,12,false,[338,148,224,224],false],
    ["memoryLeak","normal",640,13,false,[338,148,224,224],false],
    ["invertedPacketLoss","normal",560,11,true,[338,148,224,224],false],
    ["predictionError","normal",650,13,true,[338,148,224,224],false],
    ["defragmentation","normal",660,13,true,[338,148,224,224],false],
    ["assetMismatch","normal",680,14,true,[338,148,224,224],false],
    ["homingShieldCorruption","green",720,14,true,[407,217,86,86],false],
    ["glitchWallModeShift","normal",720,14,true,[338,148,224,224],false],
    ["chooseModification","normal",840,14,true,[338,148,224,224],false],
    ["inputDelay","blue",690,14,true,[338,148,224,224],false],
    ["shieldInputPhase","green",680,14,true,[407,217,86,86],false],
    ["raceCondition","normal",700,15,true,[338,148,224,224],false],
    ["finaleCascade","green",1920,15,true,[407,217,86,86],true],
    ["postFinalModification","normal",840,14,true,[338,148,224,224],false]
  ],
  zach: [
    ["barovianWolfLunges","blue",570,15,false,[338,148,224,224],false],
    ["barovianBatRain","blue",590,15,false,[394,148,112,224],false],
    ["treeBlightVolley","blue",620,15,false,[338,148,224,224],false],
    ["descendingDungeon","blue",840,15,false,[338,4,224,642],false],
    ["syncopatedFlameskulls","blue",600,15,false,[338,148,224,224],false],
    ["rhythmGridDance","purple",780,10,false,[338,193,224,134],false],
    ["halfBeatRhythmGridDance","purple",780,10,false,[338,193,224,134],false],
    ["doubledHalfBeatRhythmGridDance","purple",780,10,false,[338,193,224,134],false],
    ["flameskullCrossfire","blue",600,15,false,[338,148,224,224],false],
    ["spikedPlatformBatRain","blue",840,15,true,[338,92,224,336],false],
    ["vampireSoulDance","purple",900,10,false,[293,148,314,224],false],
    ["doubleStepVampireSoulDance","purple",900,10,false,[293,148,314,224],false],
    ["rapidVampireSoulDance","purple",900,10,false,[338,103,224,314],false],
    ["wolvesAndBats","blue",720,15,true,[338,148,224,224],false],
    ["fadingBlightBarrages","blue",840,15,true,[338,148,224,224],false],
    ["risingStarPlatformCourse","blue",900,15,false,[170,112,560,316],false],
    ["freestyleRhythmGrid","purple",780,10,false,[338,193,224,134],false],
    ["vampireLordInitiative","purple",1080,10,false,[203,34,494,494],false],
    ["extendedRhythmGridDance","purple",780,10,true,[338,193,224,134],false],
    ["postBossLineDanceOne","purple",780,10,true,[338,193,224,134],false],
    ["postBossLineDanceTwo","purple",780,10,true,[338,193,224,134],false],
    ["postBossFreestyleGrid","purple",780,10,true,[383,193,134,134],false],
    ["fourVampireSoulDance","purple",900,10,true,[270.5,125.5,359,269],false],
    ["fourVampireDoubleStepDance","purple",900,10,true,[270.5,125.5,359,269],false],
    ["fourVampireRapidDance","purple",900,10,true,[248,103,404,314],false]
  ]
};

for (const name of Object.keys(expected)) {
  const enemy = loadEnemy(name);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(enemy.turns.map(signature))), expected[name]);
}

const expectedSelectablePlayers = {
  zach: ["CARIAN", "BRAVOURÖS", "THANOS", "BUCKY"],
  sable: ["CARIAN", "BRAVOURÖS", "THANOS", "BUCKY", "TARHUN"],
  dandelion: ["CARIAN", "BRAVOURÖS", "THANOS", "BUCKY", "TARHUN"]
};
for (const [name, players] of Object.entries(expectedSelectablePlayers)) {
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(loadEnemy(name).selectablePlayers)),
    players,
    `${name} selectable player roster changed`
  );
}

const dandelion = loadEnemy("dandelion");
assert.strictEqual(loadEnemy("sable").background.pattern, "slantedLines");
assert.strictEqual(loadEnemy("zach").background.pattern, "slantedLines");
assert.strictEqual(dandelion.background.pattern, "confetti");
assert.strictEqual(dandelion.background.confetti.count, 48);
assert.strictEqual(dandelion.background.confetti.alpha, 0.22);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(dandelion.background.confetti.colors)),
  ["#fff", "#ff9de2"]
);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(dandelion.background.effects.map(({ type }) => type))),
  ["spotlights", "stageCircle"]
);
assert.strictEqual(dandelion.background.effects[0].count, 2);
assert.strictEqual(dandelion.background.effects[0].alpha, 0.12);
assert.deepStrictEqual(JSON.parse(JSON.stringify(dandelion.battleDialog)), [
  "A familiar face approaches.",
  "DANDELION appears lost in song.",
  "DANDELION promises the town is only 2 hours away.",
  "DANDELION prepares a chorus",
  "DANDELION reloads his daggers",
  "The BARD readies an attack.",
  "DANDELION awaits your strike."
]);
assert.deepStrictEqual(JSON.parse(JSON.stringify(dandelion.enemyDialog)), []);
assert.strictEqual(dandelion.hitSprite, "hit");
assert.strictEqual(dandelion.sprites.hit, "sprites/enemies/dandelion/hit.png");
assert.strictEqual(dandelion.spriteSizes.hit, 150);
assert.deepStrictEqual(JSON.parse(JSON.stringify(dandelion.spritePositions.hit)), { x: 720, y: 168 });
assert.deepStrictEqual(JSON.parse(JSON.stringify(dandelion.spriteFlips.hit)), { x: true });
assert.strictEqual(dandelion.sprites.down, "sprites/enemies/dandelion/down.png");
assert.strictEqual(dandelion.sprites.sableSit, "sprites/enemies/dandelion/sable_sit.png");
assert.strictEqual(dandelion.spriteSizes.down, 26);
assert.strictEqual(dandelion.spriteSizes.sableSit, 88);
assert.deepStrictEqual(JSON.parse(JSON.stringify(dandelion.spritePositions.down)), { x: 782, y: 292 });
assert.deepStrictEqual(JSON.parse(JSON.stringify(dandelion.spritePositions.sableSit)), { x: 705, y: 214 });
assert.deepStrictEqual(JSON.parse(JSON.stringify(dandelion.spriteFlips.down)), { x: false });
assert.deepStrictEqual(JSON.parse(JSON.stringify(dandelion.spriteFlips.sableSit)), { x: true });
for (const sprite of ["thinking", "daydream", "lovestruck"]) {
  assert.strictEqual(dandelion.sprites[sprite], `sprites/enemies/dandelion/${sprite}.png`);
  assert.strictEqual(dandelion.spriteSizes[sprite], 150);
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(dandelion.spritePositions[sprite])),
    { x: 720, y: 168 }
  );
  assert.deepStrictEqual(JSON.parse(JSON.stringify(dandelion.spriteFlips[sprite])), { x: true });
}
assert.strictEqual(dandelion.sounds.fall, "sounds/snd_fall.wav");
assert.strictEqual(dandelion.sounds.glitch1, "sounds/snd_glitch_1.mp3");
assert.strictEqual(dandelion.defeatSequence.initialSprite, "enemy");
assert.strictEqual(dandelion.defeatSequence.duration, 1010);
const defeatState = {
  encounter: {},
  enemyDialogMessage: "",
  enemyDialogTimer: 0,
  shake: 0
};
const defeatDissolve = {};
const defeatSoundsPlayed = [];
dandelion.defeatSequence.setup({ state: defeatState, dissolve: defeatDissolve });
dandelion.defeatSequence.update({
  state: defeatState,
  dissolve: defeatDissolve,
  timer: 519,
  sounds: { fall: "fall" },
  playSound: (sound) => defeatSoundsPlayed.push(sound)
});
assert.deepStrictEqual(defeatSoundsPlayed, []);
dandelion.defeatSequence.update({
  state: defeatState,
  dissolve: defeatDissolve,
  timer: 520,
  sounds: { fall: "fall" },
  playSound: (sound) => defeatSoundsPlayed.push(sound)
});
dandelion.defeatSequence.update({
  state: defeatState,
  dissolve: defeatDissolve,
  timer: 689,
  sounds: { fall: "fall" },
  playSound: (sound) => defeatSoundsPlayed.push(sound)
});
assert.deepStrictEqual(defeatSoundsPlayed, ["fall"]);
assert.strictEqual(defeatState.encounter.dandelionGenocideEnding.impactTriggered, false);
dandelion.defeatSequence.update({
  state: defeatState,
  dissolve: defeatDissolve,
  timer: 690,
  sounds: { fall: "fall" },
  playSound: (sound) => defeatSoundsPlayed.push(sound)
});
assert.strictEqual(defeatState.encounter.dandelionGenocideEnding.impactTriggered, true);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(
    dandelion.turns[9].event.steps
      .filter(({ type }) => type === "enemyDialog")
      .map(({ type, text }) => ({ type, text }))
  )),
  [
    { type: "enemyDialog", text: "Not bad, my homosexual friends!" },
    { type: "enemyDialog", text: "But its time for y'all to take a snooze." }
  ]
);
assert.strictEqual(dandelion.turns[9].skipEnemyDialog, true);
assert.strictEqual(dandelion.turns[9].event.steps[3].type, "flash");
assert.strictEqual(dandelion.turns[9].event.steps[3].duration, 36);
assert.strictEqual(dandelion.turns[9].attack.instantBox, true);
assert.strictEqual(dandelion.turns[9].attack.warmup, 0);
assert.deepStrictEqual(
  [
    dandelion.turns[1].enemyDialog,
    dandelion.turns[3].enemyDialog,
    dandelion.turns[4].enemyDialog,
    dandelion.turns[5].enemyDialog,
    dandelion.turns[10].enemyDialog,
    dandelion.turns[12].enemyDialog
  ],
  [
    "Wow! That was so cool the way you dodged my daggers.",
    "You don't have 50 candles I could borrow, do ya?",
    "Encore! Encore!",
    "Ope watch out for that pit!",
    "How was your nap, princesses?",
    "I actually learned this one from my good friend, Rory Nyte"
  ]
);
const dandelionEventDialog = (turnIndex) => dandelion.turns[turnIndex].event.steps
  .filter(({ type }) => type === "enemyDialog")
  .map(({ text, sprite = null }) => ({ text, sprite }));
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(dandelionEventDialog(2))),
  [
    { text: "I'm writing this new piece for my concert in Leitmotif.", sprite: null },
    { text: "How's it sound?", sprite: null }
  ]
);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(dandelionEventDialog(6))),
  [
    { text: "Good thing these daggers keep coming back to me.", sprite: null },
    {
      text: "Speaking of 'coming' and 'backs', how's my ole Dragonborn pal?",
      sprite: null
    }
  ]
);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(dandelionEventDialog(11))),
  [
    { text: "I've actually got a princess of my own ya know.", sprite: null },
    { text: "She sort of just appeared one day.", sprite: null },
    { text: "Ah Sable my love...", sprite: "lovestruck" }
  ]
);
const dandelionRuntime = dandelion.runtime({ ctx: {} });
const openingDialog = (names) => JSON.parse(JSON.stringify(
  dandelionRuntime.beforeEnemyTurn({
    state: { party: names.map((name) => ({ name })) },
    turn: { repeated: false },
    turnIndex: 0
  }).steps.map(({ text, sprite = null }) => ({ text, sprite }))
));
assert.deepStrictEqual(openingDialog(["TARHUN", "BRAVOURÖS", "CARIAN"]), [
  { text: "Bravouros! Big gay red guy!", sprite: null },
  { text: "My old amigos!", sprite: null },
  { text: "We were like three peas in two pods!", sprite: null },
  { text: "Like three sides of 2 different coins!", sprite: null },
  { text: "Like salt and pepper and a not gay third option!", sprite: null },
  { text: "Hey, who's the new friend?", sprite: null }
]);
assert.deepStrictEqual(openingDialog(["CARIAN", "BUCKY", "THANOS"]), [
  { text: "Officer, I've never seen these people in my life.", sprite: null }
]);
assert.deepStrictEqual(openingDialog(["TARHUN", "CARIAN", "BUCKY"]), [
  { text: "Hey! I remeber you!", sprite: null },
  { text: "You're that incredibly gay guy I used to hang out with!", sprite: null },
  { text: "The one with the super useless breath weapon!", sprite: null },
  { text: "The one with the poorly spec'd stats!", sprite: null },
  { text: "The one with the....", sprite: "thinking" },
  { text: "That's all I recall actually.", sprite: "default" },
  { text: "How's you your little boyfriend?", sprite: null },
  { text: "You pop the big question yet?", sprite: null },
  { text: "Can those with your affliction even do that here?", sprite: "thinking" },
  { text: "Anyway, I see you've made some new male friends!", sprite: "default" },
  { text: "Let's see how they hold up.", sprite: null }
]);
assert.deepStrictEqual(openingDialog(["BRAVOURÖS", "CARIAN", "BUCKY"]), [
  { text: "Bravouros! My old acquaintance! How's it going ole chap?", sprite: null },
  { text: "Still the same recluse I see", sprite: "thinking" },
  { text: "Where's your muscular trophy boyfriend at?", sprite: "default" },
  { text: "Gotta get the band back together one of these days.", sprite: null },
  { text: "...", sprite: "daydream" },
  { text: "...", sprite: null },
  { text: "...", sprite: null },
  { text: "..Ah, good times...", sprite: null },
  { text: "...", sprite: null },
  { text: "Things were so easy going and panther free...", sprite: "default" },
  { text: "Anyway, I see you've made some new friends!", sprite: null }
]);
assert.strictEqual(dandelionRuntime.beforeEnemyTurn({
  state: { party: [] },
  turn: { repeated: true },
  turnIndex: 0
}), null);
const performers = ["CARIAN", "BUCKY", "TARHUN"].map((name) => ({
  name,
  hp: 100,
  spriteKeys: {},
  runtimeState: {}
}));
const performState = {
  party: performers,
  persistentEffects: performers.map((player) => ({ actorName: player.name })),
  encounter: dandelionRuntime.createState()
};

for (const [index, actor] of performers.entries()) {
  const acts = dandelionRuntime.additionalPlayerActs({ state: performState, actor, partyIndex: index });
  assert.strictEqual(acts.length, 1);
  assert.strictEqual(acts[0].name, "Perform");
  assert.strictEqual(acts[0].description, "Dance to the Maestro's tune");
  assert.strictEqual(acts[0].tpCost, 100);
  acts[0].resolve({ state: performState, actor, act: acts[0] });
  assert.strictEqual(dandelionRuntime.isPartyMemberActive({ player: actor }), false);
  assert.strictEqual(actor.spriteKeys.dandelionInstrument, `dandelionInstrument:${actor.name.toLowerCase()}:frame:0`);
  assert.strictEqual(actor.spriteAnimations.dandelionInstrument.fps, 6);
  assert.strictEqual(actor.spriteAnimations.dandelionInstrument.spriteKeys.length, 5);
  assert.strictEqual(actor.preserveBattleSpriteAspectRatio, true);
  assert.ok(!performState.persistentEffects.some((effect) => effect.actorName === actor.name));
  assert.strictEqual(dandelionRuntime.consumeTeamMercyRequest({ state: performState }), index === 2);
}
assert.strictEqual(dandelionRuntime.consumeTeamMercyRequest({ state: performState }), false);
assert.strictEqual(dandelionRuntime.canMercy({ state: performState, defaultValue: true }), false);

const finalActiveActor = { name: "CARIAN", hp: 20 };
const finalActiveState = {
  party: [
    finalActiveActor,
    { name: "BUCKY", hp: 0 },
    { name: "TARHUN", hp: 20, dandelionPerforming: true }
  ],
  persistentEffects: [],
  encounter: dandelionRuntime.createState()
};
const finalActivePerform = dandelionRuntime.additionalPlayerActs({
  state: finalActiveState,
  actor: finalActiveActor,
  partyIndex: 0
})[0];
assert.strictEqual(finalActivePerform.available({
  state: finalActiveState,
  actor: finalActiveActor,
  act: finalActivePerform
}), false);
assert.strictEqual(finalActivePerform.resolve({
  state: finalActiveState,
  actor: finalActiveActor,
  act: finalActivePerform
}), "");
assert.notStrictEqual(finalActiveActor.dandelionPerforming, true);

finalActiveState.party.push({ name: "THANOS", hp: 20 });
assert.strictEqual(finalActivePerform.available({
  state: finalActiveState,
  actor: finalActiveActor,
  act: finalActivePerform
}), true);

console.log("ENCOUNTER_CONTRACT_PASS");

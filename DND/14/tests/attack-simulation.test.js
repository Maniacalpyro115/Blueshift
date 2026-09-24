"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const noop = () => {};
const context2d = new Proxy({}, { get: (target, key) => target[key] || noop, set: () => true });

function seededMath(seed) {
  const math = Object.create(Math);
  math.random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  return math;
}

function dreamGridConnected(walls, columns = 10, rows = 7) {
  const connectionKey = (first, second) => first < second
    ? `${first}:${second}`
    : `${second}:${first}`;
  const blocked = new Set(walls.map(({ blockedCells }) =>
    connectionKey(blockedCells[0], blockedCells[1])));
  const visited = new Set([0]);
  const pending = [0];
  while (pending.length > 0) {
    const cell = pending.shift();
    const row = Math.floor(cell / columns);
    const column = cell % columns;
    const neighbors = [];
    if (column > 0) neighbors.push(cell - 1);
    if (column < columns - 1) neighbors.push(cell + 1);
    if (row > 0) neighbors.push(cell - columns);
    if (row < rows - 1) neighbors.push(cell + columns);
    for (const neighbor of neighbors) {
      if (visited.has(neighbor) || blocked.has(connectionKey(cell, neighbor))) continue;
      visited.add(neighbor);
      pending.push(neighbor);
    }
  }
  return visited.size === columns * rows;
}

function loadEnemy(name) {
  const context = vm.createContext({
    window: {},
    console,
    Math: seededMath(name === "sable" ? 14 : 27),
    document: { createElement: () => ({ width: 0, height: 0, getContext: () => context2d }) }
  });
  vm.runInContext(fs.readFileSync(path.join(ROOT, "enemies", `${name}.js`), "utf8"), context);
  return context.window.ENEMY_DATA;
}

function simulate(name, enemy) {
  for (const [turnIndex, rawTurn] of enemy.turns.entries()) {
    const turn = rawTurn?.attack || rawTurn;
    const state = {
      frame: 0,
      enemyTimer: 0,
      enemyDuration: turn.duration,
      enemyPostFinaleReached: false,
      attackType: turn.type,
      shieldDirection: "up",
      soul: { x: 450, y: 260, r: 8, speed: 5.06, vy: 0, lane: 1, invuln: 0 },
      party: [0, 1, 2].map((index) => ({ name: `P${index}`, hp: 50, maxHP: 50 })),
      bullets: []
    };
    const playedSounds = [];
    const playedMusic = [];
    const stoppedMusic = [];
    const musicVolumes = [];
    const sounds = new Proxy({
      battleTheme: { key: "battleTheme", bpm: 180.958, loopStart: 11.571 },
      lullaby: { key: "lullaby" },
      shieldBlock: { key: "shieldBlock" },
      bomb: { key: "bomb" },
      strum1: { key: "strum1" },
      strum2: { key: "strum2" },
      strum3: { key: "strum3" },
      strum4: { key: "strum4" },
      strum5: { key: "strum5" },
      note1: { key: "note1" },
      note2: { key: "note2" },
      note3: { key: "note3" },
      note4: { key: "note4" },
      note5: { key: "note5" },
      note6: { key: "note6" },
      scissorbell: { key: "scissorbell" },
      itemUse: { key: "itemUse" }
    }, {
      get: (target, key) => target[key] || {}
    });
    const runtime = typeof enemy.runtime === "function" ? enemy.runtime({
      state,
      enemyData: enemy,
      ctx: context2d,
      sounds,
      sprites: new Proxy({}, { get: () => ({ ready: false }) }),
      input: new Proxy({}, { get: () => false }),
      getMusicElapsed: () => 24,
      playSound: (sound, volumeScale = 1) => playedSounds.push({ sound, volumeScale }),
      playMusic: (music) => playedMusic.push(music?.key),
      stopMusic: (music) => stoppedMusic.push(music?.key),
      setMusicVolume: (music, volume) => {
        if (music) music.volume = volume;
        musicVolumes.push({ key: music?.key, volume });
      },
      clamp: (n, min, max) => Math.max(min, Math.min(max, n)),
      lerp: (a, b, t) => a + (b - a) * t,
      damageRandomLivingPlayer: noop,
      currentAttackDamage: () => turn.damage,
      consumePartyDamageGuard: () => false,
      partyIsDefeated: () => false,
      beginPlayerDeath: noop,
      drawHeartShape: noop,
      drawRedHeart: noop,
      drawBullet: noop,
      drawPositionedEnemyBody: noop,
      greenShieldRectAt: () => ({ x: 0, y: 0, w: 1, h: 1 }),
      enemySpriteForKey: () => ({ ready: false }),
      currentBossData: () => enemy,
      width: 900,
      height: 650
    }) : { createState: () => ({}) };
    state.encounter = runtime.createState?.({ state }) || {};
    const bullets = [];
    state.bullets = bullets;
    const movementOrigins = new Map();
    const mechanicsObserved = {
      cloneMoved: false,
      rollbackReversed: false,
      lagFrozen: false,
      lagCatchup: false,
      dandelionSineGuides: 0,
      dandelionSinePackets: 0,
      dandelionSinePacketSizes: [],
      dandelionBounceVelocity: null,
      dandelionDaggers: [],
      dandelionPurpleBlasts: [],
      dandelionPurpleHitboxes: [],
      dandelionBlackWarnings: [],
      dandelionBlackDaggers: [],
      dandelionOutsideIndicators: [],
      dandelionDreamDaggers: [],
      dandelionSweepDaggers: [],
      dandelionBouncingNotes: [],
      dandelionArpeggioDaggers: [],
      dandelionDaggerGrids: [],
      dandelionCloudLayouts: [],
      dandelionDreamCageAtSetup: null
    };
    const spawnBullet = (bullet) => {
      const spawned = { vx: 0, vy: 0, r: 6, age: 0, life: 180, spin: 0, angle: 0, ...bullet };
      bullets.push(spawned);
      if (spawned.type === "dandelionSineGuide") mechanicsObserved.dandelionSineGuides++;
      if (spawned.type === "dandelionSinePacket") {
        mechanicsObserved.dandelionSinePackets++;
        mechanicsObserved.dandelionSinePacketSizes.push(spawned.noteCount);
      }
      if (spawned.type === "dandelionDagger") {
        mechanicsObserved.dandelionDaggers.push({
          t: state.enemyTimer,
          color: spawned.daggerColor,
          pauseFrames: spawned.daggerPauseFrames,
          x: spawned.targetX,
          y: spawned.targetY,
          playerX: state.soul.x,
          playerY: state.soul.y,
          gridSetIndex: spawned.daggerGridSetIndex,
          gridWall: spawned.daggerGridWall,
          gridIndex: spawned.daggerGridIndex,
          gridColumn: spawned.daggerGridColumn,
          gridRow: spawned.daggerGridRow
        });
        if (spawned.daggerColor === "black") {
          spawned.observedSpawnAt = state.enemyTimer;
          spawned.observedEnemySpriteKey = state.enemySpriteKey;
          mechanicsObserved.dandelionBlackDaggers.push(spawned);
        }
        if (spawned.dreamDagger) {
          spawned.observedSpawnAt = state.enemyTimer;
          mechanicsObserved.dandelionDreamDaggers.push(spawned);
        }
        if (spawned.daggerSweepBurst) {
          spawned.observedSpawnAt = state.enemyTimer;
          spawned.observedEnemySpriteKey = state.enemySpriteKey;
          mechanicsObserved.dandelionSweepDaggers.push(spawned);
        }
      }
      if (spawned.type === "dandelionDaggerGrid") {
        mechanicsObserved.dandelionDaggerGrids.push(spawned);
      }
      if (spawned.type === "dandelionBlackDaggerWarning") {
        spawned.observedSpawnAt = state.enemyTimer;
        spawned.observedHeartX = state.soul.x;
        spawned.observedHeartY = state.soul.y;
        mechanicsObserved.dandelionBlackWarnings.push(spawned);
      }
      if (spawned.type === "dandelionBlackDaggerLandingIndicator") {
        spawned.observedSpawnAt = state.enemyTimer;
        mechanicsObserved.dandelionOutsideIndicators.push(spawned);
      }
      if (spawned.type === "dandelionDaggerBlast" && spawned.daggerColor === "purple") {
        mechanicsObserved.dandelionPurpleBlasts.push({
          x: spawned.originX,
          y: spawned.originY,
          rays: spawned.blastRays.map((ray) => ({ ...ray }))
        });
      }
      if (spawned.type === "dandelionDaggerBlastHitbox") {
        mechanicsObserved.dandelionPurpleHitboxes.push({ x: spawned.x, y: spawned.y });
      }
      if (spawned.type === "dandelionBouncingNote") {
        mechanicsObserved.dandelionBouncingNotes.push({
          observedSpawnAt: state.enemyTimer,
          speed: Math.hypot(spawned.vx, spawned.vy)
        });
      }
      if (spawned.type === "dandelionWhiteDaggerPlatform" && turnIndex === 11) {
        mechanicsObserved.dandelionArpeggioDaggers.push({
          observedSpawnAt: state.enemyTimer
        });
      }
      if (spawned.type === "spikeFloor" && Number.isFinite(spawned.bounceVelocity)) {
        mechanicsObserved.dandelionBounceVelocity = spawned.bounceVelocity;
      }
      return spawned;
    };
    const box = turn.box || { x: 282, y: 148, w: 336, h: 224 };
    state.box = box;
    const payload = { state, box, spawnBullet, playSound: (sound, volumeScale = 1) => playedSounds.push({ sound, volumeScale }),
      sounds, musicBeat: 0, purpleLineYs: null };
    if (name === "dandelion" && turnIndex === 9) {
      rawTurn.event.steps.find(({ type }) => type === "call")?.run(payload);
    }
    turn.setup?.(payload);
    if (name === "dandelion" && turnIndex === 9) {
      mechanicsObserved.dandelionDreamCageAtSetup =
        state.encounter.dandelionDreamAttack.cloudCage.length;
    }
    runtime.onTurnSelected?.({ state, turnIndex, turnCount: enemy.turns.length,
      finale: turn.postFinaleTrigger === true });
    const mechanic = typeof turn.mechanic === "string"
      ? { type: turn.mechanic, config: turn.mechanicConfig || {} }
      : turn.mechanic || null;
    if (mechanic) runtime.beginDefenseMechanic?.(mechanic);
    for (let t = 0; t < turn.duration; t++) {
      state.frame++;
      state.enemyTimer = t;
      state.soul.x = box.x + box.w / 2 + Math.sin(t / 24) * box.w * 0.28;
      state.soul.y = box.y + box.h / 2 + Math.cos(t / 31) * box.h * 0.22;
      payload.t = t;
      payload.musicBeat = t / 20;
      runtime.update?.({ state });
      runtime.updateDefenseMechanic?.();
      runtime.judgeDefenseMechanic?.();
      turn.pattern(payload);
      if (name === "dandelion" && turnIndex === 9) {
        const dream = state.encounter.dandelionDreamAttack;
        const latestLayout = mechanicsObserved.dandelionCloudLayouts.at(-1);
        if (dream.cloudWallLayoutIndex >= 0 && latestLayout?.index !== dream.cloudWallLayoutIndex) {
          mechanicsObserved.dandelionCloudLayouts.push({
            index: dream.cloudWallLayoutIndex,
            walls: dream.cloudWalls.map((wall) => ({ ...wall })),
            retiringCount: dream.retiringCloudWalls.length,
            cageCount: dream.cloudCage.length
          });
        }
      }
      for (const bullet of [...bullets]) {
        const before = { x: bullet.x, y: bullet.y };
        bullet.age++;
        if (typeof bullet.update === "function") bullet.update({ bullet, state, box, spawnBullet, t });
        else { bullet.x += bullet.vx; bullet.y += bullet.vy; }
        if (bullet.type === "glitchSoul") {
          if (!movementOrigins.has(bullet)) movementOrigins.set(bullet, before);
          const origin = movementOrigins.get(bullet);
          if (Math.hypot(bullet.x - origin.x, bullet.y - origin.y) > 2) mechanicsObserved.cloneMoved = true;
        }
        if (bullet.rollback) mechanicsObserved.rollbackReversed = true;
        if (bullet.lagFrozen) mechanicsObserved.lagFrozen = true;
        if (
          state.encounter.sableLagMode === "catchup" &&
          Math.hypot(bullet.x - before.x, bullet.y - before.y) > Math.hypot(bullet.vx, bullet.vy) * 2
        ) mechanicsObserved.lagCatchup = true;
        bullet.life--;
      }
      for (let index = bullets.length - 1; index >= 0; index--) {
        if (bullets[index].life <= 0) bullets.splice(index, 1);
      }
      runtime.drawBackgroundDistortion?.({ state });
      runtime.drawHudDistortion?.({ state });
      assert.ok(bullets.length < 5000, `${name} attack ${turnIndex + 1} leaked bullets`);
    }
    const dreamAttackBeforeEnd = state.encounter.dandelionDreamAttack
      ? { ...state.encounter.dandelionDreamAttack }
      : null;
    const arpeggioClimbBeforeEnd = state.encounter.dandelionArpeggioClimb || null;
    if (name === "dandelion" && turnIndex === 9) {
      const dream = state.encounter.dandelionDreamAttack;
      const originalDreamX = dream.dreamX;
      runtime.moveSoul?.({
        state,
        input: { right: true, left: false, up: false, down: false }
      });
      assert.ok(Math.abs(dream.dreamX - originalDreamX - 7.05) < 0.001,
        "Dandelion attack 10 did not increase the pink heart speed by 50 percent");

      dream.dreamX = dream.sleepingX;
      dream.dreamY = dream.sleepingY - 41;
      runtime.moveSoul?.({
        state,
        input: { right: false, left: false, up: false, down: true }
      });
      assert.ok(Math.abs(dream.dreamY - (dream.sleepingY - 41)) < 0.001,
        "Dandelion attack 10 cloud cage did not block the pink heart");

      assert.strictEqual(dream.cloudCage.length, 4,
        "Dandelion attack 10 did not replace the invisible barrier with a full cloud cage");
      assert.strictEqual(mechanicsObserved.dandelionDreamCageAtSetup, 0,
        "Dandelion attack 10 showed the cloud cage before the first grid batch");
      assert.strictEqual(dream.cloudCageSpawnedAt, 179,
        "Dandelion attack 10 did not spawn the cloud cage with the first grid batch");
      assert.ok([...dream.cloudCage, ...dream.cloudWalls].every((wall) =>
        wall.x1 === wall.x2 || wall.y1 === wall.y2),
      "Dandelion attack 10 created a diagonal cloud wall piece");
      assert.strictEqual(dream.cloudWallLayoutIndex, 8,
        "Dandelion attack 10 did not change cloud branches every three seconds");
      assert.strictEqual(mechanicsObserved.dandelionCloudLayouts.length, 9,
        "Dandelion attack 10 did not spawn a fresh grid layout every three seconds");
      assert.ok(mechanicsObserved.dandelionCloudLayouts.every(({ cageCount }) => cageCount === 4),
        "Dandelion attack 10 did not spawn the cloud cage with the first grid batch");
      assert.ok(mechanicsObserved.dandelionCloudLayouts.slice(1).every(({ retiringCount }) =>
        retiringCount > 0),
      "Dandelion attack 10 did not retain old cloud walls for their fade-out");
      assert.ok(mechanicsObserved.dandelionCloudLayouts.every(({ walls }) =>
        walls.length > 0 && walls.every((wall) =>
          (wall.x1 === wall.x2 || wall.y1 === wall.y2) &&
          wall.branch === "grid" &&
          wall.gridChance >= 0.199 && wall.gridChance <= 0.501 &&
          Math.min(wall.x1, wall.x2) >= box.x + 53.999 &&
          Math.max(wall.x1, wall.x2) <= box.x + box.w - 53.999 &&
          Math.min(wall.y1, wall.y2) >= box.y + 53.999 &&
          Math.max(wall.y1, wall.y2) <= box.y + box.h - 53.999)),
      "Dandelion attack 10 did not keep its randomized walls on the inset grid");
      assert.ok(mechanicsObserved.dandelionCloudLayouts.every(({ walls }) =>
        dreamGridConnected(walls)),
      "Dandelion attack 10 generated a grid without a path around its walls");
      const allGridWalls = mechanicsObserved.dandelionCloudLayouts.flatMap(({ walls }) => walls);
      assert.ok(allGridWalls.some(({ gridChance }) => gridChance >= 0.4) &&
        allGridWalls.some(({ gridChance }) => gridChance <= 0.3),
      "Dandelion attack 10 did not vary wall odds from the center toward the outside");

      assert.strictEqual(dream.musicNotes.length, 8,
        "Dandelion attack 10 did not place eight stationary music notes");
      assert.ok(dream.musicNotes.every((note) => allGridWalls.every((wall) => {
        const nearestX = Math.max(Math.min(wall.x1, wall.x2), Math.min(note.x, Math.max(wall.x1, wall.x2)));
        const nearestY = Math.max(Math.min(wall.y1, wall.y2), Math.min(note.y, Math.max(wall.y1, wall.y2)));
        return Math.hypot(note.x - nearestX, note.y - nearestY) > 20;
      })), "Dandelion attack 10 placed a music note over the wall grid");

      const gridWall = dream.cloudWalls[0];
      if (gridWall.horizontal) {
        dream.dreamX = (gridWall.x1 + gridWall.x2) / 2;
        dream.dreamY = gridWall.y1 - 15;
        runtime.moveSoul?.({ state, input: { down: true } });
        assert.ok(Math.abs(dream.dreamY - (gridWall.y1 - 15)) < 0.001,
          "Dandelion attack 10 cloud grid wall did not block the pink heart");
      } else {
        dream.dreamX = gridWall.x1 - 15;
        dream.dreamY = (gridWall.y1 + gridWall.y2) / 2;
        runtime.moveSoul?.({ state, input: { right: true } });
        assert.ok(Math.abs(dream.dreamX - (gridWall.x1 - 15)) < 0.001,
          "Dandelion attack 10 cloud grid wall did not block the pink heart");
      }

      const note = dream.musicNotes[0];
      dream.dreamX = note.x;
      dream.dreamY = note.y;
      runtime.moveSoul?.({ state, input: {} });
      assert.ok(note.collected && Math.abs(dream.speedMultiplier - 1.1) < 0.001,
        "Dandelion attack 10 music note did not grant a ten-percent speed increase");
      assert.ok(playedSounds.some(({ sound }) => sound?.key === "itemUse"),
        "Dandelion attack 10 music note did not play the healing sound");
      assert.strictEqual(dream.musicNoteParticles.length, 14,
        "Dandelion attack 10 music note did not create its pickup particles");
      assert.strictEqual(dream.speedMessageTimer, 48,
        "Dandelion attack 10 music note did not show +SPEED over the pink heart");
      const boostedX = dream.dreamX;
      runtime.moveSoul?.({ state, input: { right: true } });
      assert.ok(Math.abs(dream.dreamX - boostedX - 7.755) < 0.001,
        "Dandelion attack 10 music note did not apply its speed increase to movement");

      dream.shieldImpacts = [];
      const forcedIntercept = mechanicsObserved.dandelionDreamDaggers[0];
      forcedIntercept.forcedForShieldTest = true;
      forcedIntercept.x = dream.dreamX;
      forcedIntercept.y = dream.dreamY;
      forcedIntercept.life = 10;
      forcedIntercept.harmless = false;
      forcedIntercept.update({ bullet: forcedIntercept, state, box, spawnBullet, t: turn.duration });
      assert.strictEqual(dream.shieldImpacts.length, 1,
        "Dandelion attack 10 did not create a localized shield impact flash");
    }
    runtime.drawDefense?.({ state, box });
    runtime.onAttackEnd?.({ state, turnIndex, turnCount: enemy.turns.length });
    if (name === "sable" && turnIndex === 2) {
      assert.ok(mechanicsObserved.rollbackReversed, "Sable rollback bullets never replayed their history");
    }
    if (name === "sable" && turnIndex === 5) {
      assert.ok(mechanicsObserved.lagFrozen, "Sable lag bullets never froze");
      assert.ok(mechanicsObserved.lagCatchup, "Sable lag bullets never accelerated to catch up");
    }
    if (name === "sable" && turnIndex === 7) {
      assert.ok(mechanicsObserved.cloneMoved, "Sable clone hearts never followed soul history");
    }
    if (name === "dandelion" && turnIndex === 2) {
      assert.strictEqual(playedSounds.length, 10,
        "Dandelion attack 3 did not play one strum per wave");
      assert.ok(playedSounds.every(({ sound }) => /^strum[1-5]$/.test(sound?.key)),
        "Dandelion attack 3 played a sound outside the strum set");
      assert.ok(playedSounds.every(({ volumeScale }) => volumeScale === 0.5),
        "Dandelion attack 3 strums did not use half volume");
    }
    if (name === "dandelion" && turnIndex === 4) {
      assert.strictEqual(mechanicsObserved.dandelionSineGuides, 25,
        "Dandelion attack 5 did not create a guide for every packet");
      assert.strictEqual(mechanicsObserved.dandelionSinePackets, 25,
        "Dandelion attack 5 did not repeat twenty-five packets");
      assert.ok(mechanicsObserved.dandelionSinePacketSizes.every((size) => size === 20),
        "Dandelion attack 5 packets did not contain twenty notes");
      assert.strictEqual(playedSounds.length, 25,
        "Dandelion attack 5 did not play one note per wave");
      assert.ok(playedSounds.every(({ sound }) => /^note[1-6]$/.test(sound?.key)),
        "Dandelion attack 5 played a sound outside the music-note set");
      assert.ok(playedSounds.every(({ volumeScale }) => volumeScale === 1),
        "Dandelion attack 5 notes did not use normal volume");
    }
    if (name === "dandelion" && turnIndex === 5) {
      assert.strictEqual(mechanicsObserved.dandelionBounceVelocity, -13.5,
        "Dandelion attack 6 did not use its reduced rebound velocity");
      assert.strictEqual(playedSounds.filter(({ sound }) => sound?.key === "scissorbell").length, 14,
        "Dandelion attack 6 did not play scissorbell for every expanding platform dagger");
    }
    if (name === "dandelion" && turnIndex === 8) {
      assert.strictEqual(playedSounds.filter(({ sound }) => sound?.key === "scissorbell").length, 28,
        "Dandelion attack 9 did not play scissorbell for every expanding platform dagger");
    }
    if (name === "dandelion" && turnIndex === 7) {
      const daggerSets = [];
      for (const dagger of mechanicsObserved.dandelionDaggers) {
        const previousSet = daggerSets[daggerSets.length - 1];
        if (!previousSet || previousSet[0].t !== dagger.t) daggerSets.push([]);
        daggerSets[daggerSets.length - 1].push(dagger);
      }

      assert.deepStrictEqual(daggerSets.map((set) => set.length), [6, 7, 8, 9, 11],
        "Dandelion attack 8 did not throw the requested five dagger sets");
      assert.deepStrictEqual(
        daggerSets.map((set) => set.filter(({ color }) => color === "purple").length),
        [1, 1, 1, 1, 2],
        "Dandelion attack 8 did not use the requested purple dagger counts"
      );
      assert.ok(daggerSets.every((set) => set.some(({ color }) => color === "red") &&
        set.some(({ color }) => color === "blue")),
      "Dandelion attack 8 did not mix red and blue daggers in every set");
      assert.ok(daggerSets.flat().every(({ pauseFrames }) => pauseFrames === 48),
        "Dandelion attack 8 did not double attack 1's detonation delay");

      for (const set of daggerSets) {
        const normalized = set.map((dagger) => ({
          x: (dagger.x - box.x) / box.w,
          y: (dagger.y - box.y) / box.h
        }));
        for (const [left, top] of [[true, true], [false, true], [true, false], [false, false]]) {
          assert.ok(normalized.some(({ x, y }) =>
            (left ? x <= 0.16 : x >= 0.84) && (top ? y <= 0.16 : y >= 0.84)),
          "Dandelion attack 8 left a corner uncovered");
        }
      }
    }
    if (name === "dandelion" && (turnIndex === 12 || turnIndex === 14)) {
      const attackNumber = turnIndex + 1;
      const expectedSizes = turnIndex === 12
        ? [4, 6, 6, 6, 8, 8]
        : [6, 6, 7, 7, 8, 8, 9, 9];
      const expectedStarts = turnIndex === 12
        ? [20, 80, 140, 200, 260, 320]
        : [20, 71, 122, 173, 224, 275, 326, 377];
      const warnings = mechanicsObserved.dandelionBlackWarnings;
      const blackDaggers = mechanicsObserved.dandelionBlackDaggers;
      assert.deepStrictEqual(warnings.map(({ rayCount }) => rayCount), expectedSizes,
        `Dandelion attack ${attackNumber} did not create the requested warning-line sets`);
      assert.deepStrictEqual(warnings.map(({ observedSpawnAt }) => observedSpawnAt),
        expectedStarts,
      `Dandelion attack ${attackNumber} did not use the requested burst cadence`);
      assert.ok(warnings.every(({ warningFrames }) => warningFrames === 54),
        `Dandelion attack ${attackNumber} warnings did not last 0.9 seconds`);
      assert.strictEqual(blackDaggers.length, expectedSizes.reduce((sum, size) => sum + size, 0),
        `Dandelion attack ${attackNumber} did not throw the requested dagger sets`);
      assert.ok(blackDaggers.every(({ launchSpeed }) => launchSpeed === 16.5),
        `Dandelion attack ${attackNumber} black daggers did not use the increased speed`);

      let daggerOffset = 0;
      for (const warning of warnings) {
        assert.ok(Math.abs(warning.focalX - warning.observedHeartX) < 0.001 &&
          Math.abs(warning.focalY - warning.observedHeartY) < 0.001,
        `Dandelion attack ${attackNumber} did not center a section on the heart's starting position`);
        assert.ok(warning.initialAngularStep < 0.5,
          `Dandelion attack ${attackNumber} warning lines still started with excessive angular velocity`);
        assert.ok(warning.initialAngularStep > warning.finalAngularStep * 100,
          `Dandelion attack ${attackNumber} warning lines did not drastically slow their rotation`);

        const set = blackDaggers.slice(daggerOffset, daggerOffset + warning.rayCount);
        daggerOffset += warning.rayCount;
        assert.ok(set.every((dagger) =>
          Math.abs(dagger.targetX - warning.focalX) < 0.001 &&
          Math.abs(dagger.targetY - warning.focalY) < 0.001),
        `Dandelion attack ${attackNumber} black daggers did not overlap at the focal point`);
        assert.ok(set.every((dagger, index) =>
          Math.abs(dagger.launchAngle - warning.finalAngles[index]) < 0.001),
        `Dandelion attack ${attackNumber} black daggers did not follow the stopped warning lines`);
        assert.ok(set.every((dagger) => dagger.landedAt === warning.stoppedAt),
          `Dandelion attack ${attackNumber} daggers did not land when the warning lines stopped`);
        assert.ok(set.every((dagger) => dagger.blackDaggerLaunched && dagger.reachedEdge),
          `Dandelion attack ${attackNumber} black daggers did not launch through to the arena edge`);
        assert.ok(set.every((dagger) =>
          Math.abs(dagger.x - box.x) < 0.001 ||
          Math.abs(dagger.x - (box.x + box.w)) < 0.001 ||
          Math.abs(dagger.y - box.y) < 0.001 ||
          Math.abs(dagger.y - (box.y + box.h)) < 0.001),
        `Dandelion attack ${attackNumber} black daggers stopped before reaching an arena edge`);
      }
    }
    if (name === "dandelion" && turnIndex === 16) {
      const indicators = mechanicsObserved.dandelionOutsideIndicators;
      const blackDaggers = mechanicsObserved.dandelionBlackDaggers;
      assert.strictEqual(indicators.length, 23,
        "Dandelion attack 17 did not create one landing indicator per throw");
      assert.strictEqual(blackDaggers.length, 23,
        "Dandelion attack 17 did not throw a dagger every third of a second");
      assert.ok(indicators.slice(1).every((indicator, index) =>
        indicator.observedSpawnAt - indicators[index].observedSpawnAt === 20),
      "Dandelion attack 17 indicators did not repeat every 20 frames");
      assert.ok(blackDaggers.slice(1).every((dagger, index) =>
        dagger.observedSpawnAt - blackDaggers[index].observedSpawnAt === 20),
      "Dandelion attack 17 throws did not repeat every 20 frames");

      for (let index = 0; index < blackDaggers.length; index++) {
        const dagger = blackDaggers[index];
        const indicator = indicators[index];
        const outside = dagger.targetX < box.x || dagger.targetX > box.x + box.w ||
          dagger.targetY < box.y || dagger.targetY > box.y + box.h;
        assert.ok(outside, "Dandelion attack 17 landed a dagger inside the field");
        assert.strictEqual(dagger.observedEnemySpriteKey, "throw7",
          "Dandelion attack 17 did not use the full throw animation");
        assert.ok(Math.abs(indicator.landingX - dagger.targetX) < 0.001 &&
          Math.abs(indicator.landingY - dagger.targetY) < 0.001,
        "Dandelion attack 17 indicator did not mark the dagger landing point");
        assert.strictEqual(indicator.indicatorFrames, 40,
          "Dandelion attack 17 indicator did not match the dagger's flight time");
        assert.strictEqual(dagger.daggerFlightFrames, 40,
          "Dandelion attack 17 did not use the requested black dagger flight time");
        assert.ok(Math.abs(dagger.launchSpeed - 13.2) < 0.001,
          "Dandelion attack 17 did not reduce the dagger speed by 20 percent");
        const expectedAngle = Math.atan2(
          dagger.aimY - dagger.targetY,
          dagger.aimX - dagger.targetX
        );
        assert.ok(Math.abs(Math.sin(dagger.launchAngle - expectedAngle)) < 0.001,
          "Dandelion attack 17 dagger trajectory did not point toward the player");
        assert.ok(Math.abs(indicator.directionX - Math.cos(dagger.launchAngle)) < 0.001 &&
          Math.abs(indicator.directionY - Math.sin(dagger.launchAngle)) < 0.001,
        "Dandelion attack 17 inward line did not match the dagger trajectory");
        assert.ok(dagger.reachedEdge,
          "Dandelion attack 17 dagger did not cross through to a field edge");
      }
    }
    if (name === "dandelion" && turnIndex === 9) {
      const dreamDaggers = mechanicsObserved.dandelionDreamDaggers;
      assert.ok(dreamAttackBeforeEnd, "Dandelion attack 10 did not initialize its dream state");
      assert.strictEqual(state.message, "",
        "Dandelion attack 10 left the obsolete sleep text on screen");
      assert.deepStrictEqual(
        playedSounds.filter(({ sound }) => /^strum[1-5]$/.test(sound?.key)).map(({ sound }) => sound.key),
        ["strum1", "strum3", "strum5"],
      "Dandelion attack 10 did not play its opening chord");
      assert.ok(playedSounds
        .filter(({ sound }) => /^strum[1-5]$/.test(sound?.key))
        .every(({ volumeScale }) => volumeScale === 0.45),
        "Dandelion attack 10 chord did not use the intended volume");
      assert.ok(playedSounds.some(({ sound }) => sound?.key === "shieldBlock"),
        "Dandelion attack 10 did not play snd_tempbell on shield interception");
      assert.deepStrictEqual(playedMusic, ["lullaby", "battleTheme"],
        "Dandelion attack 10 did not switch to the lullaby and begin restoring the main theme");
      assert.ok(musicVolumes.some(({ key, volume }) => key === "battleTheme" && volume === 0),
        "Dandelion attack 10 did not fade the main theme all the way out");
      assert.ok(musicVolumes.some(({ key, volume }) => key === "lullaby" && volume === 0.45),
        "Dandelion attack 10 did not fade the lullaby all the way in");
      assert.ok(state.encounter.dandelionDreamMusicReturn,
        "Dandelion attack 10 did not begin its return-to-main-theme crossfade");
      assert.strictEqual(dreamDaggers.length, 34,
        "Dandelion attack 10 did not sustain its dagger rain");
      assert.ok(dreamDaggers.slice(1).every((dagger, index) =>
        dagger.observedSpawnAt - dreamDaggers[index].observedSpawnAt === 45),
      "Dandelion attack 10 dagger rain did not use its 45-frame cadence");
      assert.deepStrictEqual([...new Set(dreamDaggers.map(({ dreamSide }) => dreamSide))].sort(),
        [0, 1, 2, 3],
      "Dandelion attack 10 did not rain daggers from all four sides");
      assert.ok(dreamDaggers.every(({ dreamSpeed }) => dreamSpeed === 1),
        "Dandelion attack 10 daggers did not move at one pixel per frame");
      assert.ok(dreamDaggers.every((dagger) => {
        if (dagger.forcedForShieldTest) return true;
        const expectedAngle = Math.atan2(
          dreamAttackBeforeEnd.sleepingY - dagger.y + dagger.vy * dagger.age,
          dreamAttackBeforeEnd.sleepingX - dagger.x + dagger.vx * dagger.age
        );
        return Math.abs(Math.sin(dagger.angle - expectedAngle)) < 0.001;
      }), "Dandelion attack 10 daggers did not target the sleeping heart");
      assert.ok(Math.abs(state.soul.x - dreamAttackBeforeEnd.sleepingX) < 0.001 &&
        Math.abs(state.soul.y - dreamAttackBeforeEnd.sleepingY) < 0.001,
      "Dandelion attack 10 did not keep the red heart frozen");
    }
    if (name === "dandelion" && turnIndex === 6) {
      const sweepDaggers = mechanicsObserved.dandelionSweepDaggers;
      assert.strictEqual(sweepDaggers.length, 66,
        "Dandelion attack 7 did not create seven eight-dagger bursts and one ten-dagger burst");
      const sides = [];
      const expectedBurstStarts = [38, 98, 158, 218, 278, 338, 398, 473];
      for (let setIndex = 0; setIndex < 8; setIndex++) {
        const set = sweepDaggers.filter((dagger) => dagger.daggerSweepSetIndex === setIndex);
        const finalSet = setIndex === 7;
        const expectedDaggerCount = finalSet ? 10 : 8;
        assert.strictEqual(set.length, expectedDaggerCount,
          "Dandelion attack 7 burst used the wrong dagger count");
        const side = set[0].daggerSweepSide;
        if (!finalSet) sides.push(side);
        assert.strictEqual(set[0].observedSpawnAt, expectedBurstStarts[setIndex],
          "Dandelion attack 7 did not use its configured batch timing");
        assert.ok(set.every((dagger) => dagger.daggerSweepSide === side),
          "Dandelion attack 7 changed walls during a burst");
        assert.ok(set.every((dagger) => dagger.daggerFlightFrames === 50),
          "Dandelion attack 7 did not increase dagger airtime by twenty percent");
        assert.deepStrictEqual(set.map(({ daggerSweepLaunchIndex }) => daggerSweepLaunchIndex),
          Array.from({ length: expectedDaggerCount }, (_value, index) => index));
        assert.ok(set.slice(1).every((dagger, index) =>
          dagger.observedSpawnAt - set[index].observedSpawnAt === 4),
        "Dandelion attack 7 daggers did not use their four-frame stagger");
        const fromFarEdge = set[0].daggerSweepFromFarEdge;
        assert.ok(set.every((dagger) => dagger.daggerSweepFromFarEdge === fromFarEdge),
          "Dandelion attack 7 changed direction during a burst");
        const expectedSlots = fromFarEdge
          ? Array.from({ length: expectedDaggerCount }, (_value, index) => 7 - index)
          : Array.from({ length: expectedDaggerCount }, (_value, index) => index);
        assert.deepStrictEqual(set.map(({ daggerSweepSlotIndex }) => daggerSweepSlotIndex), expectedSlots,
          "Dandelion attack 7 did not sweep away from its starting edge");
        if (finalSet) {
          const cornerPositions = {
            topLeft: { x: 0.04, y: 0.04 },
            topRight: { x: 0.96, y: 0.04 },
            bottomRight: { x: 0.96, y: 0.96 },
            bottomLeft: { x: 0.04, y: 0.96 }
          };
          const corner = cornerPositions[set[0].daggerSweepCorner];
          assert.ok(corner && set.every((dagger) =>
            dagger.daggerColor === "purple" &&
            dagger.daggerSweepCorner === set[0].daggerSweepCorner),
          "Dandelion attack 7 final set was not a purple line from one corner");
          assert.ok(set.every((dagger) => {
            const targetX = (dagger.targetX - box.x) / box.w;
            const targetY = (dagger.targetY - box.y) / box.h;
            const progress = dagger.daggerSweepLanePosition;
            return Math.abs(targetX - (corner.x + (1 - corner.x * 2) * progress)) < 0.001 &&
              Math.abs(targetY - (corner.y + (1 - corner.y * 2) * progress)) < 0.001;
          }), "Dandelion attack 7 final purple set did not cross the full center diagonal");
        } else {
          const verticalBeams = side === "top" || side === "bottom";
          const expectedWallPosition = side === "top" || side === "left" ? 0.04 : 0.96;
          assert.ok(set.every((dagger) => {
            const wallPosition = verticalBeams
              ? (dagger.targetY - box.y) / box.h
              : (dagger.targetX - box.x) / box.w;
            const lanePosition = verticalBeams
              ? (dagger.targetX - box.x) / box.w
              : (dagger.targetY - box.y) / box.h;
            return Math.abs(wallPosition - expectedWallPosition) < 0.001 &&
              Math.abs(lanePosition - dagger.daggerSweepLanePosition) < 0.001 &&
              dagger.daggerColor === (verticalBeams ? "red" : "blue");
          }), "Dandelion attack 7 daggers did not land along their selected wall");
        }
        assert.ok(set.every((dagger) => dagger.daggerSweepFinalSet === finalSet),
          "Dandelion attack 7 marked the wrong burst as its final set");
        const finalLanePosition = set[set.length - 1].daggerSweepLanePosition;
        const openingSize = finalSet
          ? 1 - finalLanePosition
          : fromFarEdge ? finalLanePosition : 1 - finalLanePosition;
        assert.ok(Math.abs(openingSize - 0.1875) < 0.001 &&
          set.every((dagger) => Math.abs(dagger.daggerSweepOpeningSize - 0.1875) < 0.001),
        "Dandelion attack 7 changed the size of its final opening");
        assert.strictEqual(set[set.length - 1].observedSpawnAt - set[0].observedSpawnAt,
          finalSet ? 36 : 28,
          "Dandelion attack 7 did not make the full wave slightly slower");
        assert.ok(set.every(({ observedEnemySpriteKey }) => observedEnemySpriteKey === "throw7"),
          "Dandelion attack 7 replayed the throw animation within a burst");
        assert.ok(set.every(({ blasted }) => blasted),
          "Dandelion attack 7 dagger did not reach its staggered explosion");
      }
      assert.ok(sides.every((side) => ["top", "right", "bottom", "left"].includes(side)),
        "Dandelion attack 7 selected an invalid starting wall");
      assert.ok(sides.slice(1).every((side, index) => side !== sides[index]),
        "Dandelion attack 7 repeated the same starting wall back to back");
      assert.strictEqual(playedSounds.filter(({ sound }) => sound?.key === "bomb").length, 66,
        "Dandelion attack 7 did not play the blast sound for every laser beam");
    }
    if (name === "dandelion" && turnIndex === 10) {
      const notes = mechanicsObserved.dandelionBouncingNotes;
      assert.strictEqual(notes.length, 13,
        "Dandelion attack 11 did not launch exactly thirteen notes");
      assert.ok(notes.every(({ speed }) => Math.abs(speed - 2.304) < 0.001),
        "Dandelion attack 11 did not reduce note speed by twenty percent");
    }
    if (name === "dandelion" && turnIndex === 11) {
      const daggers = mechanicsObserved.dandelionArpeggioDaggers;
      assert.strictEqual(daggers.length, 5,
        "Dandelion attack 12 did not launch all five daggers in its first set");
      assert.ok(daggers.slice(1).every((dagger, index) =>
        dagger.observedSpawnAt - daggers[index].observedSpawnAt === 30),
      "Dandelion attack 12 dagger throws were not thirty frames apart");

      const climb = arpeggioClimbBeforeEnd;
      state.encounter.dandelionArpeggioClimb = climb;
      climb.stage = 2;
      climb.completed = false;
      climb.stagePrepared = true;
      climb.pendingGoldPlatform = false;
      climb.goalBullet = {
        x: state.soul.x,
        y: state.soul.y,
        noteRadius: 12,
        collected: false,
        particles: [],
        life: 100
      };
      state.soul.vy = -1;
      state.soul.pitBounce = false;
      runtime.update?.({ state });
      assert.strictEqual(climb.completed, true,
        "Dandelion attack 12 did not complete after collecting its third golden note");
      assert.strictEqual(climb.pendingGoldPlatform, true,
        "Dandelion attack 12 did not queue a platform after its third golden note");

      const goldPlatformsBefore = bullets.filter((bullet) =>
        bullet.arpeggioStarterPlatform && bullet.platformColor === "gold").length;
      turn.pattern({ ...payload, t: turn.duration });
      const goldPlatformsAfter = bullets.filter((bullet) =>
        bullet.arpeggioStarterPlatform && bullet.platformColor === "gold").length;
      assert.strictEqual(goldPlatformsAfter, goldPlatformsBefore + 1,
        "Dandelion attack 12 did not spawn a gold platform after its third golden note");
      const finalGoldPlatform = bullets.filter((bullet) =>
        bullet.arpeggioStarterPlatform && bullet.platformColor === "gold").at(-1);
      assert.strictEqual(finalGoldPlatform.arpeggioDecayAt, null,
        "Dandelion attack 12 scheduled the final gold platform to decay");
      for (let frame = 0; frame < 200; frame++) {
        state.enemyTimer++;
        finalGoldPlatform.age++;
        finalGoldPlatform.update({ bullet: finalGoldPlatform, state, box, spawnBullet });
        finalGoldPlatform.life--;
      }
      assert.strictEqual(finalGoldPlatform.solidPlatform, true,
        "Dandelion attack 12 final gold platform stopped supporting the player");
      assert.strictEqual(finalGoldPlatform.disintegrationProgress, 0,
        "Dandelion attack 12 final gold platform began decaying without another stage");
      assert.ok(finalGoldPlatform.life > 0,
        "Dandelion attack 12 final gold platform expired before the attack ended");
    }
    if (name === "dandelion" && turnIndex === 15) {
      const daggers = mechanicsObserved.dandelionDaggers;
      assert.strictEqual(daggers.length, 20,
        "Dandelion attack 16 did not launch exactly twenty daggers");
      assert.deepStrictEqual(
        daggers.map(({ color }) => color),
        Array.from({ length: 20 }, (_value, index) => ["purple", "red", "blue"][index % 3]),
        "Dandelion attack 16 did not repeat the purple, red, blue order"
      );
      assert.ok(daggers.every(({ pauseFrames }) => pauseFrames === 40),
        "Dandelion attack 16 did not wait forty frames before detonating");
      assert.ok(daggers.slice(1).every((dagger, index) => dagger.t - daggers[index].t === 24),
        "Dandelion attack 16 daggers were not four-tenths of a second apart");
      assert.ok(Math.abs(daggers[0].x - (box.x + box.w / 2)) < 0.001 &&
        Math.abs(daggers[0].y - (box.y + box.h / 2)) < 0.001,
      "Dandelion attack 16 did not place its first dagger in the center");

      const steps = daggers.slice(1).map((dagger, index) => ({
        x: dagger.x - daggers[index].x,
        y: dagger.y - daggers[index].y
      }));
      assert.ok(steps.every(({ x, y }) => Math.abs(Math.hypot(x, y) - 11) < 0.001),
        "Dandelion attack 16 did not use the same eleven-pixel step each time");
      assert.ok(daggers.slice(1).every((dagger, index) => {
        const previous = daggers[index];
        const step = steps[index];
        const playerDirection = {
          x: dagger.playerX - previous.x,
          y: dagger.playerY - previous.y
        };
        return step.x * playerDirection.x + step.y * playerDirection.y > 0;
      }), "Dandelion attack 16 did not move each target toward the player's current position");
      assert.ok(steps.slice(1).some(({ x, y }) =>
        Math.abs(x - steps[0].x) > 0.001 || Math.abs(y - steps[0].y) > 0.001),
      "Dandelion attack 16 still used one locked direction for the whole sequence");
    }
    if (name === "dandelion" && turnIndex === 13) {
      const daggers = mechanicsObserved.dandelionDaggers;
      assert.strictEqual(mechanicsObserved.dandelionDaggerGrids.length, 1,
        "Dandelion attack 14 did not create one persistent grid guide");
      const grid = mechanicsObserved.dandelionDaggerGrids[0];
      assert.strictEqual(grid.gridSize, 11,
        "Dandelion attack 14 grid was not eleven by eleven");
      assert.strictEqual(grid.cellSize, 22,
        "Dandelion attack 14 grid cells were not twenty-two pixels wide");
      assert.deepStrictEqual(
        JSON.parse(JSON.stringify(grid.arena)),
        { x: 329, y: 139, w: 242, h: 242 },
        "Dandelion attack 14 grid did not match its defense box"
      );
      assert.strictEqual(daggers.length, 72,
        "Dandelion attack 14 did not launch twenty-four daggers in each of three sets");
      assert.ok(daggers.every(({ pauseFrames }) => pauseFrames === 180),
        "Dandelion attack 14 daggers did not wait three seconds after landing");

      const sets = Array.from({ length: 3 }, (_value, setIndex) =>
        daggers.filter((dagger) => dagger.gridSetIndex === setIndex)
      );
      assert.ok(sets.every((set) => set.length === 24),
        "Dandelion attack 14 did not keep all three sets at twenty-four daggers");
      assert.deepStrictEqual(sets.map((set) => set[0].t), [38, 328, 618],
        "Dandelion attack 14 sets did not use the configured timing");

      for (const set of sets) {
        const top = set.filter(({ gridWall }) => gridWall === "top");
        const right = set.filter(({ gridWall }) => gridWall === "right");
        const inside = set.filter(({ gridWall }) => gridWall === "inside");
        assert.strictEqual(top.length, 11,
          "Dandelion attack 14 did not cover every top-wall column");
        assert.strictEqual(right.length, 11,
          "Dandelion attack 14 did not cover every right-wall row");
        assert.strictEqual(inside.length, 2,
          "Dandelion attack 14 did not place two daggers inside the grid");
        assert.strictEqual(top.filter(({ color }) => color === "red").length, 8,
          "Dandelion attack 14 top wall did not have exactly three exceptions");
        assert.strictEqual(right.filter(({ color }) => color === "blue").length, 8,
          "Dandelion attack 14 right wall did not have exactly three exceptions");
        assert.ok(inside.every(({ color }) => color === "purple"),
          "Dandelion attack 14 interior daggers were not purple");
        assert.ok(top.every(({ y }) => y < box.y) && right.every(({ x }) => x > box.x + box.w),
          "Dandelion attack 14 wall daggers did not land outside the arena");
        assert.ok(top.every(({ y }) => Math.abs(y - (box.y - 17.6)) < 0.001) &&
          right.every(({ x }) => Math.abs(x - (box.x + box.w + 17.6)) < 0.001),
        "Dandelion attack 14 outer daggers were not offset by 17.6 pixels");

        const openColumns = top.filter(({ color }) => color !== "red").map(({ gridIndex }) => gridIndex);
        const openRows = right.filter(({ color }) => color !== "blue").map(({ gridIndex }) => gridIndex);
        assert.ok(inside.every(({ gridColumn, gridRow }) =>
          openColumns.includes(gridColumn) && openRows.includes(gridRow)),
        "Dandelion attack 14 purple daggers did not cover opening intersections");
        const candidates = openColumns.flatMap((column) =>
          openRows.map((row) => ({ column, row }))
        );
        const remainingSafe = candidates.filter((cell) => !inside.some((target) =>
          Math.abs(
            Math.abs(cell.column - target.gridColumn) -
            Math.abs(cell.row - target.gridRow)
          ) <= 1
        ));
        assert.ok(remainingSafe.length >= 3,
          "Dandelion attack 14 did not preserve a few safe grid intersections");
      }
      assert.strictEqual(playedSounds.filter(({ sound }) => sound?.key === "bomb").length, 3,
        "Dandelion attack 14 did not play one detonation sound per set");
    }
    if (name === "dandelion" && mechanicsObserved.dandelionPurpleBlasts.length > 0) {
      const epsilon = 0.001;
      for (const blast of mechanicsObserved.dandelionPurpleBlasts) {
        assert.strictEqual(blast.rays.length, turnIndex === 6 ? 2 : 4,
          "A purple Dandelion dagger created the wrong number of laser rays");
        for (const ray of blast.rays) {
          const endX = blast.x + ray.dx * ray.length;
          const endY = blast.y + ray.dy * ray.length;
          assert.ok(endX >= box.x - epsilon && endX <= box.x + box.w + epsilon &&
            endY >= box.y - epsilon && endY <= box.y + box.h + epsilon,
          "A purple Dandelion laser extended outside the arena");
          assert.ok(Math.abs(endX - box.x) <= epsilon ||
            Math.abs(endX - (box.x + box.w)) <= epsilon ||
            Math.abs(endY - box.y) <= epsilon ||
            Math.abs(endY - (box.y + box.h)) <= epsilon,
          "A purple Dandelion laser stopped before reaching a wall");
          assert.ok(mechanicsObserved.dandelionPurpleHitboxes.some(({ x, y }) =>
            Math.hypot(x - endX, y - endY) <= epsilon),
          "A purple Dandelion laser did not retain collision coverage at the wall");
        }
      }
    }
  }
}

for (const name of ["sable", "zach", "dandelion"]) simulate(name, loadEnemy(name));
console.log("ATTACK_SIMULATION_PASS");

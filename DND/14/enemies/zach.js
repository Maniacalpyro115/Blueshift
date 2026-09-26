(() => {
"use strict";

function createZachRuntime(api) {
  const { state, sounds, sprites, ctx, input, getMusicElapsed, playSound, clamp, lerp,
    damageRandomLivingPlayer, currentAttackDamage, consumePartyDamageGuard, partyIsDefeated,
    beginPlayerDeath, drawHeartShape, drawRedHeart, enemySpriteForKey } = api;

  function beginRhythmGridAttack(config) {
    const music = sounds.battleTheme;
    const elapsed = getMusicElapsed(music);
    const beatDuration = 60 / music.bpm;
    const beatsPerMeasure = 4;
    const musicBeat = (elapsed - music.loopStart) / beatDuration;
    const introStartBeat = Math.ceil((musicBeat + beatsPerMeasure) / beatsPerMeasure) * beatsPerMeasure;
    const dance = parseRhythmDance(config.dance, config.sequence);
    const remainingBeats = introStartBeat - musicBeat + 12 + dance.beats * 2;
    const requiredFrames = Math.ceil((remainingBeats * beatDuration + 1.15) * 60);
    state.enemyDuration = Math.max(state.enemyDuration, state.enemyTimer + requiredFrames);

    state.encounter.defense = {
      cols: 5,
      rows: 3,
      danceEvents: dance.events,
      danceBeats: dance.beats,
      beatDuration,
      introStartBeat,
      phase: "waiting",
      demoStep: -1,
      demoSoundStep: -1,
      countdown: null,
      responseStep: 0,
      col: 2,
      row: 1,
      soulCol: 2,
      soulRow: 1,
      expectedCol: 2,
      expectedRow: 1,
      preparedResponseStep: -1,
      inputWindow: Number.isFinite(config.inputWindow) ? config.inputWindow : 0.1,
      damageHits: 0,
      beatPhase: 0,
      finished: false,
      finishTimer: 0
    };

    state.soul.x = rhythmGridX(2);
    state.soul.y = rhythmGridY(1);
  }

  function beginFreestyleGridAttack(config = {}) {
    const music = sounds.battleTheme;
    const elapsed = getMusicElapsed(music);
    const beatDuration = 60 / music.bpm;
    const musicBeat = (elapsed - music.loopStart) / beatDuration;
    const firstDownbeat = Math.ceil((musicBeat + 4) / 4) * 4;
    const cols = Number.isInteger(config.cols) ? Math.max(3, config.cols) : 5;
    const rows = Number.isInteger(config.rows) ? Math.max(3, config.rows) : 3;
    const rowArrowCount = Number.isInteger(config.rowArrowCount)
      ? clamp(config.rowArrowCount, 1, rows)
      : 2;
    const colArrowCount = Number.isInteger(config.colArrowCount)
      ? clamp(config.colArrowCount, 1, cols)
      : 2;
    const centerCol = Math.floor(cols / 2);
    const centerRow = Math.floor(rows / 2);

    state.encounter.defense = {
      mode: "freestyle",
      phase: "response",
      cols,
      rows,
      rowArrowCount,
      colArrowCount,
      beatDuration,
      soulCol: centerCol,
      soulRow: centerRow,
      nextCueBeat: firstDownbeat,
      cues: [],
      cueCount: 0
    };

    state.soul.x = rhythmGridX(centerCol);
    state.soul.y = rhythmGridY(centerRow);
  }

  function beginVampireGridAttack(config) {
    const music = sounds.battleTheme;
    const elapsed = getMusicElapsed(music);
    const beatDuration = 60 / music.bpm;
    const musicBeat = (elapsed - music.loopStart) / beatDuration;
    const cols = Number.isInteger(config.cols) ? Math.max(3, config.cols) : 7;
    const rows = Number.isInteger(config.rows) ? Math.max(3, config.rows) : 5;
    const movesPerDownbeat = Number.isInteger(config.movesPerDownbeat)
      ? Math.max(1, config.movesPerDownbeat)
      : 1;
    const moveIntervalBeats = Number.isFinite(config.moveIntervalBeats)
      ? Math.max(1, config.moveIntervalBeats)
      : 4;
    const attackDelayBeats = Number.isFinite(config.attackDelayBeats)
      ? Math.max(0.5, config.attackDelayBeats)
      : 2;
    const seekSoul = config.seekSoul === true;
    const vampireCount = Number.isInteger(config.vampireCount)
      ? Math.min(4, Math.max(2, config.vampireCount))
      : 2;
    const centerCol = Math.floor(cols / 2);
    const centerRow = Math.floor(rows / 2);
    const horizontalStartDistance = cols - 3;
    const rightStartRow = horizontalStartDistance % 2 === 0
      ? (centerRow + 1 <= rows - 2 ? centerRow + 1 : centerRow - 1)
      : centerRow;
    const vampireStarts = vampireCount > 2
      ? [
          { side: "topLeft", col: 1, row: 1 },
          { side: "topRight", col: cols - 2, row: 1 },
          { side: "bottomLeft", col: 1, row: rows - 2 },
          { side: "bottomRight", col: cols - 2, row: rows - 2 }
        ].slice(0, vampireCount)
      : [
          { side: "left", col: 1, row: centerRow },
          { side: "right", col: cols - 2, row: rightStartRow }
        ];
    const firstDownbeat = Math.ceil((musicBeat + 4) / 4) * 4;

    state.encounter.defense = {
      mode: "vampire",
      phase: "response",
      cols,
      rows,
      movesPerDownbeat,
      moveIntervalBeats,
      attackDelayBeats,
      beatDuration,
      soulCol: centerCol,
      soulRow: centerRow,
      nextMoveBeat: firstDownbeat,
      vampires: vampireStarts.map((start) => ({
        ...start,
        fromCol: start.col,
        fromRow: start.row,
        movedAtBeat: null,
        seekSoul
      })),
      cues: []
    };

    state.soul.x = rhythmGridX(centerCol);
    state.soul.y = rhythmGridY(centerRow);
  }

  function beginVampireLordGridAttack(config) {
    const music = sounds.battleTheme;
    const elapsed = getMusicElapsed(music);
    const beatDuration = 60 / music.bpm;
    const musicBeat = (elapsed - music.loopStart) / beatDuration;
    const cols = Number.isInteger(config.cols) ? Math.max(7, config.cols) : 13;
    const rows = Number.isInteger(config.rows) ? Math.max(7, config.rows) : 13;
    const centerCol = Math.floor(cols / 2);
    const centerRow = Math.floor(rows / 2);
    const firstDownbeat = Math.ceil((musicBeat + 4) / 4) * 4;
    const regularStarts = [
      { col: 1, row: 1 },
      { col: cols - 2, row: 1 },
      { col: 1, row: rows - 2 },
      { col: cols - 2, row: rows - 2 }
    ];

    state.encounter.defense = {
      mode: "vampireLord",
      phase: "response",
      cols,
      rows,
      beatDuration,
      soulCol: centerCol,
      soulRow: rows - 2,
      nextCycleBeat: firstDownbeat,
      vampires: regularStarts.map((start, index) => ({
        side: index % 2 === 0 ? "left" : "right",
        col: start.col,
        row: start.row,
        fromCol: start.col,
        fromRow: start.row,
        movedAtBeat: null,
        blastMargin: 1,
        contactRadius: 8,
        scale: 0.72,
        seekSoul: true
      })),
      vampireLord: {
        col: centerCol,
        row: centerRow,
        fromCol: centerCol,
        fromRow: centerRow,
        movedAtBeat: null,
        blastMargin: 2,
        contactRadius: 12,
        seekSoul: true
      },
      skullSouls: [2, 6, 10].flatMap((row) => [
        { side: "left", row },
        { side: "right", row }
      ]),
      regularCues: [],
      lordCues: [],
      skullCues: []
    };

    state.soul.x = rhythmGridX(centerCol);
    state.soul.y = rhythmGridY(rows - 2);
  }

  function parseRhythmDance(pattern, fallbackSequence) {
    const events = [];
    let beat = 0;
    const directionNames = { U: "up", D: "down", L: "left", R: "right" };

    if (typeof pattern === "string") {
      for (let index = 0; index < pattern.length;) {
        const symbol = pattern[index].toUpperCase();
        if (directionNames[symbol]) {
          events.push({ beat, direction: directionNames[symbol] });
          beat++;
          index++;
          continue;
        }
        if (symbol === "_") {
          events.push({ beat, direction: null });
          beat++;
          index++;
          continue;
        }
        if (symbol === "[") {
          const closeIndex = pattern.indexOf("]", index + 1);
          if (closeIndex >= 0) {
            const groupedSteps = pattern
              .slice(index + 1, closeIndex)
              .toUpperCase()
              .split("")
              .filter((letter) => directionNames[letter] || letter === "_");
            groupedSteps.forEach((letter, groupIndex) => {
              if (!directionNames[letter]) return;
              events.push({
                beat: beat + groupIndex / groupedSteps.length,
                direction: directionNames[letter]
              });
            });
            beat++;
            index = closeIndex + 1;
            continue;
          }
        }
        index++;
      }
    }

    if (events.length === 0 && Array.isArray(fallbackSequence)) {
      fallbackSequence.forEach((direction, index) => {
        events.push({ beat: index, direction });
      });
      beat = fallbackSequence.length;
    }

    return { events, beats: beat };
  }

  function rhythmGridX(col) {
    const cols = Number.isInteger(state.encounter.defense?.cols) ? state.encounter.defense.cols : 5;
    return state.box.x + 22 + col * ((state.box.w - 44) / Math.max(1, cols - 1));
  }

  function rhythmGridY(row) {
    const rows = Number.isInteger(state.encounter.defense?.rows) ? state.encounter.defense.rows : 3;
    return state.box.y + 22 + row * ((state.box.h - 44) / Math.max(1, rows - 1));
  }

  function rhythmDirectionInput() {
    if (input.right) return "right";
    if (input.up) return "up";
    if (input.left) return "left";
    if (input.down) return "down";
    return null;
  }

  function moveGridPosition(target, direction) {
    if (direction === "right") target.col++;
    if (direction === "up") target.row--;
    if (direction === "left") target.col--;
    if (direction === "down") target.row++;
    const cols = Number.isInteger(state.encounter.defense?.cols) ? state.encounter.defense.cols : 5;
    const rows = Number.isInteger(state.encounter.defense?.rows) ? state.encounter.defense.rows : 3;
    target.col = clamp(target.col, 0, cols - 1);
    target.row = clamp(target.row, 0, rows - 1);
  }

  function gridPositionAtDanceBeat(events, danceBeat) {
    const cols = Number.isInteger(state.encounter.defense?.cols) ? state.encounter.defense.cols : 5;
    const rows = Number.isInteger(state.encounter.defense?.rows) ? state.encounter.defense.rows : 3;
    const position = { col: Math.floor(cols / 2), row: Math.floor(rows / 2) };
    for (const event of events) {
      if (event.beat > danceBeat + 0.0001) break;
      if (event.direction) moveGridPosition(position, event.direction);
    }
    return position;
  }

  function hurtForMissedRhythmStep() {
    const beastDodged = consumePartyDamageGuard();
    if (!beastDodged) {
      const grid = state.encounter.defense;
      const isLineDance = grid && !grid.mode && Array.isArray(grid.danceEvents);
      const damageHits = isLineDance && Number.isInteger(grid.damageHits) ? grid.damageHits : 0;
      const damage = isLineDance
        ? [10, 7, 5, 3][Math.min(damageHits, 3)]
        : currentAttackDamage();
      damageRandomLivingPlayer(damage);
      if (isLineDance) grid.damageHits = damageHits + 1;
      playSound(sounds.playerHurt);
      state.shake = 10;
    }
    state.soul.invuln = 16;
    if (partyIsDefeated()) beginPlayerDeath();
  }

  function randomDistinctIndexes(count, maximum, excluded = []) {
    const available = Array.from({ length: maximum }, (_, index) => index)
      .filter((index) => !excluded.includes(index));
    for (let index = available.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [available[index], available[swapIndex]] = [available[swapIndex], available[index]];
    }
    return available.slice(0, count);
  }

  function updateFreestyleGridAttack(grid, musicBeat) {
    while (musicBeat >= grid.nextCueBeat) {
      const firstCue = grid.cueCount === 0;
      grid.cues.push({
        spawnBeat: grid.nextCueBeat,
        rows: firstCue && grid.rowArrowCount === 2
          ? [0, grid.rows - 1]
          : randomDistinctIndexes(grid.rowArrowCount, grid.rows),
        cols: randomDistinctIndexes(
          grid.colArrowCount,
          grid.cols,
          firstCue && grid.colArrowCount < grid.cols ? [Math.floor(grid.cols / 2)] : []
        ),
        fired: false
      });
      grid.cueCount++;
      grid.nextCueBeat += 4;
    }

    for (const cue of grid.cues) {
      const fireBeat = cue.spawnBeat + 2;
      if (cue.fired || musicBeat < fireBeat) continue;

      cue.fired = true;
      cue.firedAtBeat = fireBeat;
      cue.damaged = false;
      playSound(sounds.arrow);
    }

    const travelDuration = 0.12;
    const arrowLength = 130;
    for (const cue of grid.cues) {
      if (!cue.fired || cue.damaged) continue;
      const travelProgress = (musicBeat - cue.firedAtBeat) * grid.beatDuration / travelDuration;
      if (travelProgress < 0 || travelProgress > 1) continue;

      const rowArrowHead = lerp(state.box.x - 10, state.box.x + state.box.w + arrowLength, travelProgress);
      const colArrowHead = lerp(state.box.y - 10, state.box.y + state.box.h + arrowLength, travelProgress);
      const rowHit = cue.rows.includes(grid.soulRow) &&
        state.soul.x >= rowArrowHead - arrowLength - state.soul.r &&
        state.soul.x <= rowArrowHead + state.soul.r;
      const colHit = cue.cols.includes(grid.soulCol) &&
        state.soul.y >= colArrowHead - arrowLength - state.soul.r &&
        state.soul.y <= colArrowHead + state.soul.r;

      if (rowHit || colHit) {
        cue.damaged = true;
        hurtForMissedRhythmStep();
      }
    }

    grid.cues = grid.cues.filter((cue) => !cue.fired || musicBeat - cue.firedAtBeat < 0.65);
  }

  function vampireHeartMoves(grid, vampire) {
    const margin = Number.isInteger(vampire.blastMargin) ? vampire.blastMargin : 1;
    const minCol = margin;
    const maxCol = grid.cols - 1 - margin;
    const minRow = margin;
    const maxRow = grid.rows - 1 - margin;
    return [
      { direction: "left", dc: -1, dr: 0 },
      { direction: "right", dc: 1, dr: 0 },
      { direction: "up", dc: 0, dr: -1 },
      { direction: "down", dc: 0, dr: 1 }
    ].filter((move) => (
      vampire.col + move.dc >= minCol &&
      vampire.col + move.dc <= maxCol &&
      vampire.row + move.dr >= minRow &&
      vampire.row + move.dr <= maxRow
    ));
  }

  function moveVampireHeartGroup(grid, movingHearts, allHearts, musicBeat) {
    const movingSet = new Set(movingHearts);
    const stationaryHearts = allHearts.filter((heart) => !movingSet.has(heart));
    const plans = [];

    function chooseMove(index) {
      if (index >= movingHearts.length) return true;

      const heart = movingHearts[index];
      const candidates = vampireHeartMoves(grid, heart)
        .map((move) => {
          const nextCol = heart.col + move.dc;
          const nextRow = heart.row + move.dr;
          const playerDistance = Math.abs(nextCol - grid.soulCol) + Math.abs(nextRow - grid.soulRow);
          return {
            move,
            order: heart.seekSoul ? playerDistance + Math.random() * 0.25 : Math.random()
          };
        })
        .sort((a, b) => a.order - b.order)
        .map((entry) => entry.move);

      for (const move of candidates) {
        const next = { col: heart.col + move.dc, row: heart.row + move.dr };
        const hitsStationaryHeart = stationaryHearts.some((other) =>
          other.col === next.col && other.row === next.row
        );
        const conflictsWithPlan = plans.some((plan, otherIndex) => {
          const other = movingHearts[otherIndex];
          const sameDestination = plan.next.col === next.col && plan.next.row === next.row;
          const swapsPlaces = next.col === other.col && next.row === other.row &&
            plan.next.col === heart.col && plan.next.row === heart.row;
          return sameDestination || swapsPlaces;
        });
        if (hitsStationaryHeart || conflictsWithPlan) continue;

        plans.push({ move, next });
        if (chooseMove(index + 1)) return true;
        plans.pop();
      }

      return false;
    }

    if (!chooseMove(0)) return false;

    movingHearts.forEach((vampire, index) => {
      vampire.fromCol = vampire.col;
      vampire.fromRow = vampire.row;
      vampire.col = plans[index].next.col;
      vampire.row = plans[index].next.row;
      vampire.movedAtBeat = musicBeat;
    });
    return true;
  }

  function moveVampireHearts(grid, musicBeat) {
    moveVampireHeartGroup(grid, grid.vampires, grid.vampires, musicBeat);
  }

  function updateVampireGridAttack(grid, musicBeat) {
    while (musicBeat >= grid.nextMoveBeat) {
      grid.cues.push({
        moveBeat: grid.nextMoveBeat,
        fireBeat: grid.nextMoveBeat + grid.attackDelayBeats,
        movesDone: 0,
        positions: null,
        fired: false
      });
      grid.nextMoveBeat += grid.moveIntervalBeats;
    }

    for (const cue of grid.cues) {
      while (cue.movesDone < grid.movesPerDownbeat) {
        const scheduledMoveBeat = cue.moveBeat + cue.movesDone / grid.movesPerDownbeat;
        if (musicBeat < scheduledMoveBeat) break;

        moveVampireHearts(grid, scheduledMoveBeat);
        cue.movesDone++;
        playSound(sounds.wing);

        if (cue.movesDone >= grid.movesPerDownbeat) {
          cue.positions = grid.vampires.map((vampire) => ({ col: vampire.col, row: vampire.row }));
        }
      }

      if (!cue.positions || cue.fired || musicBeat < cue.fireBeat) continue;

      cue.fired = true;
      cue.firedAtBeat = cue.fireBeat;
      cue.judged = false;
      playSound(sounds.arrow);
    }

    const burstDurationBeats = 0.16 / grid.beatDuration;
    grid.cues = grid.cues.filter((cue) => !cue.fired || musicBeat - cue.firedAtBeat < burstDurationBeats);
  }

  function vampireLordLineCells(grid, vampireLord, lineType, fireBeat) {
    const cells = [];
    const staggerBeats = 0.012 / grid.beatDuration;

    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const colDistance = Math.abs(col - vampireLord.col);
        const rowDistance = Math.abs(row - vampireLord.row);
        const distance = Math.max(colDistance, rowDistance);
        const isCenter = distance === 0;
        const isOnLine = lineType === "x"
          ? colDistance === rowDistance
          : col === vampireLord.col || row === vampireLord.row;
        if (!isCenter && isOnLine) {
          cells.push({
            col,
            row,
            spawnBeat: fireBeat + distance * staggerBeats,
            judged: false
          });
        }
      }
    }

    return cells;
  }

  function updateVampireLordGridAttack(grid, musicBeat) {
    while (musicBeat >= grid.nextCycleBeat) {
      const cycleBeat = grid.nextCycleBeat;
      grid.regularCues.push({
        moveBeat: cycleBeat,
        fireBeat: cycleBeat + 2,
        movesDone: 0,
        positions: null,
        fired: false
      });
      grid.lordCues.push({
        moveBeat: cycleBeat,
        lineBeat: cycleBeat + 1,
        blastBeat: cycleBeat + 2,
        lineTypes: ["x", "plus"],
        moved: false,
        lineFired: false,
        blastFired: false
      });
      grid.skullCues.push({
        fireBeat: cycleBeat + 3,
        fired: false
      });
      grid.nextCycleBeat += 4;
    }

    const allHearts = [...grid.vampires, grid.vampireLord];
    while (true) {
      let nextMoveBeat = Infinity;
      for (const cue of grid.regularCues) {
        if (cue.movesDone < 2) nextMoveBeat = Math.min(nextMoveBeat, cue.moveBeat + cue.movesDone / 2);
      }
      for (const cue of grid.lordCues) {
        if (!cue.moved) nextMoveBeat = Math.min(nextMoveBeat, cue.moveBeat);
      }
      if (musicBeat < nextMoveBeat || !Number.isFinite(nextMoveBeat)) break;

      const regularMoves = grid.regularCues.filter((cue) =>
        cue.movesDone < 2 && Math.abs(cue.moveBeat + cue.movesDone / 2 - nextMoveBeat) < 0.0001
      );
      const lordMoves = grid.lordCues.filter((cue) =>
        !cue.moved && Math.abs(cue.moveBeat - nextMoveBeat) < 0.0001
      );
      const movingHearts = regularMoves.length > 0 ? [...grid.vampires] : [];
      if (lordMoves.length > 0) movingHearts.push(grid.vampireLord);
      moveVampireHeartGroup(grid, movingHearts, allHearts, nextMoveBeat);
      playSound(sounds.wing);

      for (const cue of regularMoves) {
        cue.movesDone++;
        if (cue.movesDone === 2) {
          cue.positions = grid.vampires.map((vampire) => ({ col: vampire.col, row: vampire.row }));
        }
      }
      for (const cue of lordMoves) {
        cue.moved = true;
        cue.position = { col: grid.vampireLord.col, row: grid.vampireLord.row };
      }
    }

    for (const cue of grid.regularCues) {
      if (!cue.positions || cue.fired || musicBeat < cue.fireBeat) continue;
      cue.fired = true;
      cue.firedAtBeat = cue.fireBeat;
      cue.judged = false;
      playSound(sounds.arrow);
    }

    for (const cue of grid.lordCues) {
      if (cue.moved && !cue.lineFired && musicBeat >= cue.lineBeat) {
        cue.lineFired = true;
        cue.lineCells = cue.lineTypes.flatMap((lineType) =>
          vampireLordLineCells(grid, cue.position, lineType, cue.lineBeat)
        );
        playSound(sounds.arrow);
      }
      if (cue.moved && !cue.blastFired && musicBeat >= cue.blastBeat) {
        cue.blastFired = true;
        cue.blastFiredAtBeat = cue.blastBeat;
        cue.blastPosition = { ...cue.position };
        cue.blastJudged = false;
        playSound(sounds.arrow);
      }
    }

    for (const cue of grid.skullCues) {
      if (cue.fired || musicBeat < cue.fireBeat) continue;
      cue.fired = true;
      cue.firedAtBeat = cue.fireBeat;
      cue.judged = false;
      cue.cells = grid.skullSouls.flatMap((skull) => {
        const edgeCol = skull.side === "left" ? 0 : grid.cols - 1;
        const inward = skull.side === "left" ? 1 : -1;
        return [
          { col: edgeCol, row: skull.row - 1 },
          { col: edgeCol, row: skull.row },
          { col: edgeCol, row: skull.row + 1 },
          { col: edgeCol + inward, row: skull.row }
        ];
      });
      playSound(sounds.bombsplosion, 0.5);
    }

    const burstDurationBeats = 0.16 / grid.beatDuration;
    const lineDurationBeats = 0.18 / grid.beatDuration;
    const skullBlastDurationBeats = 0.22 / grid.beatDuration;
    grid.regularCues = grid.regularCues.filter((cue) =>
      !cue.fired || musicBeat - cue.firedAtBeat < burstDurationBeats
    );
    grid.lordCues = grid.lordCues.filter((cue) => {
      if (!cue.blastFired || !cue.lineFired) return true;
      const lastLineBeat = cue.lineCells.reduce((latest, cell) => Math.max(latest, cell.spawnBeat), cue.lineBeat);
      return musicBeat - Math.max(lastLineBeat + lineDurationBeats, cue.blastFiredAtBeat + burstDurationBeats) < 0;
    });
    grid.skullCues = grid.skullCues.filter((cue) =>
      !cue.fired || musicBeat - cue.firedAtBeat < skullBlastDurationBeats
    );
  }

  function vampireHeartPosition(grid, vampire, musicBeat) {
    const moveProgress = vampire.movedAtBeat === null
      ? 1
      : clamp((musicBeat - vampire.movedAtBeat) * grid.beatDuration / 0.12, 0, 1);
    const easedProgress = 1 - Math.pow(1 - moveProgress, 3);
    return {
      x: lerp(rhythmGridX(vampire.fromCol), rhythmGridX(vampire.col), easedProgress),
      y: lerp(rhythmGridY(vampire.fromRow), rhythmGridY(vampire.row), easedProgress)
    };
  }

  function judgeVampireGridBursts(grid) {
    const elapsed = getMusicElapsed(sounds.battleTheme);
    if (!Number.isFinite(elapsed)) return;

    const musicBeat = (elapsed - sounds.battleTheme.loopStart) / grid.beatDuration;
    const vampireTouched = grid.vampires.some((vampire) => {
      const position = vampireHeartPosition(grid, vampire, musicBeat);
      return Math.hypot(state.soul.x - position.x, state.soul.y - position.y) <= state.soul.r + 10;
    });
    if (vampireTouched && state.soul.invuln <= 0) hurtForMissedRhythmStep();

    for (const cue of grid.cues) {
      if (!cue.fired || cue.judged || musicBeat < cue.fireBeat) continue;

      cue.judged = true;
      const soulHit = cue.positions.some((position) => {
        const colDistance = Math.abs(grid.soulCol - position.col);
        const rowDistance = Math.abs(grid.soulRow - position.row);
        return colDistance <= 1 && rowDistance <= 1 && (colDistance !== 0 || rowDistance !== 0);
      });
      if (soulHit && state.soul.invuln <= 0) hurtForMissedRhythmStep();
    }
  }

  function judgeVampireLordGridHazards(grid) {
    const elapsed = getMusicElapsed(sounds.battleTheme);
    if (!Number.isFinite(elapsed)) return;

    const musicBeat = (elapsed - sounds.battleTheme.loopStart) / grid.beatDuration;
    const allHearts = [...grid.vampires, grid.vampireLord];
    const vampireTouched = allHearts.some((vampire) => {
      const position = vampireHeartPosition(grid, vampire, musicBeat);
      return Math.hypot(state.soul.x - position.x, state.soul.y - position.y) <=
        state.soul.r + vampire.contactRadius;
    });
    if (vampireTouched && state.soul.invuln <= 0) hurtForMissedRhythmStep();

    for (const cue of grid.regularCues) {
      if (!cue.fired || cue.judged || musicBeat < cue.fireBeat) continue;
      cue.judged = true;
      const soulHit = cue.positions.some((position) => {
        const colDistance = Math.abs(grid.soulCol - position.col);
        const rowDistance = Math.abs(grid.soulRow - position.row);
        return colDistance <= 1 && rowDistance <= 1 && (colDistance !== 0 || rowDistance !== 0);
      });
      if (soulHit && state.soul.invuln <= 0) hurtForMissedRhythmStep();
    }

    for (const cue of grid.lordCues) {
      if (cue.lineFired) {
        for (const cell of cue.lineCells) {
          if (cell.judged || musicBeat < cell.spawnBeat) continue;
          cell.judged = true;
          if (grid.soulCol === cell.col && grid.soulRow === cell.row && state.soul.invuln <= 0) {
            hurtForMissedRhythmStep();
          }
        }
      }

      if (!cue.blastFired || cue.blastJudged || musicBeat < cue.blastBeat) continue;
      cue.blastJudged = true;
      const colDistance = Math.abs(grid.soulCol - cue.blastPosition.col);
      const rowDistance = Math.abs(grid.soulRow - cue.blastPosition.row);
      if (colDistance <= 2 && rowDistance <= 2 && state.soul.invuln <= 0) {
        hurtForMissedRhythmStep();
      }
    }

    for (const cue of grid.skullCues) {
      if (!cue.fired || cue.judged || musicBeat < cue.fireBeat) continue;
      cue.judged = true;
      const soulHit = cue.cells.some((cell) =>
        grid.soulCol === cell.col && grid.soulRow === cell.row
      );
      if (soulHit && state.soul.invuln <= 0) hurtForMissedRhythmStep();
    }
  }

  function updateRhythmGridAttack() {
    const grid = state.encounter.defense;
    const music = sounds.battleTheme;
    const elapsed = getMusicElapsed(music);
    if (!grid || !Number.isFinite(elapsed)) return;

    if (grid.mode === "freestyle" || grid.mode === "vampire" || grid.mode === "vampireLord") {
      const musicBeat = (elapsed - music.loopStart) / grid.beatDuration;
      if (grid.mode === "vampireLord") {
        updateVampireLordGridAttack(grid, musicBeat);
        return;
      }
      if (grid.mode === "vampire") {
        updateVampireGridAttack(grid, musicBeat);
        return;
      }
      updateFreestyleGridAttack(grid, musicBeat);
      return;
    }

    if (grid.finished) {
      grid.finishTimer++;
      if (grid.finishTimer >= 60) state.enemyTimer = state.enemyDuration;
      return;
    }

    const musicBeat = (elapsed - music.loopStart) / grid.beatDuration;
    const relativeBeat = musicBeat - grid.introStartBeat;
    grid.beatPhase = ((relativeBeat % 1) + 1) % 1;

    if (relativeBeat < 0) return;

    const demoBeat = relativeBeat - 4;
    const soundLeadBeats = 0.07 / grid.beatDuration;
    while (
      grid.demoSoundStep + 1 < grid.danceEvents.length &&
      grid.danceEvents[grid.demoSoundStep + 1].beat <= demoBeat + soundLeadBeats
    ) {
      grid.demoSoundStep++;
      if (grid.danceEvents[grid.demoSoundStep].direction) playSound(sounds.wing);
    }

    if (relativeBeat < 4) {
      grid.phase = "introCountdown";
      grid.countdown = 4 - Math.floor(relativeBeat);
      return;
    }

    if (demoBeat < grid.danceBeats) {
      grid.phase = "demo";
      grid.countdown = null;
      const step = grid.danceEvents.reduce((count, event) => count + (event.beat <= demoBeat ? 1 : 0), 0) - 1;
      if (step !== grid.demoStep) {
        grid.demoStep = step;
        const feetPosition = gridPositionAtDanceBeat(grid.danceEvents, demoBeat);
        grid.col = feetPosition.col;
        grid.row = feetPosition.row;
      }
      return;
    }

    const restBeat = demoBeat - grid.danceBeats;
    if (restBeat < 4) {
      grid.phase = "rest";
      grid.countdown = null;
      return;
    }

    const countdownBeat = restBeat - 4;
    if (countdownBeat < 4) {
      grid.phase = "countdown";
      grid.countdown = 4 - Math.floor(countdownBeat);
      return;
    }

    const responseBeat = countdownBeat - 4;
    grid.phase = "response";
    grid.countdown = null;

    if (grid.responseStep >= grid.danceEvents.length) {
      grid.finished = true;
      return;
    }

    while (
      grid.preparedResponseStep + 1 < grid.danceEvents.length &&
      grid.danceEvents[grid.preparedResponseStep + 1].beat <= responseBeat
    ) {
      grid.preparedResponseStep++;
      const expectedPosition = { col: grid.expectedCol, row: grid.expectedRow };
      const direction = grid.danceEvents[grid.preparedResponseStep].direction;
      if (direction) moveGridPosition(expectedPosition, direction);
      grid.expectedCol = expectedPosition.col;
      grid.expectedRow = expectedPosition.row;
    }
  }

  function judgeRhythmGridResponse() {
    const grid = state.encounter.defense;
    if (grid?.mode === "vampireLord") {
      judgeVampireLordGridHazards(grid);
      return;
    }
    if (grid?.mode === "vampire") {
      judgeVampireGridBursts(grid);
      return;
    }
    if (
      !grid ||
      grid.mode === "freestyle" ||
      grid.phase !== "response" ||
      grid.responseStep >= grid.danceEvents.length
    ) return;

    const music = sounds.battleTheme;
    const elapsed = getMusicElapsed(music);
    if (!Number.isFinite(elapsed)) return;

    const responseStartBeat = 12 + grid.danceBeats;
    const responseBeat = (elapsed - music.loopStart) / grid.beatDuration - grid.introStartBeat - responseStartBeat;

    const graceBeats = grid.inputWindow / grid.beatDuration;
    while (
      grid.responseStep < grid.danceEvents.length &&
      responseBeat >= grid.danceEvents[grid.responseStep].beat + graceBeats
    ) {
      if (grid.soulCol !== grid.expectedCol || grid.soulRow !== grid.expectedRow) {
        hurtForMissedRhythmStep();
      }
      grid.responseStep++;
    }

    if (grid.responseStep >= grid.danceEvents.length) {
      grid.finished = true;
      state.enemyDuration = Math.max(state.enemyDuration, state.enemyTimer + 60);
    }
  }

  function drawRhythmGrid() {
    const grid = state.encounter.defense;
    const cols = Number.isInteger(grid?.cols) ? grid.cols : 5;
    const rows = Number.isInteger(grid?.rows) ? grid.rows : 3;

    ctx.save();
    ctx.strokeStyle = "#9d5cff";
    ctx.fillStyle = "#9d5cff";
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.65;

    for (let row = 0; row < rows; row++) {
      ctx.beginPath();
      ctx.moveTo(rhythmGridX(0), rhythmGridY(row));
      ctx.lineTo(rhythmGridX(cols - 1), rhythmGridY(row));
      ctx.stroke();
    }
    for (let col = 0; col < cols; col++) {
      ctx.beginPath();
      ctx.moveTo(rhythmGridX(col), rhythmGridY(0));
      ctx.lineTo(rhythmGridX(col), rhythmGridY(rows - 1));
      ctx.stroke();
    }
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        ctx.beginPath();
        ctx.arc(rhythmGridX(col), rhythmGridY(row), 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    if (grid.mode === "vampireLord") {
      drawVampireLordGrid(grid);
      return;
    }

    if (grid.mode === "vampire") {
      drawVampireGrid(grid);
      return;
    }

    if (grid.mode === "freestyle") {
      drawFreestyleGridCues(grid);
      return;
    }

    if (grid.phase === "introCountdown" || grid.phase === "demo") {
      const elapsed = getMusicElapsed(sounds.battleTheme);
      const audioBeat = Number.isFinite(elapsed)
        ? (elapsed - sounds.battleTheme.loopStart) / grid.beatDuration
        : 0;
      const beatPhase = ((audioBeat % 1) + 1) % 1;
      let feetPosition = { col: 2, row: 1 };
      if (grid.phase === "demo") {
        const liveDanceBeat = audioBeat - grid.introStartBeat - 4;
        feetPosition = gridPositionAtDanceBeat(grid.danceEvents, liveDanceBeat);
      }
      drawDancingFeet(rhythmGridX(feetPosition.col), rhythmGridY(feetPosition.row), beatPhase);
    }

    if ((grid.phase === "introCountdown" || grid.phase === "countdown") && grid.countdown) {
      ctx.save();
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 6;
      ctx.font = "bold 52px Courier New";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeText(String(grid.countdown), state.box.x + state.box.w / 2, state.box.y + state.box.h / 2);
      ctx.fillText(String(grid.countdown), state.box.x + state.box.w / 2, state.box.y + state.box.h / 2);
      ctx.restore();
    }
  }

  function drawVampireGrid(grid) {
    const elapsed = getMusicElapsed(sounds.battleTheme);
    if (!Number.isFinite(elapsed)) return;

    const musicBeat = (elapsed - sounds.battleTheme.loopStart) / grid.beatDuration;
    const cellWidth = Math.abs(rhythmGridX(1) - rhythmGridX(0));
    const cellHeight = Math.abs(rhythmGridY(1) - rhythmGridY(0));
    const burstDuration = 0.16;

    for (const cue of grid.cues) {
      if (!cue.fired) continue;

      const progress = clamp((musicBeat - cue.firedAtBeat) * grid.beatDuration / burstDuration, 0, 1);
      const alpha = Math.pow(1 - progress, 0.7);
      for (const position of cue.positions) {
        ctx.save();
        ctx.globalAlpha = alpha * 0.82;
        ctx.fillStyle = "#74152b";
        ctx.strokeStyle = "#bd3552";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#7a102a";
        ctx.shadowBlur = 16 * (1 - progress);

        for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
          for (let colOffset = -1; colOffset <= 1; colOffset++) {
            if (colOffset === 0 && rowOffset === 0) continue;
            const x = rhythmGridX(position.col + colOffset);
            const y = rhythmGridY(position.row + rowOffset);
            const width = cellWidth * 0.82;
            const height = cellHeight * 0.82;
            ctx.fillRect(x - width / 2, y - height / 2, width, height);
            ctx.strokeRect(x - width / 2, y - height / 2, width, height);
          }
        }

        const outerX = rhythmGridX(position.col - 1) - cellWidth * 0.41;
        const outerY = rhythmGridY(position.row - 1) - cellHeight * 0.41;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 4;
        ctx.strokeRect(outerX, outerY, cellWidth * 2.82, cellHeight * 2.82);
        ctx.restore();
      }
    }

    const beatPhase = ((musicBeat % 1) + 1) % 1;
    for (const vampire of grid.vampires) {
      const position = vampireHeartPosition(grid, vampire, musicBeat);
      drawVampireHeart(position.x, position.y, beatPhase);
    }
  }

  function drawVampireLordGrid(grid) {
    const elapsed = getMusicElapsed(sounds.battleTheme);
    if (!Number.isFinite(elapsed)) return;

    const musicBeat = (elapsed - sounds.battleTheme.loopStart) / grid.beatDuration;
    const cellWidth = Math.abs(rhythmGridX(1) - rhythmGridX(0));
    const cellHeight = Math.abs(rhythmGridY(1) - rhythmGridY(0));
    const burstDuration = 0.16;
    const fireDuration = 0.18;
    const skullBlastDuration = 0.22;

    for (const cue of grid.regularCues) {
      if (!cue.fired) continue;
      const progress = clamp((musicBeat - cue.firedAtBeat) * grid.beatDuration / burstDuration, 0, 1);
      const alpha = Math.pow(1 - progress, 0.7);
      ctx.save();
      ctx.globalAlpha = alpha * 0.82;
      ctx.fillStyle = "#74152b";
      ctx.strokeStyle = "#bd3552";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "#7a102a";
      ctx.shadowBlur = 10 * (1 - progress);
      for (const position of cue.positions) {
        for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
          for (let colOffset = -1; colOffset <= 1; colOffset++) {
            if (colOffset === 0 && rowOffset === 0) continue;
            const x = rhythmGridX(position.col + colOffset);
            const y = rhythmGridY(position.row + rowOffset);
            const width = cellWidth * 0.78;
            const height = cellHeight * 0.78;
            ctx.fillRect(x - width / 2, y - height / 2, width, height);
            ctx.strokeRect(x - width / 2, y - height / 2, width, height);
          }
        }
      }
      ctx.restore();
    }

    for (const cue of grid.lordCues) {
      if (cue.lineFired) {
        for (const cell of cue.lineCells) {
          const age = (musicBeat - cell.spawnBeat) * grid.beatDuration;
          if (age < 0 || age > fireDuration) continue;
          const progress = age / fireDuration;
          const pulse = 0.78 + Math.sin(progress * Math.PI) * 0.22;
          const x = rhythmGridX(cell.col);
          const y = rhythmGridY(cell.row);
          const width = cellWidth * 0.8 * pulse;
          const height = cellHeight * 0.8 * pulse;
          ctx.save();
          ctx.globalAlpha = Math.pow(1 - progress, 0.45);
          ctx.fillStyle = "#ff5a16";
          ctx.strokeStyle = "#ffd15c";
          ctx.lineWidth = 2;
          ctx.shadowColor = "#ff2a00";
          ctx.shadowBlur = 13;
          ctx.fillRect(x - width / 2, y - height / 2, width, height);
          ctx.strokeRect(x - width / 2, y - height / 2, width, height);
          ctx.restore();
        }
      }

      if (cue.blastFired) {
        const progress = clamp(
          (musicBeat - cue.blastFiredAtBeat) * grid.beatDuration / burstDuration,
          0,
          1
        );
        const alpha = Math.pow(1 - progress, 0.6);
        ctx.save();
        ctx.globalAlpha = alpha * 0.88;
        ctx.fillStyle = "#102f76";
        ctx.strokeStyle = "#4384e8";
        ctx.lineWidth = 1.5;
        ctx.shadowColor = "#144da5";
        ctx.shadowBlur = 14 * (1 - progress);
        for (let rowOffset = -2; rowOffset <= 2; rowOffset++) {
          for (let colOffset = -2; colOffset <= 2; colOffset++) {
            const x = rhythmGridX(cue.blastPosition.col + colOffset);
            const y = rhythmGridY(cue.blastPosition.row + rowOffset);
            const width = cellWidth * 0.82;
            const height = cellHeight * 0.82;
            ctx.fillRect(x - width / 2, y - height / 2, width, height);
            ctx.strokeRect(x - width / 2, y - height / 2, width, height);
          }
        }
        ctx.restore();
      }
    }

    for (const cue of grid.skullCues) {
      if (!cue.fired) continue;
      const progress = clamp(
        (musicBeat - cue.firedAtBeat) * grid.beatDuration / skullBlastDuration,
        0,
        1
      );
      const alpha = Math.pow(1 - progress, 0.55);
      ctx.save();
      ctx.globalAlpha = alpha * 0.9;
      ctx.fillStyle = "#39e63d";
      ctx.strokeStyle = "#caff9a";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#37ff18";
      ctx.shadowBlur = 18 * (1 - progress);
      for (const cell of cue.cells) {
        const x = rhythmGridX(cell.col);
        const y = rhythmGridY(cell.row);
        const width = cellWidth * 0.84;
        const height = cellHeight * 0.84;
        ctx.fillRect(x - width / 2, y - height / 2, width, height);
        ctx.strokeRect(x - width / 2, y - height / 2, width, height);
      }
      ctx.restore();
    }

    const beatPhase = ((musicBeat % 1) + 1) % 1;
    for (const vampire of grid.vampires) {
      const position = vampireHeartPosition(grid, vampire, musicBeat);
      drawVampireHeart(position.x, position.y, beatPhase, vampire.scale);
    }
    const lordPosition = vampireHeartPosition(grid, grid.vampireLord, musicBeat);
    drawVampireLordHeart(lordPosition.x, lordPosition.y, beatPhase);
    for (const skull of grid.skullSouls) {
      const position = flamingSkullSoulPosition(grid, skull);
      drawFlamingSkullSoul(position.x, position.y, beatPhase);
    }
  }

  function flamingSkullSoulPosition(grid, skull) {
    const cellWidth = Math.abs(rhythmGridX(1) - rhythmGridX(0));
    const edgeX = skull.side === "left" ? rhythmGridX(0) : rhythmGridX(grid.cols - 1);
    return {
      x: edgeX + (skull.side === "left" ? -1 : 1) * cellWidth * 0.72,
      y: rhythmGridY(skull.row)
    };
  }

  function drawFlamingSkullSoul(x, y, beatPhase) {
    const flicker = Math.sin(beatPhase * Math.PI * 4) * 1.7;

    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#42f04b";
    ctx.shadowColor = "#37ff18";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(-5, -5);
    ctx.quadraticCurveTo(-9, -14 + flicker, -2, -18);
    ctx.quadraticCurveTo(0, -11 - flicker, 5, -16);
    ctx.quadraticCurveTo(9, -8 + flicker, 5, -4);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 4;
    drawHeartShape(0, 0, "#fff");
    ctx.restore();
  }

  function drawVampireHeart(x, y, beatPhase, scale = 1) {
    const flap = Math.sin(beatPhase * Math.PI * 2) * 2.5;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "#3b0715";
    ctx.strokeStyle = "#8d1d39";
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(-7, -3);
    ctx.lineTo(-17, -11 - flap);
    ctx.lineTo(-16, -1);
    ctx.lineTo(-26, -6 + flap);
    ctx.lineTo(-20, 8);
    ctx.lineTo(-7, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(7, -3);
    ctx.lineTo(17, -11 - flap);
    ctx.lineTo(16, -1);
    ctx.lineTo(26, -6 + flap);
    ctx.lineTo(20, 8);
    ctx.lineTo(7, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    drawHeartShape(0, 0, "#681127");
    ctx.restore();
  }

  function drawVampireLordHeart(x, y, beatPhase) {
    const flap = Math.sin(beatPhase * Math.PI * 2) * 3.5;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(0.9, 0.9);
    ctx.fillStyle = "#020611";
    ctx.strokeStyle = "#2459a6";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#174a9c";
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(-8, -3);
    ctx.lineTo(-22, -15 - flap);
    ctx.lineTo(-20, -2);
    ctx.lineTo(-34, -9 + flap);
    ctx.lineTo(-28, 10);
    ctx.lineTo(-8, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(8, -3);
    ctx.lineTo(22, -15 - flap);
    ctx.lineTo(20, -2);
    ctx.lineTo(34, -9 + flap);
    ctx.lineTo(28, 10);
    ctx.lineTo(8, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 10;
    drawHeartShape(0, 0, "#071b49");
    ctx.restore();
  }

  function drawFreestyleGridCues(grid) {
    const elapsed = getMusicElapsed(sounds.battleTheme);
    if (!Number.isFinite(elapsed)) return;
    const musicBeat = (elapsed - sounds.battleTheme.loopStart) / grid.beatDuration;

    for (const cue of grid.cues) {
      if (!cue.fired) {
        ctx.save();
        ctx.fillStyle = "#ff2d3f";
        ctx.shadowColor = "#ff1e35";
        ctx.shadowBlur = 9;
        for (const row of cue.rows) {
          ctx.beginPath();
          ctx.arc(state.box.x - 13, rhythmGridY(row), 7, 0, Math.PI * 2);
          ctx.fill();
        }
        for (const col of cue.cols) {
          ctx.beginPath();
          ctx.arc(rhythmGridX(col), state.box.y - 13, 7, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        continue;
      }

      const travelDuration = 0.12;
      const travelProgress = (musicBeat - cue.firedAtBeat) * grid.beatDuration / travelDuration;
      if (travelProgress < 0 || travelProgress > 1) continue;

      const arrowLength = 130;
      const rowArrowHead = lerp(state.box.x - 10, state.box.x + state.box.w + arrowLength, travelProgress);
      const colArrowHead = lerp(state.box.y - 10, state.box.y + state.box.h + arrowLength, travelProgress);
      for (const row of cue.rows) {
        drawFreestyleArrow(rowArrowHead, rhythmGridY(row), arrowLength, 0);
      }
      for (const col of cue.cols) {
        drawFreestyleArrow(rhythmGridX(col), colArrowHead, arrowLength, Math.PI / 2);
      }
    }
  }

  function drawFreestyleArrow(headX, headY, length, angle) {
    ctx.save();
    ctx.translate(headX, headY);
    ctx.rotate(angle);
    ctx.fillStyle = "#ff2d3f";
    ctx.shadowColor = "#ff1e35";
    ctx.shadowBlur = 12;
    ctx.fillRect(-length, -4, length - 18, 8);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-24, -12);
    ctx.lineTo(-24, 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawRhythmGridBeatRectangle(box) {
    const grid = state.encounter.defense;
    const elapsed = getMusicElapsed(sounds.battleTheme);
    if (!grid || !Number.isFinite(elapsed) || elapsed < sounds.battleTheme.loopStart) return;

    const audioBeat = (elapsed - sounds.battleTheme.loopStart) / grid.beatDuration;
    const pairPhase = ((audioBeat % 2) + 2) % 2;
    if (pairPhase >= 1) return;

    const timeProgress = pairPhase;
    const travelProgress = 0.8 * timeProgress + 0.2 * timeProgress * timeProgress;
    const outset = 26 * travelProgress;

    ctx.save();
    ctx.globalAlpha = Math.pow(1 - timeProgress, 1.35) * 0.9;
    ctx.strokeStyle = "#c9a8ff";
    ctx.lineWidth = 5 - timeProgress * 2;
    ctx.shadowColor = "#9d5cff";
    ctx.shadowBlur = 20 * (1 - timeProgress);
    ctx.strokeRect(
      box.x - outset,
      box.y - outset,
      box.w + outset * 2,
      box.h + outset * 2
    );
    ctx.restore();

    const flashDurationBeats = 0.45;
    if (pairPhase >= flashDurationBeats) return;

    const flashProgress = pairPhase / flashDurationBeats;
    ctx.save();
    ctx.globalAlpha = Math.pow(1 - flashProgress, 1.6);
    ctx.strokeStyle = "#f3eaff";
    ctx.lineWidth = 9 - flashProgress * 4;
    ctx.shadowColor = "#b26cff";
    ctx.shadowBlur = 34 * (1 - flashProgress);
    ctx.strokeRect(box.x, box.y, box.w, box.h);
    ctx.restore();
  }

  function drawDancingFeet(x, y, beatPhase) {
    const bounce = Math.sin(beatPhase * Math.PI) * 4;
    ctx.save();
    ctx.translate(x, y - 9 + bounce);
    ctx.fillStyle = "#25d65f";
    ctx.beginPath();
    ctx.ellipse(-7, 0, 5, 10, -0.18, 0, Math.PI * 2);
    ctx.ellipse(7, 0, 5, 10, 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawZachBullet(b) {
    const zachTypes = new Set(["platformSpikes","platformSpikeWarning","barovianWolf","barovianBat","flameSkull","greenFireBlast","treeBlight","blightNeedle"]);
    if (!zachTypes.has(b.type)) return false;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    ctx.strokeStyle = "#fff";
    ctx.fillStyle = "#fff";
    ctx.lineWidth = 2;
    if (b.type === "platformSpikes") {
      ctx.globalAlpha *= Number.isFinite(b.alpha) ? b.alpha : 1;
      ctx.fillStyle = "#000";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      const spikeWidth = 10;

      for (let x = -b.width / 2; x < b.width / 2; x += spikeWidth) {
        ctx.beginPath();
        ctx.moveTo(x, b.height);
        ctx.lineTo(Math.min(x + spikeWidth / 2, b.width / 2), 0);
        ctx.lineTo(Math.min(x + spikeWidth, b.width / 2), b.height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }    } else if (b.type === "platformSpikeWarning") {
      const pulse = 1 + Math.sin(b.age * 0.28) * 0.08;
      ctx.scale(pulse, pulse);
      ctx.fillStyle = "#ffdd33";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(17, 14);
      ctx.lineTo(-17, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#000";
      ctx.font = "bold 22px Courier New";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("!", 0, 5);    } else if (b.type === "barovianWolf") {
      ctx.globalAlpha *= Number.isFinite(b.alpha) ? b.alpha : 1;
      ctx.scale(Number.isFinite(b.facing) ? b.facing : 1, 1);
      const wolfSprite = b.lunging ? sprites.wolfLunge : sprites.wolfDefault;
      if (wolfSprite?.ready) {
        ctx.drawImage(wolfSprite, -35, -31, 70, 56);
        ctx.restore();
        return;
      }
      ctx.fillStyle = "#20232a";
      ctx.strokeStyle = "#d8dbe2";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(-2, 1, b.r * 1.25, b.r * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(b.r * 0.55, -b.r * 0.18);
      ctx.lineTo(b.r * 1.45, -b.r * 0.48);
      ctx.lineTo(b.r * 1.55, b.r * 0.28);
      ctx.lineTo(b.r * 0.62, b.r * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(b.r * 0.62, -b.r * 0.42);
      ctx.lineTo(b.r * 0.76, -b.r * 1.02);
      ctx.lineTo(b.r * 1.06, -b.r * 0.5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ff3b3b";
      ctx.beginPath();
      ctx.arc(b.r * 1.13, -b.r * 0.18, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#d8dbe2";
      ctx.beginPath();
      ctx.moveTo(-b.r * 0.65, b.r * 0.35);
      ctx.lineTo(-b.r * 0.88, b.r * 1.05);
      ctx.moveTo(b.r * 0.15, b.r * 0.42);
      ctx.lineTo(b.r * 0.34, b.r * 1.05);
      ctx.stroke();    } else if (b.type === "barovianBat") {
      ctx.globalAlpha *= Number.isFinite(b.alpha) ? b.alpha : 1;
      if (sprites.batMinion?.ready) {
        const wingPulse = 1 + Math.sin(b.age * 0.45) * 0.06;
        ctx.drawImage(sprites.batMinion, -25, -9 * wingPulse, 50, 18 * wingPulse);
      } else {
        const flap = Math.sin(b.age * 0.55) * b.r * 0.36;
        ctx.fillStyle = "#17131f";
        ctx.strokeStyle = "#c5b8da";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 2);
        ctx.lineTo(-b.r * 1.65, -b.r * 0.6 - flap);
        ctx.lineTo(-b.r * 1.18, b.r * 0.42);
        ctx.lineTo(-b.r * 0.55, b.r * 0.08);
        ctx.lineTo(0, b.r * 0.72);
        ctx.lineTo(b.r * 0.55, b.r * 0.08);
        ctx.lineTo(b.r * 1.18, b.r * 0.42);
        ctx.lineTo(b.r * 1.65, -b.r * 0.6 - flap);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }    } else if (b.type === "flameSkull") {
      ctx.globalAlpha *= Math.min(1, b.age / 7, b.life / 7);
      ctx.scale(Number.isFinite(b.facing) ? b.facing : 1, 1);
      if (sprites.flameSkull?.ready) {
        ctx.drawImage(sprites.flameSkull, -17, -23, 34, 46);
      } else {
        ctx.fillStyle = "#7dff38";
        ctx.shadowColor = "#41ff19";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 2, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#101610";
        ctx.fillRect(-7, -2, 4, 5);
        ctx.fillRect(3, -2, 4, 5);
      }    } else if (b.type === "greenFireBlast") {
      ctx.scale(Number.isFinite(b.facing) ? b.facing : 1, 1);
      const halfW = b.width / 2;
      const halfH = b.height / 2;
      const flicker = Math.sin(b.age * 0.7) * 5;
      ctx.translate(0, halfH);

      ctx.fillStyle = "#48e62f";
      ctx.shadowColor = "#37ff18";
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(halfW + 14 + flicker, 0);
      ctx.lineTo(halfW - 4, -halfH);
      ctx.lineTo(-halfW + 18, -halfH + 2);
      ctx.lineTo(-halfW - 12 - flicker, -halfH * 0.55);
      ctx.lineTo(-halfW + 3, 0);
      ctx.lineTo(-halfW - 12 + flicker, halfH * 0.55);
      ctx.lineTo(-halfW + 18, halfH - 2);
      ctx.lineTo(halfW - 4, halfH);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#dfff8c";
      ctx.beginPath();
      ctx.moveTo(halfW + 8, 0);
      ctx.lineTo(halfW - 12, -halfH * 0.55);
      ctx.lineTo(-halfW + 8, -halfH * 0.38);
      ctx.lineTo(-halfW - 2, 0);
      ctx.lineTo(-halfW + 8, halfH * 0.38);
      ctx.lineTo(halfW - 12, halfH * 0.55);
      ctx.closePath();
      ctx.fill();    } else if (b.type === "treeBlight") {
      ctx.globalAlpha *= Number.isFinite(b.alpha) ? b.alpha : 1;
      ctx.scale(Number.isFinite(b.facing) ? b.facing : 1, 1);
      if (sprites.treeBlight?.ready) {
        ctx.drawImage(sprites.treeBlight, -25, -25, 50, 50);
      } else {
        ctx.fillStyle = "#18251a";
        ctx.strokeStyle = "#9ab68c";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -b.r * 1.4);
        ctx.lineTo(b.r, b.r);
        ctx.lineTo(-b.r, b.r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }    } else if (b.type === "blightNeedle") {
      ctx.fillStyle = "#d9f2b4";
      ctx.shadowColor = "#91b86e";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(b.r * 2.2, 0);
      ctx.lineTo(-b.r, -2.5);
      ctx.lineTo(-b.r, 2.5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    return true;
  }

  return {
    id: "zach",
    drawBullet: drawZachBullet,
    createState: function createZachState() { return { defense: null }; },
    beginDefenseMechanic: function beginDefenseMechanic(mechanic) {
      const handlers = {
        rhythmGrid: beginRhythmGridAttack,
        freestyleGrid: beginFreestyleGridAttack,
        vampireGrid: beginVampireGridAttack,
        vampireLordGrid: beginVampireLordGridAttack
      };
      handlers[mechanic?.type]?.(mechanic.config || {});
    },
    moveSoul: function moveZachSoul({ input: soulInput }) {
      const grid = state.encounter.defense;
      if (!grid) return false;
      if (grid.phase === "response" || (grid.phase === "countdown" && grid.countdown === 1)) {
        const direction = rhythmDirectionInput();
        if (direction) {
          const soulPosition = { col: grid.soulCol, row: grid.soulRow };
          moveGridPosition(soulPosition, direction);
          grid.soulCol = soulPosition.col;
          grid.soulRow = soulPosition.row;
        }
      }
      state.soul.x = rhythmGridX(grid.soulCol);
      state.soul.y = rhythmGridY(grid.soulRow);
      return true;
    },
    drawDefense: function drawZachDefense({ box }) {
      const grid = state.encounter.defense;
      if (!grid) return null;
      drawRhythmGridBeatRectangle(box);
      drawRhythmGrid();
      return {
        handledPurple: true,
        drawSoul: grid.phase === "countdown" || grid.phase === "response"
      };
    },
    beginRhythmGridAttack,
    beginFreestyleGridAttack,
    beginVampireGridAttack,
    beginVampireLordGridAttack,
    updateDefenseMechanic: updateRhythmGridAttack,
    judgeDefenseMechanic: judgeRhythmGridResponse,
    rhythmGridX,
    rhythmGridY,
    drawRhythmGrid,
    drawRhythmGridBeatRectangle
  };
}

const zachDefinition = {
  name: "ZACH",
  isNew: false,
  selectorOrder: 2,
  selectablePlayers: ["CARIAN", "BRAVOURÖS", "THANOS", "BUCKY"],
  runtime: createZachRuntime,
  background: {
    pattern: "slantedLines"
  },

  sprite: "sprites/enemies/zach/default/default_0001.png",
  defaultAnimation: {
    frames: [
      "sprites/enemies/zach/default/default_0001.png",
      "sprites/enemies/zach/default/default_0002.png",
      "sprites/enemies/zach/default/default_0003.png",
      "sprites/enemies/zach/default/default_0004.png",
      "sprites/enemies/zach/default/default_0005.png"
    ],
    fps: 2
  },
  spriteAnimations: {
    linedance: {
      frames: [
        "sprites/enemies/zach/linedance/linedance_0001.png",
        "sprites/enemies/zach/linedance/linedance_0002.png",
        "sprites/enemies/zach/linedance/linedance_0003.png",
        "sprites/enemies/zach/linedance/linedance_0004.png",
        "sprites/enemies/zach/linedance/linedance_0005.png",
        "sprites/enemies/zach/linedance/linedance_0006.png",
        "sprites/enemies/zach/linedance/linedance_0007.png",
        "sprites/enemies/zach/linedance/linedance_0008.png",
        "sprites/enemies/zach/linedance/linedance_0009.png",
        "sprites/enemies/zach/linedance/linedance_0010.png",
        "sprites/enemies/zach/linedance/linedance_0011.png"
      ],
      fps: 8
    },
    vampire: {
      frames: [
        "sprites/enemies/zach/vampire/default_0001.png",
        "sprites/enemies/zach/vampire/default_0002.png",
        "sprites/enemies/zach/vampire/default_0003.png",
        "sprites/enemies/zach/vampire/default_0004.png",
        "sprites/enemies/zach/vampire/default_0005.png",
        "sprites/enemies/zach/vampire/default_0006.png",
        "sprites/enemies/zach/vampire/default_0007.png"
      ],
      fps: 6
    }
  },
  spriteBob: 0,
  enemyDialogDurationMultiplier: 1.5,
  music: {
    src: "sounds/zach.wav",
    loopStart: 11.571,
    loopEnd: 157.461,
    bpm: 180.958
  },
  sounds: { arrow: "sounds/snd_arrow.wav", wing: "sounds/snd_wing.wav" },
  sprites: {
    hit: "sprites/enemies/zach/hit.png",
    attack1: "sprites/enemies/zach/attack1.png",
    attack2: "sprites/enemies/zach/attack2.png",
    thinking: "sprites/enemies/zach/thinking.png",
    pointing: "sprites/enemies/zach/attack1.png",
    computer: "sprites/enemies/zach/attack2.png",
    lightbulb: "sprites/enemies/zach/thinking.png",
    wolfDefault: "sprites/enemies/minions/wolf/default.png",
    wolfLunge: "sprites/enemies/minions/wolf/lunge.png",
    batMinion: "sprites/enemies/minions/bat.png",
    flameSkull: "sprites/enemies/minions/flame_skull.png",
    treeBlight: "sprites/enemies/minions/tree_blight.png"
  },
  spriteSizes: {
    default: 150,
    hit: 150,
    attack1: 150,
    attack2: 150,
    thinking: 150,
    pointing: 150,
    computer: 150,
    lightbulb: 150,
    linedance: 150,
    vampire: 150
  },
  preserveSpriteAspectRatio: ["default", "hit", "thinking", "pointing", "computer", "lightbulb", "vampire"],
  spritePositions: {
    default: { x: 720, y: 168 },
    hit: { x: 720, y: 168 },
    attack1: { x: 720, y: 168 },
    attack2: { x: 720, y: 168 },
    thinking: { x: 720, y: 168 },
    pointing: { x: 720, y: 168 },
    computer: { x: 720, y: 168 },
    lightbulb: { x: 720, y: 168 },
    linedance: { x: 720, y: 168 },
    vampire: { x: 720, y: 168 }
  },
  spriteFlips: {
    default: { x: true },
    hit: { x: true },
    attack1: { x: true },
    attack2: { x: true },
    thinking: { x: true },
    pointing: { x: true },
    computer: { x: true },
    lightbulb: { x: true },
    linedance: { x: true },
    vampire: { x: true }
  },
  maxHP: 1000,
  hitSprite: "hit",

  introMessage: "* ZACH steps into the fight.",
  winMessage: "* ZACH decides that is probably enough.",
  defeatDialog: "Its time... for me... to... flake...",
  check: "You inspect the enemy, appears its just a line dancing little fellow",
  actMessage: "* You check ZACH. He is using basic red attacks.",

  mercyFailure: "* ZACH is still locked in.",
  mercySuccess: "* You spare ZACH.",
  mercyWinMessage: "ZACH backs down.",

  enemyDialog: [
  ],

  items: [
    { name: "Snack", heal: 14 },
    { name: "Water", heal: 18 },
    { name: "Bandage", heal: 22 }
  ],

  battleDialog: [
    "A DM approaches...",
    "Zach prepares to go easy on you.",
    "The creatures of Barovia lurk about.",
    "A dungeon wall looms in the distance...",
    "You enter the dungeon. A distant fire lights the dark hallway.",
    "Zach puts away his laptop and prepares to leave",
    "Awful music fills your ear. You wish you could escape.",
    "The floor grows increasingly sticky with beer.",
    "You return to DnD, Zach's suprisingly already there waiting for.",
    "The dungeon walls echo with terror.",
    "You enter the final room.",
    "The Vampire Spawn continue their barrage",
    "The last of the Vampire Spawn surround you.",
    "You learn of the vampire lord's location. You journey to his castle.",
    "Your journey continues",
    "You near the final castle.",
    "The castle seems too calm. Watch your step.",
    "You enter the Vampire Lord's chamber.",
    "You have defeated the Vampire Lord! Zach forgets about you and returns home (line dancing).",
    "Zach dances the night away",
    "Zach dances the night away",
    "Zach dances the night away",
    "Zach dances the night away",
    "Zach dances the night away",
    "Zach dances the night away"
  ],

  turns: [
    {
      loop: true,
      type: "blue",
      event: {
        steps: [
          { type: "enemyDialog", sprite: "default", text: "Ready for your adventure, heroes?" },
          { type: "enemyDialog", sprite: "thinking", text: "Let me see if Claude is done writing it" },
          { type: "enemyDialog", sprite: "computer", text: "...barovia ...vampires ...wolves" },
          {
            type: "enemyDialog",
            sprite: "default",
            text: "Perfect, thanks for waiting 20 minutes while that loaded."
          },
          { type: "enemyDialog", sprite: "pointing", text: "A pack of wolves attack!" }
        ]
      },
      duration: 570,
      damage: 15,
      box: { x: 338, y: 148, w: 224, h: 224 },
      pattern: function barovianWolfLunges({ t, box, spawnBullet }) {
        spawnAlternatingWolfLunge({ t, box, spawnBullet });
      }
    },
    {
      loop: true,
      type: "blue",
      event: {
        steps: [
          {
            type: "enemyDialog",
            sprite: "pointing",
            text: "As you approach the town, a hoard of bats descends!"
          }
        ]
      },
      duration: 590,
      damage: 15,
      box: { x: 394, y: 148, w: 112, h: 224 },
      setup: function resetBatRainBeat({ state }) {
        state.zachBatRainLastBeat = null;
      },
      pattern: function barovianBatRain({ box, state, musicBeat, spawnBullet }) {
        spawnBeatBatRain({ box, state, musicBeat, spawnBullet, stateKey: "zachBatRainLastBeat" });
      }
    },
    {
      loop: true,
      type: "blue",
      event: {
        steps: [
          { type: "enemyDialog", sprite: "default", text: "You leave town on the trail." },
          { type: "enemyDialog", text: "You hear rustling in the bushes..." },
          { type: "enemyDialog", sprite: "pointing", text: "Twig Blights ambush you!" }
        ]
      },
      duration: 620,
      damage: 15,
      box: { x: 338, y: 148, w: 224, h: 224 },
      setup: function raiseTreeBlightPlatforms({ box, state, spawnBullet }) {
        const platforms = [
          { x: box.x + box.w - 42, y: box.y + box.h - 34 },
          { x: box.x + 42, y: box.y + box.h / 2 },
          { x: box.x + box.w - 42, y: box.y + 40 }
        ];

        for (const platform of platforms) {
          spawnBullet({
            x: platform.x,
            y: platform.y,
            r: 0,
            width: 66,
            height: 11,
            type: "platform",
            harmless: true,
            solidPlatform: true,
            noCull: true,
            life: 621
          });
        }

        state.soul.x = platforms[0].x;
        state.soul.y = platforms[0].y - state.soul.r;
        state.soul.vy = 0;
        state.soul.pitBounce = false;
      },
      pattern: function treeBlightVolley({ t, box, state, spawnBullet }) {
        const cycle = t % 108;
        const positions = [
          { x: box.x - 27, y: box.y + 42, facing: 1 },
          { x: box.x + box.w + 27, y: box.y + box.h / 2, facing: -1 },
          { x: box.x - 27, y: box.y + box.h - 42, facing: 1 }
        ];

        if (t === 0) {
          for (const position of positions) {
            spawnBullet({
              ...position,
              r: 15,
              type: "treeBlight",
              harmless: true,
              life: 620
            });
          }
        }

        if (cycle !== 24 && cycle !== 49 && cycle !== 74) return;

        for (const position of positions) {
          const dx = state.soul.x - position.x;
          const dy = state.soul.y - position.y;
          const length = Math.max(1, Math.hypot(dx, dy));
          const speed = 2.75;

          spawnBullet({
            x: position.x,
            y: position.y,
            vx: dx / length * speed,
            vy: dy / length * speed,
            r: 6,
            type: "blightNeedle",
            life: 115,
            angle: Math.atan2(dy, dx)
          });
        }
      }
    },
    {
      loop: true,
      type: "blue",
      event: {
        steps: [
          { type: "assignEnemyDefault", sprite: "default" },
          { type: "enemyDialog", sprite: "default", text: "Back to it, now!" },
          { type: "enemyDialog", sprite: "thinking", text: "Wait, where'd we leave off Claude?" },
          { type: "enemyDialog", sprite: "computer", text: ".....dungeon ...flame skulls ...combat" },
          {
            type: "enemyDialog",
            sprite: "lightbulb",
            text: "I've got it! We'll retcon the last session and re-fight the skulls!"
          },
          { type: "assignEnemyDefault", sprite: "default" }
        ]
      },
      duration: 600,
      damage: 15,
      box: { x: 338, y: 148, w: 224, h: 224 },
      setup: function raiseCrossfirePlatforms({ box, state, spawnBullet }) {
        state.zachCrossfireSafeLane = null;
        state.zachCrossfireSafeStreak = 0;
        for (const platform of [
          { heightRatio: 2 / 3, width: 64 * 1.1 },
          { heightRatio: 1 / 3, width: 64 * 0.9 }
        ]) {
          spawnBullet({
            x: box.x + box.w / 2,
            y: box.y + box.h * platform.heightRatio,
            r: 0,
            width: platform.width,
            height: 11,
            type: "platform",
            harmless: true,
            solidPlatform: true,
            noCull: true,
            life: 601
          });
        }
      },
      pattern: function flameskullCrossfire({ t, box, state, spawnBullet }) {
        if (t % 80 !== 0) return;

        const laneYs = [
          box.y + box.h / 6,
          box.y + box.h / 2,
          box.y + box.h * 5 / 6
        ];
        const availableSafeLanes = state.zachCrossfireSafeStreak >= 2
          ? [0, 1, 2].filter((index) => index !== state.zachCrossfireSafeLane)
          : [0, 1, 2];
        const safeLane = t === 0
          ? 2
          : availableSafeLanes[Math.floor(Math.random() * availableSafeLanes.length)];
        if (safeLane === state.zachCrossfireSafeLane) {
          state.zachCrossfireSafeStreak++;
        } else {
          state.zachCrossfireSafeLane = safeLane;
          state.zachCrossfireSafeStreak = 1;
        }
        const targetedLanes = laneYs
          .map((y, index) => ({ y, index }))
          .filter((lane) => lane.index !== safeLane);
        const swapSides = Math.random() < 0.5;

        targetedLanes.forEach((lane, index) => {
          const fromLeft = (index === 0) !== swapSides;
          spawnBullet({
            x: fromLeft ? box.x - 34 : box.x + box.w + 34,
            y: lane.y,
            r: 16,
            type: "flameSkull",
            harmless: true,
            facing: fromLeft ? 1 : -1,
            life: 72,
            fired: false,
            update: function fadeAndFire({ bullet, state, spawnBullet }) {
              if (bullet.fired || bullet.age < 36) return;

              bullet.fired = true;
              spawnBullet({
                x: bullet.x + (fromLeft ? 14 : -14),
                y: bullet.y - (box.h / 3 - 8) / 2,
                vx: fromLeft ? 11.25 : -11.25,
                r: 0,
                width: 110,
                height: box.h / 3 - 8,
                type: "greenFireBlast",
                life: 60,
                facing: fromLeft ? 1 : -1
              });
            }
          });
        });
      }
    },
    {
      loop: true,
      type: "blue",
      event: {
        steps: [
          {
            type: "enemyDialog",
            sprite: "default",
            text: "You aproach the dungeon wall. The door is stuck shut."
          },
          { type: "enemyDialog", sprite: "thinking", text: "Oh, you want to scale it?" },
          { type: "enemyDialog", sprite: "pointing", text: "Very well, roll acrobatics!" }
        ]
      },
      duration: 840,
      damage: 15,
      box: { x: 338, y: 4, w: 224, h: 642 },
      setup: function beginDescendingDungeon({ box, state, spawnBullet }) {
        const spikeHeight = 24;
        const floorY = box.y + box.h - spikeHeight;
        const platformSpeed = 2.7;
        state.zachLastPlatformSpiked = false;

        spawnBullet({
          x: box.x + box.w / 2,
          y: floorY,
          width: box.w,
          height: spikeHeight,
          type: "spikeFloor",
          superBounce: true,
          life: 841,
          noCull: true
        });

        let startingPlatform = null;
        for (let i = 0; i < 9; i++) {
          const width = randomPlatformWidth();
          const platform = spawnDescendingPlatform({
            spawnBullet,
            x: randomPlatformX(box, width),
            y: floorY - 48 - i * 70,
            speed: platformSpeed,
            width,
            life: 340,
            spiked: chooseRandomPlatformSpikes(state, i === 4)
          });
          if (i === 4) startingPlatform = platform;
        }

        state.soul.x = startingPlatform.x;
        state.soul.y = startingPlatform.y - state.soul.r;
        state.soul.vy = 0;
        state.soul.pitBounce = false;
      },
      pattern: function descendingDungeon({ t, box, state, spawnBullet }) {
        if (t % 22 !== 0) return;

        const width = randomPlatformWidth();
        const x = randomPlatformX(box, width);
        spawnDescendingPlatform({
          spawnBullet,
          x,
          y: box.y - 16,
          speed: 2.7,
          width,
          life: 300,
          spiked: chooseRandomPlatformSpikes(state)
        });

        if (Math.random() < 0.25) {
          const pairedWidth = randomPlatformWidth();
          const leftSide = x >= box.x + box.w / 2;
          const pairedX = leftSide
            ? box.x + 10 + pairedWidth / 2 + Math.random() * Math.max(1, box.w * 0.34 - pairedWidth)
            : box.x + box.w * 0.66 + Math.random() * Math.max(1, box.w * 0.34 - pairedWidth - 10);
          spawnDescendingPlatform({
            spawnBullet,
            x: pairedX,
            y: box.y - 16,
            speed: 2.7,
            width: pairedWidth,
            life: 300,
            spiked: chooseRandomPlatformSpikes(state)
          });
        }
      }
    },
    {
      loop: true,
      type: "blue",
      event: {
        steps: [
          {
            type: "enemyDialog",
            sprite: "pointing",
            text: "Flaming Skulls attack through the walls!"
          }
        ]
      },
      duration: 600,
      damage: 15,
      box: { x: 338, y: 148, w: 224, h: 224 },
      setup: function raiseSyncopatedPlatforms({ box, state, spawnBullet }) {
        state.zachSyncopatedLeftLane = null;
        state.zachSyncopatedSafeLane = null;
        state.zachSyncopatedSafeStreak = 0;
        for (const platform of [
          { heightRatio: 2 / 3, width: 64 * 1.1 },
          { heightRatio: 1 / 3, width: 64 * 0.9 }
        ]) {
          spawnBullet({
            x: box.x + box.w / 2,
            y: box.y + box.h * platform.heightRatio,
            r: 0,
            width: platform.width,
            height: 11,
            type: "platform",
            harmless: true,
            solidPlatform: true,
            noCull: true,
            life: 601
          });
        }
      },
      pattern: function syncopatedFlameskulls({ t, box, state, spawnBullet }) {
        if (t % 38 !== 0) return;

        const spawnIndex = Math.floor(t / 38);
        const fromLeft = spawnIndex % 2 === 1;
        const laneYs = [
          box.y + box.h / 6,
          box.y + box.h / 2,
          box.y + box.h * 5 / 6
        ];
        let laneIndex;
        if (spawnIndex % 2 === 0) {
          const availableSafeLanes = state.zachSyncopatedSafeStreak >= 2
            ? [0, 1, 2].filter((index) => index !== state.zachSyncopatedSafeLane)
            : [0, 1, 2];
          const safeLane = availableSafeLanes[Math.floor(Math.random() * availableSafeLanes.length)];
          if (safeLane === state.zachSyncopatedSafeLane) {
            state.zachSyncopatedSafeStreak++;
          } else {
            state.zachSyncopatedSafeLane = safeLane;
            state.zachSyncopatedSafeStreak = 1;
          }

          let rightLanes = [0, 1, 2].filter((index) => index !== safeLane);
          if (spawnIndex === 0) rightLanes = rightLanes.filter((index) => index !== 2);
          laneIndex = rightLanes[Math.floor(Math.random() * rightLanes.length)];
          state.zachSyncopatedLeftLane = [0, 1, 2].find((index) =>
            index !== safeLane && index !== laneIndex
          );
        } else {
          laneIndex = state.zachSyncopatedLeftLane;
        }

        spawnBullet({
          x: fromLeft ? box.x - 34 : box.x + box.w + 34,
          y: laneYs[laneIndex],
          r: 16,
          type: "flameSkull",
          harmless: true,
          facing: fromLeft ? 1 : -1,
          life: 72,
          fired: false,
          update: function fadeAndFire({ bullet, spawnBullet }) {
            if (bullet.fired || bullet.age < 36) return;

            bullet.fired = true;
            spawnBullet({
              x: bullet.x + (fromLeft ? 14 : -14),
              y: bullet.y - (box.h / 3 - 8) / 2,
              vx: fromLeft ? 11.25 : -11.25,
              r: 0,
              width: 110,
              height: box.h / 3 - 8,
              type: "greenFireBlast",
              life: 60,
              facing: fromLeft ? 1 : -1
            });
          }
        });
      }
    },
    {
      loop: true,
      type: "purple",
      event: {
        steps: [
          {
            type: "enemyDialog",
            sprite: "default",
            text: "Sorry y'all, I forgot I have to teach line dancing tonight."
          },
          { type: "enemyDialog", sprite: "pointing", text: "You're welcome to join!" },
          { type: "assignEnemyDefault", sprite: "linedance" }
        ]
      },
      duration: 780,
      damage: 10,
      box: { x: 338, y: 193, w: 224, h: 134 },
      mechanic: "rhythmGrid",
      mechanicConfig: {
        dance: "RULDDLUR",
        inputWindow: 0.12
      },
      pattern: function rhythmGridDance() {}
    },
    {
      loop: true,
      type: "purple",
      sprite: "linedance",
      event: {
        steps: [
          { type: "enemyDialog", text: "That was an easy one, try this!" }
        ]
      },
      duration: 780,
      damage: 10,
      box: { x: 338, y: 193, w: 224, h: 134 },
      mechanic: "rhythmGrid",
      mechanicConfig: {
        dance: "U_DDL[UD]R[RL]",
        inputWindow: 0.12
      },
      pattern: function halfBeatRhythmGridDance() {}
    },
    {
      loop: true,
      type: "purple",
      sprite: "linedance",
      event: {
        steps: [
          {
            type: "textbox",
            text: "Zach has forgotten you're here. Now's youre chance to get out."
          }
        ]
      },
      duration: 780,
      damage: 10,
      box: { x: 338, y: 193, w: 224, h: 134 },
      mechanic: "rhythmGrid",
      mechanicConfig: {
        dance: "[RR][DU]UD[LL][UD]DU",
        inputWindow: 0.12
      },
      pattern: function doubledHalfBeatRhythmGridDance() {}
    },
    {
      loop: true,
      type: "purple",
      assignDefaultSprite: "linedance",
      sprite: "linedance",
      duration: 780,
      damage: 10,
      box: { x: 338, y: 193, w: 224, h: 134 },
      mechanic: "rhythmGrid",
      mechanicConfig: {
        dance: "D[LL]URURLRDRUL",
        inputWindow: 0.12
      },
      pattern: function extendedRhythmGridDance() {}
    },
    {
      loop: true,
      type: "purple",
      event: {
        steps: [
          { type: "enemyDialog", text: "As you walk the halls, arrows suddenly shoot out" },
          {
            type: "enemyDialog",
            sprite: "pointing",
            text: "Use the skills I taught you! Dance around them!"
          }
        ]
      },
      duration: 780,
      damage: 10,
      box: { x: 338, y: 193, w: 224, h: 134 },
      mechanic: "freestyleGrid",
      mechanicConfig: {},
      pattern: function freestyleRhythmGrid() {}
    },
    {
      loop: true,
      type: "blue",
      event: {
        steps: [
          { type: "enemyDialog", text: "You near the end of the dungeon" },
          { type: "enemyDialog", text: "A large ravine blocks your path" }
        ]
      },
      duration: 840,
      damage: 15,
      box: { x: 338, y: 92, w: 224, h: 336 },
      setup: function prepareSpikedBatPlatforms({ box, state, spawnBullet }) {
        const floorY = box.y + box.h;
        const platformY = floorY - 48;
        const platformXs = [box.x + 48, box.x + box.w - 48];

        spawnBullet({
          x: box.x + box.w / 2,
          y: floorY - 14,
          r: 0,
          width: box.w,
          height: 14,
          type: "spikeFloor",
          noCull: true,
          life: 9999
        });
        for (const x of platformXs) {
          spawnBullet({
            x,
            y: platformY,
            r: 0,
            width: 54,
            height: 10,
            type: "platform",
            harmless: true,
            solidPlatform: true,
            noCull: true,
            life: 9999
          });
        }

        state.soul.x = platformXs[0];
        state.soul.y = platformY - state.soul.r;
        state.soul.vy = 0;
        state.zachPlatformBatLastBeat = null;
        state.zachSpikePlatforms = {
          xs: platformXs,
          y: platformY,
          side: 1,
          nextActionBeat: null,
          action: "warning",
          warning: null,
          spikes: null
        };
      },
      pattern: function spikedPlatformBatRain({ box, state, musicBeat, spawnBullet }) {
        spawnBeatBatRain({
          box,
          state,
          musicBeat,
          spawnBullet,
          stateKey: "zachPlatformBatLastBeat",
          speed: 2.6
        });
        const platforms = state.zachSpikePlatforms;
        if (!platforms || !Number.isFinite(musicBeat)) return;

        if (!Number.isFinite(platforms.nextActionBeat)) {
          platforms.nextActionBeat = Math.ceil(musicBeat / 4) * 4 + 4;
          return;
        }

        while (musicBeat >= platforms.nextActionBeat) {
          if (platforms.action === "warning") {
            platforms.warning = spawnPlatformSpikeWarning({
              spawnBullet,
              x: platforms.xs[platforms.side],
              y: platforms.y - 31
            });
            platforms.action = "spikes";
          } else if (platforms.action === "spikes") {
            if (platforms.warning) platforms.warning.life = 0;
            platforms.warning = null;
            platforms.spikes = spawnGrowingPlatformSpikes({
              spawnBullet,
              x: platforms.xs[platforms.side],
              platformY: platforms.y,
              width: 54
            });
            platforms.action = "switch";
          } else {
            if (platforms.spikes) platforms.spikes.fading = true;
            platforms.spikes = null;
            platforms.side = 1 - platforms.side;
            platforms.warning = spawnPlatformSpikeWarning({
              spawnBullet,
              x: platforms.xs[platforms.side],
              y: platforms.y - 31
            });
            platforms.action = "spikes";
          }
          platforms.nextActionBeat += 4;
        }
      }
    },
    {
      loop: true,
      type: "blue",
      event: {
        steps: [
          { type: "enemyDialog", text: "The dungeon revealed the vampire lord's location" },
          { type: "enemyDialog", text: "You continue your journey onward" },
          {
            type: "enemyDialog",
            sprite: "pointing",
            text: "Wolves and Bats surround your party!"
          }
        ]
      },
      duration: 720,
      damage: 15,
      box: { x: 338, y: 148, w: 224, h: 224 },
      setup: function resetCombinedBatBeat({ state }) {
        state.zachCombinedBatLastBeat = null;
      },
      pattern: function wolvesAndBats({ t, box, state, musicBeat, spawnBullet }) {
        spawnAlternatingWolfLunge({ t, box, spawnBullet });
        spawnBeatBatRain({
          box,
          state,
          musicBeat,
          spawnBullet,
          stateKey: "zachCombinedBatLastBeat"
        });
      }
    },
    {
      loop: true,
      type: "blue",
      event: {
        steps: [
          { type: "enemyDialog", text: "The castle is surrounded by moats and fire." },
          { type: "enemyDialog", sprite: "pointing", text: "Watch your step!" }
        ]
      },
      duration: 900,
      damage: 15,
      box: { x: 170, y: 112, w: 560, h: 316 },
      setup: function beginRisingStarPlatformCourse({ box, state, spawnBullet }) {
        const spikeHeight = 24;
        const spikeTop = box.y + box.h - spikeHeight;
        const platformY = spikeTop - 44;
        const platformSpeed = 1;
        const platformStartX = box.x + box.w - 55;
        const platformTurnaroundFrame = 450;
        const starRiseSpeed = 1.26;

        spawnBullet({
          x: box.x + box.w / 2,
          y: spikeTop,
          r: 0,
          width: box.w,
          height: spikeHeight,
          type: "spikeFloor",
          noCull: true,
          life: 901
        });

        spawnBullet({
          x: platformStartX,
          y: platformY,
          vx: -platformSpeed,
          r: 0,
          width: 52,
          height: 11,
          type: "platform",
          harmless: true,
          solidPlatform: true,
          noCull: true,
          life: 901,
          update: function shuttleAcrossPit({ bullet }) {
            bullet.x += bullet.vx;
            if (bullet.age >= platformTurnaroundFrame) bullet.vx = platformSpeed;
          }
        });

        const starColumns = [
          { x: box.x + box.w * 0.72, gapY: platformY - 8, encounter: 102 },
          {
            x: box.x + box.w * 0.54,
            gapY: platformY - 50,
            encounter: 203,
            returnGap: { gapY: platformY - 50, encounter: 697 }
          },
          {
            x: box.x + box.w * 0.36,
            gapY: platformY - 80,
            encounter: 303,
            returnGap: { gapY: platformY - 45, encounter: 597 }
          },
          {
            x: box.x + box.w * 0.18,
            gapY: platformY - 30,
            encounter: 404,
            returnGap: { gapY: platformY - 15, encounter: 496 }
          }
        ];

        for (const column of starColumns) {
          spawnRisingStarColumn({
            spawnBullet,
            x: column.x,
            topY: box.y + 12,
            bottomY: spikeTop - 10,
            gapWindows: [
              { gapY: column.gapY, encounter: column.encounter },
              ...(column.returnGap ? [column.returnGap] : [])
            ],
            gapHeight: 48,
            riseSpeed: starRiseSpeed
          });
        }

        state.soul.x = platformStartX;
        state.soul.y = platformY - state.soul.r;
        state.soul.vy = 0;
        state.soul.pitBounce = false;
      },
      pattern: function risingStarPlatformCourse() {}
    },
    {
      loop: true,
      type: "blue",
      event: {
        steps: [
          { type: "enemyDialog", text: "The Twig Blights return" },
          { type: "enemyDialog", sprite: "pointing", text: "They're ready for you this time!" }
        ]
      },
      duration: 840,
      damage: 15,
      box: { x: 338, y: 148, w: 224, h: 224 },
      setup: function prepareBlightBarragePlatform({ box, state, spawnBullet }) {
        const spikeHeight = 22;
        const spikeTop = box.y + box.h - spikeHeight;
        const platformY = spikeTop - 44;

        spawnBullet({
          x: box.x + box.w / 2,
          y: spikeTop,
          r: 0,
          width: box.w,
          height: spikeHeight,
          type: "spikeFloor",
          noCull: true,
          life: 841
        });

        spawnBullet({
          x: box.x + box.w / 2,
          y: platformY,
          r: 0,
          width: 52,
          height: 11,
          type: "platform",
          harmless: true,
          solidPlatform: true,
          noCull: true,
          life: 841
        });

        state.soul.x = box.x + box.w / 2;
        state.soul.y = platformY - state.soul.r;
        state.soul.vy = 0;
        state.soul.pitBounce = false;
      },
      pattern: function fadingBlightBarrages({ t, box, spawnBullet }) {
        if (t % 140 !== 0) return;

        const cycle = Math.floor(t / 140);
        const positions = [
          { x: box.x - 27, y: box.y + 48, facing: 1 },
          { x: box.x + box.w + 27, y: box.y + box.h - 54, facing: -1 },
          { x: box.x - 27, y: box.y + box.h / 2, facing: 1 },
          { x: box.x + box.w + 27, y: box.y + 46, facing: -1 }
        ];

        spawnBarrageTreeBlight({
          spawnBullet,
          ...positions[cycle % positions.length]
        });
      }
    },
    {
      loop: true,
      type: "purple",
      event: {
        steps: [
          { type: "enemyDialog", text: "You look around the room." },
          {
            type: "enemyDialog",
            sprite: "pointing",
            text: "Vampire Spawn lunge from the shadows!"
          }
        ]
      },
      duration: 900,
      damage: 10,
      box: { x: 293, y: 148, w: 314, h: 224 },
      mechanic: "vampireGrid",
      mechanicConfig: {
        cols: 7,
        rows: 5
      },
      pattern: function vampireSoulDance() {}
    },
    {
      loop: true,
      type: "purple",
      event: {
        steps: [
          { type: "enemyDialog", sprite: "pointing", text: "More Vampire Spawn emerge!" }
        ]
      },
      duration: 900,
      damage: 10,
      box: { x: 293, y: 148, w: 314, h: 224 },
      mechanic: "vampireGrid",
      mechanicConfig: {
        cols: 7,
        rows: 5,
        movesPerDownbeat: 2
      },
      pattern: function doubleStepVampireSoulDance() {}
    },
    {
      loop: true,
      type: "purple",
      event: {
        steps: [
          { type: "enemyDialog", sprite: "pointing", text: "This is it! Give it your all!" }
        ]
      },
      duration: 900,
      damage: 10,
      box: { x: 338, y: 103, w: 224, h: 314 },
      mechanic: "vampireGrid",
      mechanicConfig: {
        cols: 5,
        rows: 7,
        moveIntervalBeats: 2,
        attackDelayBeats: 1
      },
      pattern: function rapidVampireSoulDance() {}
    },
    {
      loop: true,
      event: {
        steps: [
          { type: "enemyDialog", sprite: "default", text: "You enter the final chamber." },
          { type: "enemyDialog", sprite: "default", text: "The vampire lord greets you." },
          { type: "enemyDialog", sprite: "default", text: "You explain you're not here to chat." },
          {
            type: "enemyTransform",
            sprite: "vampire",
            duration: 112,
            assignDefault: true,
            lockDefault: true
          },
          { type: "enemyDialog", text: "Roll Initiative!", duration: 180 }
        ]
      },
      type: "purple",
      duration: 1080,
      damage: 10,
      box: { x: 203, y: 34, w: 494, h: 494 },
      mechanic: "vampireLordGrid",
      mechanicConfig: {
        cols: 13,
        rows: 13
      },
      pattern: function vampireLordInitiative() {}
    }
  ]
};

const postBossLoopTurns = [
  {
    loop: true,
    type: "purple",
    sprite: "linedance",
    duration: 780,
    damage: 10,
    box: { x: 338, y: 193, w: 224, h: 134 },
    mechanic: "rhythmGrid",
      mechanicConfig: {
      dance: "[LL][RR][UU][DD]DRUL[RR][LL][DD][UU]ULDR",
      inputWindow: 0.12
    },
    pattern: function postBossLineDanceOne() {}
  },
  {
    loop: true,
    type: "purple",
    sprite: "linedance",
    duration: 780,
    damage: 10,
    box: { x: 338, y: 193, w: 224, h: 134 },
    mechanic: "rhythmGrid",
      mechanicConfig: {
      dance: "LDRRUULD_R_L_L_L",
      inputWindow: 0.12
    },
    pattern: function postBossLineDanceTwo() {}
  },
  {
    loop: true,
    type: "purple",
    sprite: "linedance",
    duration: 780,
    damage: 10,
    box: { x: 383, y: 193, w: 134, h: 134 },
    mechanic: "freestyleGrid",
      mechanicConfig: {
      cols: 3,
      rows: 3,
      rowArrowCount: 2,
      colArrowCount: 2
    },
    pattern: function postBossFreestyleGrid() {}
  },
  {
    loop: true,
    type: "purple",
    sprite: "linedance",
    duration: 900,
    damage: 10,
    box: { x: 270.5, y: 125.5, w: 359, h: 269 },
    mechanic: "vampireGrid",
      mechanicConfig: {
      cols: 8,
      rows: 6,
      vampireCount: 4,
      seekSoul: true
    },
    pattern: function fourVampireSoulDance() {}
  },
  {
    loop: true,
    type: "purple",
    sprite: "linedance",
    duration: 900,
    damage: 10,
    box: { x: 270.5, y: 125.5, w: 359, h: 269 },
    mechanic: "vampireGrid",
      mechanicConfig: {
      cols: 8,
      rows: 6,
      vampireCount: 4,
      movesPerDownbeat: 2,
      seekSoul: true
    },
    pattern: function fourVampireDoubleStepDance() {}
  },
  {
    loop: true,
    type: "purple",
    sprite: "linedance",
    duration: 900,
    damage: 10,
    box: { x: 248, y: 103, w: 404, h: 314 },
    mechanic: "vampireGrid",
      mechanicConfig: {
      cols: 9,
      rows: 7,
      vampireCount: 4,
      moveIntervalBeats: 2,
      attackDelayBeats: 1,
      seekSoul: true
    },
    pattern: function fourVampireRapidDance() {}
  }
];

// Run the adventure once, then loop selected encounters and all post-boss dance attacks forever.
const authoredZachTurns = zachDefinition.turns;
zachDefinition.turns = [
  ...authoredZachTurns.slice(0, 3),
  authoredZachTurns[4],
  authoredZachTurns[5],
  ...authoredZachTurns.slice(6, 9),
  authoredZachTurns[3],
  authoredZachTurns[11],
  authoredZachTurns[15],
  authoredZachTurns[16],
  authoredZachTurns[17],
  authoredZachTurns[12],
  authoredZachTurns[14],
  authoredZachTurns[13],
  authoredZachTurns[10],
  authoredZachTurns[18],
  authoredZachTurns[9],
  ...postBossLoopTurns
];

const repeatingZachPatterns = new Set([
  "spikedPlatformBatRain",
  "wolvesAndBats",
  "fadingBlightBarrages"
]);

zachDefinition.turns.forEach((turn, index) => {
  turn.loop = index >= 18 || repeatingZachPatterns.has(turn.pattern?.name);
});

function spawnBeatBatRain({ box, state, musicBeat, spawnBullet, stateKey, speed = 5.2 }) {
  if (!Number.isFinite(musicBeat)) return;

  const beat = Math.floor(musicBeat);
  if (!Number.isFinite(state[stateKey])) {
    state[stateKey] = beat;
    return;
  }
  if (beat === state[stateKey]) return;
  state[stateKey] = beat;

  const flightAngle = (-20 + Math.random() * 40) * Math.PI / 180;
  spawnBullet({
    x: box.x + 20 + Math.random() * (box.w - 40),
    y: box.y - 22,
    vx: Math.sin(flightAngle) * speed,
    vy: Math.cos(flightAngle) * speed,
    r: 11,
    type: "barovianBat",
    life: 150,
    noCull: true,
    alpha: 1,
    fading: false,
    angle: -flightAngle,
    update: function descendAndFade({ bullet }) {
      if (bullet.fading) {
        bullet.alpha -= 0.16;
        if (bullet.alpha <= 0) bullet.life = 0;
        return;
      }

      bullet.x += bullet.vx;
      bullet.y += bullet.vy;
      if (bullet.y >= box.y + box.h - 10) {
        bullet.y = box.y + box.h - 10;
        bullet.vx = 0;
        bullet.vy = 0;
        bullet.harmless = true;
        bullet.fading = true;
      }
    }
  });
}

function spawnAlternatingWolfLunge({ t, box, spawnBullet }) {
  if (t % 50 !== 0) return;

  const fromLeft = Math.floor(t / 50) % 2 === 0;
  const direction = fromLeft ? 1 : -1;
  const arcOptions = [
    { vy: 0, gravity: 0 },
    { vy: -2, gravity: 0.06 },
    { vy: -4, gravity: 0.12 },
    { vy: -6, gravity: 0.18 },
    { vy: -8, gravity: 0.24 }
  ];
  const arc = arcOptions[Math.floor(Math.random() * arcOptions.length)];

  spawnBullet({
    x: fromLeft ? box.x - 38 : box.x + box.w + 38,
    y: box.y + box.h - 23,
    r: 19,
    type: "barovianWolf",
    life: 120,
    noCull: true,
    harmless: true,
    facing: direction,
    lunging: false,
    fading: false,
    alpha: 1,
    update: function waitLungeAndFade({ bullet }) {
      if (!bullet.lunging && bullet.age >= 30) {
        bullet.lunging = true;
        bullet.harmless = false;
        bullet.vx = direction * (4 + Math.random());
        bullet.vy = arc.vy;
        bullet.gravity = arc.gravity;
      }

      if (!bullet.lunging) return;

      bullet.x += bullet.vx;
      bullet.y += bullet.vy;
      bullet.vy += bullet.gravity;

      const leftBox = direction > 0
        ? bullet.x > box.x + box.w + 42
        : bullet.x < box.x - 42;
      if (leftBox || bullet.y > box.y + box.h + 42) {
        bullet.fading = true;
        bullet.harmless = true;
      }

      if (bullet.fading) {
        bullet.alpha -= 0.18;
        if (bullet.alpha <= 0) bullet.life = 0;
      }
    }
  });
}

function spawnPlatformSpikeWarning({ spawnBullet, x, y }) {
  return spawnBullet({
    x,
    y,
    r: 14,
    type: "platformSpikeWarning",
    harmless: true,
    noCull: true,
    life: 9999
  });
}

function spawnGrowingPlatformSpikes({ spawnBullet, x, platformY, width }) {
  return spawnBullet({
    x,
    y: platformY - 1,
    baseY: platformY,
    r: 0,
    width,
    height: 1,
    targetHeight: 24,
    type: "platformSpikes",
    noCull: true,
    life: 9999,
    alpha: 1,
    fading: false,
    update: function growAndFadePlatformSpikes({ bullet }) {
      if (bullet.fading) {
        bullet.harmless = true;
        bullet.alpha -= 0.14;
        if (bullet.alpha <= 0) bullet.life = 0;
        return;
      }

      const growth = Math.min(1, bullet.age / 7);
      bullet.height = Math.max(1, bullet.targetHeight * growth);
      bullet.y = bullet.baseY - bullet.height;
    }
  });
}

function spawnDescendingPlatform({ spawnBullet, x, y, speed, width, life, spiked = false }) {
  const movement = function accelerateDownward({ bullet, state }) {
    const progress = Math.max(0, Math.min(1, state.enemyTimer / 840));
    bullet.y += speed + (4 - speed) * progress;
  };
  const platform = spawnBullet({
    x,
    y,
    r: 0,
    width,
    height: 11,
    type: "platform",
    harmless: true,
    solidPlatform: true,
    platformCarryTolerance: speed * 2 + 1,
    noCull: true,
    life,
    update: movement
  });

  if (spiked) {
    spawnBullet({
      x,
      y: y - 9,
      r: 0,
      width,
      height: 9,
      type: "platformSpikes",
      noCull: true,
      life,
      update: movement
    });
  }

  return platform;
}

function spawnRisingStarColumn({
  spawnBullet,
  x,
  topY,
  bottomY,
  gapWindows,
  gapHeight,
  riseSpeed
}) {
  const spacing = 24;
  const slotCount = Math.floor((bottomY - topY) / spacing) + 1;
  const wrapSpan = slotCount * spacing;
  const wrapY = (y) => topY + ((y - topY) % wrapSpan + wrapSpan) % wrapSpan;
  const initialGapCenters = gapWindows.map(({ gapY, encounter }) =>
    wrapY(gapY + riseSpeed * encounter)
  );

  for (let slot = 0; slot < slotCount; slot++) {
    const y = topY + slot * spacing;
    const insideGap = initialGapCenters.some((gapCenter) => {
      const directGapDistance = Math.abs(y - gapCenter);
      const circularGapDistance = Math.min(directGapDistance, wrapSpan - directGapDistance);
      return circularGapDistance <= gapHeight / 2;
    });
    if (insideGap) continue;

    spawnBullet({
      x,
      y,
      r: 8,
      type: "star",
      noCull: true,
      life: 9999,
      spin: slot % 2 === 0 ? 0.08 : -0.08,
      update: function riseAndRefillStarColumn({ bullet }) {
        bullet.y -= riseSpeed;
        if (bullet.y < topY) bullet.y += wrapSpan;
      }
    });
  }
}

function spawnBarrageTreeBlight({ spawnBullet, x, y, facing }) {
  const shotAges = [38, 68, 98];
  const fadeInDuration = 28;
  const fadeOutStart = 110;
  const fadeOutDuration = 26;

  spawnBullet({
    x,
    y,
    r: 15,
    type: "treeBlight",
    facing,
    harmless: true,
    noCull: true,
    alpha: 0,
    life: 140,
    update: function fadeAndFireBlight({ bullet, state, spawnBullet }) {
      if (bullet.age <= fadeInDuration) {
        bullet.alpha = bullet.age / fadeInDuration;
      } else if (bullet.age >= fadeOutStart) {
        bullet.alpha = Math.max(0, 1 - (bullet.age - fadeOutStart) / fadeOutDuration);
      } else {
        bullet.alpha = 1;
      }

      if (!shotAges.includes(bullet.age)) return;

      const baseAngle = Math.atan2(state.soul.y - bullet.y, state.soul.x - bullet.x);
      for (const spread of [-0.12, 0, 0.12]) {
        const angle = baseAngle + spread;
        const speed = 2.8;
        spawnBullet({
          x: bullet.x,
          y: bullet.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          r: 6,
          type: "blightNeedle",
          life: 120,
          angle
        });
      }
    }
  });
}

function randomPlatformWidth() {
  return 26 + Math.floor(Math.random() * 33);
}

function randomPlatformX(box, width) {
  const margin = 8 + width / 2;
  return box.x + margin + Math.random() * Math.max(1, box.w - margin * 2);
}

function chooseRandomPlatformSpikes(state, forceSafe = false) {
  const spiked = !forceSafe && !state.zachLastPlatformSpiked && Math.random() < 0.25;
  state.zachLastPlatformSpiked = spiked;
  return spiked;
}

if (window.SoulBattle?.encounters?.register) {
  window.SoulBattle.encounters.register("zach", zachDefinition);
} else {
  window.ENEMY_DATA = zachDefinition;
}
})();

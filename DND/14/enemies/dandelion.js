(() => {
"use strict";

const DANDELION_BLUE = "#39a7ff";
const DANDELION_RED = "#ff334f";
const DANDELION_PURPLE = "#b66cff";
const DANDELION_BLACK = "#090b10";
const DAGGER_FLIGHT_FRAMES = 42;
const DAGGER_PAUSE_FRAMES = 24;
const DAGGER_BLAST_FRAMES = 22;
const THROW_FRAME_DURATION = 3;
const DANDELION_DEFAULT_FRAMES = Array.from(
  { length: 9 },
  (_value, index) => `sprites/enemies/dandelion/default/default_${String(index + 1).padStart(4, "0")}.png`
);
const DANDELION_THROW_FRAMES = Array.from(
  { length: 7 },
  (_value, index) => `sprites/enemies/dandelion/throw/throw-windup_${String(index + 1).padStart(4, "0")}.png`
);
const DANDELION_PLAYING_FRAMES = Array.from(
  { length: 7 },
  (_value, index) => `sprites/enemies/dandelion/playing/kneeling-lute_${String(index + 1).padStart(4, "0")}.png`
);
const DANDELION_DEFEAT_DROP_START = 520;
const DANDELION_SABLE_FALL_FRAMES = 170;
const DANDELION_DEFEAT_IMPACT = DANDELION_DEFEAT_DROP_START + DANDELION_SABLE_FALL_FRAMES;
const DANDELION_DEFEAT_TIMELINE = Object.freeze({
  dropStart: DANDELION_DEFEAT_DROP_START,
  impact: DANDELION_DEFEAT_IMPACT,
  particleStart: DANDELION_DEFEAT_IMPACT + 10,
  particleEnd: DANDELION_DEFEAT_IMPACT + 130,
  sableLineStart: DANDELION_DEFEAT_IMPACT + 130,
  glitchStart: DANDELION_DEFEAT_IMPACT + 240,
  end: DANDELION_DEFEAT_IMPACT + 320
});
const DANDELION_DEFEAT_LINES = Object.freeze([
  { start: 0, end: 150, speaker: "enemy", text: "Wow! Y'all are stronger than I recall." },
  { start: 150, end: 300, speaker: "enemy", text: "But it'll take more than that to beat me!" },
  { start: 300, end: 380, speaker: "enemy", text: "Wait" },
  { start: 380, end: DANDELION_DEFEAT_TIMELINE.dropStart, speaker: "enemy", text: "Do you hear something?" },
  {
    start: DANDELION_DEFEAT_TIMELINE.sableLineStart,
    end: DANDELION_DEFEAT_TIMELINE.glitchStart,
    speaker: "sableSit",
    text: "SABLE!"
  }
]);
const DANDELION_THROW_KEYS = DANDELION_THROW_FRAMES.map((_frame, index) => `throw${index + 1}`);
const THROW_WINDUP_FRAMES = (DANDELION_THROW_FRAMES.length - 1) * THROW_FRAME_DURATION;
const NOTE_WAVE_INTERVAL = 60;
const NOTE_WAVE_FINAL_INTERVAL = NOTE_WAVE_INTERVAL * 0.9;
const NOTE_WAVE_TOTAL = 10;
const NOTE_WAVE_SPAWN_FRAMES = (() => {
  const frames = [0];
  let nextFrame = 0;

  for (let index = 1; index < NOTE_WAVE_TOTAL; index++) {
    const progress = (index - 1) / Math.max(1, NOTE_WAVE_TOTAL - 2);
    const interval = NOTE_WAVE_INTERVAL +
      (NOTE_WAVE_FINAL_INTERVAL - NOTE_WAVE_INTERVAL) * progress;
    nextFrame += interval;
    frames.push(Math.round(nextFrame));
  }

  return frames;
})();
const NOTE_WAVE_ANGLE_STEP = 0.035;
const NOTE_WAVE_EDGE_PADDING = 0.1;
const NOTE_WAVE_GAP_SLOTS = 3;
const NOTE_WAVE_SPEED = 3.4;
const DANDELION_NOTE_ORIGIN = { x: 765, y: 243 };
const DANDELION_STRUM_SOUND_KEYS = ["strum1", "strum2", "strum3", "strum4", "strum5"];
const SINE_RAY_COUNT = 1;
const SINE_PACKET_NOTE_COUNT = 20;
const SINE_PACKET_START_FRAME = 36;
const SINE_PACKET_INTERVAL = 24;
const SINE_PACKET_REPEATS = 25;
const SINE_PACKET_SPEED = 9;
const SINE_PACKET_NOTE_SPACING = 7;
const SINE_PACKET_AMPLITUDE = 26;
const SINE_PACKET_WAVELENGTH = 82;
const SINE_ATTACK_DURATION = 700;
const DANDELION_NOTE_SOUND_KEYS = ["note1", "note2", "note3", "note4", "note5", "note6"];
const BOUNCING_NOTE_COUNT = 13;
const BOUNCING_NOTE_WARNING_START = 20;
const BOUNCING_NOTE_WARNING_FRAMES = 18;
const BOUNCING_NOTE_INTERVAL = 24;
const BOUNCING_NOTE_SPEED = 2.304;
const BOUNCING_NOTE_RADIUS = 10;
const BOUNCING_NOTE_ATTACK_DURATION = 640;
const WHITE_DAGGER_PLATFORM_WINDUPS = Array.from({ length: 14 }, (_value, index) => 20 + index * 45);
const WHITE_DAGGER_FLIGHT_FRAMES = 30;
const WHITE_DAGGER_PLATFORM_FRAMES = 60;
const WHITE_DAGGER_EXPAND_FRAMES = 8;
const WHITE_DAGGER_DISINTEGRATE_FRAMES = 18;
const WHITE_DAGGER_PLATFORM_WIDTH = 54;
const WHITE_DAGGER_ATTACK_DURATION = 740;
const WHITE_DAGGER_REBOUND_VELOCITY = -13.5;
const WHITE_DAGGER_WIDE_BOX = { x: 315.6, y: 148, w: 268.8, h: 224 };
const DAGGER_WALL_COUNT = 8;
const DAGGER_WALL_SIDES = ["top", "right", "bottom", "left"];
const DAGGER_WALL_WINDUPS = [20, 130, 240, 350, 460];
const DAGGER_SWEEP_SLOT_COUNT = 8;
const DAGGER_SWEEP_BURST_COUNT = 8;
const DAGGER_SWEEP_FINAL_BURST_COUNT = 10;
const DAGGER_SWEEP_LAUNCH_INTERVAL = 4;
const DAGGER_SWEEP_FLIGHT_FRAMES = Math.round(DAGGER_FLIGHT_FRAMES * 1.2);
const DAGGER_SWEEP_FINAL_SET_DELAY = 15;
const DAGGER_SWEEP_SET_STARTS = Array.from(
  { length: 8 },
  (_value, index) => 20 + index * 60 +
    (index === 7 ? DAGGER_SWEEP_FINAL_SET_DELAY : 0)
);
const DAGGER_SWEEP_ATTACK_DURATION = 645;
const ARPEGGIO_BOX = { x: 378, y: 44, w: 144, h: 564 };
const ARPEGGIO_STAGE_COUNT = 3;
const ARPEGGIO_PLATFORM_COUNT = 5;
const ARPEGGIO_DAGGER_INTERVAL = 30;
const ARPEGGIO_STAGE_RESET_DELAY = 60;
const ARPEGGIO_START_PLATFORM_LIFE = 150;
const ARPEGGIO_START_PLATFORM_FADE_FRAMES = 40;
const ARPEGGIO_GOAL_NOTE_RADIUS = 12;
const ARPEGGIO_ATTACK_DURATION = 972;
const ADVANCING_DAGGER_ONSLAUGHT_COUNT = 20;
const ADVANCING_DAGGER_ONSLAUGHT_INTERVAL = 24;
const ADVANCING_DAGGER_ONSLAUGHT_STEP = 11;
const ADVANCING_DAGGER_ONSLAUGHT_COLORS = ["purple", "red", "blue"];
const ADVANCING_DAGGER_ONSLAUGHT_WINDUPS = Array.from(
  { length: ADVANCING_DAGGER_ONSLAUGHT_COUNT },
  (_value, index) => 20 + index * ADVANCING_DAGGER_ONSLAUGHT_INTERVAL
);
const ADVANCING_DAGGER_ONSLAUGHT_DURATION = 610;
const DAGGER_GRID_SIZE = 11;
const DAGGER_GRID_CELL_SIZE = 22;
const DAGGER_GRID_BOX = { x: 329, y: 139, w: 242, h: 242 };
const DAGGER_GRID_EXCEPTION_COUNT = 3;
const DAGGER_GRID_WALL_OFFSET = 17.6;
const DAGGER_GRID_PAUSE_FRAMES = 180;
const DAGGER_GRID_SET_WINDUPS = [20, 310, 600];
const DAGGER_GRID_ATTACK_DURATION = 900;
const DANDELION_ATTACK_ORDER = Object.freeze([
  1, 2, 4, 3, 5, 6, 13, 8, 7, 12, 14, 15, 9, 17, 10, 16, 11
]);
const DANDELION_INSTRUMENT_CHARACTERS = [
  ["CARIAN", "carian"],
  ["BRAVOURÖS", "bravouros"],
  ["THANOS", "thanos"],
  ["BUCKY", "bucky"],
  ["TARHUN", "tarhun"]
];
const DANDELION_INSTRUMENT_FRAMES = Object.fromEntries(
  DANDELION_INSTRUMENT_CHARACTERS.map(([name, assetDirectory]) => [
    name,
    Array.from(
      { length: 5 },
      (_value, index) =>
        `sprites/enemies/dandelion/instruments/${assetDirectory}/instrument_${String(index + 1).padStart(4, "0")}.png`
    )
  ])
);
const DAGGER_ONSLAUGHT_PAIR_COUNT = 10;
const DAGGER_ONSLAUGHT_WINDUPS = (() => {
  const windups = [];
  let nextWindup = 20;

  for (let index = 0; index < DAGGER_ONSLAUGHT_PAIR_COUNT; index++) {
    windups.push(Math.round(nextWindup));
    if (index < DAGGER_ONSLAUGHT_PAIR_COUNT - 1) {
      const progress = index / Math.max(1, DAGGER_ONSLAUGHT_PAIR_COUNT - 2);
      nextWindup += 60 - progress * 30;
    }
  }

  return windups;
})();
const PURPLE_FINISHER_WINDUP =
  DAGGER_ONSLAUGHT_WINDUPS[DAGGER_ONSLAUGHT_WINDUPS.length - 1] +
  THROW_WINDUP_FRAMES + DAGGER_FLIGHT_FRAMES + DAGGER_PAUSE_FRAMES +
  DAGGER_BLAST_FRAMES + 30;

const DAGGER_SEQUENCE = [
  { windupAt: 20, daggers: [{ color: "blue", x: 0.5, y: 0.5 }] },
  { windupAt: 140, daggers: [{ color: "red", x: 0.5, y: 0.5 }] },
  {
    windupAt: 260,
    daggers: [
      { color: "red", x: 0.24, y: 0.38 },
      { color: "blue", x: 0.76, y: 0.7 }
    ]
  },
  {
    windupAt: 375,
    daggers: [
      { color: "red", x: 0.72, y: 0.64 },
      { color: "blue", x: 0.28, y: 0.3 }
    ]
  },
  {
    windupAt: 490,
    daggers: [
      { color: "red", x: 0.4, y: 0.76 },
      { color: "blue", x: 0.64, y: 0.24 }
    ]
  }
];
const DAGGER_STORM_SET_SIZES = [6, 7, 8, 9, 11];
const DAGGER_STORM_WINDUPS = DAGGER_SEQUENCE.map(({ windupAt }) => windupAt);
const DAGGER_STORM_PAUSE_FRAMES = DAGGER_PAUSE_FRAMES * 2;
const BLACK_DAGGER_ATTACK_9_SET_SIZES = [4, 6, 6, 6, 8, 8];
const BLACK_DAGGER_ATTACK_9_SET_STARTS = [20, 80, 140, 200, 260, 320];
const BLACK_DAGGER_ATTACK_10_SET_SIZES = [6, 6, 7, 7, 8, 8, 9, 9];
const BLACK_DAGGER_ATTACK_10_SET_STARTS = [20, 71, 122, 173, 224, 275, 326, 377];
const BLACK_DAGGER_WARNING_FRAMES = 54;
const BLACK_DAGGER_FLIGHT_FRAMES = 12;
const BLACK_DAGGER_SPEED = 16.5;
const BLACK_DAGGER_ROTATIONS = Math.PI * 1.5;
const BLACK_DAGGER_THROW_OFFSET =
  BLACK_DAGGER_WARNING_FRAMES - BLACK_DAGGER_FLIGHT_FRAMES - THROW_WINDUP_FRAMES;
const OUTSIDE_BLACK_DAGGER_BOX = { x: 360.4, y: 170.4, w: 179.2, h: 179.2 };
const OUTSIDE_BLACK_DAGGER_INTERVAL = 20;
const OUTSIDE_BLACK_DAGGER_FLIGHT_FRAMES = 40;
const OUTSIDE_BLACK_DAGGER_SPEED = BLACK_DAGGER_SPEED * 0.8;
const OUTSIDE_BLACK_DAGGER_WINDUPS = Array.from(
  { length: 23 },
  (_value, index) => index * OUTSIDE_BLACK_DAGGER_INTERVAL
);
const OUTSIDE_BLACK_DAGGER_INDICATOR_LENGTH = 34;
const DREAM_ATTACK_BOX = { x: 4, y: 4, w: 892, h: 642 };
const DREAM_ATTACK_DURATION = 1728;
const DREAM_PRELUDE_FLASH_FRAMES = 36;
const DREAM_FADE_START = 0;
const DREAM_FADE_END = 69;
const DREAM_RED_HEART_FADE_START = 0;
const DREAM_RED_HEART_FADE_END = 69;
const DREAM_BUBBLE_START = 99;
const DREAM_HEART_REVEAL = 114;
const DREAM_BUBBLE_FADE_START = 149;
const DREAM_ACTIVE_FRAME = 179;
const DREAM_DAGGER_START = 209;
const DREAM_DAGGER_INTERVAL = 45;
const DREAM_DAGGER_SPEED = 1;
const DREAM_HEART_SPEED = 7.05;
const DREAM_SHIELD_RADIUS = 30;
const DREAM_BARRIER_HALF_SIZE = 26;
const DREAM_CLOUD_WALL_THICKNESS = 14;
const DREAM_CLOUD_LAYOUT_INTERVAL = 180;
const DREAM_CLOUD_FADE_FRAMES = 18;
const DREAM_CLOUD_GRID_INSET = 54;
const DREAM_CLOUD_GRID_COLUMNS = 10;
const DREAM_CLOUD_GRID_ROWS = 7;
const DREAM_MUSIC_NOTE_COUNT = 8;
const DREAM_MUSIC_NOTE_RADIUS = 11;
const DREAM_SPEED_MESSAGE_FRAMES = 48;
const DREAM_MUSIC_FADE_FRAMES = 90;
const DREAM_SHIELD_IMPACT_FRAMES = 10;

function daggerGemColor(color) {
  if (color === "red") return DANDELION_RED;
  if (color === "purple") return DANDELION_PURPLE;
  if (color === "black") return DANDELION_BLACK;
  return DANDELION_BLUE;
}

function dandelionInstrumentKey(playerName) {
  return `dandelionInstrument:${String(playerName || "").toLowerCase()}`;
}

function dandelionInstrumentFrameKey(playerName, frameIndex) {
  return `${dandelionInstrumentKey(playerName)}:frame:${frameIndex}`;
}

function configureDandelionInstrumentAnimation(actor) {
  if (!actor) return;

  const frames = DANDELION_INSTRUMENT_FRAMES[actor.name] || [];
  if (!frames.length) return;

  actor.spriteKeys = actor.spriteKeys || {};
  actor.spriteAnimations = actor.spriteAnimations || {};
  actor.spriteKeys.dandelionInstrument = dandelionInstrumentFrameKey(actor.name, 0);
  actor.spriteAnimations.dandelionInstrument = {
    fps: 6,
    spriteKeys: frames.map((_frame, index) => dandelionInstrumentFrameKey(actor.name, index))
  };
  actor.preserveBattleSpriteAspectRatio = true;
}

function canDandelionPerform({ state, actor }) {
  if (!actor || actor.dandelionPerforming) return false;
  const teammates = Array.isArray(state?.party)
    ? state.party.filter((player) => player !== actor)
    : [];
  const hasDownedTeammate = teammates.some((player) => player?.hp <= 0);
  const hasOtherActiveTeammate = teammates.some((player) =>
    player?.hp > 0 && !player.dandelionPerforming
  );
  return !hasDownedTeammate || hasOtherActiveTeammate;
}

function resolveDandelionPerform({ state, actor }) {
  if (!canDandelionPerform({ state, actor })) return "";

  configureDandelionInstrumentAnimation(actor);
  actor.dandelionPerforming = true;
  actor.actionSpriteRole = null;
  state.persistentEffects = state.persistentEffects.filter((effect) => effect.actorName !== actor.name);

  const encounter = state.encounter;
  if (!Array.isArray(encounter.performers)) encounter.performers = [];
  if (!encounter.performers.includes(actor.name)) encounter.performers.push(actor.name);
  if (state.party.every((player) => player.dandelionPerforming)) {
    encounter.teamMercyReady = true;
  }

  return `* ${actor.name} joins the Maestro's performance.`;
}

function dandelionPerformAct() {
  return {
    name: "Perform",
    description: "Dance to the Maestro's tune",
    tpCost: 100,
    target: "none",
    effect: "none",
    sprite: "dandelionInstrument",
    popupText: "PERFORM",
    menuColor: "#ff9de2",
    menuGlowColor: "#ff4fc7",
    popupColor: "#ff9de2",
    popupGlowColor: "#ff4fc7",
    available: canDandelionPerform,
    resolve: resolveDandelionPerform
  };
}

function purpleDaggerBlastRays(dagger, box) {
  const diagonal = Math.SQRT1_2;
  const directions = [
    { dx: -diagonal, dy: -diagonal },
    { dx: diagonal, dy: -diagonal },
    { dx: -diagonal, dy: diagonal },
    { dx: diagonal, dy: diagonal }
  ].filter(({ dx, dy }) => {
    if (dagger.purpleBlastDiagonal === "rising") return dx * dy < 0;
    if (dagger.purpleBlastDiagonal === "falling") return dx * dy > 0;
    return true;
  });
  return directions.map(({ dx, dy }) => {
    const wallX = dx < 0 ? box.x : box.x + box.w;
    const wallY = dy < 0 ? box.y : box.y + box.h;
    const distanceToXWall = (wallX - dagger.targetX) / dx;
    const distanceToYWall = (wallY - dagger.targetY) / dy;
    return {
      dx,
      dy,
      angle: Math.atan2(dy, dx),
      length: Math.max(0, Math.min(distanceToXWall, distanceToYWall))
    };
  });
}

function spawnPurpleDaggerBlast(spawnBullet, dagger, box) {
  const blastRays = purpleDaggerBlastRays(dagger, box);
  spawnBullet({
    x: dagger.targetX,
    y: dagger.targetY,
    r: 0,
    type: "dandelionDaggerBlast",
    daggerColor: "purple",
    blastShape: "x",
    originX: dagger.targetX,
    originY: dagger.targetY,
    blastRays,
    expansion: 0,
    harmless: true,
    noCull: true,
    life: DAGGER_BLAST_FRAMES,
    update: ({ bullet }) => {
      bullet.expansion = Math.min(1, bullet.age / 4);
    }
  });

  spawnBullet({
    x: dagger.targetX,
    y: dagger.targetY,
    r: 7,
    type: "dandelionDaggerBlastHitbox",
    harmless: true,
    noCull: true,
    life: DAGGER_BLAST_FRAMES,
    activationFrame: 1,
    update: ({ bullet }) => {
      bullet.harmless = bullet.age < bullet.activationFrame;
    }
  });

  const hitboxSpacing = 10;
  for (const ray of blastRays) {
    const segmentCount = Math.max(1, Math.ceil(ray.length / hitboxSpacing));
    for (let index = 1; index <= segmentCount; index++) {
      const progress = index / segmentCount;
      const distance = ray.length * progress;
      spawnBullet({
        x: dagger.targetX + ray.dx * distance,
        y: dagger.targetY + ray.dy * distance,
        r: 7,
        type: "dandelionDaggerBlastHitbox",
        harmless: true,
        noCull: true,
        life: DAGGER_BLAST_FRAMES,
        activationFrame: Math.max(1, Math.ceil(progress * 4)),
        update: ({ bullet }) => {
          bullet.harmless = bullet.age < bullet.activationFrame;
        }
      });
    }
  }
}

function spawnDaggerBlast(spawnBullet, dagger, box) {
  if (dagger.daggerColor === "purple") {
    spawnPurpleDaggerBlast(spawnBullet, dagger, box);
    return;
  }

  const horizontal = dagger.daggerColor === "blue";
  spawnBullet({
    x: dagger.targetX,
    y: dagger.targetY,
    r: 0,
    width: 1,
    height: 1,
    type: "dandelionDaggerBlast",
    daggerColor: dagger.daggerColor,
    horizontal,
    originX: dagger.targetX,
    originY: dagger.targetY,
    arena: { x: box.x, y: box.y, w: box.w, h: box.h },
    noCull: true,
    life: DAGGER_BLAST_FRAMES,
    update: ({ bullet }) => {
      const expansion = Math.min(1, bullet.age / 4);
      const arena = bullet.arena;

      if (bullet.horizontal) {
        const left = bullet.originX - (bullet.originX - arena.x) * expansion;
        const right = bullet.originX + (arena.x + arena.w - bullet.originX) * expansion;
        bullet.x = (left + right) / 2;
        bullet.y = bullet.originY - 5;
        bullet.width = right - left;
        bullet.height = 10;
      } else {
        const top = bullet.originY - (bullet.originY - arena.y) * expansion;
        const bottom = bullet.originY + (arena.y + arena.h - bullet.originY) * expansion;
        bullet.x = bullet.originX;
        bullet.y = top;
        bullet.width = 10;
        bullet.height = bottom - top;
      }
    }
  });
}

function spawnDandelionDagger({
  box,
  spawnBullet,
  playSound,
  sounds,
  color,
  destinationX,
  destinationY,
  flightFrames = DAGGER_FLIGHT_FRAMES,
  pauseFrames = DAGGER_PAUSE_FRAMES,
  playBlastSound = true,
  metadata = null
}) {
  const startX = 756;
  const startY = 220;
  const controlX = (startX + destinationX) / 2;
  const controlY = Math.min(startY, destinationY) - 82;

  spawnBullet({
    x: startX,
    y: startY,
    r: 13,
    type: "dandelionDagger",
    daggerColor: color,
    daggerFlightFrames: flightFrames,
    daggerPauseFrames: pauseFrames,
    targetX: destinationX,
    targetY: destinationY,
    harmless: true,
    noCull: true,
    ...(metadata || {}),
    life: flightFrames + pauseFrames + DAGGER_BLAST_FRAMES,
    update: ({ bullet, spawnBullet: spawn }) => {
      if (bullet.age <= flightFrames) {
        const progress = Math.min(1, bullet.age / flightFrames);
        const inverse = 1 - progress;
        bullet.x = inverse * inverse * startX + 2 * inverse * progress * controlX +
          progress * progress * destinationX;
        bullet.y = inverse * inverse * startY + 2 * inverse * progress * controlY +
          progress * progress * destinationY;

        const tangentX = 2 * inverse * (controlX - startX) +
          2 * progress * (destinationX - controlX);
        const tangentY = 2 * inverse * (controlY - startY) +
          2 * progress * (destinationY - controlY);
        bullet.angle = Math.atan2(tangentY, tangentX) + progress * Math.PI * 8;
        if (progress === 1 && !bullet.landed) {
          bullet.landed = true;
        }
        return;
      }

      bullet.x = destinationX;
      bullet.y = destinationY;
      bullet.angle = color === "blue" ? 0 : color === "purple" ? Math.PI / 4 : Math.PI / 2;

      if (!bullet.landed) {
        bullet.landed = true;
      }

      if (!bullet.blasted && bullet.age >= flightFrames + bullet.daggerPauseFrames) {
        bullet.blasted = true;
        if (playBlastSound && typeof playSound === "function") playSound(sounds.bomb);
        spawnDaggerBlast(spawn, bullet, box);
      }
    }
  });
}

function rayDistanceToBoxEdge(originX, originY, directionX, directionY, box) {
  const distances = [];
  const epsilon = 0.001;
  const addIntersection = (distance, x, y) => {
    if (
      distance >= 0 &&
      x >= box.x - epsilon && x <= box.x + box.w + epsilon &&
      y >= box.y - epsilon && y <= box.y + box.h + epsilon
    ) {
      distances.push(distance);
    }
  };

  if (Math.abs(directionX) > epsilon) {
    for (const wallX of [box.x, box.x + box.w]) {
      const distance = (wallX - originX) / directionX;
      addIntersection(distance, wallX, originY + directionY * distance);
    }
  }
  if (Math.abs(directionY) > epsilon) {
    for (const wallY of [box.y, box.y + box.h]) {
      const distance = (wallY - originY) / directionY;
      addIntersection(distance, originX + directionX * distance, wallY);
    }
  }

  return distances.length > 0 ? Math.max(...distances) : 0;
}

function blackDaggerWarningAngle(bullet, age) {
  const progress = Math.max(0, Math.min(1, age / bullet.warningFrames));
  const eased = 1 - Math.pow(1 - progress, 3);
  return bullet.startAngle + bullet.rotationDirection * bullet.rotationRadians * eased;
}

function createBlackDaggerBurst(count, focalX, focalY) {
  const startAngle = Math.random() * Math.PI * 2;
  const rotationDirection = Math.random() < 0.5 ? -1 : 1;
  const finalBaseAngle = startAngle + rotationDirection * BLACK_DAGGER_ROTATIONS;

  return {
    focalX,
    focalY,
    count,
    startAngle,
    rotationDirection,
    finalAngles: Array.from(
      { length: count },
      (_value, index) => finalBaseAngle + index * Math.PI * 2 / count
    )
  };
}

function spawnBlackDaggerWarning({ box, spawnBullet, burst }) {
  spawnBullet({
    x: burst.focalX,
    y: burst.focalY,
    r: 0,
    type: "dandelionBlackDaggerWarning",
    harmless: true,
    noCull: true,
    focalX: burst.focalX,
    focalY: burst.focalY,
    rayCount: burst.count,
    startAngle: burst.startAngle,
    rotationDirection: burst.rotationDirection,
    rotationRadians: BLACK_DAGGER_ROTATIONS,
    warningFrames: BLACK_DAGGER_WARNING_FRAMES,
    currentAngle: burst.startAngle,
    finalAngles: [...burst.finalAngles],
    arena: { x: box.x, y: box.y, w: box.w, h: box.h },
    life: BLACK_DAGGER_WARNING_FRAMES,
    update: ({ bullet, t }) => {
      const previousAngle = bullet.currentAngle;
      bullet.currentAngle = blackDaggerWarningAngle(bullet, bullet.age);
      bullet.angularStep = Math.abs(bullet.currentAngle - previousAngle);
      if (bullet.age === 1) bullet.initialAngularStep = bullet.angularStep;
      if (bullet.age >= bullet.warningFrames) {
        bullet.stoppedAt = t;
        bullet.finalAngularStep = bullet.angularStep;
      }
    }
  });
}

function spawnDandelionBlackDagger({
  box,
  spawnBullet,
  playSound,
  sounds,
  focalX,
  focalY,
  launchAngle,
  playImpactSound,
  outsideLaunch = false,
  aimX = null,
  aimY = null,
  flightFrames = BLACK_DAGGER_FLIGHT_FRAMES,
  launchSpeed = BLACK_DAGGER_SPEED
}) {
  const startX = 756;
  const startY = 220;
  const controlX = (startX + focalX) / 2;
  const controlY = Math.min(startY, focalY) - 68;
  const directionX = Math.cos(launchAngle);
  const directionY = Math.sin(launchAngle);
  const launchDistance = rayDistanceToBoxEdge(
    focalX,
    focalY,
    directionX,
    directionY,
    box
  );
  const launchFrames = Math.ceil(launchDistance / launchSpeed);

  spawnBullet({
    x: startX,
    y: startY,
    r: 10,
    type: "dandelionDagger",
    daggerColor: "black",
    targetX: focalX,
    targetY: focalY,
    launchAngle,
    launchDistance,
    launchSpeed,
    daggerFlightFrames: flightFrames,
    outsideLaunch,
    aimX,
    aimY,
    harmless: true,
    noCull: true,
    life: flightFrames + launchFrames,
    update: ({ bullet, t }) => {
      if (bullet.age <= bullet.daggerFlightFrames) {
        const progress = Math.min(1, bullet.age / bullet.daggerFlightFrames);
        const inverse = 1 - progress;
        bullet.x = inverse * inverse * startX + 2 * inverse * progress * controlX +
          progress * progress * focalX;
        bullet.y = inverse * inverse * startY + 2 * inverse * progress * controlY +
          progress * progress * focalY;

        const tangentX = 2 * inverse * (controlX - startX) +
          2 * progress * (focalX - controlX);
        const tangentY = 2 * inverse * (controlY - startY) +
          2 * progress * (focalY - controlY);
        bullet.angle = progress === 1
          ? launchAngle
          : Math.atan2(tangentY, tangentX) + progress * Math.PI * 5;

        if (progress === 1) {
          bullet.landed = true;
          bullet.blackDaggerLaunched = true;
          bullet.harmless = false;
          bullet.landedAt = t;
          if (playImpactSound && typeof playSound === "function") playSound(sounds.bomb);
        }
        return;
      }

      const distance = Math.min(
        launchDistance,
        (bullet.age - bullet.daggerFlightFrames) * bullet.launchSpeed
      );
      bullet.x = focalX + directionX * distance;
      bullet.y = focalY + directionY * distance;
      bullet.angle = launchAngle;
      bullet.harmless = false;
      if (distance >= launchDistance) bullet.reachedEdge = true;
    }
  });
}

function randomOutsideBlackDaggerDestination(box) {
  const side = Math.floor(Math.random() * 4);
  const distanceOutside = 18 + Math.random() * 18;
  if (side === 0) {
    return { x: box.x + Math.random() * box.w, y: box.y - distanceOutside };
  }
  if (side === 1) {
    return { x: box.x + box.w + distanceOutside, y: box.y + Math.random() * box.h };
  }
  if (side === 2) {
    return { x: box.x + Math.random() * box.w, y: box.y + box.h + distanceOutside };
  }
  return { x: box.x - distanceOutside, y: box.y + Math.random() * box.h };
}

function spawnOutsideBlackDagger({ box, state, spawnBullet, playSound, sounds }) {
  const destination = randomOutsideBlackDaggerDestination(box);
  const aimX = state.soul.x;
  const aimY = state.soul.y;
  const launchAngle = Math.atan2(aimY - destination.y, aimX - destination.x);

  spawnBullet({
    x: destination.x,
    y: destination.y,
    r: 0,
    type: "dandelionBlackDaggerLandingIndicator",
    harmless: true,
    noCull: true,
    landingX: destination.x,
    landingY: destination.y,
    directionX: Math.cos(launchAngle),
    directionY: Math.sin(launchAngle),
    indicatorLength: OUTSIDE_BLACK_DAGGER_INDICATOR_LENGTH,
    indicatorFrames: OUTSIDE_BLACK_DAGGER_FLIGHT_FRAMES,
    life: OUTSIDE_BLACK_DAGGER_FLIGHT_FRAMES
  });

  spawnDandelionBlackDagger({
    box,
    spawnBullet,
    playSound,
    sounds,
    focalX: destination.x,
    focalY: destination.y,
    launchAngle,
    playImpactSound: true,
    outsideLaunch: true,
    aimX,
    aimY,
    flightFrames: OUTSIDE_BLACK_DAGGER_FLIGHT_FRAMES,
    launchSpeed: OUTSIDE_BLACK_DAGGER_SPEED
  });
}

function spawnDandelionDreamDagger({
  box,
  state,
  spawnBullet,
  playSound,
  sounds,
  volleyIndex
}) {
  const dream = state.encounter.dandelionDreamAttack;
  if (!dream) return;

  const side = volleyIndex % 4;
  const inset = 14;
  let x;
  let y;
  if (side === 0) {
    x = box.x + inset + Math.random() * (box.w - inset * 2);
    y = box.y - 16;
  } else if (side === 1) {
    x = box.x + box.w + 16;
    y = box.y + inset + Math.random() * (box.h - inset * 2);
  } else if (side === 2) {
    x = box.x + inset + Math.random() * (box.w - inset * 2);
    y = box.y + box.h + 16;
  } else {
    x = box.x - 16;
    y = box.y + inset + Math.random() * (box.h - inset * 2);
  }

  const angle = Math.atan2(dream.sleepingY - y, dream.sleepingX - x);
  const directionX = Math.cos(angle);
  const directionY = Math.sin(angle);
  const travelDistance = Math.hypot(dream.sleepingX - x, dream.sleepingY - y);

  spawnBullet({
    x,
    y,
    r: 10,
    type: "dandelionDagger",
    daggerColor: "black",
    dreamDagger: true,
    dreamSide: side,
    targetX: dream.sleepingX,
    targetY: dream.sleepingY,
    angle,
    landed: true,
    vx: directionX * DREAM_DAGGER_SPEED,
    vy: directionY * DREAM_DAGGER_SPEED,
    dreamSpeed: DREAM_DAGGER_SPEED,
    noCull: true,
    life: Math.ceil((travelDistance + 36) / DREAM_DAGGER_SPEED),
    update: ({ bullet, state: currentState }) => {
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;

      const currentDream = currentState.encounter.dandelionDreamAttack;
      if (!currentDream || currentDream.timer < DREAM_ACTIVE_FRAME) return;

      const shieldDistance = Math.hypot(
        bullet.x - currentDream.dreamX,
        bullet.y - currentDream.dreamY
      );
      if (shieldDistance <= DREAM_SHIELD_RADIUS + bullet.r) {
        const impactAngle = Math.atan2(
          bullet.y - currentDream.dreamY,
          bullet.x - currentDream.dreamX
        );
        bullet.harmless = true;
        bullet.life = 0;
        bullet.dreamIntercepted = true;
        currentDream.intercepts++;
        currentDream.shieldFlash = 8;
        currentDream.shieldImpacts.push({
          angle: impactAngle,
          age: 0,
          life: DREAM_SHIELD_IMPACT_FRAMES
        });
        playSound?.(sounds?.shieldBlock);
        return;
      }

      if (
        !bullet.reachedSleepingHeart &&
        Math.hypot(
          bullet.x - currentDream.sleepingX,
          bullet.y - currentDream.sleepingY
        ) <= bullet.r + currentState.soul.r
      ) {
        bullet.reachedSleepingHeart = true;
        currentDream.misses++;
      }
    }
  });
}

function dreamCloudSegment(x1, y1, x2, y2, branch = "cage") {
  return {
    x1,
    y1,
    x2,
    y2,
    branch,
    horizontal: y1 === y2
  };
}

function createDreamCloudCage(dream) {
  const left = dream.sleepingX - DREAM_BARRIER_HALF_SIZE;
  const right = dream.sleepingX + DREAM_BARRIER_HALF_SIZE;
  const top = dream.sleepingY - DREAM_BARRIER_HALF_SIZE;
  const bottom = dream.sleepingY + DREAM_BARRIER_HALF_SIZE;
  return [
    dreamCloudSegment(left, top, right, top),
    dreamCloudSegment(right, top, right, bottom),
    dreamCloudSegment(left, bottom, right, bottom),
    dreamCloudSegment(left, top, left, bottom)
  ];
}

function dreamCloudGrid(box) {
  const x = box.x + DREAM_CLOUD_GRID_INSET;
  const y = box.y + DREAM_CLOUD_GRID_INSET;
  const w = box.w - DREAM_CLOUD_GRID_INSET * 2;
  const h = box.h - DREAM_CLOUD_GRID_INSET * 2;
  return {
    x,
    y,
    w,
    h,
    cellW: w / DREAM_CLOUD_GRID_COLUMNS,
    cellH: h / DREAM_CLOUD_GRID_ROWS
  };
}

function dreamGridConnectionKey(first, second) {
  return first < second ? `${first}:${second}` : `${second}:${first}`;
}

function dreamGridIsConnected(walls) {
  const cellCount = DREAM_CLOUD_GRID_COLUMNS * DREAM_CLOUD_GRID_ROWS;
  const blocked = new Set(walls.map(({ blockedCells }) =>
    dreamGridConnectionKey(blockedCells[0], blockedCells[1])));
  const visited = new Set([0]);
  const pending = [0];

  while (pending.length > 0) {
    const cell = pending.shift();
    const row = Math.floor(cell / DREAM_CLOUD_GRID_COLUMNS);
    const column = cell % DREAM_CLOUD_GRID_COLUMNS;
    const neighbors = [];
    if (column > 0) neighbors.push(cell - 1);
    if (column < DREAM_CLOUD_GRID_COLUMNS - 1) neighbors.push(cell + 1);
    if (row > 0) neighbors.push(cell - DREAM_CLOUD_GRID_COLUMNS);
    if (row < DREAM_CLOUD_GRID_ROWS - 1) neighbors.push(cell + DREAM_CLOUD_GRID_COLUMNS);

    for (const neighbor of neighbors) {
      if (visited.has(neighbor) || blocked.has(dreamGridConnectionKey(cell, neighbor))) continue;
      visited.add(neighbor);
      pending.push(neighbor);
    }
  }
  return visited.size === cellCount;
}

function createDreamCloudGridCandidates(box) {
  const grid = dreamCloudGrid(box);
  const centerX = box.x + box.w / 2;
  const centerY = box.y + box.h / 2;
  const candidates = [];
  const addCandidate = (wall, firstCell, secondCell, gridRow, gridColumn) => {
    const midpointX = (wall.x1 + wall.x2) / 2;
    const midpointY = (wall.y1 + wall.y2) / 2;
    const outerDistance = Math.min(1, Math.max(
      Math.abs(midpointX - centerX) / ((grid.w - grid.cellW) / 2),
      Math.abs(midpointY - centerY) / ((grid.h - grid.cellH) / 2)
    ));
    candidates.push({
      ...wall,
      branch: "grid",
      blockedCells: [firstCell, secondCell],
      gridRow,
      gridColumn,
      gridChance: 0.5 - outerDistance * 0.3
    });
  };

  for (let row = 1; row < DREAM_CLOUD_GRID_ROWS; row++) {
    const wallY = grid.y + row * grid.cellH;
    for (let column = 0; column < DREAM_CLOUD_GRID_COLUMNS; column++) {
      const x1 = grid.x + column * grid.cellW;
      const above = (row - 1) * DREAM_CLOUD_GRID_COLUMNS + column;
      const below = row * DREAM_CLOUD_GRID_COLUMNS + column;
      addCandidate(
        dreamCloudSegment(x1, wallY, x1 + grid.cellW, wallY, "grid"),
        above,
        below,
        row,
        column
      );
    }
  }
  for (let column = 1; column < DREAM_CLOUD_GRID_COLUMNS; column++) {
    const wallX = grid.x + column * grid.cellW;
    for (let row = 0; row < DREAM_CLOUD_GRID_ROWS; row++) {
      const y1 = grid.y + row * grid.cellH;
      const left = row * DREAM_CLOUD_GRID_COLUMNS + column - 1;
      const right = left + 1;
      addCandidate(
        dreamCloudSegment(wallX, y1, wallX, y1 + grid.cellH, "grid"),
        left,
        right,
        row,
        column
      );
    }
  }
  return candidates;
}

function createDreamMusicNotes(dream, box) {
  const grid = dreamCloudGrid(box);
  const cells = Array.from(
    { length: DREAM_CLOUD_GRID_COLUMNS * DREAM_CLOUD_GRID_ROWS },
    (_value, cell) => {
      const row = Math.floor(cell / DREAM_CLOUD_GRID_COLUMNS);
      const column = cell % DREAM_CLOUD_GRID_COLUMNS;
      return {
        cell,
        row,
        column,
        x: grid.x + (column + 0.5) * grid.cellW,
        y: grid.y + (row + 0.5) * grid.cellH,
        collected: false
      };
    }
  ).filter((note) =>
    Math.hypot(note.x - dream.sleepingX, note.y - dream.sleepingY) >
      DREAM_BARRIER_HALF_SIZE + DREAM_MUSIC_NOTE_RADIUS + 24 &&
    Math.hypot(note.x - dream.dreamX, note.y - dream.dreamY) > 48
  );

  for (let index = cells.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [cells[index], cells[swapIndex]] = [cells[swapIndex], cells[index]];
  }
  return cells.slice(0, DREAM_MUSIC_NOTE_COUNT);
}

function createDreamCloudBranches(dream, box) {
  const candidates = createDreamCloudGridCandidates(box);
  const safetyRadius = DREAM_CLOUD_WALL_THICKNESS / 2 + 14;
  const nearDreamHeart = (wall) => {
    const nearestX = Math.max(Math.min(wall.x1, wall.x2), Math.min(dream.dreamX, Math.max(wall.x1, wall.x2)));
    const nearestY = Math.max(Math.min(wall.y1, wall.y2), Math.min(dream.dreamY, Math.max(wall.y1, wall.y2)));
    return Math.hypot(dream.dreamX - nearestX, dream.dreamY - nearestY) < safetyRadius;
  };
  const crossesCenterCage = (wall) => {
    const cageClearance = DREAM_BARRIER_HALF_SIZE + DREAM_CLOUD_WALL_THICKNESS / 2 + 4;
    const left = Math.min(wall.x1, wall.x2);
    const right = Math.max(wall.x1, wall.x2);
    const top = Math.min(wall.y1, wall.y2);
    const bottom = Math.max(wall.y1, wall.y2);
    return right >= dream.sleepingX - cageClearance &&
      left <= dream.sleepingX + cageClearance &&
      bottom >= dream.sleepingY - cageClearance &&
      top <= dream.sleepingY + cageClearance;
  };
  const available = candidates.filter((wall) =>
    !nearDreamHeart(wall) && !crossesCenterCage(wall));

  let walls = [];
  for (let attempt = 0; attempt < 32; attempt++) {
    walls = available.filter(({ gridChance }) => Math.random() < gridChance);
    if (dreamGridIsConnected(walls)) return walls;
  }
  while (!dreamGridIsConnected(walls) && walls.length > 0) {
    walls.splice(Math.floor(Math.random() * walls.length), 1);
  }
  return walls;
}

function updateDreamCloudLayout(dream, box, timer) {
  if (timer < DREAM_ACTIVE_FRAME) return;
  const layoutIndex = Math.floor((timer - DREAM_ACTIVE_FRAME) / DREAM_CLOUD_LAYOUT_INTERVAL);
  if (dream.cloudWallLayoutIndex === layoutIndex) return;

  if (dream.cloudWalls.length > 0) {
    dream.retiringCloudWalls = dream.cloudWalls.map((wall) => ({ ...wall }));
    dream.cloudWallsRetiredAt = timer;
  }
  if (dream.cloudCage.length === 0) {
    dream.cloudCage = createDreamCloudCage(dream);
    dream.musicNotes = createDreamMusicNotes(dream, box);
    dream.cloudCageSpawnedAt = timer;
  }
  dream.cloudWalls = createDreamCloudBranches(dream, box);
  dream.cloudWallLayoutIndex = layoutIndex;
  dream.cloudWallsChangedAt = timer;
}

function setupDandelionDreamAttack({ box, state }) {
  const sleepingX = state.soul.x;
  const sleepingY = state.soul.y;
  state.encounter.dandelionDreamAttack = {
    timer: 0,
    sleepingX,
    sleepingY,
    dreamX: sleepingX,
    dreamY: sleepingY - 48,
    cloudCage: [],
    cloudWalls: [],
    retiringCloudWalls: [],
    cloudWallLayoutIndex: -1,
    cloudWallsChangedAt: 0,
    cloudWallsRetiredAt: 0,
    cloudCageSpawnedAt: null,
    musicNotes: [],
    musicNoteParticles: [],
    speedMultiplier: 1,
    speedMessageTimer: 0,
    shieldFlash: 0,
    shieldImpacts: [],
    intercepts: 0,
    misses: 0,
    box: { x: box.x, y: box.y, w: box.w, h: box.h }
  };
  state.message = "";
  state.enemySpriteKey = null;
}

function beginDandelionDreamPrelude({ state, playSound, sounds }) {
  state.encounter.dandelionDreamMusicFade = {
    timer: 0,
    duration: DREAM_MUSIC_FADE_FRAMES,
    started: false
  };
  state.enemySpriteKey = "playing";
  playSound?.(sounds.strum1, 0.45);
  playSound?.(sounds.strum3, 0.45);
  playSound?.(sounds.strum5, 0.45);
}

function spawnBlackDaggerBurst({ box, spawnBullet, playSound, sounds, burst }) {
  for (const [index, launchAngle] of burst.finalAngles.entries()) {
    spawnDandelionBlackDagger({
      box,
      spawnBullet,
      playSound,
      sounds,
      focalX: burst.focalX,
      focalY: burst.focalY,
      launchAngle,
      playImpactSound: index === 0
    });
  }
}

function updateBlackDaggerFocalBursts({
  t,
  box,
  state,
  spawnBullet,
  playSound,
  sounds,
  setSizes,
  setStarts
}) {
  if (!Array.isArray(state.encounter.dandelionBlackDaggerBursts)) {
    state.encounter.dandelionBlackDaggerBursts = [];
  }

  const warningIndex = setStarts.indexOf(t);
  if (warningIndex !== -1) {
    const burst = createBlackDaggerBurst(
      setSizes[warningIndex],
      state.soul.x,
      state.soul.y
    );
    state.encounter.dandelionBlackDaggerBursts[warningIndex] = burst;
    spawnBlackDaggerWarning({ box, spawnBullet, burst });
  }

  const setIndex = setStarts.findIndex((start) => {
    const windupAt = start + BLACK_DAGGER_THROW_OFFSET;
    const elapsed = t - windupAt;
    return elapsed >= 0 && elapsed <= THROW_WINDUP_FRAMES;
  });
  if (setIndex === -1) return;

  const windupAt = setStarts[setIndex] + BLACK_DAGGER_THROW_OFFSET;
  if (!updateDandelionThrowWindup({ t, state, windupAt })) return;
  const burst = state.encounter.dandelionBlackDaggerBursts[setIndex];
  if (!burst) return;
  spawnBlackDaggerBurst({ box, spawnBullet, playSound, sounds, burst });
}

function updateDandelionThrowWindup({ t, state, windupAt }) {
  const windupElapsed = t - windupAt;
  if (windupElapsed < 0 || windupElapsed > THROW_WINDUP_FRAMES) return false;

  const throwFrameIndex = Math.min(
    DANDELION_THROW_KEYS.length - 1,
    Math.floor(windupElapsed / THROW_FRAME_DURATION)
  );
  state.enemySpriteKey = DANDELION_THROW_KEYS[throwFrameIndex];
  return windupElapsed === THROW_WINDUP_FRAMES;
}

function updateAdvancingDaggerOnslaught({
  t,
  box,
  state,
  spawnBullet,
  playSound,
  sounds
}) {
  const daggerIndex = ADVANCING_DAGGER_ONSLAUGHT_WINDUPS.findIndex((windupAt) => {
    const elapsed = t - windupAt;
    return elapsed >= 0 && elapsed <= THROW_WINDUP_FRAMES;
  });
  if (daggerIndex === -1) return;

  const windupAt = ADVANCING_DAGGER_ONSLAUGHT_WINDUPS[daggerIndex];
  if (!updateDandelionThrowWindup({ t, state, windupAt })) return;

  const centerX = box.x + box.w / 2;
  const centerY = box.y + box.h / 2;
  let destinationX = centerX;
  let destinationY = centerY;
  const previousTarget = state.encounter.dandelionAdvancingDaggerOnslaughtTarget;
  if (daggerIndex > 0 && previousTarget) {
    const deltaX = state.soul.x - previousTarget.x;
    const deltaY = state.soul.y - previousTarget.y;
    const distance = Math.hypot(deltaX, deltaY);
    if (distance > 0.001) {
      const stepDistance = Math.min(ADVANCING_DAGGER_ONSLAUGHT_STEP, distance);
      destinationX = previousTarget.x + deltaX / distance * stepDistance;
      destinationY = previousTarget.y + deltaY / distance * stepDistance;
    } else {
      destinationX = previousTarget.x;
      destinationY = previousTarget.y;
    }
  }
  state.encounter.dandelionAdvancingDaggerOnslaughtTarget = {
    x: destinationX,
    y: destinationY
  };

  spawnDandelionDagger({
    box,
    spawnBullet,
    playSound,
    sounds,
    color: ADVANCING_DAGGER_ONSLAUGHT_COLORS[
      daggerIndex % ADVANCING_DAGGER_ONSLAUGHT_COLORS.length
    ],
    destinationX,
    destinationY,
    pauseFrames: 40,
    metadata: { advancingOnslaughtIndex: daggerIndex }
  });
}

function shuffledDaggerGridIndices() {
  const indices = Array.from({ length: DAGGER_GRID_SIZE }, (_value, index) => index);
  for (let index = indices.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [indices[index], indices[swapIndex]] = [indices[swapIndex], indices[index]];
  }
  return indices;
}

function chooseDaggerGridOpenings() {
  for (let attempt = 0; attempt < 80; attempt++) {
    const openings = shuffledDaggerGridIndices()
      .slice(0, DAGGER_GRID_EXCEPTION_COUNT)
      .sort((left, right) => left - right);
    if (openings.slice(1).every((value, index) => value - openings[index] >= 3)) {
      return openings;
    }
  }
  return [1, 5, 9];
}

function purpleDaggerGridTargetCoversCell(target, cell) {
  const columnDistance = Math.abs(cell.column - target.column);
  const rowDistance = Math.abs(cell.row - target.row);
  return Math.abs(columnDistance - rowDistance) <= 1;
}

function createDaggerGridLayout() {
  const openColumns = chooseDaggerGridOpenings();
  const openRows = chooseDaggerGridOpenings();
  const candidates = openColumns.flatMap((column) =>
    openRows.map((row) => ({ column, row }))
  );
  let bestTargets = [candidates[0], candidates[1]];
  let bestSafeCells = [];

  for (let first = 0; first < candidates.length - 1; first++) {
    for (let second = first + 1; second < candidates.length; second++) {
      const targets = [candidates[first], candidates[second]];
      const safeCells = candidates.filter((cell) =>
        !targets.some((target) => purpleDaggerGridTargetCoversCell(target, cell))
      );
      if (safeCells.length > bestSafeCells.length) {
        bestTargets = targets;
        bestSafeCells = safeCells;
      }
    }
  }

  return { openColumns, openRows, purpleTargets: bestTargets, safeCells: bestSafeCells };
}

function setupDaggerGridCrossfire({ state, spawnBullet }) {
  state.encounter.dandelionDaggerGridLayouts = [];
  spawnBullet({
    x: DAGGER_GRID_BOX.x,
    y: DAGGER_GRID_BOX.y,
    r: 0,
    type: "dandelionDaggerGrid",
    gridSize: DAGGER_GRID_SIZE,
    cellSize: DAGGER_GRID_CELL_SIZE,
    arena: { ...DAGGER_GRID_BOX },
    harmless: true,
    noCull: true,
    life: DAGGER_GRID_ATTACK_DURATION + 1
  });
}

function spawnDaggerGridCrossfireSet({
  box,
  state,
  spawnBullet,
  playSound,
  sounds,
  setIndex
}) {
  const layout = createDaggerGridLayout();
  state.encounter.dandelionDaggerGridLayouts[setIndex] = layout;
  let daggerInSet = 0;
  const spawnGridDagger = ({ color, destinationX, destinationY, metadata }) => {
    spawnDandelionDagger({
      box,
      spawnBullet,
      playSound,
      sounds,
      color,
      destinationX,
      destinationY,
      pauseFrames: DAGGER_GRID_PAUSE_FRAMES,
      playBlastSound: daggerInSet === 0,
      metadata: { daggerGridSetIndex: setIndex, ...metadata }
    });
    daggerInSet++;
  };

  for (let column = 0; column < DAGGER_GRID_SIZE; column++) {
    spawnGridDagger({
      color: layout.openColumns.includes(column) ? "blue" : "red",
      destinationX: box.x + (column + 0.5) * DAGGER_GRID_CELL_SIZE,
      destinationY: box.y - DAGGER_GRID_WALL_OFFSET,
      metadata: { daggerGridWall: "top", daggerGridIndex: column }
    });
  }
  for (let row = 0; row < DAGGER_GRID_SIZE; row++) {
    spawnGridDagger({
      color: layout.openRows.includes(row) ? "red" : "blue",
      destinationX: box.x + box.w + DAGGER_GRID_WALL_OFFSET,
      destinationY: box.y + (row + 0.5) * DAGGER_GRID_CELL_SIZE,
      metadata: { daggerGridWall: "right", daggerGridIndex: row }
    });
  }
  for (const target of layout.purpleTargets) {
    spawnGridDagger({
      color: "purple",
      destinationX: box.x + (target.column + 0.5) * DAGGER_GRID_CELL_SIZE,
      destinationY: box.y + (target.row + 0.5) * DAGGER_GRID_CELL_SIZE,
      metadata: {
        daggerGridWall: "inside",
        daggerGridColumn: target.column,
        daggerGridRow: target.row
      }
    });
  }
}

function updateDaggerGridCrossfire({ t, box, state, spawnBullet, playSound, sounds }) {
  const setIndex = DAGGER_GRID_SET_WINDUPS.findIndex((windupAt) => {
    const elapsed = t - windupAt;
    return elapsed >= 0 && elapsed <= THROW_WINDUP_FRAMES;
  });
  if (setIndex === -1) return;
  const windupAt = DAGGER_GRID_SET_WINDUPS[setIndex];
  if (!updateDandelionThrowWindup({ t, state, windupAt })) return;
  spawnDaggerGridCrossfireSet({
    box,
    state,
    spawnBullet,
    playSound,
    sounds,
    setIndex
  });
}

function spawnRandomDaggerWall({ box, spawnBullet, playSound, sounds }) {
  const side = DAGGER_WALL_SIDES[Math.floor(Math.random() * DAGGER_WALL_SIDES.length)];
  const windowIndex = 1 + Math.floor(Math.random() * (DAGGER_WALL_COUNT - 2));
  const crossingColor = side === "top" || side === "bottom" ? "red" : "blue";
  const windowColor = crossingColor === "red" ? "blue" : "red";
  const edgeInset = 0.04;

  for (let index = 0; index < DAGGER_WALL_COUNT; index++) {
    const linePosition = (index + 0.5) / DAGGER_WALL_COUNT;
    let x = linePosition;
    let y = linePosition;

    if (side === "top") y = edgeInset;
    else if (side === "bottom") y = 1 - edgeInset;
    else if (side === "left") x = edgeInset;
    else x = 1 - edgeInset;

    spawnDandelionDagger({
      box,
      spawnBullet,
      playSound,
      sounds,
      color: index === windowIndex ? windowColor : crossingColor,
      destinationX: box.x + box.w * x,
      destinationY: box.y + box.h * y,
      playBlastSound: index === 0
    });
  }
}

function setupDandelionDaggerSweeps({ state }) {
  const sides = [];
  for (let setIndex = 0; setIndex < DAGGER_SWEEP_SET_STARTS.length - 1; setIndex++) {
    const previousSide = sides[setIndex - 1];
    const availableSides = DAGGER_WALL_SIDES.filter((side) => side !== previousSide);
    sides.push(availableSides[Math.floor(Math.random() * availableSides.length)]);
  }
  state.encounter.dandelionDaggerSweepSides = sides;
  state.encounter.dandelionDaggerSweepFinalCorner = Math.floor(Math.random() * 4);
}

function spawnDandelionDaggerSweepSlot({
  box,
  state,
  spawnBullet,
  playSound,
  sounds,
  setIndex,
  launchIndex
}) {
  const finalSet = setIndex === DAGGER_SWEEP_SET_STARTS.length - 1;
  const burstCount = finalSet ? DAGGER_SWEEP_FINAL_BURST_COUNT : DAGGER_SWEEP_BURST_COUNT;
  const side = state.encounter.dandelionDaggerSweepSides?.[setIndex];
  if (!finalSet && !side) return;
  const fromFarEdge = !finalSet && (side === "right" || side === "bottom");
  const slotIndex = fromFarEdge
    ? DAGGER_SWEEP_SLOT_COUNT - 1 - launchIndex
    : launchIndex;
  const edgeInset = 0.04;
  const occupiedStart = 0.5 / DAGGER_SWEEP_SLOT_COUNT;
  const occupiedEnd = (DAGGER_SWEEP_SLOT_COUNT - 1.5) / DAGGER_SWEEP_SLOT_COUNT;
  const occupiedProgress = launchIndex / (burstCount - 1);
  const slotPosition = finalSet
    ? occupiedEnd * occupiedProgress
    : fromFarEdge
      ? 1 - occupiedStart - (occupiedEnd - occupiedStart) * occupiedProgress
      : occupiedStart + (occupiedEnd - occupiedStart) * occupiedProgress;
  const verticalSweep = side === "top" || side === "bottom";
  const color = finalSet ? "purple" : verticalSweep ? "red" : "blue";
  const wallX = side === "left"
    ? box.x + box.w * edgeInset
    : box.x + box.w * (1 - edgeInset);
  const wallY = side === "top"
    ? box.y + box.h * edgeInset
    : box.y + box.h * (1 - edgeInset);
  const finalCorners = [
    { key: "topLeft", x: edgeInset, y: edgeInset },
    { key: "topRight", x: 1 - edgeInset, y: edgeInset },
    { key: "bottomRight", x: 1 - edgeInset, y: 1 - edgeInset },
    { key: "bottomLeft", x: edgeInset, y: 1 - edgeInset }
  ];
  const finalCorner = finalCorners[state.encounter.dandelionDaggerSweepFinalCorner] || finalCorners[0];
  const purpleBlastDiagonal = finalCorner.x === finalCorner.y ? "rising" : "falling";
  const destinationX = finalSet
    ? box.x + box.w * (finalCorner.x + (1 - finalCorner.x * 2) * slotPosition)
    : verticalSweep ? box.x + box.w * slotPosition : wallX;
  const destinationY = finalSet
    ? box.y + box.h * (finalCorner.y + (1 - finalCorner.y * 2) * slotPosition)
    : verticalSweep ? wallY : box.y + box.h * slotPosition;

  spawnDandelionDagger({
    box,
    spawnBullet,
    playSound,
    sounds,
    color,
    destinationX,
    destinationY,
    flightFrames: DAGGER_SWEEP_FLIGHT_FRAMES,
    playBlastSound: true,
    metadata: {
      daggerSweepBurst: true,
      daggerSweepSetIndex: setIndex,
      daggerSweepLaunchIndex: launchIndex,
      daggerSweepSlotIndex: slotIndex,
      daggerSweepSide: side,
      daggerSweepCorner: finalSet ? finalCorner.key : null,
      purpleBlastDiagonal: finalSet ? purpleBlastDiagonal : null,
      daggerSweepFromFarEdge: fromFarEdge,
      daggerSweepFinalSet: finalSet,
      daggerSweepLanePosition: slotPosition,
      daggerSweepOpeningSize: 1 - occupiedEnd
    }
  });
}

function updateDandelionDaggerSweeps({ t, box, state, spawnBullet, playSound, sounds }) {
  const setIndex = DAGGER_SWEEP_SET_STARTS.findIndex((start, index) => {
    const elapsed = t - start;
    const burstCount = index === DAGGER_SWEEP_SET_STARTS.length - 1
      ? DAGGER_SWEEP_FINAL_BURST_COUNT
      : DAGGER_SWEEP_BURST_COUNT;
    const burstFrames = (burstCount - 1) * DAGGER_SWEEP_LAUNCH_INTERVAL;
    return elapsed >= 0 && elapsed <= THROW_WINDUP_FRAMES + burstFrames;
  });
  if (setIndex === -1) return;

  const windupAt = DAGGER_SWEEP_SET_STARTS[setIndex];
  if (t - windupAt <= THROW_WINDUP_FRAMES) {
    updateDandelionThrowWindup({ t, state, windupAt });
  }
  const launchElapsed = t - (windupAt + THROW_WINDUP_FRAMES);
  if (launchElapsed < 0 || launchElapsed % DAGGER_SWEEP_LAUNCH_INTERVAL !== 0) return;
  const launchIndex = launchElapsed / DAGGER_SWEEP_LAUNCH_INTERVAL;
  const burstCount = setIndex === DAGGER_SWEEP_SET_STARTS.length - 1
    ? DAGGER_SWEEP_FINAL_BURST_COUNT
    : DAGGER_SWEEP_BURST_COUNT;
  if (launchIndex >= burstCount) return;

  spawnDandelionDaggerSweepSlot({
    box,
    state,
    spawnBullet,
    playSound,
    sounds,
    setIndex,
    launchIndex
  });
}

function randomDaggerDestination(box, existingDestinations = [], bounds = {}) {
  const margin = 0.04;
  const cushion = 48;
  const minRatioX = bounds.minX ?? margin;
  const maxRatioX = bounds.maxX ?? 1 - margin;
  const minRatioY = bounds.minY ?? margin;
  const maxRatioY = bounds.maxY ?? 1 - margin;
  const minX = box.x + box.w * minRatioX;
  const maxX = box.x + box.w * maxRatioX;
  const minY = box.y + box.h * minRatioY;
  const maxY = box.y + box.h * maxRatioY;
  const destination = {
    x: box.x + box.w * (minRatioX + Math.random() * (maxRatioX - minRatioX)),
    y: box.y + box.h * (minRatioY + Math.random() * (maxRatioY - minRatioY))
  };

  for (let pass = 0; pass < 6; pass++) {
    let moved = false;

    for (const existing of existingDestinations) {
      let dx = destination.x - existing.x;
      let dy = destination.y - existing.y;
      let distance = Math.hypot(dx, dy);
      if (distance >= cushion) continue;

      if (distance < 0.001) {
        const angle = Math.random() * Math.PI * 2;
        dx = Math.cos(angle);
        dy = Math.sin(angle);
        distance = 1;
      }

      const push = cushion - distance + 2;
      destination.x += dx / distance * push;
      destination.y += dy / distance * push;
      destination.x = Math.max(minX, Math.min(maxX, destination.x));
      destination.y = Math.max(minY, Math.min(maxY, destination.y));
      moved = true;
    }

    if (!moved) break;
  }

  return destination;
}

function shuffleDandelionDaggers(items) {
  for (let index = items.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function createDaggerStormDestinations(box, count) {
  const cornerInnerEdge = 0.16;
  const cornerBounds = [
    { minX: 0.04, maxX: cornerInnerEdge, minY: 0.04, maxY: cornerInnerEdge },
    { minX: 1 - cornerInnerEdge, maxX: 0.96, minY: 0.04, maxY: cornerInnerEdge },
    { minX: 0.04, maxX: cornerInnerEdge, minY: 1 - cornerInnerEdge, maxY: 0.96 },
    { minX: 1 - cornerInnerEdge, maxX: 0.96, minY: 1 - cornerInnerEdge, maxY: 0.96 }
  ];
  const destinations = [];

  for (const bounds of cornerBounds) {
    destinations.push(randomDaggerDestination(box, destinations, bounds));
  }
  while (destinations.length < count) {
    destinations.push(randomDaggerDestination(box, destinations));
  }

  return shuffleDandelionDaggers(destinations);
}

function spawnDaggerStormSet({ box, spawnBullet, playSound, sounds, count, purpleCount }) {
  const remainingCount = count - purpleCount;
  const redCount = Math.floor(remainingCount / 2);
  const colors = shuffleDandelionDaggers([
    ...Array(redCount).fill("red"),
    ...Array(remainingCount - redCount).fill("blue"),
    ...Array(purpleCount).fill("purple")
  ]);
  const destinations = createDaggerStormDestinations(box, count);

  for (let index = 0; index < count; index++) {
    spawnDandelionDagger({
      box,
      spawnBullet,
      playSound,
      sounds,
      color: colors[index],
      destinationX: destinations[index].x,
      destinationY: destinations[index].y,
      pauseFrames: DAGGER_STORM_PAUSE_FRAMES,
      playBlastSound: index === 0
    });
  }
}

function spawnRandomDaggerTrio({ box, spawnBullet, playSound, sounds }) {
  const destinations = [];
  const redDestination = randomDaggerDestination(box, destinations);
  destinations.push(redDestination);
  const blueDestination = randomDaggerDestination(box, destinations);
  destinations.push(blueDestination);
  const thirdDestination = randomDaggerDestination(box, destinations);

  spawnDandelionDagger({
    box,
    spawnBullet,
    playSound,
    sounds,
    color: "red",
    destinationX: redDestination.x,
    destinationY: redDestination.y
  });
  spawnDandelionDagger({
    box,
    spawnBullet,
    playSound,
    sounds,
    color: "blue",
    destinationX: blueDestination.x,
    destinationY: blueDestination.y,
    playBlastSound: false
  });
  spawnDandelionDagger({
    box,
    spawnBullet,
    playSound,
    sounds,
    color: Math.random() < 0.5 ? "red" : "blue",
    destinationX: thirdDestination.x,
    destinationY: thirdDestination.y,
    playBlastSound: false
  });
}

function spawnDandelionNoteWave({ box, spawnBullet, waveIndex }) {
  const targetX = box.x + box.w * (0.15 + Math.random() * 0.7);
  const targetY = box.y + box.h * (0.15 + Math.random() * 0.7);
  const gapAngle = Math.atan2(
    targetY - DANDELION_NOTE_ORIGIN.y,
    targetX - DANDELION_NOTE_ORIGIN.x
  );
  const normalizedGapAngle = gapAngle < 0 ? gapAngle + Math.PI * 2 : gapAngle;
  const cornerAngles = [
    [box.x, box.y],
    [box.x + box.w, box.y],
    [box.x, box.y + box.h],
    [box.x + box.w, box.y + box.h]
  ].map(([x, y]) => {
    const angle = Math.atan2(y - DANDELION_NOTE_ORIGIN.y, x - DANDELION_NOTE_ORIGIN.x);
    return angle < 0 ? angle + Math.PI * 2 : angle;
  });
  const startAngle = Math.min(...cornerAngles) - NOTE_WAVE_EDGE_PADDING;
  const endAngle = Math.max(...cornerAngles) + NOTE_WAVE_EDGE_PADDING;
  const noteCount = Math.floor((endAngle - startAngle) / NOTE_WAVE_ANGLE_STEP) + 1;
  const gapCenterIndex = Math.round(
    (normalizedGapAngle - startAngle) / NOTE_WAVE_ANGLE_STEP
  );
  const halfGap = Math.floor(NOTE_WAVE_GAP_SLOTS / 2);
  const farthestCorner = Math.max(
    ...[
      [box.x, box.y],
      [box.x + box.w, box.y],
      [box.x, box.y + box.h],
      [box.x + box.w, box.y + box.h]
    ].map(([x, y]) => Math.hypot(
      x - DANDELION_NOTE_ORIGIN.x,
      y - DANDELION_NOTE_ORIGIN.y
    ))
  );

  spawnBullet({
    x: DANDELION_NOTE_ORIGIN.x,
    y: DANDELION_NOTE_ORIGIN.y,
    r: 8,
    type: "dandelionNoteWave",
    noteWave: waveIndex,
    noteRadius: 8,
    waveRadius: 10,
    waveSpeed: NOTE_WAVE_SPEED,
    startAngle,
    noteCount,
    gapCenterIndex,
    halfGap,
    noCull: true,
    life: Math.ceil((farthestCorner + 28 - 10) / NOTE_WAVE_SPEED),
    update: ({ bullet }) => {
      bullet.waveRadius = 10 + bullet.age * bullet.waveSpeed;
    }
  });
}

function createDandelionSineRays(box) {
  const targetX = box.x - 24;
  const entryX = box.x + box.w;

  return Array.from({ length: SINE_RAY_COUNT }, (_value, index) => {
    const edgeAnchor = SINE_RAY_COUNT > 1 ? index / (SINE_RAY_COUNT - 1) : null;
    const entryPosition = SINE_RAY_COUNT === 1
      ? -0.11 + Math.random() * 1.22
      : Math.max(-0.11, Math.min(
        1.11,
        edgeAnchor + (Math.random() - 0.5) * 0.22
      ));
    const entryY = box.y + box.h * entryPosition;
    const targetY = DANDELION_NOTE_ORIGIN.y +
      (entryY - DANDELION_NOTE_ORIGIN.y) * (
        (targetX - DANDELION_NOTE_ORIGIN.x) /
        (entryX - DANDELION_NOTE_ORIGIN.x)
      );
    const deltaX = targetX - DANDELION_NOTE_ORIGIN.x;
    const deltaY = targetY - DANDELION_NOTE_ORIGIN.y;
    const pathLength = Math.hypot(deltaX, deltaY);
    const directionX = deltaX / pathLength;
    const directionY = deltaY / pathLength;

    return {
      originX: DANDELION_NOTE_ORIGIN.x,
      originY: DANDELION_NOTE_ORIGIN.y,
      entryX,
      entryY,
      targetX,
      targetY,
      pathLength,
      directionX,
      directionY,
      normalX: -directionY,
      normalY: directionX,
      sinePhase: Math.random() * Math.PI * 2
    };
  });
}

function sinePacketNotePosition(bullet, index) {
  const distance = bullet.distance - index * bullet.noteSpacing;
  const offset = Math.sin(
    distance / bullet.wavelength * Math.PI * 2 + bullet.sinePhase
  ) * bullet.amplitude;

  return {
    distance,
    x: bullet.originX + bullet.directionX * distance + bullet.normalX * offset,
    y: bullet.originY + bullet.directionY * distance + bullet.normalY * offset
  };
}

function dandelionSinePacketLife(ray) {
  const packetLength = (SINE_PACKET_NOTE_COUNT - 1) * SINE_PACKET_NOTE_SPACING;
  return Math.ceil((ray.pathLength + packetLength + 24) / SINE_PACKET_SPEED);
}

function spawnDandelionSineGuide({ spawnBullet, ray, leadFrames }) {
  spawnBullet({
    x: ray.originX,
    y: ray.originY,
    r: 0,
    type: "dandelionSineGuide",
    ...ray,
    harmless: true,
    noCull: true,
    life: leadFrames + dandelionSinePacketLife(ray)
  });
}

function spawnDandelionSinePacket({ spawnBullet, ray, volleyIndex }) {
  spawnBullet({
    x: ray.originX,
    y: ray.originY,
    r: 5,
    type: "dandelionSinePacket",
    ...ray,
    noteCount: SINE_PACKET_NOTE_COUNT,
    noteRadius: 5,
    noteSpacing: SINE_PACKET_NOTE_SPACING,
    speed: SINE_PACKET_SPEED,
    amplitude: SINE_PACKET_AMPLITUDE,
    wavelength: SINE_PACKET_WAVELENGTH,
    sinePhase: ray.sinePhase + volleyIndex * 0.7,
    distance: 0,
    noCull: true,
    life: dandelionSinePacketLife(ray),
    update: ({ bullet }) => {
      bullet.distance = bullet.age * bullet.speed;
      const head = sinePacketNotePosition(bullet, 0);
      bullet.x = head.x;
      bullet.y = head.y;
    }
  });
}

function createDandelionBouncingNoteRay(box) {
  const entryX = box.x + box.w - BOUNCING_NOTE_RADIUS;
  const edgePadding = BOUNCING_NOTE_RADIUS + 10;
  const entryY = box.y + edgePadding +
    Math.random() * Math.max(1, box.h - edgePadding * 2);
  const deltaX = entryX - DANDELION_NOTE_ORIGIN.x;
  const deltaY = entryY - DANDELION_NOTE_ORIGIN.y;
  const pathLength = Math.hypot(deltaX, deltaY);
  return {
    originX: DANDELION_NOTE_ORIGIN.x,
    originY: DANDELION_NOTE_ORIGIN.y,
    entryX,
    entryY,
    pathLength,
    directionX: deltaX / pathLength,
    directionY: deltaY / pathLength
  };
}

function spawnDandelionBouncingNoteGuide({ spawnBullet, ray }) {
  spawnBullet({
    x: ray.originX,
    y: ray.originY,
    r: 0,
    type: "dandelionBouncingNoteGuide",
    ...ray,
    harmless: true,
    noCull: true,
    life: BOUNCING_NOTE_WARNING_FRAMES
  });
}

function spawnDandelionBouncingNote({ box, spawnBullet, ray, launchIndex, life }) {
  const colors = ["#ffe680", "#ffaddf", "#9edcff"];
  spawnBullet({
    x: ray.originX,
    y: ray.originY,
    vx: ray.directionX * BOUNCING_NOTE_SPEED,
    vy: ray.directionY * BOUNCING_NOTE_SPEED,
    r: BOUNCING_NOTE_RADIUS,
    type: "dandelionBouncingNote",
    noteColor: colors[launchIndex % colors.length],
    enteredArena: false,
    bounceCount: 0,
    noCull: true,
    life,
    update: ({ bullet }) => {
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;

      const left = box.x + bullet.r;
      const right = box.x + box.w - bullet.r;
      const top = box.y + bullet.r;
      const bottom = box.y + box.h - bullet.r;
      if (!bullet.enteredArena) {
        if (bullet.x > right) return;
        bullet.enteredArena = true;
      }

      if (bullet.x < left) {
        bullet.x = left + (left - bullet.x);
        bullet.vx = Math.abs(bullet.vx);
        bullet.bounceCount++;
      } else if (bullet.x > right) {
        bullet.x = right - (bullet.x - right);
        bullet.vx = -Math.abs(bullet.vx);
        bullet.bounceCount++;
      }
      if (bullet.y < top) {
        bullet.y = top + (top - bullet.y);
        bullet.vy = Math.abs(bullet.vy);
        bullet.bounceCount++;
      } else if (bullet.y > bottom) {
        bullet.y = bottom - (bullet.y - bottom);
        bullet.vy = -Math.abs(bullet.vy);
        bullet.bounceCount++;
      }
    }
  });
}

function arpeggioStartPlatformY(box) {
  return box.y + box.h - 70;
}

function arpeggioGoalPosition(box) {
  return { x: box.x + box.w / 2, y: box.y + 32 };
}

function arpeggioPlatformDestination(box, index, startsLeft) {
  const startY = arpeggioStartPlatformY(box);
  const goal = arpeggioGoalPosition(box);
  const progress = (index + 1) / (ARPEGGIO_PLATFORM_COUNT + 1);
  const left = startsLeft ? index % 2 === 0 : index % 2 !== 0;
  return {
    x: box.x + (left ? 34 : box.w - 34),
    y: startY + (goal.y - startY) * progress
  };
}

function spawnArpeggioStarterPlatform({
  box,
  state,
  spawnBullet,
  gold,
  placeSoul = false,
  decayAt = null
}) {
  const platformY = arpeggioStartPlatformY(box);
  const fadeStart = ARPEGGIO_START_PLATFORM_LIFE - ARPEGGIO_START_PLATFORM_FADE_FRAMES;
  const platform = spawnBullet({
    x: box.x + box.w / 2,
    y: platformY,
    r: 0,
    width: 64,
    height: 10,
    type: "dandelionStarterPlatform",
    platformColor: gold ? "gold" : "white",
    arpeggioStarterPlatform: true,
    harmless: true,
    solidPlatform: true,
    noCull: true,
    disintegrationProgress: 0,
    arpeggioDecayAt: gold ? decayAt : null,
    arpeggioDecayAge: 0,
    life: gold
      ? ARPEGGIO_ATTACK_DURATION + ARPEGGIO_START_PLATFORM_LIFE + 1
      : ARPEGGIO_START_PLATFORM_LIFE,
    update: ({ bullet }) => {
      let platformAge = bullet.age;
      if (gold) {
        if (
          !Number.isFinite(bullet.arpeggioDecayAt) ||
          state.enemyTimer < bullet.arpeggioDecayAt
        ) {
          bullet.disintegrationProgress = 0;
          bullet.solidPlatform = true;
          return;
        }
        bullet.arpeggioDecayAge++;
        platformAge = bullet.arpeggioDecayAge;
      }
      bullet.disintegrationProgress = Math.max(
        0,
        Math.min(
          1,
          (platformAge - fadeStart) / ARPEGGIO_START_PLATFORM_FADE_FRAMES
        )
      );
      bullet.solidPlatform = platformAge < ARPEGGIO_START_PLATFORM_LIFE - 1;
      if (gold && !bullet.solidPlatform) bullet.life = Math.min(bullet.life, 1);
    }
  });

  if (placeSoul) {
    state.soul.x = platform.x;
    state.soul.y = platform.y - state.soul.r;
    state.soul.vy = 0;
    state.soul.pitBounce = false;
  }
  return platform;
}

function spawnArpeggioGoalNote({ box, spawnBullet, stage }) {
  const goal = arpeggioGoalPosition(box);
  return spawnBullet({
    x: goal.x,
    y: goal.y,
    r: 0,
    type: "dandelionArpeggioGoalNote",
    noteRadius: ARPEGGIO_GOAL_NOTE_RADIUS,
    arpeggioStage: stage,
    collected: false,
    particles: [],
    harmless: true,
    noCull: true,
    life: ARPEGGIO_ATTACK_DURATION + 1,
    update: ({ bullet }) => {
      for (const particle of bullet.particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.94;
        particle.vy *= 0.94;
        particle.life--;
      }
      bullet.particles = bullet.particles.filter(({ life: particleLife }) => particleLife > 0);
    }
  });
}

function setupArpeggioClimb({ box, state, spawnBullet }) {
  const spikeHeight = 22;
  state.encounter.dandelionArpeggioClimb = {
    stage: 0,
    stageStart: 20,
    stagePrepared: false,
    startsLeft: false,
    goalBullet: null,
    pendingGoldPlatform: false,
    completed: false,
    spikeTop: box.y + box.h - spikeHeight
  };
  spawnBullet({
    x: box.x + box.w / 2,
    y: box.y + box.h - spikeHeight,
    r: 0,
    width: box.w,
    height: spikeHeight,
    type: "spikeFloor",
    superBounce: true,
    bounceVelocity: WHITE_DAGGER_REBOUND_VELOCITY,
    noCull: true,
    life: ARPEGGIO_ATTACK_DURATION + 1
  });
  spawnArpeggioStarterPlatform({ box, state, spawnBullet, gold: false, placeSoul: true });
}

function updateArpeggioClimbPattern({ t, box, state, spawnBullet, playSound, sounds }) {
  const climb = state.encounter.dandelionArpeggioClimb;
  if (!climb) return;

  if (climb.pendingGoldPlatform) {
    spawnArpeggioStarterPlatform({
      box,
      state,
      spawnBullet,
      gold: true,
      decayAt: climb.completed ? null : climb.stageStart
    });
    climb.pendingGoldPlatform = false;
  }
  if (climb.completed || t < climb.stageStart) return;

  if (!climb.stagePrepared) {
    climb.stagePrepared = true;
    climb.startsLeft = Math.random() < 0.5;
    climb.goalBullet = spawnArpeggioGoalNote({ box, spawnBullet, stage: climb.stage });
  }

  const windupIndex = Array.from({ length: ARPEGGIO_PLATFORM_COUNT }, (_value, index) => index)
    .find((index) => {
      const windupAt = climb.stageStart + index * ARPEGGIO_DAGGER_INTERVAL;
      const elapsed = t - windupAt;
      return elapsed >= 0 && elapsed <= THROW_WINDUP_FRAMES;
    });
  if (!Number.isInteger(windupIndex)) return;
  const windupAt = climb.stageStart + windupIndex * ARPEGGIO_DAGGER_INTERVAL;
  if (!updateDandelionThrowWindup({ t, state, windupAt })) return;

  spawnDandelionWhiteDaggerPlatform({
    box,
    state,
    spawnBullet,
    playSound,
    sounds,
    destination: arpeggioPlatformDestination(box, windupIndex, climb.startsLeft)
  });
}

function chooseDandelionDaggerPlatformDestination(box, state) {
  const previous = state.encounter.dandelionLastPlatformDestination || {
    x: box.x + box.w / 2,
    y: box.y + box.h - 70
  };
  const minX = box.x + 34;
  const maxX = box.x + box.w - 34;
  const minY = box.y + 70;
  const maxY = box.y + box.h - 58;

  for (let attempt = 0; attempt < 12; attempt++) {
    const destination = {
      x: minX + Math.random() * (maxX - minX),
      y: minY + Math.random() * (maxY - minY)
    };
    const dx = destination.x - previous.x;
    const dy = destination.y - previous.y;
    if (Math.hypot(dx, dy) >= 48 && Math.abs(dx) <= 135 && Math.abs(dy) <= 80) {
      return destination;
    }
  }

  return {
    x: previous.x < box.x + box.w / 2 ? box.x + box.w * 0.72 : box.x + box.w * 0.28,
    y: box.y + 95 + Math.random() * 45
  };
}

function spawnDandelionStarterPlatform({ box, state, spawnBullet }) {
  const spikeHeight = 22;
  const spikeTop = box.y + box.h - spikeHeight;
  const platformY = spikeTop - 48;
  const platformLife = 114;
  const fadeStart = platformLife - 38;

  spawnBullet({
    x: box.x + box.w / 2,
    y: platformY,
    r: 0,
    width: 58,
    height: 10,
    type: "dandelionStarterPlatform",
    harmless: true,
    solidPlatform: true,
    noCull: true,
    disintegrationProgress: 0,
    life: platformLife,
    update: ({ bullet }) => {
      bullet.disintegrationProgress = Math.max(
        0,
        Math.min(1, (bullet.age - fadeStart) / (platformLife - fadeStart))
      );
      bullet.solidPlatform = bullet.age < platformLife - 1;
    }
  });

  state.encounter.dandelionLastPlatformDestination = {
    x: box.x + box.w / 2,
    y: platformY
  };
  state.soul.x = box.x + box.w / 2;
  state.soul.y = platformY - state.soul.r;
  state.soul.vy = 0;
  state.soul.pitBounce = false;
}

function spawnDandelionWhiteDaggerPlatform({
  box,
  state,
  spawnBullet,
  playSound,
  sounds,
  destination = null
}) {
  if (!destination) destination = chooseDandelionDaggerPlatformDestination(box, state);
  state.encounter.dandelionLastPlatformDestination = destination;

  const startX = DANDELION_NOTE_ORIGIN.x;
  const startY = DANDELION_NOTE_ORIGIN.y;
  const controlX = (startX + destination.x) / 2;
  const controlY = Math.min(startY, destination.y) - 68;

  spawnBullet({
    x: startX,
    y: startY,
    r: 0,
    type: "dandelionWhiteDaggerPlatform",
    harmless: true,
    solidPlatform: false,
    noCull: true,
    angle: 0,
    disintegrationProgress: 0,
    life: WHITE_DAGGER_FLIGHT_FRAMES + WHITE_DAGGER_PLATFORM_FRAMES + 1,
    update: ({ bullet }) => {
      if (bullet.age <= WHITE_DAGGER_FLIGHT_FRAMES) {
        const progress = Math.min(1, bullet.age / WHITE_DAGGER_FLIGHT_FRAMES);
        const inverse = 1 - progress;
        bullet.x = inverse * inverse * startX + 2 * inverse * progress * controlX +
          progress * progress * destination.x;
        bullet.y = inverse * inverse * startY + 2 * inverse * progress * controlY +
          progress * progress * destination.y;

        const tangentX = 2 * inverse * (controlX - startX) +
          2 * progress * (destination.x - controlX);
        const tangentY = 2 * inverse * (controlY - startY) +
          2 * progress * (destination.y - controlY);
        bullet.angle = Math.atan2(tangentY, tangentX) + progress * Math.PI * 6;
        return;
      }

      const platformAge = bullet.age - WHITE_DAGGER_FLIGHT_FRAMES;
      if (!bullet.expansionSoundPlayed) {
        bullet.expansionSoundPlayed = true;
        playSound?.(sounds?.scissorbell);
      }
      const expandProgress = Math.min(1, platformAge / WHITE_DAGGER_EXPAND_FRAMES);
      bullet.x = destination.x;
      bullet.y = destination.y;
      bullet.angle = 0;
      bullet.width = 34 + (WHITE_DAGGER_PLATFORM_WIDTH - 34) * expandProgress;
      bullet.height = 9;
      bullet.solidPlatform = platformAge <= WHITE_DAGGER_PLATFORM_FRAMES;
      bullet.disintegrationProgress = Math.max(
        0,
        Math.min(
          1,
          (platformAge - (
            WHITE_DAGGER_PLATFORM_FRAMES - WHITE_DAGGER_DISINTEGRATE_FRAMES + 1
          )) /
            WHITE_DAGGER_DISINTEGRATE_FRAMES
        )
      );
    }
  });
}

function dandelionDefeatLineAt(timer) {
  return DANDELION_DEFEAT_LINES.find(({ start, end }) => timer >= start && timer < end) || null;
}

function syncDandelionDefeatDialog(state, dissolve, timer) {
  const ending = state.encounter.dandelionGenocideEnding;
  const line = dandelionDefeatLineAt(timer);
  const lineKey = line ? `${line.start}:${line.text}` : "";
  if (ending.dialogueKey === lineKey) {
    if (line) state.enemyDialogTimer++;
    return;
  }

  ending.dialogueKey = lineKey;
  state.enemyDialogMessage = line?.text || "";
  state.enemyDialogTimer = 0;
  dissolve.speechSpriteKey = line?.speaker || "enemy";
}

function beginDandelionGenocideEnding({ state, dissolve }) {
  state.encounter.dandelionGenocideEnding = {
    dialogueKey: null,
    fallSoundPlayed: false,
    impactTriggered: false,
    particleSoundPlayed: false,
    glitchSoundPlayed: false,
    particles: []
  };
  dissolve.spriteKey = "enemy";
  dissolve.speechSpriteKey = "enemy";
  syncDandelionDefeatDialog(state, dissolve, 0);
}

function spawnDandelionDefeatParticles(ending) {
  const colors = ["#f0447d", "#ff8fae", "#7a3f2d", "#c8753d", "#2b1d24"];
  for (let index = 0; index < 58; index++) {
    const life = 54 + Math.floor(Math.random() * 42);
    ending.particles.push({
      x: 718 + Math.random() * 154,
      y: 292 + Math.random() * 26,
      vx: (Math.random() - 0.5) * 2.8,
      vy: -0.8 - Math.random() * 2.2,
      drift: (Math.random() - 0.5) * 0.025,
      life,
      maxLife: life,
      size: 2 + Math.floor(Math.random() * 4),
      color: colors[index % colors.length]
    });
  }
}

function updateDandelionGenocideEnding({ state, dissolve, timer, sounds, playSound }) {
  const ending = state.encounter.dandelionGenocideEnding;
  if (!ending) return;

  syncDandelionDefeatDialog(state, dissolve, timer);

  if (!ending.fallSoundPlayed && timer >= DANDELION_DEFEAT_TIMELINE.dropStart) {
    ending.fallSoundPlayed = true;
    playSound?.(sounds?.fall);
  }

  if (!ending.impactTriggered && timer >= DANDELION_DEFEAT_TIMELINE.impact) {
    ending.impactTriggered = true;
    state.shake = Math.max(state.shake, 12);
  }

  if (!ending.particleSoundPlayed && timer >= DANDELION_DEFEAT_TIMELINE.particleStart) {
    ending.particleSoundPlayed = true;
    spawnDandelionDefeatParticles(ending);
    playSound?.(sounds?.vaporized);
  }

  for (const particle of ending.particles) {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vx += particle.drift;
    particle.vy -= 0.008;
    particle.life--;
  }
  ending.particles = ending.particles.filter(({ life }) => life > 0);

  if (!ending.glitchSoundPlayed && timer >= DANDELION_DEFEAT_TIMELINE.glitchStart) {
    ending.glitchSoundPlayed = true;
    playSound?.(sounds?.glitch1);
  }
}

function advanceDandelionGenocideEnding({ state, dissolve, timer }) {
  const line = dandelionDefeatLineAt(timer);
  if (!line) return false;
  dissolve.timer = line.end;
  state.enemyDialogMessage = "";
  state.enemyDialogTimer = 0;
  return true;
}

function drawDandelionDefeatParticles(ctx, particles, clamp) {
  for (const particle of particles) {
    ctx.save();
    ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    ctx.restore();
  }
}

function drawDandelionDefeatSableGlitch({
  ctx, sprite, x, y, size, spriteKey, timer, clamp, drawPositionedEnemyBody
}) {
  const progress = clamp(
    (timer - DANDELION_DEFEAT_TIMELINE.glitchStart) /
      (DANDELION_DEFEAT_TIMELINE.end - DANDELION_DEFEAT_TIMELINE.glitchStart),
    0,
    1
  );
  const alpha = 1 - progress;
  const jitter = Math.floor(timer / 2) % 2 === 0 ? -Math.ceil(progress * 5) : Math.ceil(progress * 5);

  ctx.save();
  ctx.globalAlpha = alpha;
  drawPositionedEnemyBody(ctx, sprite, x + jitter, y - jitter, size, spriteKey);
  ctx.restore();

  const sliceCount = 4 + Math.floor(progress * 7);
  for (let index = 0; index < sliceCount; index++) {
    const sliceY = y + ((timer * (3 + index) + index * 17) % Math.max(1, size - 3));
    const sliceHeight = 1 + index % 4;
    const direction = index % 2 === 0 ? -1 : 1;
    const shift = direction * (3 + Math.floor(progress * 22));

    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 72, sliceY, size + 144, sliceHeight);
    ctx.clip();
    ctx.globalAlpha = 0.86 * alpha;
    drawPositionedEnemyBody(ctx, sprite, x + shift, y, size, spriteKey);
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = index % 2 === 0 ? "#22d8ff" : "#ff2bd6";
    ctx.globalAlpha = 0.32 * alpha;
    ctx.fillRect(x - 72 + Math.max(0, shift), sliceY, size + 144 - Math.abs(shift), 1);
    ctx.restore();
  }
}

function drawDandelionGenocideEnding({
  ctx, state, timer, clamp, lerp, easeInOutCubic,
  drawPositionedEnemyBody, enemySpriteForKey, enemySpritePosition, enemySpriteSize
}) {
  const ending = state.encounter.dandelionGenocideEnding;
  if (!ending) return;

  const defaultKey = "enemy";
  const downKey = "down";
  const sableKey = "sableSit";
  const defaultSize = enemySpriteSize(defaultKey);
  const defaultPosition = enemySpritePosition(defaultSize, defaultKey);
  const downSize = enemySpriteSize(downKey);
  const downPosition = enemySpritePosition(downSize, downKey);
  const sableSize = enemySpriteSize(sableKey);
  const sablePosition = enemySpritePosition(sableSize, sableKey);
  const sableSprite = enemySpriteForKey(sableKey);

  if (timer < DANDELION_DEFEAT_TIMELINE.impact) {
    drawPositionedEnemyBody(
      ctx,
      enemySpriteForKey(defaultKey),
      defaultPosition.x,
      defaultPosition.y,
      defaultSize,
      defaultKey
    );
  } else if (timer < DANDELION_DEFEAT_TIMELINE.particleEnd) {
    const fade = clamp(
      (timer - DANDELION_DEFEAT_TIMELINE.particleStart) /
        (DANDELION_DEFEAT_TIMELINE.particleEnd - DANDELION_DEFEAT_TIMELINE.particleStart),
      0,
      1
    );
    ctx.save();
    ctx.globalAlpha = 1 - fade;
    drawPositionedEnemyBody(
      ctx,
      enemySpriteForKey(downKey),
      downPosition.x,
      downPosition.y,
      downSize,
      downKey
    );
    ctx.restore();
    drawDandelionDefeatParticles(ctx, ending.particles, clamp);
  }

  if (timer < DANDELION_DEFEAT_TIMELINE.dropStart) return;

  const dropProgress = clamp(
    (timer - DANDELION_DEFEAT_TIMELINE.dropStart) /
      (DANDELION_DEFEAT_TIMELINE.impact - DANDELION_DEFEAT_TIMELINE.dropStart),
    0,
    1
  );
  const sableY = lerp(-sableSize - 20, sablePosition.y, easeInOutCubic(dropProgress));

  if (timer >= DANDELION_DEFEAT_TIMELINE.glitchStart) {
    drawDandelionDefeatSableGlitch({
      ctx,
      sprite: sableSprite,
      x: sablePosition.x,
      y: sablePosition.y,
      size: sableSize,
      spriteKey: sableKey,
      timer,
      clamp,
      drawPositionedEnemyBody
    });
    return;
  }

  drawPositionedEnemyBody(
    ctx,
    sableSprite,
    sablePosition.x,
    sableY,
    sableSize,
    sableKey
  );
}

const DANDELION_GENOCIDE_DEFEAT_SEQUENCE = Object.freeze({
  duration: DANDELION_DEFEAT_TIMELINE.end,
  initialSprite: "enemy",
  setup: beginDandelionGenocideEnding,
  update: updateDandelionGenocideEnding,
  advance: advanceDandelionGenocideEnding,
  draw: drawDandelionGenocideEnding
});

function createDandelionRuntime({
  ctx,
  state,
  sounds,
  playSound,
  playMusic,
  stopMusic,
  setMusicVolume,
  drawHeartShape,
  width = 900,
  height = 650
}) {
  const noteSpriteCache = new Map();
  let dreamCloudPuffSprite = null;

  function cachedDreamCloudPuffSprite() {
    if (dreamCloudPuffSprite) return dreamCloudPuffSprite;
    if (typeof document === "undefined") return null;
    const sprite = document.createElement("canvas");
    const spriteCtx = sprite.getContext("2d");
    sprite.width = 28;
    sprite.height = 28;
    spriteCtx.fillStyle = "#fff";
    spriteCtx.shadowColor = "#fff";
    spriteCtx.shadowBlur = 7;
    spriteCtx.beginPath();
    spriteCtx.arc(14, 14, 6.5, 0, Math.PI * 2);
    spriteCtx.fill();
    dreamCloudPuffSprite = sprite;
    return sprite;
  }

  function cachedNoteSprite(color) {
    if (noteSpriteCache.has(color)) return noteSpriteCache.get(color);
    if (typeof document === "undefined") return null;

    const sprite = document.createElement("canvas");
    const spriteCtx = sprite.getContext("2d");
    sprite.width = 28;
    sprite.height = 28;
    spriteCtx.translate(14, 14);
    spriteCtx.fillStyle = color;
    spriteCtx.strokeStyle = "#fff9df";
    spriteCtx.lineWidth = 1.2;
    spriteCtx.shadowColor = color;
    spriteCtx.shadowBlur = 5;

    spriteCtx.beginPath();
    spriteCtx.ellipse(-2.5, 3.5, 4.5, 3.5, -0.25, 0, Math.PI * 2);
    spriteCtx.fill();
    spriteCtx.stroke();
    spriteCtx.fillRect(1, -7, 2.5, 11);
    spriteCtx.beginPath();
    spriteCtx.moveTo(3, -7);
    spriteCtx.quadraticCurveTo(9, -5, 7.5, 0);
    spriteCtx.quadraticCurveTo(7, -2.5, 3, -3);
    spriteCtx.closePath();
    spriteCtx.fill();
    spriteCtx.stroke();

    noteSpriteCache.set(color, sprite);
    return sprite;
  }

  function noteWaveCollision({ soul, bullet }) {
    if (bullet.type === "dandelionSinePacket") {
      const noteRadius = bullet.noteRadius || 5;
      const collisionRadius = soul.r + noteRadius;
      const grazeRadius = soul.r + noteRadius + 14;
      let nearestDistanceSquared = Infinity;

      for (let index = 0; index < bullet.noteCount; index++) {
        const note = sinePacketNotePosition(bullet, index);
        if (note.distance < 0 || note.distance > bullet.pathLength) continue;
        const dx = soul.x - note.x;
        const dy = soul.y - note.y;
        nearestDistanceSquared = Math.min(nearestDistanceSquared, dx * dx + dy * dy);
      }

      return {
        collides: nearestDistanceSquared < collisionRadius * collisionRadius * 0.78,
        grazes: nearestDistanceSquared < grazeRadius * grazeRadius
      };
    }

    if (bullet.type !== "dandelionNoteWave") return null;

    const dx = soul.x - bullet.x;
    const dy = soul.y - bullet.y;
    const soulRadius = Math.hypot(dx, dy);
    const noteRadius = bullet.noteRadius || 8;
    const grazeRadius = soul.r + 18 + noteRadius;

    if (Math.abs(soulRadius - bullet.waveRadius) > grazeRadius) {
      return { collides: false, grazes: false };
    }

    let soulAngle = Math.atan2(dy, dx);
    if (soulAngle < 0) soulAngle += Math.PI * 2;
    const nearestIndex = Math.round(
      (soulAngle - bullet.startAngle) / NOTE_WAVE_ANGLE_STEP
    );
    let nearestDistanceSquared = Infinity;

    for (let index = nearestIndex - 4; index <= nearestIndex + 4; index++) {
      if (index < 0 || index > bullet.noteCount) continue;
      if (Math.abs(index - bullet.gapCenterIndex) <= bullet.halfGap) continue;

      const angle = bullet.startAngle + index * NOTE_WAVE_ANGLE_STEP;
      const noteX = bullet.x + Math.cos(angle) * bullet.waveRadius;
      const noteY = bullet.y + Math.sin(angle) * bullet.waveRadius;
      const noteDx = soul.x - noteX;
      const noteDy = soul.y - noteY;
      nearestDistanceSquared = Math.min(
        nearestDistanceSquared,
        noteDx * noteDx + noteDy * noteDy
      );
    }

    const collisionRadius = soul.r + noteRadius;
    return {
      collides: nearestDistanceSquared < collisionRadius * collisionRadius * 0.72,
      grazes: nearestDistanceSquared < grazeRadius * grazeRadius
    };
  }

  function dreamDarkness(timer) {
    return Math.max(0, Math.min(
      1,
      (timer - DREAM_FADE_START) / (DREAM_FADE_END - DREAM_FADE_START)
    ));
  }

  function drawDandelionDreamHudDistortion() {
    const dream = state?.encounter?.dandelionDreamAttack;
    if (!dream) return;

    const darkness = dreamDarkness(dream.timer);
    if (darkness > 0) {
      ctx.save();
      ctx.globalAlpha = darkness;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

  }

  function updateDandelionDreamDefenseMechanic() {
    const dream = state?.encounter?.dandelionDreamAttack;
    if (!dream) return;
    if (dream.shieldFlash > 0) dream.shieldFlash--;
    if (dream.speedMessageTimer > 0) dream.speedMessageTimer--;
    for (const impact of dream.shieldImpacts) impact.age++;
    dream.shieldImpacts = dream.shieldImpacts.filter(({ age, life }) => age < life);
    for (const particle of dream.musicNoteParticles) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vx *= 0.94;
      particle.vy *= 0.94;
      particle.life--;
    }
    dream.musicNoteParticles = dream.musicNoteParticles.filter(({ life }) => life > 0);
  }

  function collectDreamMusicNotes(dream, radius) {
    for (const note of dream.musicNotes) {
      if (note.collected) continue;
      if (Math.hypot(dream.dreamX - note.x, dream.dreamY - note.y) >
        radius + DREAM_MUSIC_NOTE_RADIUS) continue;

      note.collected = true;
      note.collectedAt = dream.timer;
      dream.speedMultiplier *= 1.1;
      dream.speedMessageTimer = DREAM_SPEED_MESSAGE_FRAMES;
      for (let index = 0; index < 14; index++) {
        const angle = index / 14 * Math.PI * 2 + Math.random() * 0.18;
        const speed = 1.1 + Math.random() * 2.2;
        dream.musicNoteParticles.push({
          x: note.x,
          y: note.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 24 + Math.floor(Math.random() * 13),
          maxLife: 36,
          size: 2 + index % 3
        });
      }
      playSound?.(sounds?.itemUse);
    }
  }

  function moveDreamHeartAlongAxis(dream, axis, from, destination, fixed, radius) {
    const walls = [...dream.cloudCage, ...dream.cloudWalls];
    let resolved = destination;
    const movingPositive = destination > from;
    const movingNegative = destination < from;

    for (const wall of walls) {
      const left = Math.min(wall.x1, wall.x2) - DREAM_CLOUD_WALL_THICKNESS / 2 - radius;
      const right = Math.max(wall.x1, wall.x2) + DREAM_CLOUD_WALL_THICKNESS / 2 + radius;
      const top = Math.min(wall.y1, wall.y2) - DREAM_CLOUD_WALL_THICKNESS / 2 - radius;
      const bottom = Math.max(wall.y1, wall.y2) + DREAM_CLOUD_WALL_THICKNESS / 2 + radius;
      const fixedInside = axis === "x"
        ? fixed > top && fixed < bottom
        : fixed > left && fixed < right;
      if (!fixedInside) continue;

      const nearEdge = axis === "x" ? left : top;
      const farEdge = axis === "x" ? right : bottom;
      if (movingPositive && from <= nearEdge && resolved > nearEdge) {
        resolved = Math.min(resolved, nearEdge);
      } else if (movingNegative && from >= farEdge && resolved < farEdge) {
        resolved = Math.max(resolved, farEdge);
      }
    }
    return resolved;
  }

  function moveDandelionDreamSoul({ state: currentState, input: soulInput }) {
    const dream = currentState.encounter.dandelionDreamAttack;
    if (!dream) return false;
    if (dream.timer < DREAM_ACTIVE_FRAME) return true;

    let dx = (soulInput.right ? 1 : 0) - (soulInput.left ? 1 : 0);
    let dy = (soulInput.down ? 1 : 0) - (soulInput.up ? 1 : 0);
    if (dx && dy) {
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }

    const radius = currentState.soul.r;
    let nextX = Math.max(
      currentState.box.x + radius,
      Math.min(
        currentState.box.x + currentState.box.w - radius,
        dream.dreamX + dx * DREAM_HEART_SPEED * dream.speedMultiplier
      )
    );
    let nextY = Math.max(
      currentState.box.y + radius,
      Math.min(
        currentState.box.y + currentState.box.h - radius,
        dream.dreamY + dy * DREAM_HEART_SPEED * dream.speedMultiplier
      )
    );

    nextX = moveDreamHeartAlongAxis(dream, "x", dream.dreamX, nextX, dream.dreamY, radius);
    nextY = moveDreamHeartAlongAxis(dream, "y", dream.dreamY, nextY, nextX, radius);

    dream.dreamX = nextX;
    dream.dreamY = nextY;
    collectDreamMusicNotes(dream, radius);
    return true;
  }

  function drawDreamCloudBorder(box, timer) {
    ctx.save();
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 7;
    ctx.globalAlpha = 0.2;
    const phase = timer * 0.035;

    for (let x = box.x; x <= box.x + box.w; x += 22) {
      const wobble = Math.sin(phase + x * 0.04) * 2;
      for (const y of [box.y, box.y + box.h]) {
        ctx.beginPath();
        ctx.arc(x, y + wobble, 7 + Math.sin(phase + x) * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (let y = box.y + 16; y < box.y + box.h; y += 22) {
      const wobble = Math.cos(phase + y * 0.04) * 2;
      for (const x of [box.x, box.x + box.w]) {
        ctx.beginPath();
        ctx.arc(x + wobble, y, 7 + Math.cos(phase + y) * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawDreamCloudWalls(walls, timer, alpha) {
    if (!walls?.length || alpha <= 0) return;
    const phase = timer * 0.045;
    const puffSprite = cachedDreamCloudPuffSprite();

    ctx.save();
    ctx.globalAlpha = alpha * 0.26;
    ctx.strokeStyle = "#fff";
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 9;
    ctx.lineWidth = DREAM_CLOUD_WALL_THICKNESS;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (const wall of walls) {
      ctx.moveTo(wall.x1, wall.y1);
      ctx.lineTo(wall.x2, wall.y2);
    }
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = alpha * 0.78;
    ctx.fillStyle = "#fff";
    for (const wall of walls) {
      const dx = wall.x2 - wall.x1;
      const dy = wall.y2 - wall.y1;
      const length = Math.hypot(dx, dy);
      const pieces = Math.max(1, Math.ceil(length / 11));
      for (let index = 0; index <= pieces; index++) {
        const progress = index / pieces;
        const wobble = Math.sin(phase + index * 1.7 + wall.x1 * 0.03 + wall.y1 * 0.02) * 1.8;
        const x = wall.x1 + dx * progress + (wall.horizontal ? 0 : wobble);
        const y = wall.y1 + dy * progress + (wall.horizontal ? wobble : 0);
        const scale = 0.82 + Math.sin(phase * 1.3 + index * 2.1) * 0.12;
        if (puffSprite) {
          const size = 28 * scale;
          ctx.drawImage(puffSprite, x - size / 2, y - size / 2, size, size);
        } else {
          ctx.beginPath();
          ctx.arc(x, y, 6.5 * scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  function drawDreamMusicNotes(dream, alpha) {
    const phase = dream.timer * 0.075;
    for (const note of dream.musicNotes) {
      if (note.collected) continue;
      ctx.save();
      ctx.translate(note.x, note.y);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#ffd34d";
      ctx.strokeStyle = "#fff0a6";
      ctx.shadowColor = "#ffb000";
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(-3, 6, 6, 4.5, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(2, 5);
      ctx.lineTo(2, -12);
      ctx.quadraticCurveTo(12, -9, 9, -1);
      ctx.stroke();

      ctx.fillStyle = "#fff1a6";
      ctx.shadowBlur = 6;
      for (let index = 0; index < 4; index++) {
        const angle = phase + index * Math.PI / 2 + note.cell * 0.7;
        const orbit = 14 + Math.sin(phase * 1.4 + index) * 2;
        const size = 1.5 + (index % 2) * 0.8;
        ctx.fillRect(
          Math.cos(angle) * orbit - size / 2,
          Math.sin(angle) * orbit - size / 2,
          size,
          size
        );
      }
      ctx.restore();
    }

    for (const particle of dream.musicNoteParticles) {
      ctx.save();
      ctx.globalAlpha = alpha * Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = "#ffc43d";
      ctx.shadowColor = "#ffb000";
      ctx.shadowBlur = 7;
      ctx.fillRect(
        particle.x - particle.size / 2,
        particle.y - particle.size / 2,
        particle.size,
        particle.size
      );
      ctx.restore();
    }
  }

  function drawDreamBubble(dream) {
    const timer = dream.timer;
    if (timer < DREAM_BUBBLE_START || timer >= DREAM_ACTIVE_FRAME) return;
    const grow = Math.min(1, (timer - DREAM_BUBBLE_START) / 22);
    const easedGrow = 1 - Math.pow(1 - grow, 3);
    const fade = timer < DREAM_BUBBLE_FADE_START
      ? 1
      : Math.max(0, 1 - (timer - DREAM_BUBBLE_FADE_START) /
        (DREAM_ACTIVE_FRAME - DREAM_BUBBLE_FADE_START));
    const centerX = dream.sleepingX;
    const centerY = dream.sleepingY - 50 + Math.sin(timer * 0.08) * 1.5;
    const breathe = 1 + Math.sin(timer * 0.11) * 0.018;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(easedGrow * breathe, easedGrow * breathe);
    ctx.globalAlpha = fade;
    ctx.shadowColor = "#ff86d4";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "rgba(255, 118, 207, 0.16)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 51, 36, 0, 0, Math.PI * 2);
    ctx.fill();

    const cloudGradient = ctx.createRadialGradient?.(-13, -13, 3, 0, 2, 49);
    if (cloudGradient?.addColorStop) {
      cloudGradient.addColorStop(0, "rgba(255,255,255,0.95)");
      cloudGradient.addColorStop(0.58, "rgba(255,225,247,0.88)");
      cloudGradient.addColorStop(1, "rgba(239,154,218,0.72)");
      ctx.fillStyle = cloudGradient;
    } else {
      ctx.fillStyle = "#ffe1f6";
    }
    ctx.strokeStyle = "#ff92d4";
    ctx.lineWidth = 2.2;
    ctx.shadowBlur = 11;
    ctx.beginPath();
    ctx.moveTo(-40, 12);
    ctx.bezierCurveTo(-51, 5, -48, -9, -36, -14);
    ctx.bezierCurveTo(-39, -26, -24, -34, -12, -27);
    ctx.bezierCurveTo(-4, -41, 17, -40, 24, -25);
    ctx.bezierCurveTo(40, -27, 51, -13, 45, 0);
    ctx.bezierCurveTo(53, 9, 44, 23, 31, 23);
    ctx.bezierCurveTo(18, 32, 0, 30, -10, 23);
    ctx.bezierCurveTo(-25, 31, -44, 25, -40, 12);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.globalAlpha = fade * 0.52;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-27, -14);
    ctx.bezierCurveTo(-14, -29, 8, -31, 25, -18);
    ctx.stroke();

    for (let index = 0; index < 6; index++) {
      const angle = index / 6 * Math.PI * 2 + timer * 0.025;
      const twinkle = 0.35 + Math.sin(timer * 0.16 + index * 1.9) * 0.25;
      ctx.globalAlpha = fade * twinkle;
      ctx.fillStyle = index % 2 ? "#fff" : "#ffd0ef";
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * 31, Math.sin(angle) * 18, 1.2 + index % 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    const tailPuffs = [[-12, 28, 7], [-7, 39, 4.8], [-3, 48, 2.8]];
    for (const [index, [offsetX, offsetY, radius]] of tailPuffs.entries()) {
      const tailGrow = Math.max(0, Math.min(1,
        (timer - DREAM_BUBBLE_START - index * 4) / 12
      ));
      if (tailGrow <= 0) continue;
      ctx.save();
      ctx.globalAlpha = fade * tailGrow * 0.86;
      ctx.fillStyle = "#ffe3f7";
      ctx.strokeStyle = "#ff9bd8";
      ctx.lineWidth = 1.4;
      ctx.shadowColor = "#ff72c8";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(centerX + offsetX, centerY + offsetY, radius * tailGrow, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawSleepingHeartZs(dream, alpha) {
    if (alpha <= 0) return;
    for (let index = 0; index < 3; index++) {
      const progress = ((dream.timer + index * 40) % 120) / 120;
      const fade = Math.sin(progress * Math.PI) * alpha;
      const x = dream.sleepingX + 10 + progress * 58;
      const y = dream.sleepingY - 11 - progress * 68 + Math.sin(progress * Math.PI * 3) * 2;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.12 + progress * 0.16);
      ctx.globalAlpha = fade * 0.9;
      ctx.font = `bold ${8 + progress * 6}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffd8f2";
      ctx.strokeStyle = "#6e214f";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "#ff70c7";
      ctx.shadowBlur = 7;
      ctx.strokeText("Z", 0, 0);
      ctx.fillText("Z", 0, 0);
      ctx.restore();
    }
  }

  function drawDandelionDreamDefense({ state: currentState, box }) {
    const dream = currentState.encounter.dandelionDreamAttack;
    if (!dream) return null;

    const darkness = dreamDarkness(dream.timer);
    if (darkness >= 0.98) {
      ctx.save();
      ctx.fillStyle = "#000";
      ctx.fillRect(box.x - 5, box.y - 5, box.w + 10, box.h + 10);
      ctx.restore();
    }

    if (dream.timer >= DREAM_ACTIVE_FRAME) {
      drawDreamCloudBorder(box, dream.timer);
    }
    drawDreamBubble(dream);
    const attackFade = Math.max(0, Math.min(
      1,
      (dream.timer + 1) / DREAM_CLOUD_FADE_FRAMES,
      (DREAM_ATTACK_DURATION - dream.timer) / DREAM_CLOUD_FADE_FRAMES
    ));
    if (dream.timer >= DREAM_ACTIVE_FRAME) {
      const currentFade = Math.min(
        1,
        (dream.timer - dream.cloudWallsChangedAt + 1) / DREAM_CLOUD_FADE_FRAMES
      );
      const cageFade = Math.min(
        1,
        (dream.timer - dream.cloudCageSpawnedAt + 1) / DREAM_CLOUD_FADE_FRAMES
      );
      drawDreamCloudWalls(dream.cloudCage, dream.timer, cageFade * attackFade);
      drawDreamCloudWalls(dream.cloudWalls, dream.timer, currentFade * attackFade);
      const retiredFade = Math.max(
        0,
        1 - (dream.timer - dream.cloudWallsRetiredAt) / DREAM_CLOUD_FADE_FRAMES
      );
      drawDreamCloudWalls(dream.retiringCloudWalls, dream.timer, retiredFade * attackFade);
      drawDreamMusicNotes(dream, cageFade * attackFade);
    }

    return { handledPurple: true };
  }

  function drawDandelionDreamSoul() {
    const dream = state?.encounter?.dandelionDreamAttack;
    if (!dream) return false;

    const redHeartFade = Math.max(0, Math.min(
      1,
      (dream.timer - DREAM_RED_HEART_FADE_START) /
        (DREAM_RED_HEART_FADE_END - DREAM_RED_HEART_FADE_START)
    ));
    if (redHeartFade > 0 && typeof drawHeartShape === "function") {
      ctx.save();
      ctx.globalAlpha = redHeartFade;
      drawHeartShape(dream.sleepingX, dream.sleepingY, "#ff1e35");
      ctx.restore();
    }
    drawSleepingHeartZs(dream, redHeartFade);
    if (dream.timer < DREAM_HEART_REVEAL) return true;

    if (dream.timer >= DREAM_ACTIVE_FRAME) {
      ctx.save();
      ctx.globalAlpha = 0.72 + dream.shieldFlash / 8 * 0.28;
      ctx.strokeStyle = "#ff79cd";
      ctx.shadowColor = "#ff4fbd";
      ctx.shadowBlur = 8 + dream.shieldFlash;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(dream.dreamX, dream.dreamY, DREAM_SHIELD_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      for (const impact of dream.shieldImpacts) {
        const fade = Math.max(0, 1 - impact.age / impact.life);
        const impactX = dream.dreamX + Math.cos(impact.angle) * DREAM_SHIELD_RADIUS;
        const impactY = dream.dreamY + Math.sin(impact.angle) * DREAM_SHIELD_RADIUS;
        const tangentX = -Math.sin(impact.angle);
        const tangentY = Math.cos(impact.angle);
        const halfLength = 3 + fade * 8;

        ctx.save();
        ctx.globalAlpha = fade;
        ctx.strokeStyle = "#fff";
        ctx.shadowColor = "#fff";
        ctx.shadowBlur = 10 * fade;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(
          impactX - tangentX * halfLength,
          impactY - tangentY * halfLength
        );
        ctx.lineTo(
          impactX + tangentX * halfLength,
          impactY + tangentY * halfLength
        );
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(impactX, impactY, 2.5 * fade, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    if (typeof drawHeartShape === "function") {
      drawHeartShape(dream.dreamX, dream.dreamY, "#ff72cf");
    }
    if (dream.speedMessageTimer > 0) {
      const messageAge = DREAM_SPEED_MESSAGE_FRAMES - dream.speedMessageTimer;
      ctx.save();
      ctx.globalAlpha = Math.min(1, dream.speedMessageTimer / 12);
      ctx.fillStyle = "#ffd34d";
      ctx.strokeStyle = "#5c3b00";
      ctx.lineWidth = 3;
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeText("+SPEED", dream.dreamX, dream.dreamY - 34 - messageAge * 0.28);
      ctx.fillText("+SPEED", dream.dreamX, dream.dreamY - 34 - messageAge * 0.28);
      ctx.restore();
    }
    return true;
  }

  function drawDisintegratingPlatform(bullet) {
    const progress = bullet.disintegrationProgress || 0;
    const platformWidth = bullet.width || WHITE_DAGGER_PLATFORM_WIDTH;
    const platformHeight = bullet.height || 9;
    const segmentCount = 9;
    const segmentWidth = platformWidth / segmentCount;
    const gold = bullet.platformColor === "gold";

    ctx.save();
    ctx.translate(bullet.x, bullet.y);
    ctx.fillStyle = gold ? "#ffd34d" : "#f8fbff";
    ctx.strokeStyle = gold ? "#fff0a6" : "#b9d6ea";
    ctx.lineWidth = 1;
    ctx.shadowColor = gold ? "#ffb000" : "#fff";
    ctx.shadowBlur = 4 * (1 - progress);

    for (let index = 0; index < segmentCount; index++) {
      const dissolveOrder = ((index * 5) % segmentCount + 1) / segmentCount;
      const x = -platformWidth / 2 + index * segmentWidth;

      if (progress < dissolveOrder) {
        ctx.globalAlpha = 1 - progress * 0.7;
        ctx.fillRect(x, 0, segmentWidth + 0.5, platformHeight);
        ctx.strokeRect(x, 0, segmentWidth + 0.5, platformHeight);
        continue;
      }

      const fragmentProgress = Math.min(1, (progress - dissolveOrder) * 4 + 0.15);
      ctx.globalAlpha = Math.max(0, 1 - fragmentProgress);
      const drift = (index % 2 === 0 ? -1 : 1) * fragmentProgress * 5;
      ctx.fillRect(
        x + segmentWidth / 2 + drift,
        2 + fragmentProgress * (7 + index % 3 * 3),
        3,
        3
      );
    }

    ctx.restore();
  }

  function drawDandelionBullet(bullet) {
    if (bullet.type === "dandelionDaggerGrid") {
      const arena = bullet.arena;
      ctx.save();
      ctx.strokeStyle = "#9d82c9";
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let index = 0; index <= bullet.gridSize; index++) {
        const x = arena.x + index * bullet.cellSize;
        const y = arena.y + index * bullet.cellSize;
        ctx.moveTo(x, arena.y);
        ctx.lineTo(x, arena.y + arena.h);
        ctx.moveTo(arena.x, y);
        ctx.lineTo(arena.x + arena.w, y);
      }
      ctx.stroke();
      ctx.restore();
      return true;
    }

    if (bullet.type === "dandelionStarterPlatform") {
      drawDisintegratingPlatform(bullet);
      return true;
    }

    if (bullet.type === "dandelionWhiteDaggerPlatform") {
      if (bullet.age > WHITE_DAGGER_FLIGHT_FRAMES) {
        drawDisintegratingPlatform(bullet);
        return true;
      }

      ctx.save();
      ctx.translate(bullet.x, bullet.y);
      ctx.rotate(bullet.angle);
      ctx.fillStyle = "#d8caaa";
      ctx.fillRect(-13, -2.5, 10, 5);
      ctx.beginPath();
      ctx.arc(-13, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f8fbff";
      ctx.shadowColor = "#fff";
      ctx.shadowBlur = 7;
      ctx.beginPath();
      ctx.moveTo(-3, -5);
      ctx.lineTo(22, 0);
      ctx.lineTo(-3, 5);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#b9d6ea";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return true;
    }

    if (bullet.type === "dandelionBouncingNoteGuide") {
      ctx.save();
      ctx.globalAlpha = Math.max(0.08, 0.28 * bullet.life / BOUNCING_NOTE_WARNING_FRAMES);
      ctx.strokeStyle = "#ffe680";
      ctx.shadowColor = "#ffe680";
      ctx.shadowBlur = 5;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bullet.originX, bullet.originY);
      ctx.lineTo(bullet.entryX, bullet.entryY);
      ctx.stroke();
      ctx.restore();
      return true;
    }

    if (bullet.type === "dandelionBouncingNote") {
      const sprite = cachedNoteSprite(bullet.noteColor || "#ffe680");
      if (sprite) ctx.drawImage(sprite, bullet.x - 14, bullet.y - 14, 28, 28);
      return true;
    }

    if (bullet.type === "dandelionArpeggioGoalNote") {
      if (!bullet.collected) {
        const sprite = cachedNoteSprite("#ffd34d");
        const pulse = 1 + Math.sin(bullet.age * 0.12) * 0.08;
        if (sprite) {
          ctx.save();
          ctx.shadowColor = "#ffb000";
          ctx.shadowBlur = 10;
          ctx.drawImage(sprite, bullet.x - 15 * pulse, bullet.y - 15 * pulse, 30 * pulse, 30 * pulse);
          ctx.restore();
        }
        ctx.save();
        ctx.fillStyle = "#fff1a6";
        ctx.shadowColor = "#ffb000";
        ctx.shadowBlur = 6;
        for (let index = 0; index < 4; index++) {
          const angle = bullet.age * 0.075 + index * Math.PI / 2 + bullet.arpeggioStage * 0.7;
          const orbit = 16 + Math.sin(bullet.age * 0.1 + index) * 2;
          ctx.fillRect(
            bullet.x + Math.cos(angle) * orbit - 1,
            bullet.y + Math.sin(angle) * orbit - 1,
            2,
            2
          );
        }
        ctx.restore();
      }
      for (const particle of bullet.particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
        ctx.fillStyle = particle.color || "#ffc43d";
        ctx.shadowColor = particle.color || "#ffb000";
        ctx.shadowBlur = 7;
        ctx.fillRect(
          particle.x - particle.size / 2,
          particle.y - particle.size / 2,
          particle.size,
          particle.size
        );
        ctx.restore();
      }
      return true;
    }

    if (bullet.type === "dandelionSineGuide") {
      ctx.save();
      ctx.globalAlpha = 0.24;
      ctx.strokeStyle = "#ffe680";
      ctx.lineWidth = 1;
      ctx.shadowColor = "#ffe680";
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(bullet.originX, bullet.originY);
      ctx.lineTo(bullet.targetX, bullet.targetY);
      ctx.stroke();
      ctx.restore();
      return true;
    }

    if (bullet.type === "dandelionSinePacket") {
      const sprite = cachedNoteSprite("#ffe680");
      if (!sprite) return true;

      for (let index = 0; index < bullet.noteCount; index++) {
        const note = sinePacketNotePosition(bullet, index);
        if (note.distance < 0 || note.distance > bullet.pathLength) continue;
        if (note.x < -10 || note.x > width + 10 || note.y < -10 || note.y > height + 10) continue;
        ctx.drawImage(sprite, note.x - 8, note.y - 8, 16, 16);
      }
      return true;
    }

    if (bullet.type === "dandelionNoteWave") {
      const colors = ["#ffe680", "#ffaddf", "#9edcff"];
      const color = colors[bullet.noteWave % colors.length];
      const sprite = cachedNoteSprite(color);

      if (!sprite) return true;
      for (let index = 0; index <= bullet.noteCount; index++) {
        if (Math.abs(index - bullet.gapCenterIndex) <= bullet.halfGap) continue;

        const angle = bullet.startAngle + index * NOTE_WAVE_ANGLE_STEP;
        const noteX = bullet.x + Math.cos(angle) * bullet.waveRadius;
        const noteY = bullet.y + Math.sin(angle) * bullet.waveRadius;
        if (noteX < -14 || noteX > width + 14 || noteY < -14 || noteY > height + 14) continue;
        ctx.drawImage(sprite, noteX - 14, noteY - 14);
      }
      return true;
    }

    if (bullet.type === "dandelionBlackDaggerWarning") {
      ctx.save();
      ctx.strokeStyle = "#fff";
      ctx.fillStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;
      ctx.shadowColor = "#fff";
      ctx.shadowBlur = 3;

      for (let index = 0; index < bullet.rayCount; index++) {
        const angle = bullet.currentAngle + index * Math.PI * 2 / bullet.rayCount;
        const directionX = Math.cos(angle);
        const directionY = Math.sin(angle);
        const length = rayDistanceToBoxEdge(
          bullet.focalX,
          bullet.focalY,
          directionX,
          directionY,
          bullet.arena
        );
        ctx.beginPath();
        ctx.moveTo(bullet.focalX, bullet.focalY);
        ctx.lineTo(
          bullet.focalX + directionX * length,
          bullet.focalY + directionY * length
        );
        ctx.stroke();
      }

      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(bullet.focalX, bullet.focalY, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return true;
    }

    if (bullet.type === "dandelionBlackDaggerLandingIndicator") {
      const pulse = 0.82 + Math.sin(bullet.age * 0.8) * 0.18;
      const lineEndX = bullet.landingX + bullet.directionX * bullet.indicatorLength;
      const lineEndY = bullet.landingY + bullet.directionY * bullet.indicatorLength;
      ctx.save();
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#fff";
      ctx.shadowColor = "#fff";
      ctx.shadowBlur = 7;
      ctx.globalAlpha = 0.18 * pulse;
      ctx.beginPath();
      ctx.arc(bullet.landingX, bullet.landingY, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.32;
      ctx.shadowBlur = 3;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(bullet.landingX, bullet.landingY);
      ctx.lineTo(lineEndX, lineEndY);
      ctx.stroke();
      ctx.restore();
      return true;
    }

    if (bullet.type === "dandelionDagger") {
      const color = daggerGemColor(bullet.daggerColor);
      const landed = bullet.landed === true;
      const pulse = landed ? 0.7 + Math.sin(bullet.age * 0.55) * 0.3 : 0.55;
      const black = bullet.daggerColor === "black";
      const dreamDagger = bullet.dreamDagger === true;

      ctx.save();
      ctx.translate(bullet.x, bullet.y);
      ctx.rotate(bullet.angle);

      if (dreamDagger) {
        ctx.fillStyle = "#ff72cf";
        ctx.shadowColor = "#ff4fbd";
        ctx.shadowBlur = 5;
        for (let index = 0; index < 4; index++) {
          const trailDistance = 23 + index * 8 + (bullet.age * 0.7 % 8);
          ctx.globalAlpha = 0.5 - index * 0.1;
          ctx.beginPath();
          ctx.arc(-trailDistance, Math.sin(bullet.age * 0.35 + index) * 3, 2.4 - index * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }

      if (black && landed) {
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = "#fff";
        ctx.fillRect(-24, -1, 21, 2);
        ctx.globalAlpha = 1;
      }

      if (!black && landed && !bullet.blasted) {
        const flightFrames = bullet.daggerFlightFrames ?? DAGGER_FLIGHT_FRAMES;
        const warningProgress = Math.min(
          1,
          (bullet.age - flightFrames) /
            (bullet.daggerPauseFrames ?? DAGGER_PAUSE_FRAMES)
        );
        const auraRadius = 15 - warningProgress * 9;
        ctx.globalAlpha = 0.08 + warningProgress * 0.2;
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.shadowColor = color;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = black ? "#f7f9fc" : "#d9c9a8";
      ctx.fillRect(-13, -2.5, 10, 5);
      ctx.beginPath();
      ctx.arc(-13, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
      if (dreamDagger) {
        ctx.strokeStyle = "#ff72cf";
        ctx.shadowColor = "#ff4fbd";
        ctx.shadowBlur = 4;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-13, -2.5, 10, 5);
        ctx.stroke();
      }

      ctx.fillStyle = black ? "#fff" : "#f4f7fa";
      ctx.fillRect(-4, -7, 3, 14);
      if (dreamDagger) ctx.strokeRect(-4, -7, 3, 14);

      ctx.fillStyle = black ? "#fff" : "#e4ebf2";
      ctx.beginPath();
      ctx.moveTo(1, -4.5);
      ctx.lineTo(22, 0);
      ctx.lineTo(1, 4.5);
      ctx.closePath();
      ctx.fill();
      if (black) {
        ctx.strokeStyle = dreamDagger ? "#ff72cf" : "#c6ced8";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.globalAlpha = black ? 1 : pulse;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = black ? 2 : landed ? 12 : 7;
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.strokeStyle = dreamDagger ? "#ff72cf" : "#fff";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
      return true;
    }

    if (bullet.type === "dandelionDaggerBlastHitbox") return true;

    if (bullet.type === "dandelionDaggerBlast") {
      const color = daggerGemColor(bullet.daggerColor);
      const fade = Math.min(1, bullet.life / 6);

      ctx.save();
      if (bullet.age <= 4) {
        const flareProgress = bullet.age / 4;
        ctx.globalAlpha = (1 - flareProgress) * 0.65;
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(bullet.originX, bullet.originY, 5 + flareProgress * 13, 0, Math.PI * 2);
        ctx.fill();
      }

      if (bullet.blastShape === "x") {
        for (const ray of bullet.blastRays) {
          const visualLength = ray.length * bullet.expansion;
          ctx.save();
          ctx.translate(bullet.originX, bullet.originY);
          ctx.rotate(ray.angle);
          ctx.globalAlpha = fade * 0.18;
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 10;
          ctx.fillRect(-3, -8, visualLength + 6, 16);
          ctx.globalAlpha = fade * 0.72;
          ctx.shadowBlur = 4;
          ctx.fillRect(0, -5, visualLength, 10);
          ctx.globalAlpha = fade * 0.22;
          ctx.fillStyle = "#fff";
          ctx.shadowBlur = 0;
          ctx.fillRect(0, -1, visualLength, 2);
          ctx.restore();
        }
        ctx.restore();
        return true;
      }

      ctx.globalAlpha = fade * 0.18;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.fillRect(
        bullet.x - bullet.width / 2 - 3,
        bullet.y - 3,
        bullet.width + 6,
        bullet.height + 6
      );
      ctx.globalAlpha = fade * 0.72;
      ctx.shadowBlur = 4;
      ctx.fillRect(bullet.x - bullet.width / 2, bullet.y, bullet.width, bullet.height);
      ctx.globalAlpha = fade * 0.22;
      ctx.fillStyle = "#fff";
      ctx.shadowBlur = 0;
      if (bullet.horizontal) {
        ctx.fillRect(bullet.x - bullet.width / 2, bullet.y + 4, bullet.width, 2);
      } else {
        ctx.fillRect(bullet.x - 1, bullet.y, 2, bullet.height);
      }
      ctx.restore();
      return true;
    }

    return false;
  }

  function resetToDefault({ state }) {
    state.enemySpriteKey = null;
    delete state.encounter.dandelionSineRays;
    delete state.encounter.dandelionBouncingNoteRays;
    delete state.encounter.dandelionLastPlatformDestination;
    delete state.encounter.dandelionBlackDaggerBursts;
    delete state.encounter.dandelionDreamAttack;
    delete state.encounter.dandelionDaggerSweepSides;
    delete state.encounter.dandelionArpeggioClimb;
    delete state.encounter.dandelionAdvancingDaggerOnslaughtTarget;
    delete state.encounter.dandelionDaggerGridLayouts;
  }

  function finishDandelionAttack({ state: currentState }) {
    const finishedDreamAttack = Boolean(currentState.encounter.dandelionDreamAttack);
    resetToDefault({ state: currentState });
    if (!finishedDreamAttack) return;

    delete currentState.encounter.dandelionDreamMusicFade;
    playMusic?.(sounds?.battleTheme);
    currentState.encounter.dandelionDreamMusicReturn = {
      timer: 0,
      duration: DREAM_MUSIC_FADE_FRAMES
    };
  }

  function updateArpeggioGoalCollection() {
    const climb = state?.encounter?.dandelionArpeggioClimb;
    const goal = climb?.goalBullet;
    if (!climb || !goal || goal.collected || climb.completed) return;
    const landedInSpikes = state.soul.pitBounce || (
      state.soul.vy >= 0 && state.soul.y + state.soul.r >= climb.spikeTop - 0.5
    );
    const reachedGoal = Math.hypot(state.soul.x - goal.x, state.soul.y - goal.y) <=
      state.soul.r + goal.noteRadius;
    if (!landedInSpikes && !reachedGoal) return;

    goal.collected = true;
    goal.shattered = landedInSpikes;
    goal.life = Math.min(goal.life, 42);
    const particleCount = landedInSpikes ? 20 : 14;
    for (let index = 0; index < particleCount; index++) {
      const angle = index / particleCount * Math.PI * 2 + Math.random() * 0.18;
      const speed = landedInSpikes
        ? 2.2 + Math.random() * 3.2
        : 1.1 + Math.random() * 2.2;
      goal.particles.push({
        x: goal.x,
        y: goal.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 24 + Math.floor(Math.random() * 13),
        maxLife: 36,
        size: 2 + index % 3,
        color: landedInSpikes && index % 2 === 0 ? "#fff1a6" : "#ffc43d"
      });
    }
    playSound?.(landedInSpikes ? sounds?.break1 : sounds?.itemUse);
    climb.goalBullet = null;

    const hasNextStage = climb.stage < ARPEGGIO_STAGE_COUNT - 1;
    if (!hasNextStage) {
      climb.completed = true;
    } else {
      climb.stage++;
      climb.stageStart = (state.enemyTimer || 0) + ARPEGGIO_STAGE_RESET_DELAY;
      climb.stagePrepared = false;
    }
    climb.pendingGoldPlatform = true;
  }

  function updateDandelionRuntime() {
    updateArpeggioGoalCollection();
    const fade = state?.encounter?.dandelionDreamMusicFade;
    if (fade) {
      if (!fade.started) {
        fade.started = true;
        setMusicVolume?.(sounds?.lullaby, 0);
        playMusic?.(sounds?.lullaby);
      }
      fade.timer++;
      const progress = Math.min(1, fade.timer / fade.duration);
      setMusicVolume?.(sounds?.battleTheme, 0.45 * (1 - progress));
      setMusicVolume?.(sounds?.lullaby, 0.45 * progress);
      if (progress >= 1) delete state.encounter.dandelionDreamMusicFade;
    }

    const transition = state?.encounter?.dandelionDreamMusicReturn;
    if (!transition) return;

    transition.timer++;
    const progress = Math.min(1, transition.timer / transition.duration);
    setMusicVolume?.(sounds?.lullaby, 0.45 * (1 - progress));
    setMusicVolume?.(sounds?.battleTheme, 0.45 * progress);
    if (progress < 1) return;

    stopMusic?.(sounds?.lullaby);
    delete state.encounter.dandelionDreamMusicReturn;
  }

  function additionalPlayerActs({ actor }) {
    if (!actor || actor.dandelionPerforming) return [];
    configureDandelionInstrumentAnimation(actor);
    return [dandelionPerformAct()];
  }

  function consumeTeamMercyRequest({ state }) {
    if (!state.encounter.teamMercyReady || state.encounter.teamMercyStarted) return false;
    state.encounter.teamMercyStarted = true;
    return true;
  }

  function normalizedPartyName(name) {
    return String(name || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
  }

  function openingDialogSteps(currentState) {
    const partyNames = new Set(
      (currentState.party || []).map((player) => normalizedPartyName(player?.name))
    );
    const hasTarhun = partyNames.has("TARHUN");
    const hasBravouros = partyNames.has("BRAVOUROS");

    if (hasTarhun && hasBravouros) {
      return [
        { type: "enemyDialog", text: "Bravouros! Big gay red guy!" },
        { type: "enemyDialog", text: "My old amigos!" },
        { type: "enemyDialog", text: "We were like three peas in two pods!" },
        { type: "enemyDialog", text: "Like three sides of 2 different coins!" },
        { type: "enemyDialog", text: "Like salt and pepper and a not gay third option!" },
        { type: "enemyDialog", text: "Hey, who's the new friend?" }
      ];
    }

    if (!hasTarhun && !hasBravouros) {
      return [
        { type: "enemyDialog", text: "Officer, I've never seen these people in my life." }
      ];
    }

    if (hasTarhun) {
      return [
        { type: "enemyDialog", text: "Hey! I remeber you!" },
        { type: "enemyDialog", text: "You're that incredibly gay guy I used to hang out with!" },
        { type: "enemyDialog", text: "The one with the super useless breath weapon!" },
        { type: "enemyDialog", text: "The one with the poorly spec'd stats!" },
        { type: "enemyDialog", sprite: "thinking", text: "The one with the...." },
        { type: "enemyDialog", sprite: "default", text: "That's all I recall actually." },
        { type: "enemyDialog", text: "How's you your little boyfriend?" },
        { type: "enemyDialog", text: "You pop the big question yet?" },
        {
          type: "enemyDialog",
          sprite: "thinking",
          text: "Can those with your affliction even do that here?"
        },
        {
          type: "enemyDialog",
          sprite: "default",
          text: "Anyway, I see you've made some new male friends!"
        },
        { type: "enemyDialog", text: "Let's see how they hold up." }
      ];
    }

    return [
      {
        type: "enemyDialog",
        text: "Bravouros! My old acquaintance! How's it going ole chap?"
      },
      { type: "enemyDialog", sprite: "thinking", text: "Still the same recluse I see" },
      {
        type: "enemyDialog",
        sprite: "default",
        text: "Where's your muscular trophy boyfriend at?"
      },
      { type: "enemyDialog", text: "Gotta get the band back together one of these days." },
      { type: "enemyDialog", sprite: "daydream", text: "..." },
      { type: "enemyDialog", text: "..." },
      { type: "enemyDialog", text: "..." },
      { type: "enemyDialog", text: "..Ah, good times..." },
      { type: "enemyDialog", text: "..." },
      {
        type: "enemyDialog",
        sprite: "default",
        text: "Things were so easy going and panther free..."
      },
      { type: "enemyDialog", text: "Anyway, I see you've made some new friends!" }
    ];
  }

  function beforeEnemyTurn({ state: currentState, turn, turnIndex }) {
    if (turnIndex !== 0 || turn?.repeated) return null;
    return { steps: openingDialogSteps(currentState) };
  }

  return {
    createState: () => ({
      performers: [],
      teamMercyReady: false,
      teamMercyStarted: false
    }),
    additionalPlayerActs,
    isPartyMemberActive: ({ player }) => !player?.dandelionPerforming,
    playerSpriteRole: ({ player }) => player?.dandelionPerforming ? "dandelionInstrument" : null,
    canMercy: () => false,
    consumeTeamMercyRequest,
    beforeEnemyTurn,
    resetAttack: resetToDefault,
    onAttackEnd: finishDandelionAttack,
    update: updateDandelionRuntime,
    updateDefenseMechanic: updateDandelionDreamDefenseMechanic,
    moveSoul: moveDandelionDreamSoul,
    bulletCollision: noteWaveCollision,
    drawBullet: drawDandelionBullet,
    drawDefaultDefenseBox: ({ state: currentState }) => {
      const dream = currentState.encounter.dandelionDreamAttack;
      return !dream || dreamDarkness(dream.timer) >= 0.98;
    },
    drawDefense: drawDandelionDreamDefense,
    drawSoul: drawDandelionDreamSoul,
    drawHudDistortion: drawDandelionDreamHudDistortion
  };
}

function orderedDandelionTurns(turns) {
  return DANDELION_ATTACK_ORDER.map((attackNumber) => turns[attackNumber - 1]);
}

const dandelionDefinition = {
  name: "DANDELION",
  isNew: true,
  selectorOrder: 2,
  runtime: createDandelionRuntime,
  background: {
    pattern: "confetti",
    confetti: {
      count: 48,
      alpha: 0.22,
      colors: ["#fff", "#ff9de2"],
      speed: 0.18,
      minLength: 3,
      maxLength: 7
    },
    effects: [
      {
        type: "spotlights",
        count: 2,
        anchorX: 795,
        targetY: 324,
        alpha: 0.12,
        separation: 48,
        topSpacing: 140,
        bottomWidth: 70,
        cycleFrames: 360,
        sweepChance: 0.32,
        sweepDistance: 140
      },
      {
        type: "stageCircle",
        x: 795,
        y: 326,
        radiusX: 84,
        radiusY: 22,
        fillAlpha: 0.025,
        strokeAlpha: 0.13
      }
    ]
  },
  sprite: DANDELION_DEFAULT_FRAMES[0],
  defaultAnimation: {
    frames: DANDELION_DEFAULT_FRAMES,
    fps: 6
  },
  spriteAnimations: {
    playing: {
      frames: DANDELION_PLAYING_FRAMES,
      fps: 6
    }
  },
  sprites: {
    hit: "sprites/enemies/dandelion/hit.png",
    down: "sprites/enemies/dandelion/down.png",
    sableSit: "sprites/enemies/dandelion/sable_sit.png",
    thinking: "sprites/enemies/dandelion/thinking.png",
    daydream: "sprites/enemies/dandelion/daydream.png",
    lovestruck: "sprites/enemies/dandelion/lovestruck.png",
    ...Object.fromEntries(
      DANDELION_THROW_KEYS.map((key, index) => [key, DANDELION_THROW_FRAMES[index]])
    ),
    ...Object.fromEntries(
      Object.entries(DANDELION_INSTRUMENT_FRAMES).flatMap(([name, frames]) =>
        frames.map((path, index) => [dandelionInstrumentFrameKey(name, index), path])
      )
    )
  },
  spriteBob: 0,
  spriteSize: 150,
  spriteSizes: {
    default: 150,
    hit: 150,
    playing: 150,
    down: 26,
    sableSit: 88,
    thinking: 150,
    daydream: 150,
    lovestruck: 150,
    ...Object.fromEntries(DANDELION_THROW_KEYS.map((key) => [key, 150]))
  },
  spritePositions: {
    default: { x: 720, y: 168 },
    hit: { x: 720, y: 168 },
    playing: { x: 720, y: 168 },
    down: { x: 782, y: 292 },
    sableSit: { x: 705, y: 214 },
    thinking: { x: 720, y: 168 },
    daydream: { x: 720, y: 168 },
    lovestruck: { x: 720, y: 168 },
    ...Object.fromEntries(DANDELION_THROW_KEYS.map((key) => [key, { x: 720, y: 168 }]))
  },
  spriteFlips: {
    default: { x: true },
    hit: { x: true },
    playing: { x: true },
    down: { x: false },
    sableSit: { x: true },
    thinking: { x: true },
    daydream: { x: true },
    lovestruck: { x: true },
    ...Object.fromEntries(DANDELION_THROW_KEYS.map((key) => [key, { x: true }]))
  },
  preserveSpriteAspectRatio: true,
  hitSprite: "hit",
  music: {
    src: "sounds/Lutist.wav",
    loopStart: 7.327,
    loopEnd: 186.619
  },
  musicTracks: {
    lullaby: { src: "sounds/lullaby.mp3" }
  },
  sounds: {
    bomb: "sounds/snd_bomb.wav",
    strum1: "sounds/snd_strum1.wav",
    strum2: "sounds/snd_strum2.wav",
    strum3: "sounds/snd_strum3.wav",
    strum4: "sounds/snd_strum4.wav",
    strum5: "sounds/snd_strum5.wav",
    note1: "sounds/mus_note1.wav",
    note2: "sounds/mus_note2.wav",
    note3: "sounds/mus_note3.wav",
    note4: "sounds/mus_note4.wav",
    note5: "sounds/mus_note5.wav",
    note6: "sounds/mus_note6.wav",
    scissorbell: "sounds/snd_scissorbell.wav",
    fall: "sounds/snd_fall.wav",
    glitch1: "sounds/snd_glitch_1.mp3"
  },
  maxHP: 1000,
  defeatSequence: DANDELION_GENOCIDE_DEFEAT_SEQUENCE,

  introMessage: "* DANDELION blocks your path.",
  winMessage: "* DANDELION has been defeated.",
  defeatDialog: "Wow! Y'all are stronger than I recall.",

  acts: [
    { name: "Check", dialog: "* DANDELION - A basic fight ready to be built upon." }
  ],
  actConditions: [
    { act: 1, dialog: "* DANDELION is ready to be spared." }
  ],

  mercyFailure: "* DANDELION is not ready to leave.",
  mercySuccess: "* The party joins DANDELION's performance.",
  mercyWinMessage: "OBISCWTPDNDWMFT",
  teamMercyMessage: "* The performance reaches its finale.",
  teamMercyEnemyDialog: "Wow! You guys are almost as good as me!",
  teamMercyFadeDuration: 240,

  battleDialog: [
    "A familiar face approaches.",
    "DANDELION appears lost in song.",
    "DANDELION promises the town is only 2 hours away.",
    "DANDELION prepares a chorus",
    "DANDELION reloads his daggers",
    "The BARD readies an attack.",
    "DANDELION awaits your strike."
  ],

  enemyDialog: [],

  turns: orderedDandelionTurns([
    {
      loop: false,
      type: "normal",
      duration: 630,
      damage: 10,
      box: { x: 338, y: 148, w: 224, h: 224 },
      pattern: function coloredDaggerSequence({ t, box, state, spawnBullet, playSound, sounds }) {
        const volley = DAGGER_SEQUENCE.find((entry) => {
          const elapsed = t - entry.windupAt;
          return elapsed >= 0 && elapsed <= THROW_WINDUP_FRAMES;
        });
        if (!volley) return;

        if (!updateDandelionThrowWindup({ t, state, windupAt: volley.windupAt })) return;

        for (const [index, dagger] of volley.daggers.entries()) {
          spawnDandelionDagger({
            box,
            spawnBullet,
            playSound,
            sounds,
            color: dagger.color,
            destinationX: box.x + box.w * dagger.x,
            destinationY: box.y + box.h * dagger.y,
            playBlastSound: index === 0
          });
        }
      }
    },
    {
      loop: false,
      type: "normal",
      enemyDialog: "Wow! That was so cool the way you dodged my daggers.",
      duration: 590,
      damage: 10,
      box: { x: 338, y: 148, w: 224, h: 224 },
      pattern: function randomDaggerWindowBarrage({ t, box, state, spawnBullet, playSound, sounds }) {
        const windupAt = DAGGER_WALL_WINDUPS.find((start) => {
          const elapsed = t - start;
          return elapsed >= 0 && elapsed <= THROW_WINDUP_FRAMES;
        });
        if (!Number.isFinite(windupAt)) return;
        if (!updateDandelionThrowWindup({ t, state, windupAt })) return;

        spawnRandomDaggerWall({ box, spawnBullet, playSound, sounds });
      }
    },
    {
      loop: true,
      type: "normal",
      enemyDialog: "You don't have 50 candles I could borrow, do ya?",
      duration: 710,
      damage: 10,
      box: { x: 338, y: 148, w: 224, h: 224 },
      pattern: function daggerOnslaught({ t, box, state, spawnBullet, playSound, sounds }) {
        const pairWindup = DAGGER_ONSLAUGHT_WINDUPS.find((start) => {
          const elapsed = t - start;
          return elapsed >= 0 && elapsed <= THROW_WINDUP_FRAMES;
        });

        if (Number.isFinite(pairWindup)) {
          if (!updateDandelionThrowWindup({ t, state, windupAt: pairWindup })) return;
          spawnRandomDaggerTrio({ box, spawnBullet, playSound, sounds });
          return;
        }

        if (!updateDandelionThrowWindup({ t, state, windupAt: PURPLE_FINISHER_WINDUP })) return;
        spawnDandelionDagger({
          box,
          spawnBullet,
          playSound,
          sounds,
          color: "purple",
          destinationX: box.x + box.w / 2,
          destinationY: box.y + box.h / 2
        });
      }
    },
    {
      loop: true,
      event: {
        steps: [
          {
            type: "enemyDialog",
            text: "I'm writing this new piece for my concert in Leitmotif."
          },
          { type: "enemyDialog", text: "How's it sound?" }
        ]
      },
      type: "normal",
      duration: 700,
      damage: 10,
      box: { x: 338, y: 148, w: 224, h: 224 },
      pattern: function radiatingNoteWaves({ t, box, state, spawnBullet, playSound, sounds }) {
        state.enemySpriteKey = "playing";
        const waveIndex = NOTE_WAVE_SPAWN_FRAMES.indexOf(t);
        if (waveIndex === -1) return;
        spawnDandelionNoteWave({
          box,
          spawnBullet,
          waveIndex
        });
        const strumKey = DANDELION_STRUM_SOUND_KEYS[
          Math.floor(Math.random() * DANDELION_STRUM_SOUND_KEYS.length)
        ];
        playSound(sounds[strumKey], 0.5);
      }
    },
    {
      loop: true,
      type: "normal",
      enemyDialog: "Encore! Encore!",
      duration: SINE_ATTACK_DURATION,
      damage: 10,
      box: { x: 338, y: 148, w: 224, h: 224 },
      pattern: function sineNotePackets({ t, box, state, spawnBullet, playSound, sounds }) {
        state.enemySpriteKey = "playing";

        if (t === 0 || !Array.isArray(state.encounter.dandelionSineRays)) {
          state.encounter.dandelionSineRays = createDandelionSineRays(box);
          for (const ray of state.encounter.dandelionSineRays) {
            spawnDandelionSineGuide({
              spawnBullet,
              ray,
              leadFrames: SINE_PACKET_START_FRAME
            });
          }
        }

        const elapsed = t - SINE_PACKET_START_FRAME;
        if (elapsed < 0 || elapsed % SINE_PACKET_INTERVAL !== 0) return;
        const volleyIndex = elapsed / SINE_PACKET_INTERVAL;
        if (volleyIndex >= SINE_PACKET_REPEATS) return;

        for (const ray of state.encounter.dandelionSineRays) {
          spawnDandelionSinePacket({ spawnBullet, ray, volleyIndex });
        }
        const noteKey = DANDELION_NOTE_SOUND_KEYS[
          Math.floor(Math.random() * DANDELION_NOTE_SOUND_KEYS.length)
        ];
        playSound(sounds[noteKey]);

        if (volleyIndex < SINE_PACKET_REPEATS - 1) {
          state.encounter.dandelionSineRays = createDandelionSineRays(box);
          for (const ray of state.encounter.dandelionSineRays) {
            spawnDandelionSineGuide({
              spawnBullet,
              ray,
              leadFrames: SINE_PACKET_INTERVAL
            });
          }
        }
      }
    },
    {
      loop: true,
      type: "blue",
      enemyDialog: "Ope watch out for that pit!",
      duration: WHITE_DAGGER_ATTACK_DURATION - 30,
      damage: 10,
      box: { x: 338, y: 148, w: 224, h: 224 },
      setup: function setupWhiteDaggerPlatforms({ box, state, spawnBullet }) {
        const spikeHeight = 22;
        const spikeTop = box.y + box.h - spikeHeight;

        spawnBullet({
          x: box.x + box.w / 2,
          y: spikeTop,
          r: 0,
          width: box.w,
          height: spikeHeight,
          type: "spikeFloor",
          superBounce: true,
          bounceVelocity: WHITE_DAGGER_REBOUND_VELOCITY,
          noCull: true,
          life: WHITE_DAGGER_ATTACK_DURATION + 1
        });
        spawnDandelionStarterPlatform({ box, state, spawnBullet });
      },
      pattern: function whiteDaggerPlatforms({ t, box, state, spawnBullet, playSound, sounds }) {
        const windupAt = WHITE_DAGGER_PLATFORM_WINDUPS.find((start) => {
          const elapsed = t - start;
          return elapsed >= 0 && elapsed <= THROW_WINDUP_FRAMES;
        });
        if (!Number.isFinite(windupAt)) return;
        if (!updateDandelionThrowWindup({ t, state, windupAt })) return;
        spawnDandelionWhiteDaggerPlatform({ box, state, spawnBullet, playSound, sounds });
      }
    },
    {
      loop: true,
      type: "blue",
      duration: WHITE_DAGGER_ATTACK_DURATION - 30,
      damage: 10,
      box: WHITE_DAGGER_WIDE_BOX,
      setup: function setupWideWhiteDaggerPlatforms({ box, state, spawnBullet }) {
        const spikeHeight = 22;
        const spikeTop = box.y + box.h - spikeHeight;

        spawnBullet({
          x: box.x + box.w / 2,
          y: spikeTop,
          r: 0,
          width: box.w,
          height: spikeHeight,
          type: "spikeFloor",
          superBounce: true,
          bounceVelocity: WHITE_DAGGER_REBOUND_VELOCITY,
          noCull: true,
          life: WHITE_DAGGER_ATTACK_DURATION + 1
        });
        spawnDandelionStarterPlatform({ box, state, spawnBullet });
      },
      pattern: function whiteDaggerCrossfire({
        t,
        box,
        state,
        spawnBullet,
        playSound,
        sounds
      }) {
        const windupAt = WHITE_DAGGER_PLATFORM_WINDUPS.find((start) => {
          const elapsed = t - start;
          return elapsed >= 0 && elapsed <= THROW_WINDUP_FRAMES;
        });
        if (!Number.isFinite(windupAt)) return;
        if (!updateDandelionThrowWindup({ t, state, windupAt })) return;

        const firstPlatform = chooseDandelionDaggerPlatformDestination(box, state);
        spawnDandelionWhiteDaggerPlatform({
          box,
          state,
          spawnBullet,
          playSound,
          sounds,
          destination: firstPlatform
        });
        const secondPlatform = chooseDandelionDaggerPlatformDestination(box, state);
        spawnDandelionWhiteDaggerPlatform({
          box,
          state,
          spawnBullet,
          playSound,
          sounds,
          destination: secondPlatform
        });
        const redDestination = randomDaggerDestination(box, [firstPlatform, secondPlatform]);
        spawnDandelionDagger({
          box,
          spawnBullet,
          playSound,
          sounds,
          color: "red",
          destinationX: redDestination.x,
          destinationY: redDestination.y
        });
      }
    },
    {
      loop: true,
      type: "normal",
      duration: 630,
      damage: 10,
      box: { x: 338, y: 148, w: 224, h: 224 },
      pattern: function escalatingDaggerStorm({ t, box, state, spawnBullet, playSound, sounds }) {
        const setIndex = DAGGER_STORM_WINDUPS.findIndex((windupAt) => {
          const elapsed = t - windupAt;
          return elapsed >= 0 && elapsed <= THROW_WINDUP_FRAMES;
        });
        if (setIndex === -1) return;

        const windupAt = DAGGER_STORM_WINDUPS[setIndex];
        if (!updateDandelionThrowWindup({ t, state, windupAt })) return;

        spawnDaggerStormSet({
          box,
          spawnBullet,
          playSound,
          sounds,
          count: DAGGER_STORM_SET_SIZES[setIndex],
          purpleCount: setIndex === DAGGER_STORM_SET_SIZES.length - 1 ? 2 : 1
        });
      }
    },
    {
      loop: true,
      type: "normal",
      enemyDialog: "I actually learned this one from my good friend, Rory Nyte",
      duration: 410,
      damage: 10,
      box: { x: 338, y: 148, w: 224, h: 224 },
      pattern: function blackDaggerFocalBursts({
        t,
        box,
        state,
        spawnBullet,
        playSound,
        sounds
      }) {
        updateBlackDaggerFocalBursts({
          t,
          box,
          state,
          spawnBullet,
          playSound,
          sounds,
          setSizes: BLACK_DAGGER_ATTACK_9_SET_SIZES,
          setStarts: BLACK_DAGGER_ATTACK_9_SET_STARTS
        });
      }
    },
    {
      loop: true,
      type: "normal",
      duration: 470,
      damage: 10,
      box: { x: 338, y: 148, w: 224, h: 224 },
      pattern: function rapidBlackDaggerFocalBursts({
        t,
        box,
        state,
        spawnBullet,
        playSound,
        sounds
      }) {
        updateBlackDaggerFocalBursts({
          t,
          box,
          state,
          spawnBullet,
          playSound,
          sounds,
          setSizes: BLACK_DAGGER_ATTACK_10_SET_SIZES,
          setStarts: BLACK_DAGGER_ATTACK_10_SET_STARTS
        });
      }
    },
    {
      loop: true,
      type: "normal",
      duration: 540,
      damage: 10,
      box: OUTSIDE_BLACK_DAGGER_BOX,
      pattern: function outsideBlackDaggerAmbush({
        t,
        box,
        state,
        spawnBullet,
        playSound,
        sounds
      }) {
        const windupAt = OUTSIDE_BLACK_DAGGER_WINDUPS.find((start) => {
          const elapsed = t - start;
          return elapsed >= 0 && elapsed <= THROW_WINDUP_FRAMES;
        });
        if (!Number.isFinite(windupAt)) return;
        if (!updateDandelionThrowWindup({ t, state, windupAt })) return;
        spawnOutsideBlackDagger({ box, state, spawnBullet, playSound, sounds });
      }
    },
    {
      loop: false,
      skipEnemyDialog: true,
      event: {
        steps: [
          { type: "enemyDialog", text: "Not bad, my homosexual friends!" },
          { type: "enemyDialog", text: "But its time for y'all to take a snooze." },
          { type: "call", run: beginDandelionDreamPrelude },
          { type: "flash", color: "#ff5ebd", duration: DREAM_PRELUDE_FLASH_FRAMES }
        ]
      },
      attack: {
        type: "purple",
        duration: DREAM_ATTACK_DURATION,
        damage: 10,
        box: DREAM_ATTACK_BOX,
        instantBox: true,
        warmup: 0,
        setup: setupDandelionDreamAttack,
        pattern: function dreamGuardian({ t, box, state, spawnBullet, playSound, sounds }) {
          const dream = state.encounter.dandelionDreamAttack;
          if (!dream) return;

          dream.timer = t;
          updateDreamCloudLayout(dream, box, t);
          if (
            dream.retiringCloudWalls.length > 0 &&
            t - dream.cloudWallsRetiredAt >= DREAM_CLOUD_FADE_FRAMES
          ) {
            dream.retiringCloudWalls = [];
          }
          state.soul.x = dream.sleepingX;
          state.soul.y = dream.sleepingY;
          state.soul.vy = 0;
          state.enemySpriteKey = null;

          if (t >= DREAM_HEART_REVEAL && t < DREAM_ACTIVE_FRAME) {
            const emergeProgress = t < DREAM_BUBBLE_FADE_START
              ? 0
              : Math.min(1, (t - DREAM_BUBBLE_FADE_START) /
                (DREAM_ACTIVE_FRAME - DREAM_BUBBLE_FADE_START));
            dream.dreamX = dream.sleepingX;
            dream.dreamY = dream.sleepingY - 48 - emergeProgress * 22;
          } else if (t === DREAM_ACTIVE_FRAME) {
            dream.dreamX = dream.sleepingX;
            dream.dreamY = dream.sleepingY - 70;
          }

          const daggerElapsed = t - DREAM_DAGGER_START;
          if (daggerElapsed < 0 || daggerElapsed % DREAM_DAGGER_INTERVAL !== 0) return;
          spawnDandelionDreamDagger({
            box,
            state,
            spawnBullet,
            playSound,
            sounds,
            volleyIndex: daggerElapsed / DREAM_DAGGER_INTERVAL
          });
        }
      }
    },
    {
      loop: true,
      event: {
        steps: [
          { type: "enemyDialog", text: "Good thing these daggers keep coming back to me." },
          {
            type: "enemyDialog",
            text: "Speaking of 'coming' and 'backs', how's my ole Dragonborn pal?"
          }
        ]
      },
      type: "normal",
      duration: DAGGER_SWEEP_ATTACK_DURATION,
      damage: 10,
      box: { x: 338, y: 148, w: 224, h: 224 },
      setup: setupDandelionDaggerSweeps,
      pattern: function staggeredDaggerSweeps({
        t,
        box,
        state,
        spawnBullet,
        playSound,
        sounds
      }) {
        updateDandelionDaggerSweeps({
          t,
          box,
          state,
          spawnBullet,
          playSound,
          sounds
        });
      }
    },
    {
      loop: true,
      type: "normal",
      enemyDialog: "How was your nap, princesses?",
      duration: BOUNCING_NOTE_ATTACK_DURATION,
      damage: 10,
      box: { x: 338, y: 148, w: 224, h: 224 },
      setup: function setupBouncingNotes({ state }) {
        state.encounter.dandelionBouncingNoteRays = Array(BOUNCING_NOTE_COUNT).fill(null);
      },
      pattern: function bouncingNotes({ t, box, state, spawnBullet, playSound, sounds }) {
        state.enemySpriteKey = "playing";
        const rays = state.encounter.dandelionBouncingNoteRays;
        if (!Array.isArray(rays)) return;

        const warningElapsed = t - BOUNCING_NOTE_WARNING_START;
        if (
          warningElapsed >= 0 &&
          warningElapsed % BOUNCING_NOTE_INTERVAL === 0
        ) {
          const warningIndex = warningElapsed / BOUNCING_NOTE_INTERVAL;
          if (warningIndex < BOUNCING_NOTE_COUNT) {
            const ray = createDandelionBouncingNoteRay(box);
            rays[warningIndex] = ray;
            spawnDandelionBouncingNoteGuide({ spawnBullet, ray });
          }
        }

        const launchStart = BOUNCING_NOTE_WARNING_START + BOUNCING_NOTE_WARNING_FRAMES;
        const launchElapsed = t - launchStart;
        if (launchElapsed < 0 || launchElapsed % BOUNCING_NOTE_INTERVAL !== 0) return;
        const launchIndex = launchElapsed / BOUNCING_NOTE_INTERVAL;
        if (launchIndex >= BOUNCING_NOTE_COUNT) return;
        const ray = rays[launchIndex] || createDandelionBouncingNoteRay(box);
        rays[launchIndex] = ray;
        spawnDandelionBouncingNote({
          box,
          spawnBullet,
          ray,
          launchIndex,
          life: BOUNCING_NOTE_ATTACK_DURATION - t + 1
        });
        const noteKey = DANDELION_NOTE_SOUND_KEYS[
          Math.floor(Math.random() * DANDELION_NOTE_SOUND_KEYS.length)
        ];
        playSound(sounds[noteKey]);
      }
    },
    {
      loop: true,
      event: {
        steps: [
          {
            type: "enemyDialog",
            text: "I've actually got a princess of my own ya know."
          },
          { type: "enemyDialog", text: "She sort of just appeared one day." },
          {
            type: "enemyDialog",
            sprite: "lovestruck",
            text: "Ah Sable my love..."
          }
        ]
      },
      type: "blue",
      duration: ARPEGGIO_ATTACK_DURATION,
      damage: 10,
      box: ARPEGGIO_BOX,
      setup: setupArpeggioClimb,
      pattern: function arpeggioClimb({ t, box, state, spawnBullet, playSound, sounds }) {
        updateArpeggioClimbPattern({ t, box, state, spawnBullet, playSound, sounds });
      }
    },
    {
      loop: true,
      type: "normal",
      duration: ADVANCING_DAGGER_ONSLAUGHT_DURATION,
      damage: 10,
      box: { x: 338, y: 148, w: 224, h: 224 },
      pattern: function advancingDaggerOnslaught({
        t,
        box,
        state,
        spawnBullet,
        playSound,
        sounds
      }) {
        updateAdvancingDaggerOnslaught({
          t,
          box,
          state,
          spawnBullet,
          playSound,
          sounds
        });
      }
    },
    {
      loop: true,
      type: "normal",
      duration: DAGGER_GRID_ATTACK_DURATION,
      damage: 10,
      box: DAGGER_GRID_BOX,
      setup: setupDaggerGridCrossfire,
      pattern: function daggerGridCrossfire({
        t,
        box,
        state,
        spawnBullet,
        playSound,
        sounds
      }) {
        updateDaggerGridCrossfire({ t, box, state, spawnBullet, playSound, sounds });
      }
    }
  ])
};

if (window.SoulBattle?.encounters?.register) {
  window.SoulBattle.encounters.register("dandelion", dandelionDefinition);
} else {
  window.ENEMY_DATA = dandelionDefinition;
}
})();

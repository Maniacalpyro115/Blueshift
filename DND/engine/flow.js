(() => {
  "use strict";

  window.SoulBattle = window.SoulBattle || {};

  function normalizeAttackPattern(attackPattern) {
    const normal = window.SoulBattle.constants.ATTACK_TYPE.NORMAL;
    if (typeof attackPattern === "function") {
      return { type: normal, duration: null, damage: null, box: null, setup: null,
        enemyDialog: null, sprite: null, assignDefaultSprite: null, lockDefaultSprite: false,
        mechanic: null,
        pattern: attackPattern };
    }
    if (!attackPattern || typeof attackPattern !== "object") {
      return { type: normal, duration: null, damage: null, box: null, setup: null,
        enemyDialog: null, sprite: null, assignDefaultSprite: null, lockDefaultSprite: false,
        mechanic: null,
        pattern: null };
    }
    const objectCopy = (value) => value && typeof value === "object" ? { ...value } : null;
    return {
      type: typeof attackPattern.type === "string" ? attackPattern.type : normal,
      duration: Number.isFinite(attackPattern.duration) ? attackPattern.duration : null,
      damage: Number.isFinite(attackPattern.damage) ? Math.max(0, attackPattern.damage) : null,
      box: attackPattern.box && ["x", "y", "w", "h"].every((key) => Number.isFinite(attackPattern.box[key]))
        ? { ...attackPattern.box } : null,
      setup: typeof attackPattern.setup === "function" ? attackPattern.setup : null,
      enemyDialog: typeof attackPattern.enemyDialog === "string" ? attackPattern.enemyDialog : null,
      sprite: typeof attackPattern.sprite === "string" ? attackPattern.sprite : null,
      assignDefaultSprite: typeof attackPattern.assignDefaultSprite === "string"
        ? attackPattern.assignDefaultSprite : null,
      lockDefaultSprite: attackPattern.lockDefaultSprite === true,
      instantBox: attackPattern.instantBox === true,
      warmup: Number.isFinite(attackPattern.warmup)
        ? Math.max(0, attackPattern.warmup)
        : null,
      mechanic: typeof attackPattern.mechanic === "string"
        ? { type: attackPattern.mechanic, config: objectCopy(attackPattern.mechanicConfig) || {} }
        : objectCopy(attackPattern.mechanic),
      pattern: attackPattern.pattern
    };
  }

  function normalizeTurnEvent(event) {
    if (!event || !Array.isArray(event.steps)) return null;
    const supported = new Set([
      "textbox", "enemyDialog", "enemyTransform", "assignEnemyDefault", "flash",
      "wait", "call", "custom", "choice"
    ]);

    function normalizeStep(step) {
      if (!step || !supported.has(step.type)) return null;
      const normalized = {
        type: step.type,
        text: typeof step.text === "string" ? step.text : "",
        color: typeof step.color === "string" ? step.color : "#fff",
        sprite: typeof step.sprite === "string" ? step.sprite : null,
        assignDefault: step.assignDefault === true,
        lockDefault: step.lockDefault === true,
        duration: Number.isFinite(step.duration) ? Math.max(1, step.duration) : null,
        run: typeof step.run === "function" ? step.run : null,
        enter: typeof step.enter === "function" ? step.enter : null,
        update: typeof step.update === "function" ? step.update : null,
        draw: typeof step.draw === "function" ? step.draw : null,
        exit: typeof step.exit === "function" ? step.exit : null
      };
      if (step.type === "choice") {
        normalized.choices = (Array.isArray(step.choices) ? step.choices : []).map((choice) => ({
          weight: Number.isFinite(choice?.weight) && choice.weight > 0 ? choice.weight : 1,
          steps: (Array.isArray(choice?.steps) ? choice.steps : [])
            .map(normalizeStep)
            .filter(Boolean)
        })).filter((choice) => choice.steps.length > 0);
      }
      return normalized;
    }

    const steps = event.steps.map(normalizeStep).filter(Boolean);
    return steps.length ? { steps } : null;
  }

  function chooseTimelineSteps(step, random = Math.random) {
    const choices = Array.isArray(step?.choices) ? step.choices : [];
    if (choices.length === 0) return [];
    const total = choices.reduce((sum, choice) => sum + choice.weight, 0);
    let roll = random() * total;
    for (const choice of choices) {
      roll -= choice.weight;
      if (roll < 0) return choice.steps;
    }
    return choices[choices.length - 1].steps;
  }

  function normalizeTurn(turn) {
    if (turn && typeof turn === "object" && (
      Object.prototype.hasOwnProperty.call(turn, "attack") ||
      Object.prototype.hasOwnProperty.call(turn, "event") ||
      Object.prototype.hasOwnProperty.call(turn, "loop")
    )) {
      return {
        attack: normalizeAttackPattern(turn.attack || turn),
        event: normalizeTurnEvent(turn.event),
        postAttackEvent: normalizeTurnEvent(turn.postAttackEvent),
        scene: turn.scene && typeof turn.scene === "object" ? turn.scene : null,
        skipEnemyDialog: turn.skipEnemyDialog === true,
        loop: turn.loop !== false
      };
    }
    return {
      attack: normalizeAttackPattern(turn),
      event: null,
      postAttackEvent: null,
      scene: null,
      skipEnemyDialog: false,
      loop: true
    };
  }

  function createFlowController(initialPhase, handlers, context) {
    let phase = null;

    function transition(nextPhase, payload) {
      const previous = phase;
      if (previous && handlers[previous]?.exit) handlers[previous].exit(context, nextPhase);
      phase = nextPhase;
      context.state.phase = nextPhase;
      if (handlers[nextPhase]?.enter) handlers[nextPhase].enter(context, payload, previous);
    }

    function update() {
      handlers[phase]?.update?.(context);
    }

    function draw() {
      handlers[phase]?.draw?.(context);
    }

    transition(initialPhase);
    return { transition, update, draw, get phase() { return phase; } };
  }

  function createSequenceRunner(context) {
    let sequence = [];
    let index = -1;
    let active = null;
    let timer = 0;
    let onComplete = null;

    function finishStep() {
      active?.exit?.(context, timer);
      index++;
      timer = 0;
      active = sequence[index] || null;
      if (!active) {
        const complete = onComplete;
        onComplete = null;
        complete?.();
        return;
      }
      active.enter?.(context);
      if (active.type === "call") {
        active.run?.(context);
        finishStep();
      }
    }

    function start(steps, complete) {
      sequence = Array.isArray(steps) ? steps : [];
      index = -1;
      active = null;
      timer = 0;
      onComplete = typeof complete === "function" ? complete : null;
      finishStep();
    }

    function update() {
      if (!active) return;
      const result = active.update?.(context, timer);
      timer++;
      const duration = Number.isFinite(active.duration) ? Math.max(1, active.duration) : null;
      if (result === true || (duration !== null && timer >= duration)) finishStep();
    }

    function draw() {
      active?.draw?.(context, timer);
    }

    return {
      start,
      update,
      draw,
      finishStep,
      get active() { return active; },
      get timer() { return timer; },
      get running() { return active !== null; }
    };
  }

  window.SoulBattle.flow = {
    normalizeAttackPattern,
    normalizeTurnEvent,
    normalizeTurn,
    chooseTimelineSteps,
    createFlowController,
    createSequenceRunner
  };
})();

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const context = vm.createContext({ window: {}, console });
for (const file of ["engine/constants.js", "engine/defense.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}

const { ATTACK_TYPE, BOX_RECT } = context.window.SoulBattle.constants;
const defense = context.window.SoulBattle.defense;
assert.strictEqual(defense.soulColor(ATTACK_TYPE.GREEN), "#25d65f");
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(defense.boxFor(ATTACK_TYPE.BLUE))),
  JSON.parse(JSON.stringify(BOX_RECT.BATTLE))
);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(defense.boxFor(ATTACK_TYPE.GREEN))),
  JSON.parse(JSON.stringify(BOX_RECT.GREEN))
);

const state = {
  attackType: ATTACK_TYPE.PURPLE,
  box: { x: 100, y: 100, w: 300, h: 180 },
  soul: { x: 0, y: 0, r: 8, lane: 0, vy: 12, pitBounce: true },
  shieldDirection: "left"
};
defense.placeSoul(state, [130, 190, 250]);
assert.strictEqual(state.soul.x, 250);
assert.strictEqual(state.soul.y, 190);
assert.strictEqual(state.soul.lane, 1);
assert.strictEqual(state.soul.vy, 0);

console.log("DEFENSE_RUNTIME_PASS");

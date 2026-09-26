"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const context = vm.createContext({ window: {}, console, Math });
for (const file of ["engine/constants.js", "engine/flow.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}

const flow = context.window.SoulBattle.flow;
const event = flow.normalizeTurnEvent({ steps: [{
  type: "choice",
  choices: [
    { weight: 1, steps: [{ type: "enemyDialog", text: "first" }] },
    { weight: 3, steps: [{ type: "wait", duration: 12 }] }
  ]
}] });
assert.strictEqual(event.steps[0].choices.length, 2);
assert.strictEqual(flow.chooseTimelineSteps(event.steps[0], () => 0)[0].text, "first");
assert.strictEqual(flow.chooseTimelineSteps(event.steps[0], () => 0.99)[0].type, "wait");

const calls = [];
const runner = flow.createSequenceRunner({ marker: true });
runner.start([
  { type: "call", run: () => calls.push("call") },
  { type: "custom", duration: 1, enter: () => calls.push("enter"),
    update: () => calls.push("update"), exit: () => calls.push("exit") }
], () => calls.push("complete"));
runner.update();
assert.deepStrictEqual(calls, ["call", "enter", "update", "exit", "complete"]);

console.log("FLOW_RUNTIME_PASS");

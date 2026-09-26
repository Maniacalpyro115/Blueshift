"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const encounterContext = vm.createContext({ window: {}, console, Map, Array, TypeError, Error });
vm.runInContext(fs.readFileSync(path.join(root, "engine/loader.js"), "utf8"), encounterContext);
const encounters = encounterContext.window.SoulBattle.encounters;
encounters.register("first", { name: "FIRST" });
encounters.register("second", { name: "SECOND" });
assert.deepStrictEqual(Array.from(encounters.list(), (entry) => entry.id), ["first", "second"]);
assert.strictEqual(encounters.get("FIRST").name, "FIRST");
assert.throws(() => encounters.register("first", { name: "duplicate" }), /already registered/);

const playerContext = vm.createContext({
  window: { PLAYER_DATA: [{ name: "EXISTING" }] }, console, Array, TypeError, Error
});
vm.runInContext(fs.readFileSync(path.join(root, "engine/player-runtime.js"), "utf8"), playerContext);
playerContext.window.SoulBattle.players.register({ name: "NEW" });
assert.strictEqual(playerContext.window.PLAYER_DATA.length, 2);
assert.strictEqual(playerContext.window.SoulBattle.players.get("NEW").name, "NEW");

const sharedFiles = ["game.js", ...fs.readdirSync(path.join(root, "engine"))
  .filter((file) => file.endsWith(".js"))
  .map((file) => path.join("engine", file))];
const forbidden = /\b(Sable|Zach|Bucky|Tarhun|Carian|Bravourös|Thanos)\b/i;
for (const file of sharedFiles) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  assert.ok(!forbidden.test(source), `${file} contains encounter/player-specific ownership`);
}

console.log("REGISTRY_OWNERSHIP_PASS");

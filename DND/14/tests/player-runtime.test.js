"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const context = vm.createContext({ window: {}, console, Math });
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "engine", "player-runtime.js"), "utf8"), context);
for (const file of ["carian", "bravouros", "thanos", "bucky", "tarhun"]) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "players", `${file}.js`), "utf8"), context);
}
const players = context.window.PLAYER_DATA;
const playerStats = Object.fromEntries(JSON.parse(JSON.stringify(players)).map((player) => [
  player.name,
  [player.maxHP, player.defendTP, player.damage]
]));
assert.deepStrictEqual(playerStats, {
  CARIAN: [50, 12, 16],
  "BRAVOURÖS": [45, 17, 14],
  THANOS: [55, 16, 14],
  BUCKY: [50, 14, 15],
  TARHUN: [65, 15, 13]
});
const tarhun = players.find((player) => player.name === "TARHUN");
const rage = tarhun.acts.find((act) => act.name === "Rage");
const tarhunState = { ...tarhun, spriteKeys: tarhun.sprites };
assert.ok(rage.available({ actor: tarhunState }));
rage.resolve({ actor: tarhunState, act: rage });
assert.strictEqual(tarhun.runtime.modifyOutgoingDamage({ player: tarhunState, multiplier: 1 }), 1.2);
assert.strictEqual(tarhun.runtime.modifyIncomingDamage({ player: tarhunState, damage: 10 }), 8);

const bucky = players.find((player) => player.name === "BUCKY");
const buckyState = { ...bucky, runtimeState: bucky.runtime.createState() };
const summon = bucky.acts.find((act) => act.name === "Summon Beast");
summon.resolve({ state: { frame: 12 }, actor: buckyState });
assert.ok(buckyState.runtimeState.summoned);
buckyState.runtimeState.dodgeArmed = true;
assert.ok(bucky.runtime.consumeDamageGuard({ player: buckyState }));
console.log("PLAYER_RUNTIME_PASS");

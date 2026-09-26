"use strict";

const assert = require("assert");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const ROOT = path.resolve(__dirname, "..");
const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CASES = [
  { fight: "dandelion", turn: 1 },
  { fight: "dandelion", turn: 2 },
  { fight: "dandelion", turn: 3 },
  { fight: "dandelion", turn: 4 },
  { fight: "dandelion", turn: 5 },
  { fight: "dandelion", turn: 6 },
  { fight: "dandelion", turn: 7 },
  { fight: "dandelion", turn: 8 },
  { fight: "dandelion", turn: 9 },
  { fight: "dandelion", turn: 10 },
  { fight: "dandelion", turn: 11 },
  { fight: "dandelion", turn: 12 },
  { fight: "dandelion", turn: 13 },
  { fight: "dandelion", turn: 14 },
  { fight: "dandelion", turn: 15 },
  { fight: "dandelion", turn: 16 },
  { fight: "dandelion", turn: 17 },
  ...Array.from({ length: 21 }, (_, index) => ({ fight: "sable", turn: index + 1 })),
  ...Array.from({ length: 25 }, (_, index) => ({ fight: "zach", turn: index + 1 })),
  { fight: "sable", turn: 10, repeat: true },
  { fight: "dandelion", sequence: true },
  { fight: "sable", sequence: true },
  { fight: "zach", sequence: true }
];
const CONCURRENCY = 4;

if (!fs.existsSync(CHROME)) {
  console.log("BROWSER_TURN_SUITE_SKIPPED (Chrome not found)");
  process.exit(0);
}

function runCase(testCase) {
  return new Promise((resolve, reject) => {
    const testUrl = pathToFileURL(path.join(__dirname, "encounter-turn-smoke.html"));
    testUrl.searchParams.set("fight", testCase.fight);
    if (testCase.sequence) testUrl.searchParams.set("sequence", "all");
    else testUrl.searchParams.set("turn", String(testCase.turn));
    if (testCase.repeat) testUrl.searchParams.set("repeat", "twice");
    const label = testCase.sequence
      ? `${testCase.fight} full sequence`
      : `${testCase.fight} turn ${testCase.turn}${testCase.repeat ? " repeated" : ""}`;
    const child = spawn(CHROME, [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--disable-default-apps",
      "--allow-file-access-from-files",
      `--virtual-time-budget=${testCase.sequence ? 600000 : testCase.repeat ? 60000 : 30000}`,
      "--dump-dom",
      testUrl.href
    ], { windowsHide: true });
    let output = "";
    let errors = "";
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`${label} timed out`));
    }, testCase.sequence ? 240000 : 60000);
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { errors += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timeout);
      try {
        assert.strictEqual(code, 0, `${label} Chrome exit ${code}: ${errors}`);
        const body = output.match(/<body[^>]*>/)?.[0] || "";
        assert.match(body, /data-smoke="pass"/, `${label} failed: ${body || errors}`);
        if (testCase.fight === "sable" && (testCase.sequence || testCase.turn === 8)) {
          assert.match(body, /data-clone-moved="true"/, "Sable turn 8 clone hearts did not move");
        }
        if (testCase.fight === "dandelion" && (testCase.sequence || testCase.turn === 10)) {
          assert.match(
            body,
            /data-dandelion-dream-box-morphed="false"/,
            "Dandelion turn 10 used the spinning box morph"
          );
        }
        if (testCase.repeat) {
          assert.match(
            body,
            /data-enemy-dialog-count="1"/,
            `${label} replayed its attack-specific enemy dialogue`
          );
        }
        console.log(`BROWSER_TURN_PASS ${label}`);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function worker(queue) {
  while (queue.length > 0) {
    const next = queue.shift();
    await runCase(next);
  }
}

(async () => {
  const queue = [...CASES];
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)));
  console.log("BROWSER_TURN_SUITE_PASS (63 isolated turns + 1 repeat-dialog check + 3 full sequences)");
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});

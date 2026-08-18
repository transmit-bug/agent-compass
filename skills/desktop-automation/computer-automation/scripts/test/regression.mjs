#!/usr/bin/env node
/**
 * regression.mjs — cache-semantics regression suite for midagent.js
 *
 * Runs the real daemon against a stubbed `@midscene/computer` SDK (no LLM, no real
 * desktop; needs node ≥ 18 + python3 with Pillow for screen-diff.py and fixture PNGs).
 *
 * Run from anywhere:  node regression.mjs
 *
 * Locks in the semantics the skills depend on:
 *   1. A PASSING assert persists and hits across daemon restarts (zero LLM).
 *   2. cache invalidate "<prompt>" drops exactly that prompt's verdicts → fresh assert.
 *   3. A FAILING assert is never persisted (a repeat re-runs; no fake-negative poison).
 *   4. Low-information frames (near-blank) bypass the cache in both directions.
 *   5. Every capture settles first: a frame is judged only after consecutive frames
 *      match (transition frames are neither asserted nor cached).
 *   6. The act retry gate reuses only a SUCCEEDED act; after a failed attempt the same
 *      prompt re-executes for real.
 *   7. Acts never persist: after a daemon restart the same act re-runs.
 *   8. Element-level act prompts get an advisory note; behavior is unchanged.
 *   9. .midscene/.cache.json holds only passing assertion entries.
 */
import { spawn } from "node:child_process";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SKILL_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const MIDAGENT = path.join(SKILL_DIR, "midagent.js");
const PORT = 39000 + Math.floor(Math.random() * 900);
const BASE = `http://127.0.0.1:${PORT}`;

const work = fs.mkdtempSync(path.join(os.tmpdir(), "midagent-reg-"));
const MDS = path.join(work, ".midscene");
const session = path.join(MDS, "s1");
const control = path.join(work, "stub-control.json");
const counters = path.join(work, "stub-counters.json");
const cacheFile = path.join(MDS, ".cache.json");

const failures = [];
function check(name, cond, detail) {
  if (cond) console.log(`  ok  ${name}`);
  else {
    failures.push(name);
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// ---------- fixtures: blank (low-info) + two rich noise frames ----------
const fix = path.join(work, "fixtures");
fs.mkdirSync(fix, { recursive: true });
execFileSync("python3", [
  "-c",
  `
from PIL import Image
import random
Image.new("RGB", (320, 180), (128, 128, 128)).save(${JSON.stringify(path.join(fix, "blank.png"))})
for seed, out in ((1, ${JSON.stringify(path.join(fix, "rich1.png"))}), (2, ${JSON.stringify(path.join(fix, "rich2.png"))})):
    random.seed(seed)
    img = Image.new("RGB", (320, 180))
    img.putdata([(random.randrange(256), random.randrange(256), random.randrange(256)) for _ in range(320 * 180)])
    img.save(out)
`,
]);

// ---------- stub @midscene/computer inside the work dir (cwd resolution) ----------
const stubDir = path.join(work, "node_modules", "@midscene", "computer");
fs.mkdirSync(stubDir, { recursive: true });
fs.writeFileSync(
  path.join(stubDir, "package.json"),
  JSON.stringify({ name: "@midscene/computer", version: "0.0.0-stub", main: "index.js" })
);
fs.writeFileSync(
  path.join(stubDir, "index.js"),
  `"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = ${JSON.stringify(work)};
const FIX = ${JSON.stringify(fix)};
const CONTROL = ${JSON.stringify(control)};
const COUNTERS = ${JSON.stringify(counters)};
function readJson(p, dflt) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return dflt; } }
function bump(k) {
  const c = readJson(COUNTERS, { shots: 0, acts: 0, asserts: 0 });
  c[k] += 1;
  fs.writeFileSync(COUNTERS, JSON.stringify(c));
  return c[k];
}
async function screenshotBase64() {
  const n = bump("shots");
  const ctl = readJson(CONTROL, {});
  const screens = ctl.screens && ctl.screens.length ? ctl.screens : ["rich1.png"];
  const file = path.join(FIX, screens[(n - 1) % screens.length]);
  return fs.readFileSync(file).toString("base64");
}
async function aiAct(prompt) {
  const n = bump("acts");
  const ctl = readJson(CONTROL, {});
  if (ctl.actThrows) throw new Error("stub act failure #" + n);
  return "stub act ok #" + n;
}
async function aiAssert(prompt) {
  const n = bump("asserts");
  const ctl = readJson(CONTROL, {});
  const pass = !!ctl.assertPass;
  return { pass, thought: "stub thought #" + n, message: pass ? null : "stub failure msg #" + n };
}
module.exports = { agentForComputer: async () => ({
  page: { screenshotBase64 },
  aiAct,
  aiAssert,
  destroy: async () => {},
}) };
`
);

const setControl = (obj) => fs.writeFileSync(control, JSON.stringify(obj));
const getCounters = () => JSON.parse(fs.readFileSync(counters, "utf8"));
const readCache = () => (fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, "utf8")) : []);

// ---------- daemon lifecycle ----------
let child = null;
let lastErr = "";
async function startDaemon(extraEnv = {}) {
  child = spawn(process.execPath, [MIDAGENT, "serve"], {
    cwd: work,
    env: {
      ...process.env,
      MIDAGENT_PORT: String(PORT),
      MIDAGENT_SETTLE_MS: "40", // fast probes in tests; the loop itself is scenario 5
      // require() resolves from midagent.js's own dir — point NODE_PATH at the stub
      NODE_PATH: [path.join(work, "node_modules"), process.env.NODE_PATH].filter(Boolean).join(path.delimiter),
      ...extraEnv,
    },
    stdio: ["ignore", "ignore", "pipe"],
  });
  child.stderr.on("data", (d) => { lastErr = String(d); });
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`${BASE}/ping`).then((r) => r.json());
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`daemon did not come up — stderr: ${lastErr}`);
}
async function stopDaemon() {
  try {
    await fetch(`${BASE}/stop`, { method: "POST" });
  } catch {}
  await new Promise((r) => {
    const t = setTimeout(r, 2000);
    child.once("exit", () => { clearTimeout(t); r(); });
  });
}
const post = (ep, body) =>
  fetch(`${BASE}${ep}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionDir: session, ...body }),
  }).then((r) => r.json().then((j) => ({ status: r.status, ...j })));

// ---------- scenarios ----------
try {
  fs.mkdirSync(session, { recursive: true });
  setControl({ screens: ["rich1.png"], actThrows: false, assertPass: true });

  await startDaemon();

  // 1 — passing assert persists, hits after a daemon restart
  let r = await post("/assert", { prompt: "the home screen is visible" });
  check("1a first assert runs the model", r.llm === true && r.pass === true);
  r = await post("/assert", { prompt: "the home screen is visible" });
  check("1b repeat assert hits in-process cache", r.cached === true);
  await stopDaemon();
  await startDaemon();
  r = await post("/assert", { prompt: "the home screen is visible" });
  check("1c assert hits across restart (persistent)", r.cached === true && r.llm === false, JSON.stringify(r));

  // 2 — invalidate drops exactly that prompt; verbatim re-assert runs fresh
  r = await post("/cache/invalidate", { prompt: "the home screen is visible" });
  check("2a invalidate removes the stored verdict", r.removed === 1, JSON.stringify(r));
  r = await post("/assert", { prompt: "the home screen is visible" });
  check("2b re-assert after invalidate runs the model", r.llm === true && r.pass === true);
  r = await post("/assert", { prompt: "the home screen is visible" });
  check("2c verdict re-cached for future hits", r.cached === true);

  // 3 — failing assert never persists
  setControl({ screens: ["rich2.png"], actThrows: false, assertPass: false });
  r = await post("/assert", { prompt: "the export dialog is open" });
  check("3a failing assert reports fail", r.pass === false && r.llm === true);
  check("3b failing assert leaves no cache entry", !readCache().some((e) => e.prompt === "the export dialog is open"));
  setControl({ screens: ["rich2.png"], actThrows: false, assertPass: true });
  r = await post("/assert", { prompt: "the export dialog is open" });
  check("3c same prompt+screen re-runs after a failure (no fake-negative poison)", r.llm === true);

  // 4 — low-information frames bypass the cache both ways
  setControl({ screens: ["blank.png"], actThrows: false, assertPass: true });
  r = await post("/assert", { prompt: "the screen shows a desktop" });
  check("4a low-info assert is flagged", /low-information/.test(r.msg || ""), r.msg);
  r = await post("/assert", { prompt: "the screen shows a desktop" });
  check("4b low-info assert is not cached", r.llm === true && !r.cached, JSON.stringify(r));
  check("4c low-info leaves no cache entry", !readCache().some((e) => e.prompt === "the screen shows a desktop"));

  // 5 — settle gate: a frame is used only after consecutive frames match
  setControl({ screens: ["rich1.png", "rich2.png", "rich2.png"], actThrows: false, assertPass: true });
  const before = getCounters().shots;
  r = await post("/assert", { prompt: "settled screen check" });
  const used = getCounters().shots - before;
  check("5a assert waited for the screen to settle (3 captures: rich1→rich2→rich2)", used === 3, `captures used: ${used}`);
  check("5b settled assert judged the stable frame", r.llm === true && r.pass === true);

  // 6 — retry gate reuses only SUCCEEDED acts
  setControl({ screens: ["rich2.png"], actThrows: true, assertPass: true });
  r = await post("/act", { prompt: "open the Export dialog, choose CSV, name the file ledger-2026, click Save" });
  check("6a failed act errors out", r.status === 500, JSON.stringify(r));
  setControl({ screens: ["rich2.png"], actThrows: false, assertPass: true });
  r = await post("/act", { prompt: "open the Export dialog, choose CSV, name the file ledger-2026, click Save" });
  check("6b same act prompt after failure re-executes (gate stays open)", r.llm === true && getCounters().acts === 2);
  r = await post("/act", { prompt: "open the Export dialog, choose CSV, name the file ledger-2026, click Save" });
  check("6c idempotent re-dispatch after success hits the gate", r.cached === true && getCounters().acts === 2);

  // 7 — acts never persist across restarts
  await stopDaemon();
  await startDaemon();
  r = await post("/act", { prompt: "open the Export dialog, choose CSV, name the file ledger-2026, click Save" });
  check("7 act re-runs after daemon restart (acts are imperative)", r.llm === true && getCounters().acts === 3, JSON.stringify(r));

  // 8 — element-level prompts get an advisory note, still execute
  r = await post("/act", { prompt: "click login" });
  check("8 element-level prompt noted but executed", r.llm === true && typeof r.note === "string");

  // 9 — cache file holds only passing assertion entries
  const entries = readCache();
  check(
    "9 cache file holds only passing asserts",
    entries.length > 0 && entries.every((e) => e.kind === "assert" && e.result && e.result.pass === true),
    JSON.stringify(entries.map((e) => [e.prompt, e.result && e.result.pass]))
  );

  await stopDaemon();
} finally {
  try { await stopDaemon(); } catch {}
  fs.rmSync(work, { recursive: true, force: true });
}

console.log(failures.length ? `\n${failures.length} check(s) FAILED` : "\nall checks passed");
process.exit(failures.length ? 1 : 0);

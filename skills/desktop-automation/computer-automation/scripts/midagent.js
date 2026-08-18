#!/usr/bin/env node
/**
 * midagent.js — persistent session daemon for the midscene SDK
 *
 * Session state lives in this process, implementing "local compare, LLM on demand":
 *   - Connect once, health-check once (the CLI repeats both on every call)
 *   - Settle gate: every capture waits for two consecutive strict-identical frames
 *     before it is used (asserting a transition frame produces a verdict on a half-drawn
 *     screen and a cache key that never hits again; MIDAGENT_SETTLE_PROBES=0 disables)
 *   - Local screenshot diff (screen-diff.py --strict): screen unchanged → zero LLM
 *   - Persistent result cache (screen-diff.py --hash + .midscene/.cache.json) for
 *     ASSERTIONS ONLY, and only PASSING ones: same screen (dHash hamming ≤
 *     MIDAGENT_CACHE_DIST) + exact same prompt → the cached verdict, across sessions.
 *     Asserts are pure functions of the screen, so this is safe; failures never cache
 *     (a repeat simply re-runs), and low-information frames (near-blank screens where
 *     dHash keys collide) bypass the cache in both directions.
 *   - ACTS are imperative — a cached act result would mean skipping the action itself —
 *     so an act reuses the last result in-process only when the screen is strict-
 *     identical, the prompt repeats immediately, AND the previous attempt succeeded;
 *     after a failed attempt the gate stands open and the act re-executes. Never
 *     persisted. Refresh with mid.sh cache invalidate "<prompt>"; reset with cache clear.
 *
 * Start: node midagent.js serve        (pair with mid.sh agent start)
 * Port: 127.0.0.1:39417 (override with MIDAGENT_PORT)
 */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = process.cwd();
const MDS = path.join(ROOT, ".midscene");
const PORT = Number(process.env.MIDAGENT_PORT || 39417);
const SCREEN_DIFF = path.join(__dirname, "screen-diff.py");
const PCACHE_FILE = path.join(MDS, ".cache.json");
// 0 disables the persistent cache; distance is dHash hamming bits (≤ 4): same screen
// with a clock/caret change lands at 1–2 bits; degenerate near-blank screens can
// collide higher, hence the tight default.
const CACHE_MAX = Number(process.env.MIDAGENT_CACHE_MAX ?? 200);
const CACHE_DIST = Number(process.env.MIDAGENT_CACHE_DIST ?? 4);
// Settle gate: a capture is "settled" when two consecutive frames are strict-identical.
// Default: up to 8 probes 400 ms apart (~3 s worst case). 0 disables (capture immediately).
const SETTLE_PROBES = Number(process.env.MIDAGENT_SETTLE_PROBES ?? 8);
const SETTLE_MS = Number(process.env.MIDAGENT_SETTLE_MS ?? 400);

// 1) Load .env (never override existing env vars; model config is read at first AI call,
//    so late loading is fine)
if (fs.existsSync(path.join(ROOT, ".env"))) {
  for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

let agent = null;
let startedAt = null;
let lastFrame = null; // most recently captured frame path (gate baseline)
let lastAct = null; // { prompt, result?, ok } — in-process act retry gate (never persisted)
let pcache = []; // [{ h: dHashHex, kind: "assert", prompt, result, ts }] — passing assertions only

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- local diff (strict mode: any >=0.05% change is a real state change) ----------
function diffStrict(a, b) {
  try {
    return execFileSync("python3", [SCREEN_DIFF, "--strict", a, b], {
      encoding: "utf8",
    }).trim();
  } catch (e) {
    // exit 1 = CHANGED; stdout still carries "CHANGED ..." text
    return String(e.stdout || "").trim() || "CHANGED";
  }
}

function screenSame(a, b) {
  return diffStrict(a, b).startsWith("SAME");
}

// A near-blank frame (solid color, empty canvas, spinner-on-flat) has a dHash that
// collides with other near-blank frames — keying a cache on it is unreliable. Ask
// screen-diff.py whether the frame carries enough information to be a cache key.
function lowInfo(file) {
  try {
    return execFileSync("python3", [SCREEN_DIFF, "--lowinfo", file], {
      encoding: "utf8",
    }).trim() === "LOWINFO";
  } catch {
    return false; // detector unavailable → do not cripple the cache over it
  }
}

// ---------- persistent result cache (screen hash + exact prompt → result) ----------
function dhashHex(file) {
  try {
    return (
      execFileSync("python3", [SCREEN_DIFF, "--hash", file], {
        encoding: "utf8",
      }).trim() || null
    );
  } catch (e) {
    return String(e.stdout || "").trim() || null;
  }
}

function hammingHex(aHex, bHex) {
  let x = BigInt("0x" + aHex) ^ BigInt("0x" + bHex);
  let c = 0;
  while (x) {
    c += Number(x & 1n);
    x >>= 1n;
  }
  return c;
}

function pcacheLoad() {
  try {
    const raw = JSON.parse(fs.readFileSync(PCACHE_FILE, "utf8"));
    pcache = Array.isArray(raw) ? raw : [];
  } catch {
    pcache = [];
  }
}

function pcachePersist() {
  try {
    fs.mkdirSync(MDS, { recursive: true });
    const tmp = PCACHE_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(pcache));
    fs.renameSync(tmp, PCACHE_FILE);
  } catch {}
}

function pcacheLookup(prompt, h, skip) {
  if (skip || !h || CACHE_MAX <= 0) return null;
  let best = null;
  for (const e of pcache) {
    if (e.prompt !== prompt) continue;
    const d = hammingHex(e.h, h);
    if (d <= CACHE_DIST && (!best || d < best.d)) best = { ...e, d };
  }
  return best;
}

function pcacheStore(prompt, h, result) {
  if (!h || CACHE_MAX <= 0) return;
  // A failed assert is never persisted: a collision on a similar screen would poison a
  // rerun with a fake FAIL (and trigger pointless bisection), while re-running a true
  // FAIL on an unchanged screen costs exactly one AI call.
  if (!result.pass) return;
  // The cache key is (kind=assert, prompt, screen): evict only same-prompt entries on a
  // perceptually same screen (within CACHE_DIST) — the same prompt on a different
  // screen is a distinct verdict and must survive.
  pcache = pcache.filter(
    (e) => !(e.prompt === prompt && hammingHex(e.h, h) <= CACHE_DIST)
  );
  pcache.push({ h, kind: "assert", prompt, result, ts: new Date().toISOString() });
  while (pcache.length > CACHE_MAX) pcache.shift();
  pcachePersist();
}

// ---------- screenshot ----------
async function captureTo(dir, name) {
  const b64 = await agent.page.screenshotBase64();
  const data = b64.replace(/^data:[^,]+,/, ""); // strip the data URI prefix
  const p = path.join(dir, name);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, Buffer.from(data, "base64"));
  return p;
}

// Capture only after the screen settles: consecutive frames strict-identical. Used for
// every act/assert/shot capture — acting on or judging a half-drawn transition is how
// optimistic flows produce phantom failures. A screen that never settles (video,
// animation) falls through after SETTLE_PROBES with the latest frame.
// Returns { cap, prev }: cap is the settled frame (.last.png); prev is the baseline
// frame from BEFORE this capture (.prev.png, or null on the first capture). Callers
// must diff against prev, not against a remembered .last.png path — .last.png is
// overwritten in place, so a remembered path would compare the file with itself.
async function settledCapture(dir) {
  const last = path.join(dir, ".last.png");
  const prevPath = path.join(dir, ".prev.png");
  if (fs.existsSync(last)) fs.copyFileSync(last, prevPath); // preserve the prior baseline
  const names = [".settle-0.png", ".settle-1.png"];
  let p0 = await captureTo(dir, names[0]);
  let cur = p0;
  for (let i = 0; i < SETTLE_PROBES; i++) {
    await sleep(SETTLE_MS);
    cur = await captureTo(dir, names[(i + 1) % 2]);
    if (screenSame(p0, cur)) break;
    p0 = cur;
  }
  fs.copyFileSync(cur, last);
  return { cap: last, prev: fs.existsSync(prevPath) ? prevPath : null };
}

// ---------- HTTP ----------
function readBody(req) {
  return new Promise((resolve, reject) => {
    let d = "";
    req.on("data", (c) => (d += c));
    req.on("end", () => {
      try {
        resolve(d ? JSON.parse(d) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

function json(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

function sessionDirOf(body) {
  if (body.sessionDir) return body.sessionDir;
  const f = path.join(MDS, ".current");
  return fs.existsSync(f) ? fs.readFileSync(f, "utf8").trim() : null;
}

async function handle(req, res) {
  const url = req.url.split("?")[0];

  if (req.method === "GET" && url === "/ping")
    return json(res, 200, { ok: !!agent });
  if (req.method === "GET" && url === "/status")
    return json(res, 200, {
      ok: !!agent,
      startedAt,
      lastFrame,
      cacheEntries: pcache.length,
      cacheMax: CACHE_MAX,
      cacheDist: CACHE_DIST,
      settleProbes: SETTLE_PROBES,
      settleMs: SETTLE_MS,
    });
  if (req.method === "POST" && url === "/cache/clear") {
    pcache = [];
    try {
      fs.unlinkSync(PCACHE_FILE);
    } catch {}
    return json(res, 200, { ok: true, msg: "persistent cache cleared" });
  }
  if (req.method === "POST" && url === "/stop") {
    try {
      await agent?.destroy?.();
    } catch {}
    json(res, 200, { ok: true });
    setTimeout(() => process.exit(0), 100);
    return;
  }
  if (req.method !== "POST") return json(res, 405, { error: "method not allowed" });

  let body = {};
  try {
    body = await readBody(req);
  } catch (e) {
    return json(res, 400, { error: "bad json body" });
  }

  // Drop one prompt's cached verdicts (no session needed). The staleness refresh:
  // `cache invalidate` + re-assert the same verbatim prompt → a fresh verdict without
  // re-wording (the wording, not the verdict, is what future cache hits key on).
  if (url === "/cache/invalidate") {
    const prompt = String(body.prompt || "");
    if (!prompt) return json(res, 400, { error: "prompt required" });
    const before = pcache.length;
    pcache = pcache.filter((e) => e.prompt !== prompt);
    pcachePersist();
    const removed = before - pcache.length;
    return json(res, 200, {
      ok: true,
      removed,
      msg: removed
        ? `invalidated ${removed} cached verdict(s) for this prompt — re-assert it verbatim for a fresh one`
        : "no cached verdicts for this prompt",
    });
  }

  const dir = sessionDirOf(body);
  if (!dir) return json(res, 400, { error: "no active session (run mid.sh start first)" });
  if (!agent) return json(res, 503, { error: "daemon not connected" });

  // POST /shot { purpose } —— record only changed frames (diff against the PREVIOUS
  // baseline, preserved by settledCapture in .prev.png)
  if (url === "/shot") {
    const purpose = String(body.purpose || "step").replace(/[^A-Za-z0-9._-]/g, "-");
    const { cap, prev } = await settledCapture(dir);
    let saved = false;
    let pathOut = null;
    let msg;
    if (prev && screenSame(prev, cap)) {
      msg = `SKIP identical to ${path.basename(prev)}, not re-archived`;
    } else {
      const shots = path.join(dir, "screenshots");
      fs.mkdirSync(shots, { recursive: true });
      let seq = 1;
      const last = fs
        .readdirSync(shots)
        .map((f) => /^(\d+)/.exec(f)?.[1])
        .filter(Boolean)
        .map(Number)
        .sort((a, b) => a - b)
        .pop();
      if (last) seq = last + 1;
      const fname = String(seq).padStart(3, "0") + "-" + purpose + ".png";
      pathOut = path.join(shots, fname);
      fs.copyFileSync(cap, pathOut);
      saved = true;
      msg = `archived: ${path.join("screenshots", fname)}`;
    }
    lastFrame = cap;
    return json(res, 200, { ok: true, saved, path: pathOut, msg });
  }

  // POST /act { prompt } —— in-process retry gate only: strict-identical screen + the
  // exact same prompt re-sent immediately + the previous attempt SUCCEEDED → reuse the
  // last result (idempotent re-dispatch). A FAILED attempt leaves the gate open, so a
  // retry re-executes for real. Never persisted — an act's value is the state change it
  // performs, so a cached act result is a skipped action, not a saving.
  if (url === "/act") {
    const prompt = String(body.prompt || "");
    if (!prompt) return json(res, 400, { error: "prompt required" });
    const { cap, prev } = await settledCapture(dir);
    // "Unchanged" = identical to the PREVIOUS baseline (.prev.png), not to a remembered
    // .last.png path — that file was just overwritten in place and would self-compare.
    const unchanged = prev && fs.existsSync(prev) && screenSame(prev, cap);
    if (unchanged && lastAct && lastAct.ok && lastAct.prompt === prompt) {
      lastFrame = cap;
      return json(res, 200, {
        ok: true,
        cached: true,
        llm: false,
        result: lastAct.result,
        msg: "CACHED screen unchanged + same act prompt re-sent after success, reused last result (retry gate)",
      });
    }
    let result;
    try {
      result = await agent.aiAct(prompt);
    } catch (e) {
      lastAct = { prompt, ok: false }; // failed attempt: gate stays open, a retry re-executes
      throw e;
    }
    lastFrame = cap;
    lastAct = { prompt, result, ok: true };
    // Advisory only: an element-level prompt burns a full planning cycle on one click
    // and drags the orchestrator into per-element interaction — the shape the session
    // exists to avoid. Judgment stays with the caller.
    const compact = prompt.replace(/\s+/g, "").length;
    const note =
      compact < 24
        ? "note: this prompt reads element-level — prefer one act carrying the whole flow (each step + its intended effect)"
        : undefined;
    return json(res, 200, { ok: true, cached: false, llm: true, result, ...(note ? { note } : {}), msg: "act done" });
  }

  // POST /assert { prompt, message? } —— settle, then judge; persistent PASS-only cache
  if (url === "/assert") {
    const prompt = String(body.prompt || "");
    if (!prompt) return json(res, 400, { error: "prompt required" });
    const { cap } = await settledCapture(dir);
    const h = dhashHex(cap);
    const unkeyable = lowInfo(cap); // near-blank frame: dHash keys collide — bypass cache both ways
    const hit = pcacheLookup(prompt, h, unkeyable);
    if (hit) {
      lastFrame = cap;
      return json(res, 200, {
        ok: true,
        cached: true,
        llm: false,
        ...hit.result,
        msg: `CACHED screen matches (hamming ${hit.d}/${CACHE_DIST}) + same prompt, reused assertion result (zero LLM)`,
      });
    }
    const r = await agent.aiAssert(prompt, body.message || undefined);
    // Verdict integrity: with some model+SDK combos the model answers correctly but the
    // SDK fails to parse the response — surfacing as a FAILED assert with empty thought
    // AND empty message. Report UNRELIABLE instead of a fake FAIL; never cache it.
    if (r?.pass === undefined && !r?.thought && !r?.message) {
      lastFrame = cap;
      return json(res, 200, {
        ok: true,
        cached: false,
        llm: true,
        unreliable: true,
        pass: null,
        msg: "UNRELIABLE verdict — the model answered but the SDK could not parse it (failed assert with empty thought+message). Cross-check midscene_run/log/ai-call.log or a reference image before recording anything; record the model+SDK combo in the screen map's hints.",
      });
    }
    const result = {
      pass: !!r?.pass,
      thought: r?.thought ?? null,
      message: r?.message ?? null,
    };
    lastFrame = cap;
    if (!unkeyable) pcacheStore(prompt, h, result);
    return json(res, 200, {
      ok: true,
      cached: false,
      llm: true,
      ...result,
      msg:
        (unkeyable ? "low-information frame — not cacheable; " : "") +
        (result.pass ? "Assertion passed." : "Assertion failed."),
    });
  }

  return json(res, 404, { error: "unknown endpoint" });
}

// ---------- lifecycle ----------
async function main() {
  pcacheLoad();
  const { agentForComputer } = require("@midscene/computer");
  const t0 = Date.now();
  agent = await agentForComputer({});
  startedAt = new Date().toISOString();
  console.error(`[midagent] connected in ${Date.now() - t0}ms, listening on :${PORT}`);

  const server = http.createServer(async (req, res) => {
    try {
      await handle(req, res);
    } catch (e) {
      try {
        json(res, 500, { error: String(e?.message || e) });
      } catch (_) {}
    }
  });
  server.listen(PORT, "127.0.0.1", () => {
    console.error(`[midagent] ready http://127.0.0.1:${PORT}`);
  });

  for (const sig of ["SIGINT", "SIGTERM"]) {
    process.on(sig, async () => {
      try {
        await agent?.destroy?.();
      } catch {}
      process.exit(0);
    });
  }
}

main().catch((e) => {
  console.error("[midagent] FATAL:", e?.message || e);
  process.exit(1);
});

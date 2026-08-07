#!/usr/bin/env node
/**
 * midagent.js — persistent session daemon for the midscene SDK
 *
 * Session state lives in this process, implementing "local compare, LLM on demand":
 *   - Connect once, health-check once (the CLI repeats both on every call)
 *   - Local screenshot diff (screen-diff.py --strict): screen unchanged → zero LLM
 *   - act/assert gate: screen unchanged + same prompt → return the cached result
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
let cache = null; // { prompt, kind, result }

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

// ---------- screenshot ----------
async function captureTo(dir, name) {
  const b64 = await agent.page.screenshotBase64();
  const data = b64.replace(/^data:[^,]+,/, ""); // strip the data URI prefix
  const p = path.join(dir, name);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, Buffer.from(data, "base64"));
  return p;
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
      cachePrompt: cache ? cache.prompt : null,
    });
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

  const dir = sessionDirOf(body);
  if (!dir) return json(res, 400, { error: "no active session (run mid.sh start first)" });
  if (!agent) return json(res, 503, { error: "daemon not connected" });

  // POST /shot { purpose } —— record only changed frames
  if (url === "/shot") {
    const purpose = String(body.purpose || "step").replace(/[^A-Za-z0-9._-]/g, "-");
    const cap = await captureTo(dir, ".last.png");
    let saved = false;
    let pathOut = null;
    let msg;
    if (lastFrame && fs.existsSync(lastFrame) && screenSame(lastFrame, cap)) {
      msg = `SKIP identical to ${path.basename(lastFrame)}, not re-archived`;
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

  // POST /act { prompt } —— gate: screen unchanged + same prompt → cached, zero LLM
  if (url === "/act") {
    const prompt = String(body.prompt || "");
    if (!prompt) return json(res, 400, { error: "prompt required" });
    const cap = await captureTo(dir, ".last.png");
    const unchanged =
      lastFrame && fs.existsSync(lastFrame) && screenSame(lastFrame, cap);
    if (unchanged && cache && cache.prompt === prompt && cache.kind === "act") {
      lastFrame = cap;
      return json(res, 200, { ok: true, cached: true, llm: false, result: cache.result, msg: "CACHED screen unchanged, reused last result (zero LLM)" });
    }
    const result = await agent.aiAct(prompt);
    lastFrame = cap;
    cache = { prompt, kind: "act", result };
    return json(res, 200, { ok: true, cached: false, llm: true, result, msg: "act done" });
  }

  // POST /assert { prompt, message? } —— same gate as above
  if (url === "/assert") {
    const prompt = String(body.prompt || "");
    if (!prompt) return json(res, 400, { error: "prompt required" });
    const cap = await captureTo(dir, ".last.png");
    const unchanged =
      lastFrame && fs.existsSync(lastFrame) && screenSame(lastFrame, cap);
    if (unchanged && cache && cache.prompt === prompt && cache.kind === "assert") {
      lastFrame = cap;
      return json(res, 200, { ok: true, cached: true, llm: false, ...cache.result, msg: "CACHED screen unchanged, reused last assertion result (zero LLM)" });
    }
    const r = await agent.aiAssert(prompt, body.message || undefined);
    const result = {
      pass: !!r?.pass,
      thought: r?.thought ?? null,
      message: r?.message ?? null,
    };
    lastFrame = cap;
    cache = { prompt, kind: "assert", result };
    return json(res, 200, { ok: true, cached: false, llm: true, ...result, msg: result.pass ? "Assertion passed." : "Assertion failed." });
  }

  return json(res, 404, { error: "unknown endpoint" });
}

// ---------- lifecycle ----------
async function main() {
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

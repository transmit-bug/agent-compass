---
name: computer-automation
description: |
  Operation layer of the desktop-automation group: Midscene desktop automation — persistent session
  daemon, diff-gated screenshots, archived reports. Drives the local desktop
  (macOS/Windows/Linux) or a remote Windows host over RDP. ⚠️ Takes over the real mouse and
  keyboard in local mode.
disable-model-invocation: true
allowed-tools:
  - Bash
  - Read
---

# Computer Automation (operation layer)

Vision-driven desktop control through Midscene, run as a **session**: one persistent daemon
owns the connection, a local diff gate skips identical frames (zero LLM), and everything is
archived. You are the brain — look at the screen, act, verify, report.

For desktop-native apps (Electron, Qt, native macOS/Windows/Linux) or a remote Windows host
via RDP. For web apps, prefer a browser-automation skill — this one takes over the real
mouse and keyboard in local mode.

## Dependencies

- `@midscene/computer` — daemon (`scripts/midagent.js`) or `npx -y @midscene/computer@1` (stateless CLI fallback)
- node ≥ 18, python3 + Pillow (`scripts/screen-diff.py`)
- Model config (`MIDSCENE_MODEL_*`) is read from `.env` in the working directory — **assumed already configured**. If a model error appears, check `.env` first.

## Setup

The daemon resolves `@midscene/computer` from the project's `node_modules` first, falling
back to a machine-wide global install:

```bash
npm i -g @midscene/computer        # one-time, machine-wide — found via NODE_PATH fallback
# alternative: project-local dev dependency (npm i -D @midscene/computer), the reference setup
```

## Session loop — preferred path

Run `<skill-dir>/scripts/mid.sh <cmd>` from the project cwd (artifacts land in `./.midscene/`).

| Step | Command | Effect |
|---|---|---|
| Start daemon | `scripts/mid.sh agent start` | connect once, health-checked (~0.4s vs ~6s per CLI call) |
| Open session | `scripts/mid.sh start <slug>` | creates `.midscene/<slug>/` (auto `-2/-3` on name clash) |
| Look | `scripts/mid.sh shot <purpose>` | screenshot archived; identical frames **SKIPPED** (diff gate) |
| Act | `scripts/mid.sh act "<whole flow>"` | one high-level prompt carrying a whole flow |
| Verify | `scripts/mid.sh assert "<condition>"` | natural-language screen check, no UI action |
| Refresh | `scripts/mid.sh cache invalidate "<prompt>"` | drop one prompt's cached verdicts — re-assert it verbatim for a fresh one |
| Finish | `scripts/mid.sh finish` | merge reports → `index.md` → cleanup, keep last 20 |
| Stop daemon | `scripts/mid.sh agent stop` | release the connection |
| List | `scripts/mid.sh ls` | archived sessions |

Artifacts in `.midscene/<slug>/`: `index.md` (per-step conclusions), merged `report.html` +
`report.md`, `screenshots/NNN-<purpose>.png`. When the daemon is down, `mid.sh` falls back to
the stateless CLI automatically. One daemon drives one connection — for parallel agents in
one project, pin a session per shell with `export MIDSCENE_SESSION=<slug>` (separate session
pointers), or run a second daemon on another port (`MIDAGENT_PORT`).

Before planning acts: if a **screen map** exists (`.midscene/screens.md`), read it — proven
routes and verbatim prompts (→ cache hits, zero LLM). At `finish`, merge what this session
learned back into it. The contract is owned by the **screen-verify** skill (same group,
model-invoked primitive).

## Why the session — the cost gate

Most consecutive frames are identical (measured 80–100%), and every capture waits for the
screen to **settle** (two consecutive identical frames) before it is judged — asserting a
half-drawn transition produces a phantom failure and a cache key that never hits again.
Past the settle gate, the daemon compares each new frame to the last locally before the
model ever runs: unchanged screen → skip the AI; a repeated `act` on an unchanged screen
reuses the last **successful** result (retry gate — a failed act always re-executes); a
**passing assertion** on a same screen (perceptual hash) with the **exact same prompt**
returns the cached verdict from `.midscene/.cache.json` — across sessions. **Zero LLM on
no-ops and re-assertions.** Failed assertions and low-information frames (near-blank
screens whose hash collides) are never cached. `mid.sh cache stats` inspects the cache,
`mid.sh cache invalidate "<prompt>"` refreshes one prompt (the staleness move — the wording
stays verbatim, only the verdict is re-derived), `mid.sh cache clear` resets everything
(after a model or app update). The session is done when `finish` has archived the report.

## Rules

1. **One command at a time, synchronous.** Never background, never chain — each output
   (especially the screenshot) feeds the next decision. Commands take ~1 min (AI inference);
   that is not a hang.
2. **One `act` per coherent flow — never per element.** Midscene plans-executes-replans
   *inside* a single `act` with shared context; between calls it shares nothing. Every
   `act` is a full planning cycle, so an element-level prompt (`act "click the login
   button"`) buys one click for one cycle and drags you into orchestrating the UI
   element-by-element — the slow, expensive shape this session exists to avoid. Give `act`
   the whole flow: every operation with its intended effect, ending in the state that
   proves it done — "fill in the username and password, click Login, and confirm the home
   screen loads"; longer flows ("open the Export dialog, choose CSV, name the file
   ledger-2026, click Save, and confirm the saved toast") are the norm. If a prompt names a
   single element, fold it into its neighboring flow. Verify with `assert`, not by
   splitting the flow. State the irreversible steps so the act-vs-ask gate can fire before
   anything runs. (The daemon notes act prompts that read element-level — advisory only.)
3. **Optimistic flow, lazy verification.** After a flow `act`, assert the **terminal state**
   only — the daemon settles the screen before judging, so the verdict lands on the finished
   state, not a transition frame. On failure, bisect: `assert` the intermediate checkpoints
   to locate the last-good state, re-plan the remainder, `act` from there. Per-step asserts
   are the smoke skill's contract, not the default.
4. **Verdict-driven, image-free.** Orchestrating means plan → `act` → `assert` → repeat;
   every screen question goes through `assert` (cacheable, structured verdict). Reading a
   screenshot yourself bloats your window for the rest of the session and never caches.
   `shot` is a last-resort diagnostic — an element `act` cannot find, evidence for the user —
   and the screen-map builder (first encounter).
5. **Reuse prompts verbatim.** When the screen map holds a proven prompt for the step, run it
   word-for-word: exact assert prompt + same screen is a persistent-cache hit (zero LLM).
   Rewording is a cache miss and a fresh experiment.
6. **Foreground the app first.** `open -a <App>` (macOS) / `start <App>` (Windows), then
   `assert` it is visible. Avoid launcher-search flows through midscene.
7. **Be specific about elements**: color, position, surrounding text ("the yellow minimize
   button in the top-left corner of the Safari window").
8. **Minimize, don't close.** Never close an app or window unless the user explicitly asks.
9. **On failure, one diagnostic `shot`** — re-read and re-describe the element; check it is
   not behind another window — don't continue blindly.
10. **RDP (remote Windows host)**: `npx -y @midscene/computer@1 connect --host <fqdn> --username <user> --password "$RDP_PASSWORD"`, and repeat those flags on every command (each CLI invocation reconnects). Full RDP reference: [references/command-reference.md](references/command-reference.md) → **Connect via RDP**.
11. **Report before finishing**: outcome, key data, paths of generated files. Never end silently.

## Long tasks

Midscene decomposes inside a single `act` but shares nothing between calls — **you are the
memory across calls, not the eyes**. Plan the route on the screen map; per leg: `act` the
whole leg → `assert` the terminal anchor → on failure bisect with checkpoint asserts →
resume from the last-good anchor. Update the map at `finish`.

## Advanced options

`tap --locate` (precise targeting from a reference image), `assert --image`, `record` +
`assert --record` (transient UI), `report-tool`, `--deep-locate` / `--deep-think`, and
troubleshooting: see [references/command-reference.md](references/command-reference.md).
Cache/gate semantics are locked by a regression suite (stubbed SDK, no LLM):
`node scripts/test/regression.mjs`.

## Example — one session end to end

```bash
scripts/mid.sh agent start
scripts/mid.sh start demo
scripts/mid.sh act "in Safari, type hello world in the search field and press Enter"
scripts/mid.sh assert "a result list is visible"
scripts/mid.sh finish
scripts/mid.sh agent stop
```

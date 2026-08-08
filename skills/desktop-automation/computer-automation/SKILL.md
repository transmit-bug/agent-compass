---
name: computer-automation
description: |
  Operation layer of the computeruse group: Midscene desktop automation — persistent session
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
| Act | `scripts/mid.sh act "<whole task>"` | click/type/drag/scroll/keys — one high-level prompt |
| Verify | `scripts/mid.sh assert "<condition>"` | natural-language screen check, no UI action |
| Finish | `scripts/mid.sh finish` | merge reports → `index.md` → cleanup, keep last 20 |
| Stop daemon | `scripts/mid.sh agent stop` | release the connection |
| List | `scripts/mid.sh ls` | archived sessions |

Artifacts in `.midscene/<slug>/`: `index.md` (per-step conclusions), merged `report.html` +
`report.md`, `screenshots/NNN-<purpose>.png`. When the daemon is down, `mid.sh` falls back to
the stateless CLI automatically.

## Why the session — the cost gate

Most consecutive frames are identical (measured 80–100%). The daemon compares each new frame
to the last locally before the model ever runs: unchanged screen → skip the AI; unchanged
screen **and** the same `act`/`assert` prompt → return the cached result. **Zero LLM on
no-ops.** The session is done when `finish` has archived the report.

## Rules

1. **One command at a time, synchronous.** Never background, never chain — each output
   (especially the screenshot) feeds the next decision. Commands take ~1 min (AI inference);
   that is not a hang.
2. **Give `act` whole tasks.** Consecutive operations in one app belong in one prompt
   ("search for X, click the first result, scroll down") — fewer screenshot-analyze cycles.
3. **Foreground the app first.** `open -a <App>` (macOS) / `start <App>` (Windows), screenshot
   to confirm it is visible, then automate. Avoid launcher-search flows through midscene.
4. **Be specific about elements**: color, position, surrounding text ("the yellow minimize
   button in the top-left corner of the Safari window").
5. **Minimize, don't close.** Never close an app or window unless the user explicitly asks.
6. **On failure, re-screenshot and re-describe** the element; check it is not behind another
   window — don't continue blindly.
7. **RDP (remote Windows host)**: `npx -y @midscene/computer@1 connect --host <fqdn> --username <user> --password "$RDP_PASSWORD"`, and repeat those flags on every command (each CLI invocation reconnects). Full RDP reference: [references/command-reference.md](references/command-reference.md) → **Connect via RDP**.
8. **Report before finishing**: outcome, key data, paths of generated files. Never end silently.

## Advanced options

`tap --locate` (precise targeting from a reference image), `assert --image`, `record` +
`assert --record` (transient UI), `report-tool`, `--deep-locate` / `--deep-think`, and
troubleshooting: see [references/command-reference.md](references/command-reference.md).

## Example — one session end to end

```bash
scripts/mid.sh agent start
scripts/mid.sh start demo
scripts/mid.sh shot initial
scripts/mid.sh act "type hello world in the search field and press Enter"
scripts/mid.sh assert "a result list is visible"
scripts/mid.sh finish
scripts/mid.sh agent stop
```

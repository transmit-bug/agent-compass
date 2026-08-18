---
name: screen-smoke
description: Launch a built desktop app and drive its core business flow end-to-end, asserting each step, with one PASS/FAIL report.
disable-model-invocation: true
allowed-tools:
  - Bash
  - Read
---

# Screen Smoke (business layer)

Build verification for desktop apps: launch the build, walk the core business flow
(fill → submit → export → close), assert each step, and deliver one **PASS / FAIL** report
with per-step evidence. Invoked by name — "use screen-smoke on the app to verify the
export flow".

Run the **screen-verify** discipline for verdicts, evidence, and the screen map; the
machinery — `mid.sh` session, daemon, persistent cache — is **computer-automation**'s:
invoke it by name alongside this one.

## The run

1. **Define the flow first**: list the steps with a pass condition per step — the user
   provides them, or you propose and confirm before driving anything. A re-run flow should
   already live on the screen map as a route — reuse its verbatim prompts.
2. **Session**: `mid.sh start <slug>`; launch the app (`open -a <App>` / `start <App>`),
   confirm it is visible.
3. For each step, in order:
   - `mid.sh act "<step — state the goal and the expected effect>"` (one `act` per flow
     step);
   - `mid.sh assert "<pass condition>"` → record the step verdict (pass = match or
     expected drift, per screen-verify). `shot` only on failure, for evidence.
4. **On a failing step**: stop the flow there — do not skip ahead or guess the rest. Show
   the failure and the last-good screenshot; ask the user whether to continue or abort.
5. **Finish**: `mid.sh finish` → merged report + `index.md`; merge the flow's verified
   prompts back into the screen map.

## Report — the run is complete when

the report names: overall PASS / FAIL, per-step verdicts, the failing step with evidence
(screenshot paths, assertion output), and the generated file paths.

## Boundaries

- Read-only over the app under test: it drives the flow, it never changes code or config.
  For changing code, use **screen-fixer** (same group).

---
name: smoke-runner
description: Launch a built desktop app and drive its core business flow end-to-end, asserting each step, with one PASS/FAIL report.
disable-model-invocation: true
allowed-tools:
  - Bash
  - Read
---

# Smoke Runner (business layer)

Build verification for desktop apps: launch the build, walk the core business flow
(fill → submit → export → close), assert each step, and deliver one **PASS / FAIL** report
with per-step evidence. Invoked by name — "use smoke-runner on the app to verify the export flow".

## Dependencies

- `computer-automation` skill (same group, operation layer) — **invoke it by name alongside
  this one**; it provides the `mid.sh` session and the CLI reference for driving the app.
- Model config: assumed (`.env`); see computer-automation.

## The run

1. **Define the flow first**: list the steps with a pass condition per step — the user
   provides them, or you propose and confirm before driving anything.
2. **Session**: `mid.sh start <slug>`.
3. **Launch** the app (`open -a <App>` / `start <App>`), `mid.sh shot initial`.
4. For each step, in order:
   - `mid.sh act "<step — state the goal and the expected effect>"` (one `act` per flow
     step; the prompt carries the whole step — goal and expected effect);
   - `mid.sh shot <step>` to archive the resulting state;
   - `mid.sh assert "<pass condition>"` → record the step verdict.
5. **On a failing step**: stop the flow there — do not skip ahead or guess the rest. Show
   the failure and the last-good screenshot; ask the user whether to continue or abort.
6. **Finish**: `mid.sh finish` → merged report + `index.md`.

## Report — the run is complete when

the report names: overall PASS / FAIL, per-step verdicts, the failing step with evidence
(screenshot paths, assertion output), and the generated file paths. Report never ends
silently.

## Guardrails

- smoke-runner drives the app under test but is read-only over its code and config (like
  `uichecker`). For changing code, use `ui-fixer`.
- Irreversible actions (submit / overwrite / delete) require the user's go-ahead first.
- Keep sensitive content out of screenshots.

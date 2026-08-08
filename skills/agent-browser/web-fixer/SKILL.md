---
name: web-fixer
description: Fix a web app's UI until the page matches expected structure or a reference image.
disable-model-invocation: true
allowed-tools:
  - Bash
  - Read
  - Edit
  - Write
---

# Web Fixer (business layer)

Make the app's rendered page match a fixed reference — expected structure, or a design mock
for appearance. Closed loop: judge → fix → reload → re-judge, until the gap list is empty.
The DOM is the interface; the rendered page is the target; the reference is fixed. Invoked
by name — "use web-fixer to make the page match this design".

## Dependencies

- `agent-browser` (external): `npm i -g agent-browser && agent-browser install`. Command
  surface: `agent-browser skills get core`.
- Suite scripts: `../scripts/agent-browser-run` — the run model, storage, and lifecycle
  contract: [session-model.md](../references/session-model.md).
- The app must be rebuildable or refreshable by the agent (dev-server reload, or a build
  command the agent can run and relaunch).

## Ground truth and stop threshold

The reference is fixed — never "fixed" by editing the reference. Agree the stop threshold up
front: structural gaps all closed; for appearance work, the user's confirmation (a pixel
signal is optional evidence, not the default gate).

## Steps

1. **Compile the gap list.** Judge the current page against the reference, structure-first
   (`snapshot -i`, `read`, `get`, `eval`); list every divergence — missing element, wrong
   text, wrong state, broken layout; appearance gaps only where the task is visual.
   *Done when: the gap list is complete and the stop threshold is agreed.*
2. **Start the run.** `../scripts/agent-browser-run start <app> <flow> --skill web-fixer`.
   *Done when: the run dir exists and the index shows it running.*
3. **Close gaps one at a time, biggest first.** Judge → fix the smallest change that closes
   the gap → reload → re-judge → record a checkpoint verdict.
   *Done when: the gap list is empty and the threshold is met.*
4. **On resistance, re-orient.** Two attempts on the same gap without progress: re-snapshot
   and re-describe the element, and check the app did not crash or hang before touching code
   again. A change that made things worse gets reverted (git) before the next attempt.
   *Done when: the loop is converging, or the escape hatch fired.*
5. **Escape hatch.** N attempts on one gap (thresholds.maxAttempts, default 3) → stop,
   report the remaining diff with screenshots, ask the user — do not guess further.
   *Done when: the escape hatch result is reported.*
6. **Finish with the report.** `../scripts/agent-browser-run finish <app> <flow> --status
   complete|failed|aborted`.
   *Done when: the report names gaps closed, files changed, evidence paths. The report never
   ends silently.*

## Reference

- **Structure-first.** Judge with `snapshot` / `read` / `eval`, not screenshots — pixels
  only for appearance gaps and human evidence.
- **Refs go stale.** After any change: reload, `wait`, then re-`snapshot`.

## Guardrails

- The reference is fixed: editing it to make the match trivial is not fixing.
- Revert-worse: a change that increased divergence is rolled back before the next attempt.
- Irreversible actions need the user's go-ahead first.

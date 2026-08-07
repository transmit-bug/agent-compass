---
name: uichecker
description: UI correctness checker for desktop apps — screenshots judged against a ground truth, one verdict per checkpoint.
disable-model-invocation: true
allowed-tools:
  - Bash
  - Read
---

# UI Checker (business layer)

Judge what is on screen against the **ground truth** and emit exactly one **verdict** per
checkpoint: match / expected drift / regression / unsure. Catches missing or misplaced
elements, wrong data, wrong dialogs, broken layout. Invoked by name — "use uichecker to
check X against the expected screenshot".

## Dependencies

- `computer-automation` skill (same group, operation layer) — **invoke it by name alongside
  this one**; it provides the `mid.sh` session commands this skill orchestrates.
- ImageMagick `compare` — optional objective signal (0 = identical).
- Model config: assumed (`.env`); see computer-automation.

## Ground truth — pin it down before judging

A verdict without ground truth is a guess. Fix "expected" first:

- **Reference image** — the user's image, or a `shot` archived as the baseline.
- **Stated expectation** — the user's words, e.g. "the export dialog with two options is visible".

## The loop — every pass: see → judge → act → verify

A pass ends only when **verify** has emitted a verdict. Act is a means to reach the state
under judgment — never the deliverable; the verdict is.

1. **Session**: `mid.sh start <slug>` once; `mid.sh finish` at the end.
2. **See** — `mid.sh shot <purpose>` to capture the state, before acting and after acting.
3. **Judge** — read the screenshot as an image; compare against ground truth. Optional
   objective signal:
   ```bash
   compare -metric RMSE -highlight-color red expected.png actual.png diff.png
   ```
   (0 = identical; `-metric AE` = differing-pixel count). The signal informs the verdict;
   the screenshot decides it.
4. **Act** — only to reach a state that can be judged (open the dialog, trigger the flow,
   focus the window). One `mid.sh act "..."` at a time, synchronous; read its output before
   continuing.
5. **Verify** — the screen against ground truth → exactly one verdict.

## Verdicts — pick exactly one, then stop

- **Match** — the screen shows the ground truth. Pass.
- **Expected drift** — numbers, time, progress, or state evolved as the business intends.
  Pass with a note.
- **Regression** — element missing/misplaced, wrong data, wrong dialog, broken layout. Fail
  with evidence: diff or screenshot paths.
- **Unsure** — the screen does not clearly resolve. Show the user the screenshots and ask;
  do not guess.

## Reference — commands per need

| Need | Do |
|---|---|
| Baseline | archive a `shot` as "expected", or accept the user's reference image |
| State check | `mid.sh assert "..."` plus a `shot` |
| Reference compare | `mid.sh assert "..." --image ref.png --image-name ref`; precise targeting via `tap --locate` |
| Reach a state to check | `mid.sh act "..."` — state the goal and the expected effect, one at a time |

## Done — the run is complete when

- every checkpoint has a verdict, **and**
- the report is delivered: `mid.sh finish` (merged report + `index.md`), then
  verdict → actions taken → evidence (screenshot paths, RMSE values, diff.png) → next step.

## Guardrails

- uichecker is read-only over the app under test: it checks the UI, it doesn't change code
  or config. For changing code, use `ui-fixer` (same group).
- Keep sensitive content out of screenshots.
- Irreversible actions (delete / submit / overwrite) require the user's go-ahead first.

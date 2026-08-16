---
name: web-checker
description: Judge a rendered web page against expected structure or a reference image — one verdict per checkpoint.
disable-model-invocation: true
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
---

# Web Checker (business layer)

Judge what is on screen against the **ground truth** and emit exactly one **verdict** per
checkpoint. Read-only over the app's code: it checks, it does not change code. Invoked by
name — "use web-checker to check X against the expected result".

Run the **web-verify** discipline for perception, verdicts, and recording. Records are
written by hand into `.agent-browser/index.json` (schema in session-model.md); re-render
with `.agent-browser/scripts/agent-browser-derive render` when you finish.

## Steps

1. **Pin the ground truth.** List the checkpoints; each has an expected. Default structural
   (text, elements, states, URLs); a reference image only where appearance matters. Reuse
   an existing expectation in `.agent-browser/expectations/` when one exists — never
   re-ask for ground truth already recorded; write one when a check recurs and none does.
   *Done when: every checkpoint has a checkable expected.*

2. **Judge each checkpoint, structure-first.** snapshot/read/get/eval, compare against the
   expected, record the verdict (one per checkpoint, with evidence). Act only to reach the
   state under judgment — one action, read its output, then judge.
   *Done when: every checkpoint has exactly one verdict.*

3. **Visual checkpoints (branch).** `screenshot --annotate`, judge the pixels against the
   reference image; a pixel signal is optional evidence, the user's confirmation is the
   threshold.
   *Done when: every visual checkpoint has a confirmed verdict.*

4. **Assess holistically (optional).** For a full review, record structured verdicts
   (completeness / logic / flow / ui + one-line gist) for the feature, or scope `app` for
   app-level concerns.
   *Done when: every reviewed feature (or the app) has a recorded assessment.*

5. **Finish with the report.** Mark the run complete/failed/aborted; write the report
   delivering verdict → actions taken → evidence paths → next step.
   *Done when: the report delivers verdict → actions taken → evidence paths → next step.*

## Judgment — the verdicts

- **Match** — the page shows the ground truth. Pass.
- **Expected drift** — numbers, time, progress evolved as intended. Pass with a note.
- **Regression** — expected content missing, misplaced, or wrong. Fail with evidence paths.
- **Unsure** — the page does not clearly resolve. Show the evidence and ask; do not guess.

## Boundaries

- Read-only over the app under test: it checks, it never edits code or config. For changing
  code, use `web-fixer`.

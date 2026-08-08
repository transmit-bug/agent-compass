---
name: web-checker
description: Judge a rendered web page against expected structure or a reference image — one verdict per checkpoint.
disable-model-invocation: true
allowed-tools:
  - Bash
  - Read
---

# Web Checker (business layer)

Judge what is on screen against the **ground truth** and emit exactly one **verdict** per
checkpoint: match / expected drift / regression / unsure. Read-only: it checks, it does not
change code. Invoked by name — "use web-checker to check X against the expected result".

## Dependencies

- `agent-browser` (external): `npm i -g agent-browser && agent-browser install`. Command
  surface: `agent-browser skills get core`.
- Suite scripts: `../scripts/agent-browser-run` — the run model, storage, and lifecycle
  contract: [session-model.md](../references/session-model.md).

## Ground truth — pin it down before judging

A verdict without ground truth is a guess. Fix "expected" first:
- **Structural** (default): expected text, elements, states, URLs — from the user's words,
  a spec, or a flow recipe.
- **Visual** (branch): a reference image — only for checkpoints that are about appearance.

## Steps

**Act is a means to reach the state under judgment — never the deliverable; the verdict is.**

1. **Pin the ground truth.** List the checkpoints; each has an expected. Default structural;
   image reference only where appearance matters.
   *Done when: every checkpoint has a checkable expected.*
2. **Start the run.** `../scripts/agent-browser-run start <app> <flow> --skill web-checker`.
   *Done when: the run dir exists and the index shows it running.*
3. **Judge each checkpoint, structure-first.** `snapshot -i` (or `read` / `get` / `eval`),
   compare against the expected, record the verdict via `checkpoint`. Act only to reach the
   state under judgment — one action, read its output, then judge.
   *Done when: every checkpoint has exactly one verdict.*
4. **Visual checkpoints (branch).** `screenshot --annotate`, judge the pixels against the
   reference image; a pixel signal is optional evidence, the user's confirmation is the
   threshold.
   *Done when: every visual checkpoint has a confirmed verdict.*
5. **Finish with the report.** `../scripts/agent-browser-run finish <app> <flow> --status
   complete|failed|aborted`.
   *Done when: the report delivers verdict → actions taken → evidence (structure files,
   screenshot paths) → next step. The report never ends silently.*

## Verdicts — pick exactly one, then stop

- **Match** — the page shows the ground truth. Pass.
- **Expected drift** — numbers, time, progress, or state evolved as intended. Pass with a
  note.
- **Regression** — expected content missing, misplaced, or wrong. Fail with evidence paths.
- **Unsure** — the page does not clearly resolve. Show the evidence and ask; do not guess.

## Reference

- **Refs go stale.** After any page-changing action: `wait`, then re-`snapshot`.
- **Determinism first.** Prefer `wait --text`, `get count`, `eval` → boolean, `errors
  --bail`; the agent judges only where the CLI cannot decide.

## Guardrails

- web-checker is read-only over the app under test: it checks, it does not edit code or
  config. For changing code, use `web-fixer`.
- Irreversible actions need the user's go-ahead first.
- Keep sensitive content out of screenshots; auth through the vault, never paste secrets.

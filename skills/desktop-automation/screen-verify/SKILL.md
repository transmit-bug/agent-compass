---
name: screen-verify
description: Verification discipline for the desktop-automation group — checkpoint verdicts with evidence, the screen map, act-vs-ask. Use when running or judging a desktop session through mid.sh (recording a checkpoint, picking a verdict, closing a report), reading or merging the screen map, or deciding act-vs-ask on a desktop app.
allowed-tools:
  - Bash
  - Read
---

# Screen Verify — the verification discipline (primitive)

Model-invoked primitive owning the verification discipline for the desktop-automation
group; the `screen-*` business skills invoke it by prose — "run the screen-verify
discipline" — and inherit what follows. The screen-map contract
([references/screen-map.md](references/screen-map.md)) is owned here; the machinery —
`mid.sh`, the daemon, the persistent cache — is the **computer-automation** operation
layer's, and its session-loop rules (synchronous commands, whole-flow `act`s,
assert-don't-look, verbatim prompts) apply unchanged.

## The discipline

- **One verdict per checkpoint, with evidence.** A checkpoint is a checkable expected
  state. Judge it once, record exactly one verdict, and attach the evidence — screenshot
  paths, assertion output, RMSE values. An interrupted run keeps its recorded verdicts.
- **The screen map first.** Before planning acts, read `.midscene/screens.md` if it
  exists — launch commands, proven routes, verbatim prompts (→ persistent-cache hits on
  anchors), and code-derived **hints** (assumptions to verify — they inform planning and
  phrasing, never cache claims). At `finish`, merge what the session learned back;
  promote or delete the hints this session proved or disproved. Contract:
  references/screen-map.md.
- **The report closes the run.** Verdict → actions taken → evidence paths → next step.
  Never end silently.

## Verdicts — pick exactly one per checkpoint

- **Match** — the screen shows the ground truth. Pass.
- **Expected drift** — numbers, time, progress, or state evolved as the business intends.
  Pass with a note.
- **Regression** — element missing/misplaced, wrong data, wrong dialog, broken layout.
  Fail with evidence.
- **Unsure** — the screen does not clearly resolve. Show the evidence and ask; never guess.

Smoke runs phrase these per step: pass (match or drift) / fail (regression) / unsure.

A cached verdict repeats the model's earlier judgment; it does not re-derive it. When a
cached PASS contradicts what you expect, ground it before trusting it — `assert --image`
against a reference, or an RMSE compare — and refresh the wording with
`mid.sh cache invalidate "<prompt>"` + a verbatim re-assert.

## Act-vs-ask

Act on every answer the code, the records, and the screen can derive. Ask only when an
action is irreversible or expensive (submit, overwrite, delete) or the evidence does not
resolve. Every `assert` ships the full frame to the model provider, and the persistent
cache stores prompt text locally — keep sensitive content out of asserted screens: judge
such states by a narrow condition, or against a redacted reference with `assert --image`.

## Boundaries

- **Judgment lives here. The machinery lives in computer-automation** (session commands,
  daemon, cache — invoke that skill by name for the `mid.sh` surface). The screen map is
  written by the agent into `.midscene/screens.md`; its format and staleness rules live
  in the contract file.

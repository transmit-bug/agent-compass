---
name: screen-fixer
description: Fix a running desktop app's UI until the live screen matches a reference image or design mock.
disable-model-invocation: true
allowed-tools:
  - Bash
  - Read
  - Edit
  - Write
---

# Screen Fixer (business layer)

Make the app's rendered UI match a reference image (design mock, screenshot, previous
version). Closed loop: shoot → compare → judge → fix → rebuild → re-shoot, until the screen
is visually consistent. The **screen is the source of truth**; the code is what you change.
Invoked by name — "use screen-fixer to make the UI match this image".

Run the **screen-verify** discipline for verdicts, evidence, and the screen map; the
machinery — `mid.sh` session, daemon, persistent cache — is **computer-automation**'s:
invoke it by name alongside this one.

Also needs: ImageMagick `compare` (pixel-difference signal), and an app that is rebuildable
or refreshable by the agent (dev-server reload, or a build command you can run and relaunch).

## Ground truth

The reference image (user-provided, or a `shot` archived as the intended state). Agree on
the **stop threshold** up front: RMSE below a given value, or the user's visual
confirmation. The reference is fixed — never "fixed" by editing the reference.

## The loop — iterate until consistent

1. `mid.sh start <slug>`; `mid.sh shot baseline` to archive the current render.
2. **Compare**: `compare -metric RMSE -highlight-color red ref.png actual.png diff.png`
   — the signal (0 = identical).
3. **Judge**: read the reference, the current screenshot, and diff.png together; list what
   is off — missing element, misplacement, wrong data, wrong colors, broken layout.
4. **Fix**: edit the source code to close one gap at a time (smallest change that addresses
   it). Midscene is the eye; you are the hand.
5. **Rebuild / refresh** the app, then `mid.sh shot`.
6. Repeat 2–5 until every gap on the judge list is closed and the RMSE is under the agreed
   threshold.

## Convergence rules

- Fix the **biggest gap first** (highest visual weight) — closing the dominant difference
  usually collapses several smaller ones.
- After two attempts on the same gap, re-screenshot and re-describe the element; check the
  app did not crash or hang before touching the code again.
- If a change made things worse, revert it (git checkout / undo) before trying the next one.
- Once the screen matches, run `mid.sh finish` and report: gaps closed, RMSE before → after,
  files changed, evidence screenshots.

## Done — the loop stops when

- every identified gap is closed and RMSE is under the agreed threshold, **or**
- the gap has resisted N fixes (agree N up front, default 3) — then report the remaining
  diff and ask the user, with screenshots, instead of guessing.

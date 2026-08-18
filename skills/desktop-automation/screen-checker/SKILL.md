---
name: screen-checker
description: UI correctness checker for desktop apps — screenshots judged against a ground truth, one verdict per checkpoint.
disable-model-invocation: true
allowed-tools:
  - Bash
  - Read
---

# Screen Checker (business layer)

Judge what is on screen against the **ground truth** and emit exactly one **verdict** per
checkpoint: match / expected drift / regression / unsure. Catches missing or misplaced
elements, wrong data, wrong dialogs, broken layout. Invoked by name — "use screen-checker
to check X against the expected screenshot".

Run the **screen-verify** discipline for verdicts, evidence, and the screen map; the
machinery — `mid.sh` session, daemon, persistent cache — is **computer-automation**'s:
invoke it by name alongside this one.

## Pin the ground truth first

A verdict without ground truth is a guess. Fix "expected" before judging:

- **Reference image** — the user's image, or a shot archived as the baseline.
- **Stated expectation** — the user's words, e.g. "the export dialog with two options is
  visible".

## The pass — reach, then judge

A pass ends only when every checkpoint has its verdict. Act is a means to reach the state
under judgment — never the deliverable; the verdict is.

1. **Session**: `mid.sh start <slug>` once; `mid.sh finish` at the end.
2. **Reach** the state under judgment — one `mid.sh act "..."` at a time, synchronous,
   reading each output; prefer `mid.sh assert` to confirm arrival instead of eyeballing a
   screenshot.
3. **Judge each checkpoint**:
   - condition-resolvable → `mid.sh assert "<condition>"`; against a reference image →
     `assert --image <ref.png> --image-name <name>`;
   - visual ground truth → read the archived screenshot as an image, with an optional
     objective signal: `compare -metric RMSE -highlight-color red expected.png actual.png
     diff.png` (0 = identical; ImageMagick). The signal informs the verdict; the
     screenshot decides it.
4. **Record** verdict + evidence per checkpoint (screenshot paths, assertion output, RMSE).
   Take a `shot` only to archive evidence or a first-encounter screen-map entry.

## Boundaries

- Read-only over the app under test: it checks the UI, it never changes code or config.
  For changing code, use **screen-fixer** (same group).

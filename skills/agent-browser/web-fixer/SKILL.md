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

Make the rendered page match a fixed reference — expected structure, or a design mock for
appearance. Closed loop: judge → fix → reload → re-judge, until the gap list is empty.
The reference is fixed — never "fixed" by editing it. Invoked by name — "use web-fixer to
make the page match this design".

Run the **web-verify** discipline for the run model, perception, and verdicts.

## Steps

1. **Compile the gap list.** Judge the current page against the reference — reuse an
   existing expectation in `.agent-browser/expectations/` when one exists, otherwise the
   user's words or a mock — structure-first; list every divergence — missing element,
   wrong text, wrong state, broken layout. Agree the stop threshold up front: structural
   gaps all closed; for appearance work, the user's confirmation.
   *Done when: the gap list is complete and the stop threshold is agreed.*
2. **Start the run.** `.agent-browser/scripts/agent-browser-run start <app> <flow> --skill web-fixer`.
   *Done when: the run dir exists and the index shows it running.*
3. **Close gaps one at a time, biggest first.** Judge → apply the smallest change that closes
   the gap → reload → re-judge → record a checkpoint verdict.
   *Done when: the gap list is empty and the threshold is met.*
4. **On resistance, re-orient.** Two attempts on the same gap without progress: re-snapshot
   and re-describe the element, and check the app did not crash or hang before touching code
   again. A change that made things worse is reverted (git) before the next attempt.
   *Done when: the loop is converging, or the escape hatch fired.*
5. **Escape hatch.** N attempts on one gap (manifest `thresholds.maxAttempts`, default 3) →
   stop, report the remaining diff with screenshots, ask the user — do not guess further.
   *Done when: the escape hatch result is reported.*
6. **Finish with the report.** `.agent-browser/scripts/agent-browser-run finish <app> <flow> --status
   complete|failed|aborted`.
   *Done when: the report names gaps closed, files changed, evidence paths.*

## Judgment

- **Reference is fixed** — editing it to make the match trivial is not fixing.
- **Revert-worse** — a change that increased divergence is rolled back before the next
  attempt.
- Irreversible actions need the user's go-ahead first.

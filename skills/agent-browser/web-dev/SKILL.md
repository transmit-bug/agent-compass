---
name: web-dev
description: Develop a web feature with a verify loop — edit, reload, check structure and errors, iterate.
disable-model-invocation: true
allowed-tools:
  - Bash
  - Read
  - Edit
  - Write
---

# Web Dev (business layer)

Implement a feature with the browser as the verification instrument: edit → reload →
check structure and errors → iterate until the acceptance points pass. Invoked by name —
"use web-dev to implement X".

Run the **web-verify** discipline for perception, verdicts, and recording. Records are
written by hand into `.agent-browser/index.json` as you go (schema in session-model.md);
re-render the orient doc with `.agent-browser/scripts/agent-browser-derive render` when
you finish.

## Steps

1. **Orient.** Read the app's `.agent-browser/index.md` — what exists, what was last
   verified and when. Have a dev server the agent can start and reload.
   *Done when: you know the current page structure and the last verification state.*

2. **Implement against acceptance points.** Edit code, then verify per point: reload →
   structure check (snapshot/read/eval) → `errors` empty for zero blocking errors → record
   a checkpoint verdict with evidence (write-as-you-go).
   *Done when: every acceptance point has a passing structural check and no blocking
   errors.*

3. **Review visual changes.** When the work is appearance-visible: screenshot and confirm
   with the user — human confirmation is the threshold.
   *Done when: visual changes are confirmed or explicitly deferred.*

4. **Finish with the report.** Mark the run complete/failed/aborted in the records;
   re-render the orient doc; write the report (`.agent-browser/runs/<app>/<flow>/report.md`)
   naming acceptance points, verdicts, files changed, evidence.
   *Done when: the report names acceptance points, verdicts, files changed, evidence, and
   the orient doc reflects the run.*

## Judgment

- **Division of labor.** web-dev owns the build loop; judging an existing state is
  web-checker's job — a pure check routes there, not here.
- The agent edits code, never the repo's history: no commit, tag, or push without the
  user's go-ahead. Irreversible actions need the user's go-ahead first.

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

Implement a feature with the browser as the verification instrument: edit → reload → check
structure and errors → iterate until the acceptance points pass. Invoked by name — "use
web-dev to implement X".

Run the **web-verify** discipline for the run model, perception, and verdicts.

## Steps

1. **Orient.** Read the app's `.agent-browser/index.md` and `../scripts/agent-browser-run ls`: what
   exists, what was last verified and when; have a dev server the agent can start and reload.
   *Done when: you know the current page structure and the last verification state.*
2. **Start the run.** `../scripts/agent-browser-run start <app> <feature> --skill web-dev`; open the
   dev URL.
   *Done when: the app is reachable and a baseline checkpoint is recorded.*
3. **Implement against acceptance points.** Edit code, then verify per point: reload →
   structure check → `errors --bail` for zero blocking errors → record a checkpoint verdict.
   *Done when: every acceptance point has a passing structural check and no blocking errors.*
4. **Review visual changes.** When the work is appearance-visible: screenshot and confirm
   with the user — human confirmation is the threshold.
   *Done when: visual changes are confirmed or explicitly deferred.*
5. **Finish with the report.** `../scripts/agent-browser-run finish <app> <feature> --status
   complete|failed|aborted`.
   *Done when: the report names acceptance points, verdicts, files changed, evidence.*

## Judgment

- **Division of labor.** web-dev owns the build loop; judging an existing state is
  web-checker's job — a pure check routes there, not here.
- The agent edits code, never the repo's history: no commit, tag, or push without the user's
  go-ahead. Irreversible actions need the user's go-ahead first.

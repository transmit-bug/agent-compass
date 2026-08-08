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

## Dependencies

- `agent-browser` (external): `npm i -g agent-browser && agent-browser install`. Command
  surface: `agent-browser skills get core`.
- Suite scripts: `../scripts/agent-browser-run` — the run model, storage, and lifecycle
  contract: [session-model.md](../references/session-model.md).
- A dev server the agent can start, reload, and read the console of.

## Steps

1. **Read the state first.** `../scripts/agent-browser-run ls` and the app's
   `.agent-browser/index.md`: what exists, what was last verified and when.
   *Done when: you know the current page structure and the last verification state.*
2. **Start the run and the server.** `../scripts/agent-browser-run start <app> <feature>
   --skill web-dev`; start the dev server; `agent-browser open <dev-url>`.
   *Done when: the app is reachable and a baseline checkpoint is recorded.*
3. **Implement against acceptance points.** Edit code; then verify per point: reload →
   structure check (`snapshot -i`, `read`, `get`, `eval`) → `errors --bail` for zero
   blocking errors → record a checkpoint.
   *Done when: every acceptance point has a passing structural check and no blocking
   errors.*
4. **Review visual changes.** When the work is appearance-visible: screenshot and confirm
   with the user; human confirmation is the threshold.
   *Done when: visual changes are confirmed or explicitly deferred.*
5. **Finish with the report.** `../scripts/agent-browser-run finish <app> <feature>
   --status complete|failed|aborted`.
   *Done when: the report names acceptance points, verdicts, files changed, evidence. The
   report never ends silently.*

## Reference

- **Structure-first.** Verify by reading the tree and the text, not by staring at pixels.
- **Refs go stale.** Reload, `wait`, then re-`snapshot`.
- **Division of labor.** web-dev owns the build loop; `web-checker` owns judging an existing
  state. When the task is a pure check, reach for web-checker instead.

## Guardrails

- The agent edits code, not the repo's history: no commit, tag, or push without the user's
  go-ahead.
- Irreversible actions (delete, overwrite, migration) need the user's go-ahead first.
- Keep secrets out of screenshots; auth through the vault.

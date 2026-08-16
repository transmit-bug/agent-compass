---
name: web-smoke
description: Verify a web app's core business flow end-to-end against a scenario recipe (flows/ or smoke/ in the library), one PASS/FAIL report with per-step evidence.
disable-model-invocation: true
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
---

# Web Smoke (business layer)

Launch the app, walk the defined flow step by step, assert each step, deliver one **PASS /
FAIL** report with per-step evidence. Invoked by name — "use web-smoke on the export flow".

Run the **web-verify** discipline for the run model, perception, and verdicts.

## Steps

1. **Take the recipe from the scenario library.** The user names the flow ("smoke the export
   flow"). Read `docs/agent-browser/scenarios/` first: if a `flows/` or `smoke/` scenario
   covers it, walk that — it is the recipe. If it does not exist yet, derive its steps and
   per-step pass conditions from the app — code + observed UI — and write it as
   `docs/agent-browser/scenarios/flows/<id>.md`: a thin composition that references business
   scenarios by `depends` and never restates their rules; update the scenarios README index.
   Ask only when the target flow is genuinely ambiguous (two competing paths, undocumented
   behavior) — never ask for steps the app already shows.
   *Done when: every step has a pass condition the agent can check, and the recipe is a
   scenario in the library.*
2. **Start the run.** `.agent-browser/scripts/agent-browser-run start <app> <flow> --skill web-smoke`.
   *Done when: the run dir exists and the index shows it running.*
3. **Launch.** open the URL (dev/preview/prod per the task); wait for network idle.
   *Done when: the app is reachable and the initial state is a recorded checkpoint.*
4. **Walk the flow, one step at a time.** For each step: act (one action, or one `eval
   --stdin` for a state change) → wait (deterministic: element / `--text` / `--url` /
   `--fn`, never a bare timeout) → assert structure-first (`snapshot -i`, `read`, `get
   count`, `eval`; `console`/`errors` for health; screenshot only for appearance or
   human evidence) → record the checkpoint verdict.
   *Done when: every step has a recorded verdict — nothing left unasserted.*
5. **Stop on a failing step.** Do not skip ahead or guess the rest. Show the failure and the
   last good screenshot; ask the user whether to continue or abort.
   *Done when: the user chose, and the choice is reflected in the run.*
6. **Finish with the report.** `.agent-browser/scripts/agent-browser-run finish <app> <flow> --status
   complete|failed|aborted`.
   *Done when: the report names overall PASS/FAIL, per-step verdicts, the failing step with
   evidence paths, and the generated file paths.*

## Judgment

- **Flow pinning.** A defined flow with per-step pass conditions is the unit — exploratory
  bug hunts are agent-browser's `dogfood`, not this skill.
- Read-only over the app's code and config: it drives, never edits. For changing code, use
  `web-fixer`.
- Irreversible actions (submit / delete / overwrite) need the user's go-ahead first.

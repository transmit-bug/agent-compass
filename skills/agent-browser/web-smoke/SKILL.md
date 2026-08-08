---
name: web-smoke
description: Verify a web app's core business flow end-to-end against defined steps, one PASS/FAIL report with per-step evidence.
disable-model-invocation: true
allowed-tools:
  - Bash
  - Read
---

# Web Smoke (business layer)

Launch the app, walk the defined flow step by step, assert each step, deliver one **PASS /
FAIL** report with per-step evidence. Invoked by name — "use web-smoke on the export flow".

## Dependencies

- `agent-browser` (external): `npm i -g agent-browser && agent-browser install`. Command
  surface: `agent-browser skills get core` (or `--full`). It is the operation layer — drive
  the browser with it; this skill decides what to verify.
- Suite scripts: `../scripts/agent-browser-run` — the run model, storage, and lifecycle
  contract: [session-model.md](../references/session-model.md). Run suite scripts from the
  app repo root.

## Steps

1. **Pin the flow first.** List the steps with a checkable pass condition per step — the
   user provides them, or you propose and confirm before driving anything. Record a repeat
   flow as `.agent-browser/flows/<flow>.md`.
   *Done when: every step has a pass condition the agent can check (element, text, URL, or
   state), and the user confirmed the flow.*
2. **Start the run.** `../scripts/agent-browser-run start <app> <flow> --skill web-smoke`.
   *Done when: the run dir exists and the index shows it running.*
3. **Launch.** `agent-browser open <url>` (dev/preview/prod per the task); `wait --load
   networkidle` after navigation.
   *Done when: the app is reachable and the initial state is a recorded checkpoint.*
4. **Walk the flow, one step at a time.** For each step, in order:
   - `act` — one action (or one `eval --stdin` for a state change);
   - `wait` — deterministic (element / `--text` / `--url` / `--fn`), never a bare timeout;
   - `assert` — structure-first: `snapshot -i`, `read`, `get count`, or `eval` against the
     step's pass condition; `console`/`errors --bail` for health; screenshot only when the
     step is about appearance or you need human evidence;
   - record — `../scripts/agent-browser-run checkpoint <app> <flow> --json '{"step": "…",
     "method": "…", "expected": "…", "actual": "…", "verdict": "pass|fail|unsure",
     "evidence": "structure/…"}'`.
   *Done when: every step has a recorded verdict — nothing left unasserted.*
5. **Stop on a failing step.** Do not skip ahead or guess the rest. Show the failure and the
   last good screenshot; ask the user whether to continue or abort.
   *Done when: the user chose, and the choice is reflected in the run.*
6. **Finish with the report.** `../scripts/agent-browser-run finish <app> <flow> --status
   complete|failed|aborted`.
   *Done when: the report names overall PASS/FAIL, per-step verdicts, the failing step with
   evidence paths, and the generated file paths. The report never ends silently.*

## Reference

- **Assert with the CLI, judge with the agent.** Deterministic checks first (`wait
  --text/--url/--fn`, `get count`, `eval` → boolean, `errors --bail`) — zero LLM. LLM
  judgment only for ambiguity; that verdict is `unsure`, with evidence shown to the user,
  not a guess.
- **Refs go stale.** After any page-changing action: `wait`, then `snapshot -i` again — the
  old `@eN` refs are dead.
- **Exploratory bug hunts are not this skill** — use `agent-browser skills get dogfood`.
  web-smoke verifies a defined flow; dogfood explores without one.

## Guardrails

- web-smoke is read-only over the app's code and config — it drives, never edits. For
  changing code, use `web-fixer`.
- Irreversible actions (submit / delete / overwrite) need the user's go-ahead first.
- Auth through the vault (`agent-browser auth login <name>`); never echo secrets.
- Sensitive targets: launch with `--allowed-domains` to contain the browser.

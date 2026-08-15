# agent-browser — usage guide

How to run the web-app lifecycle (spec → dev → check → fix → smoke → maintain) in the
managed app's own repo with the agent-browser suite. Business logic testing is the worked
flow; every other stage follows the same rhythm: **record → derive → orient → act**.

Companions: architecture & rules → `docs/blueprint.md` · contract (records, storage,
commands) → `skills/agent-browser/references/session-model.md` · routing → the group
README · lifecycle model → `docs/adr/0002-web-app-lifecycle-model.md`.

## Setup

### Machine, once

- Operation layer: `npm i -g agent-browser && agent-browser install`. The command surface
  is `agent-browser skills get core` — never hardcode CLI details into files or memory.
- Skills, **project-level only, never `-g`**: `npx skills add transmit-bug/agent-compass
  --skill web-router --skill web-verify --skill web-logic …` (full list in the group
  README).

### App repo, once

Run the **web-setup** skill — executed by the agent, not the user: it scaffolds
`.agent-browser/` (empty records + orient doc), gitignores `.agent-browser/runs/`, records
how to run the app (`docs/agent-browser/app-notes.md`, linked from the orient doc), checks
that the operation layer answers, and confirms the app is reachable. The user's only part
is the one-time interactive vault login (`agent-browser auth login <name>`).

*Done when: `.agent-browser/index.md` exists, links the app notes, and a fresh session can
orient and start a run.*

## The lifecycle at a glance

- The **feature** is the unit; each feature arcs spec → dev → check → fix → smoke →
  maintain (dev↔check↔fix iterate until verified, smoke is the gate, maintain is ongoing).
- **Records** live in `.agent-browser/index.json` — runs and assessments, facts only.
  Everything else (status, next actions, the orient doc `index.md`) is **derived** by the
  scripts, never stored.
- The **tracker** (the app repo's own issue tracker) holds intent: spec tickets, found
  problems, blockers. Runs carry optional `--ticket <#n>` and `--blocked-by <#n,…>` refs.
- A fresh session **orients from exactly one artifact**: `.agent-browser/index.md`.
- **Re-testing is automatic.** A code change touching a run's provenance files (the source
  its verification rests on) or the UI surface, or a record aging past `staleSinceDays`,
  marks the run stale — it is re-verified by the owning skill before trust, without
  asking. A new feature (open ticket, no run records) is not-started and gets its tests
  established during orientation. The user is asked only for irreversible steps (tidy
  drops, destructive actions).
- Reusable context lives with the state: **flows** (`.agent-browser/flows/*.md`, repeatable
  verification sequences) and **expectations** (`.agent-browser/expectations/*.md`, reusable
  ground truth for checks/fixes). Answers to once-asked questions land in the durable
  docs' Decisions section — never re-asked.

## Business logic testing (web-logic) — the flow

### First session

1. **Orient.** Read `.agent-browser/index.md` (rendered by web-setup; it lists the app
   notes and any records) and the source's entry points — routes, components, state, API
   calls.
   *Done when: you know the app's last verification state and where the logic lives.*
2. **Start the run.** `skills/agent-browser/scripts/agent-browser-run start <app> <flow>
   --skill web-logic [--ticket <#n>]`. web-logic treats the run as optional for ad-hoc
   probes — **traceability is the price of continuation**: start one whenever the session
   should be continuable or recorded.
   *Done when: the run dir exists and the index shows it running.*
3. **Derive the logic plan from source** (web-logic step 1): read the code, derive core
   flows, rules per path (branches, required fields, side effects), and boundaries / error
   handling; write it as `.agent-browser/flows/<flow>.md` — the durable plan document —
   with a provenance line. Ask the user only where the source genuinely cannot answer.
   *Done when: every entry point and branch in the source is accounted for in the plan,
   and the plan is written to `.agent-browser/flows/`.*
4. **Generate test cases from the plan** (step 2): a happy path per plan entry, both sides
   of every conditional branch, boundary values (empty, minimum, maximum, overlong,
   invalid format), and error paths (API failure, timeout, invalid submission).
5. **Run the cases, checkpoint per case** (step 3): assert structurally, then
   `agent-browser-run checkpoint <app> <flow> --json '{"step":"<case>","verdict":
   "pass|fail|unsure","expected":"…","actual":"…","evidence":"…"}'`.
   *Done when: every case has a recorded verdict — nothing left unasserted.*
6. **Classify the problems** (step 4): implementation doesn't match logic / the logic
   itself is flawed / I inferred wrong — each with evidence and a source location where
   relevant.
7. **Finish the run.** `agent-browser-run finish <app> <flow> --status
   complete|failed|aborted` — renders `report.md` and re-derives the orient doc.
   *Done when: the report organizes problems by class with evidence and ends with a
   conclusion + recommended next step.*
8. **Assess the feature.** `agent-browser-run assess <app> <scope> --json
   '{"completeness":"…","logic":"…","flow":"…","ui":"…","gist":"…"}'` — the four verdict
   kinds plus a one-line gist; scope is the feature, or `app` for app-level concerns.
9. **Open app-repo tickets** for confirmed problems — tracker-side intent; the fix loop is
   web-fixer's. Reference them on the next run with `--ticket`.

### After one item

The record now holds: per-case verdicts (the run), the four-kind assessment + gist, and
any ticket refs. The orient doc shows the flow's status row (stage = logic) with the
assessment gist and derived next actions. A new run for the same flow **supersedes** the
previous complete one — a chain, not an overwrite; the old record stays until the scripted
tidy. Problems recorded → tickets → the next session picks them up from the orient doc and
the tracker, not from your memory.

### Cross-session continuation

1. Fresh session: read `.agent-browser/index.md` — the derived status table, assessment
   gists, next actions.
2. Derive the next item: **stale** → re-verify with the stage's skill; **failing** →
   check/fix; **blocked** → resolve the blocker refs; open ticket without a run →
   not-started feature.
3. Act. **Never re-ask** — a question answered once lives in a gist or assessment, not in
   the conversation.

## Other stages at a glance

| Stage | Skill | Record |
|---|---|---|
| Implement a feature | web-dev | run + checkpoint per acceptance point |
| Judge a rendered state | web-checker | run + one verdict per checkpoint (+ optional assess) |
| Converge to a fixed reference | web-fixer | run + gap-list checkpoints |
| Core-flow end-to-end | web-smoke | run + per-step PASS/FAIL |
| Staleness / tidy | web-maintain | `scan --mark` + `tidy --dry-run` / `--apply` |

Every stage runs the **web-verify** discipline (run model, perception, verdicts,
staleness) and writes through the same scripts — only the workflow differs.

## Where each rule lives

| Topic | Home |
|---|---|
| Invocation axis, disclosure, workflow rules | `docs/blueprint.md` |
| Run model, records, storage, commands | `references/session-model.md` (owned by web-verify) |
| Verification discipline | `web-verify` |
| Orientation / routing | `web-router` + group README |
| Lifecycle model, records vs derived views | `docs/adr/0002-web-app-lifecycle-model.md` |

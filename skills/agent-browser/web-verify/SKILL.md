---
name: web-verify
description: Verification discipline for the agent-browser suite — the run model, perception ladder, verdicts, staleness/retention, and autonomy gate. Use when running or judging a verification run (start, checkpoint, finish, supersede), recording verdicts with evidence, perceiving a page structure-first, checking what is stale, or deciding act-vs-ask while verifying a web app.
allowed-tools:
  - Bash
  - Read
---

# Web Verify — the verification discipline (primitive)

Model-invoked primitive owning the verification discipline for the agent-browser suite;
mode skills invoke it by prose — "run the web-verify discipline" — and inherit what follows.
The contract (shapes, storage, command tables) is
[session-model.md](../references/session-model.md), owned here.

## Run model — write-as-you-go

start → checkpoint → finish, recorded as it happens: a checkpoint verdict is written the
moment it is known; an interrupted run (aborted) is legal with its checkpoints preserved. A
new run for the same flow supersedes the previous complete one — a chain, not an overwrite.
Stale is a verdict about the record, set by the scan, never deleted automatically.

## Perception — structure-first, vision-on-demand

Perceive through the DOM/accessibility tree by default: snapshot → read → eval →
console/errors; pixels only for appearance, DOM-less content, and human evidence. After any
page-changing action: wait, then re-snapshot — refs go stale the moment the page changes.
Prefer deterministic assertions; reserve LLM judgment for ambiguity.

## Verdicts — pass / fail / unsure, with evidence

Exactly one verdict per checkpoint, with evidence. Pass: the page shows the expectation.
Fail: it does not. Unsure: the page does not clearly resolve — show the evidence and ask,
never guess. Overall: any fail → fail; else any unsure → unsure; else pass.

## Staleness & retention

The scan computes staleness (strong: UI files changed, UI keywords hit, UI deps bumped;
weak: age) and records it. Forgetting is the tidy: explicit, previewed, user-confirmed —
never background. Git is the archive; the index forgets meaning, not history.

## Autonomy gate — act, then ask

Act on every answer the code and the index can derive. Ask only when an answer cannot be
derived or an action is irreversible or expensive. Record everything — a question answered
once is never re-asked; the answer is written where the next session reads it.

## Boundaries

- **Discipline lives here** (prose). **Computation lives in the scripts** (`agent-browser-run`,
  `agent-browser-stale`). **The browser surface lives in the CLI** — `agent-browser skills
  get core`, never hardcoded. Install the operation layer once:
  `npm i -g agent-browser && agent-browser install`.
- The primitive is invoked by mode skills; it never drives the browser itself.

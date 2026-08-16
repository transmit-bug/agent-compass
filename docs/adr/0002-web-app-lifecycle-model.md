# Web-App Lifecycle Model (agent-browser)

The agent-browser suite manages a managed web app's lifecycle **per-feature**: each feature arcs
spec → dev → check → fix → smoke → maintain — forward, with dev↔check↔fix iterating until
verified, smoke as the gate, maintain ongoing until retired — owned by the business skills
(`web-dev` / `web-checker` + `web-logic` / `web-fixer` / `web-smoke` / `web-maintain`). Spec is
tracker-side intent, never indexed verification state.

State is **facts-only**: `index.json` stores records (latest run per feature+flow — verdict,
commit, staleness, optional ticket ref); stage state, the status table, and the orient doc
(`index.md`) are **derived deterministically** from records plus open app-repo tickets, never
stored separately. Holistic review is tracked as **structured verdict kinds** (completeness,
logic clarity, flow reasonableness, UI layout), per-feature facts rolled into the derived status.

Operation is **direction-and-review**: the human sets direction and reviews findings; the model
reads the code, derives features/logic/flows/UI concerns, verifies, assesses, records, opens
app-repo tickets for found issues, and fixes via `web-fixer` — asking only when an answer cannot
be derived from the code or an action is irreversible or expensive. Continuation is
**read-and-act**: a fresh session reads `index.md`, derives status and next actions, picks the
most stale or most important open item, and acts; aborted runs resume from preserved checkpoints,
stale verifications are re-run before any verdict is trusted, superseded evidence stays until the
scripted retention tidy. Durable human-facing docs (scenarios, assessment reports, app notes)
live in the app repo's `docs/agent-browser/`, linked from the index — there are no handoff or
orient ceremony files beyond the derived index.

Decided after research into mattpocock/skills cross-session continuation (state carried by
durable artifacts; a fresh session orients from exactly one object) and a charted destination:
sustainable, cross-session-continuable web-app lifecycle tracking. The mattpocock ceremony is
deliberately not imitated — no handoff artifacts, no ticket-per-phase, no tracker registry;
the suite mobilizes the model's initiative within a human-set direction.

Rejected: storing stage state explicitly (duplicative with run facts, write-heavy); ceremony
artifacts that duplicate what the derived index already carries; strict oldest-ticket-queue
continuation (contradicts autonomy-first); this repo hosting managed apps' lifecycle state
(each app's lifecycle lives in its own repo; the suite teaches the pattern, it doesn't host
the state).

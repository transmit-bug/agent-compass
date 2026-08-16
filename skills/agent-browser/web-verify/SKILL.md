---
name: web-verify
description: Verification discipline for the agent-browser suite — the run model, perception ladder, verdicts, staleness/retention, and autonomy gate. Use when running or judging a verification run (start, checkpoint, finish, supersede), perceiving a page structure-first, checking what is stale, or deciding act-vs-ask while verifying a web app.
allowed-tools:
  - Bash
  - Read
---

# Web Verify — the verification discipline (primitive)

Model-invoked primitive owning the verification discipline for the agent-browser suite;
mode skills invoke it by prose — "run the web-verify discipline" — and inherit what
follows. The contract (record schema, perception ladder, rules, storage) is
[references/session-model.md](references/session-model.md), owned here; the derive script
(`scripts/agent-browser-derive`) ships with this skill and is bootstrapped by web-setup
into the app's `.agent-browser/scripts/`.

## The discipline

- **Write-as-you-go** — record a checkpoint verdict the moment it is known, in
  `.agent-browser/index.json` (schema in session-model.md); an interrupted run is a legal
  state with its checkpoints preserved. A new run for a flow supersedes the previous
  terminal one — a chain, not an overwrite.
- **Perceive structure-first** — DOM/accessibility tree by default (snapshot → read →
  eval → console/errors); pixels only for appearance, DOM-less content, and human
  evidence. After any page-changing action: wait, then re-snapshot — refs go stale the
  moment the page changes.
- **Verdicts are honest** — exactly one per checkpoint, with evidence. `pass`: the page
  shows the expectation. `fail`: it does not. `unsure`: the page does not clearly resolve —
  show the evidence and ask, never guess. Prefer deterministic assertions; reserve LLM
  judgment for ambiguity.
- **Act, then ask** — act on every answer the code and the records can derive. Ask only
  when an answer cannot be derived or an action is irreversible or expensive. Record
  everything — a question answered once is never re-asked.

## Boundaries

- **Discipline lives here** (prose). **Derivation lives in the script**
  (`agent-browser-derive render | stale | tidy` — status, orient doc, staleness, retention;
  it computes, never decides). **The browser surface lives in the CLI** —
  `agent-browser skills get core`, never hardcoded. The primitive is invoked by mode
  skills; it never drives the browser itself.
- Install the operation layer once: `npm i -g agent-browser && agent-browser install`.

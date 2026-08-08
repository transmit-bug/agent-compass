---
name: web-maintain
description: Scan verification history for stale runs and re-verify what drifted, with selective forgetting.
disable-model-invocation: true
allowed-tools:
  - Bash
  - Read
---

# Web Maintain (business layer)

Keep the verification index honest: scan it for stale runs (git-driven), re-verify what
drifted, and forget records that lost their meaning. Invoked by name — "use web-maintain to
check what needs re-testing".

## Dependencies

- `agent-browser` (external): `npm i -g agent-browser && agent-browser install`.
- Suite scripts: `../scripts/agent-browser-run` and `../scripts/agent-browser-stale` — the
  run model, storage, lifecycle, and retention contract:
  [session-model.md](../references/session-model.md).

## Steps

1. **Scan for staleness.** `../scripts/agent-browser-stale scan` — deterministic; it only
   computes. Present the result: run, reason (ui-change / age), severity, evidence.
   *Done when: the stale list is presented with reasons, and the user chose a scope.*
2. **Tidy the index.** `../scripts/agent-browser-stale tidy --dry-run` — preview what would
   be forgotten (superseded beyond the keep window, content rewritten past the commit
   horizon, dead by age). Review with the user, then `--apply` for the agreed scope.
   *Done when: the index reflects the retention policy; forgotten runs had their evidence
   pruned together, and the user confirmed each non-superseded drop.*
3. **Re-verify what drifted.** For each stale run the user wants re-checked, rerun its flow
   with the owning skill (`web-smoke` for flows, `web-checker` for checkpoints); the new run
   supersedes the old.
   *Done when: every chosen stale run is either re-verified (superseded) or consciously
   dropped.*
4. **Report.** Present the outcome: what was stale, why, what was re-verified, what was
   forgotten, and the current verification state. The report never ends silently.

## Reference

- **Staleness sources**: ui-change (strong: UI files changed, commit subjects hit UI
  keywords, UI deps bumped) and age (weak: no rerun past staleSinceDays).
- **Forgetting is not deleting history**: git keeps the record; the index drops the
  record's *meaning*, not the past.
- **Scan and tidy never decide** — they compute; the agent and the user decide.

## Guardrails

- `tidy --apply` is explicit, never background. Nothing is forgotten without a user-visible
  dry-run first.
- Re-verification is read-only over code; for changing code, use `web-fixer`.

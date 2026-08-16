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

Run the **web-verify** discipline for staleness, retention, and verdicts.

## Steps

1. **Scan and record.** `.agent-browser/scripts/agent-browser-stale scan --mark` — computes staleness and records
   it on the index. Present the result: run, reason (provenance-change / ui-change / age), severity.
   *Done when: the stale list is presented with reasons, and the user chose a scope.*
2. **Tidy by agreement.** `.agent-browser/scripts/agent-browser-stale tidy --dry-run` — preview what would be
   forgotten (superseded beyond the keep window, content rewritten past the commit horizon,
   dead by age). Review with the user, then `--apply` for the agreed scope.
   *Done when: the index reflects the retention policy; each non-superseded drop was
   user-confirmed.*
3. **Re-verify what drifted — automatically.** Every stale run is re-verified before it is
   trusted again: rerun its flow with the owning skill (web-logic for logic plans,
   web-smoke for flows, web-checker for checkpoints); the new run supersedes the old.
   Re-verification is the autonomy contract, not a question — ask only when a re-run is
   irreversible or expensive.
   *Done when: every stale run is re-verified (superseded) or consciously dropped.*
4. **Report.** Present: what was stale, why, what was re-verified, what was forgotten, and
   the current verification state.

## Judgment

- **Retention review.** Forgetting is not deleting history — git keeps the record; the
  index drops the record's *meaning*, not the past. `tidy --apply` is explicit, never
  background: nothing is forgotten without a user-visible dry-run first.
- Re-verification is read-only over code; for changing code, use `web-fixer`.

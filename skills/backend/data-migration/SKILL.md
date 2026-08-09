---
name: data-migration
description: Plan and verify safe data-layer changes — schema migrations, backfills, dual-writes, and rollback, without downtime or data loss.
disable-model-invocation: true
license: MIT
metadata:
  author: agent-compass
---

# Data Migration

Plan or verify any change to a data layer — a schema migration, a column rename, a
backfill, a format change in an object store. The migration is safe when it can be
run, verified, and rolled back without losing data or breaking readers at any point
in the sequence. Never run it for the user: produce the plan and the risks.

## Steps

1. **Map the change.** State what is changing — schema, data, or both — and list every
   place that reads or writes the affected shape: tables, queries, indexes, consumers,
   object-store layouts.
   *Done when: the blast radius is on the list, traced from the code — every reader
   and writer of the changing shape, not from memory.*

2. **Plan the order.** Write the migration sequence, additive-first: add the new shape,
   backfill, switch readers, then drop the old. Never destructive-first. Each step has
   a rollback.
   *Done when: the full ordered sequence and its rollback for every step are written
   down; no step destroys before its replacement is live.*

3. **Check the safety net.** Backup before destructive steps. Every step is idempotent —
   re-running it lands in the same state. A failed step leaves the database in a known
   state, never half-applied.
   *Done when: the re-run and rollback path of each step is verified against the code.*

4. **Check the dual-write.** For data transforms, the window is explicit: write both
   shapes, backfill in batches, verify each batch against the source, switch readers
   one at a time, and only then drop the old.
   *Done when: the dual-write window, batch size, verification step, and cutover are
   defined with acceptance criteria for each.*

5. **Check size and load.** Heavy operations are sized for production: bounded batches,
   no long-held locks, indexes built online, no table rewrite under live traffic.
   *Done when: each heavy step is measured and safe at production scale.*

6. **Verdict.** List each risk — destructive-first order, non-idempotent step, missing
   rollback, unverified backfill, reader switched before data is ready, unbounded
   batch, silent loss — with its fix and the check that would have caught it.
   *Done when: every risk on the list is filed or fixed; the plan passes the checks
   above, or the report says exactly why not.*

## Failure modes

- **Destructive-first** — the old shape is dropped or rewritten before the new one is
  live; a bad deploy loses data.
- **Half-applied step** — a migration fails midway; the database sits in a state that
  never existed.
- **Non-idempotent re-run** — the retry doubles inserts, re-adds a column, or runs a
  backfill twice.
- **No rollback** — the forward path exists; the way back does not.
- **Unverified backfill** — rows copied but never checked against the source; readers
  trust data no one confirmed.
- **Reader switched early** — the read path flips to the new shape before the backfill
  finishes.
- **Unbounded batch** — a backfill or rewrite that locks the table or fills the log
  under live traffic.
- **Silent loss** — a migration truncates what it cannot convert, and nothing records
  it.

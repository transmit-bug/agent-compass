---
name: reliable-api
description: Make an API or event flow safe under retries and replays — idempotency, retry policy, outbox, exactly-once semantics.
disable-model-invocation: true
license: MIT
metadata:
  author: agent-compass
---

# Reliable API

Verify or design the reliability semantics of any API or event flow — an order, a
payment, a webhook, a queue consumer. The flow is reliable when a request retried or
replayed a hundred times changes the world exactly as it did the first time. Never
change code: report what is wrong and how to fix it.

## Steps

1. **Map the effects.** List every state-changing operation in the flow — DB writes,
   external calls, event publishes — and which request or event triggers it.
   *Done when: every effect that would be dangerous to repeat is on the list, traced
   from the code, not from memory.*

2. **Check idempotency.** Every dangerous effect either is naturally idempotent or is
   gated by an idempotency key. A replay returns the original result, not a second
   execution. The key is server-generated or validated, never silently trusted from
   the caller.
   *Done when: for each dangerous effect, the replay path is traced and shown to
   produce the first response or no second effect.*

3. **Check the retry policy.** Retries happen only for retryable failures — timeouts,
   5xx, connection errors — never for 4xx, with bounded attempts and backoff. Retried
   requests are idempotent or keyed. Client and server do not both retry in a way
   that multiplies load.
   *Done when: every retry decision in the flow is accounted for and the retry budget
   is finite.*

4. **Check the outbox.** If the flow publishes events, the business write and the
   publish are one transaction: the outbox row commits with the change, a relay
   publishes after commit, and the consumer dedupes by event id. No publish-before-
   commit, no commit-without-publish.
   *Done when: the ordering is traced in the code — write, commit, relay, publish,
   consume — and each step is safe under a crash at any point.*

5. **Check exactly-once claims.** Where "exactly once" is claimed, verify it is
   at-least-once delivery plus idempotent processing — never a real exactly-once
   mechanism unless one is actually in place. Duplicates are deduped, not tolerated
   silently.
   *Done when: the claim is checked against the actual mechanism and the dedupe path
   is verified.*

6. **Verdict.** List each defect — missing idempotency, keyed wrong, unlimited retry,
   retry storm, torn write, outbox gap, dedupe hole, false exactly-once claim — with
   its fix and the test that would have caught it.
   *Done when: every defect on the list is filed or fixed; the flow passes the checks
   above, or the report says exactly why not.*

## Failure modes

- **Double effect** — the same request processed twice: two charges, two inserts, two
  emails. The classic idempotency failure.
- **Keyed by the caller** — an idempotency key the client invents; the client can
  retry with a fresh key and get a second execution.
- **Retry storm** — unlimited retries, or client and server both retrying, multiplying
  the load until the service falls over.
- **Torn write** — the business change commits but the event is never published, or
  the event publishes and the change never commits.
- **Outbox gap** — the publish sits outside the transaction; a crash between the two
  loses one or duplicates the other.
- **Poison message** — a permanently failing event retried forever, blocking the queue.
- **Replayed into new state** — an old event reprocessed after the world moved on,
  applied to state it was never written against.
- **False exactly-once** — "exactly once" claimed where the mechanism is at-least-once
  and the consumer is not idempotent.

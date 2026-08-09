---
name: state-machine
description: Design and verify state machines in any codebase — legal transitions, terminal states, persistence, and crash recovery.
disable-model-invocation: true
license: MIT
metadata:
  author: agent-compass
---

# State Machine

Design and verify the state machine of any system with lifecycle states — an order, a
device, an exam, an approval, a CI run. The machine is correct when every transition
is legal, every edge is handled, and the state survives a crash. Never change code:
report what is wrong and how to fix it.

## Steps

1. **Extract the machine.** List every state — persisted and transient — and every
   transition with its guard, straight from the code.
   *Done when: every state-changing code path in the system is on the list; nothing
   added from memory that the code does not show, nothing in the code left off.*

2. **Check legality.** Every transition fires from a state it is defined for, and its
   guard is actually evaluated, not assumed.
   *Done when: each transition's source state and guard are verified against the code.*

3. **Check the edges.** For every reachable (state, event) pair, the machine either
   handles it, ignores it deliberately, or makes it impossible. An event with no
   handler is a **swallowed event** — it vanishes, and the machine drifts from what
   the caller believes.
   *Done when: every reachable pair is accounted for, including out-of-order, duplicate,
   and stale events.*

4. **Check the ends.** A terminal state stops work: no transitions out, no timers,
   retries, or callbacks still firing, no side effects.
   *Done when: each terminal state is reached only through defined transitions and
   provably idles afterwards.*

5. **Check persistence and recovery.** State is persisted where the business needs it —
   every transition, or at defined checkpoints — and a restart resumes from persisted
   state, not from memory. A crash mid-transition leaves the old state or the new one,
   never a torn state; replaying an event is idempotent.
   *Done when: the restart path is traced in code and the state after every crash point
   is well-defined.*

6. **Verdict.** List each defect found — illegal transition, missing edge, swallowed
   event, non-terminal terminal state, unpersisted state, recovery gap — with its fix
   and the test that would have caught it.
   *Done when: every defect on the list is filed or fixed; the machine passes the checks
   above, or the report says exactly why not.*

## Failure modes

- **Swallowed event** — an event arrives in a state with no handler, and nothing records
  it. Callers believe it was processed.
- **Torn state** — a crash between two persisted writes leaves a state that never
  existed.
- **Memory-only machine** — state lives in process memory; a restart resets the world.
- **Zombie terminal** — a terminal state still runs timers, retries, or callbacks.
- **Assumed guard** — a transition's guard is checked only on the happy path; it fails
  in production.
- **Racing transitions** — two events in flight move the machine through each other's
  states; the final state depends on arrival order.

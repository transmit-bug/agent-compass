---
name: logic-test
description: Infer business logic from source, generate test cases, run them, and report problems by three-way classification.
disable-model-invocation: true
allowed-tools:
  - Bash
  - Read
---

# Logic Test

Business-logic testing for apps that have source code: read the code and page copy,
infer the business logic, generate test cases from that logic, execute them one by one
on the real running app, and finally classify and report the problems found. **Does not
change code** — it only tests and reports.

Applies to: web apps (driven by agent-browser), desktop apps (driven by
computer-automation), and pure backends or CLIs (plain Bash). The execution channel is
a branch taken at the last step; the first four steps are domain-independent.

## Dependencies

- Execution channel (pick one by app type):
  - **Web**: `agent-browser` (`npm i -g agent-browser && agent-browser install`), command
    surface `agent-browser skills get core`
  - **Desktop**: the `computer-automation` skill's mid.sh session commands
    (`start / act / assert / finish`)
  - **Backend / CLI**: plain Bash
- Run records (optional): the `agent-browser-run` script from the agent-browser suite,
  model per `skills/agent-browser/references/session-model.md` — runs fine without it,
  you just lose traceability

## Steps

1. **Understand the business logic.** Read the source (entry / routes / components /
   state / API calls), then combine it with the page copy and interactions, and list:
   - Core flows: the paths a user can take
   - Rules on each path: conditional branches, required fields, state changes,
     side effects (submits / navigation / data writes)
   - Boundaries and error handling: empty values, overlong input, invalid formats,
     API failures, timeouts
   Produce a **logic checklist** (each entry: flow → rule → expected behavior), show it
   to the user for confirmation or additions.
   *Done when: the checklist has been checked line by line against the source entry
   points and branches with nothing missing, and the user has confirmed it.*

2. **Generate test cases.** Generate from the logic checklist, with coverage
   requirements:
   - At least one case per logic entry (happy path)
   - At least one case for the else edge of every conditional branch
   - Boundary values: empty, minimum, maximum, overlong, invalid format
   - Error paths: API failure, timeout, invalid submission
   Produce: a case list (input → action → expected result), each entry tagged with its
   logic-checklist entry.
   *Done when: every entry in the checklist has cases and both sides of every branch
   are covered.*

3. **Run the cases.** Execute one by one:
   - **Web**: driven by agent-browser; assert structurally (`snapshot -i` / `read` /
     `get count` / `eval` / `wait --text`); screenshots only for "judging appearance"
     or "leaving evidence"
   - **Desktop**: `act` / `assert` from mid.sh
   - **Backend / CLI**: run commands, compare output and exit codes
   Record per case: action, actual result, expected, pass / fail. Reusable cases are
   saved as recipe files (`.agent-browser/flows/<name>.md`).
   *Done when: all cases have been executed and each has a result record.*

4. **Analyze the problems.** Classify each failing or anomalous case into three
   categories:
   - **Implementation doesn't match logic**: the source says A, the actual behavior is
     B → code bug (attach source location + actual evidence)
   - **The logic itself is flawed**: implementation and logic agree, but the logic is
     wrong / misses a boundary → design flaw
   - **I inferred wrong**: I misread the business logic → fix the case and re-run
   *Done when: every anomaly is classified; "implementation mismatch" entries have a
   source location, "logic flaw" entries state where the flaw is.*

5. **Report.** Organize by the three categories, each problem carrying evidence: case,
   action steps, expected, actual, screenshot or structural snapshot path. The report
   never ends silently — give a conclusion, evidence, and a recommended next step.

## Reference

- **Assertion semantics**: pass = the expectation can be verified by a structural
  assertion; when the expectation is vague, give evidence and ask the user — don't guess.
- **Classification boundary**: when unsure between "implementation mismatch" and "logic
  flaw", find the corresponding branch in the source — the branch exists but the
  behavior deviates is the former; the branch or boundary simply doesn't exist is the
  latter.
- Exploratory bug hunting (wandering without a clear logic checklist) is a different
  thing — that is agent-browser's `dogfood`, not this skill.

## Boundaries

- No code changes: fixing problems uses `web-fixer` (web) or `ui-fixer` (desktop).
- Irreversible actions (submit / delete / overwrite) — ask the user first.
- Sensitive content stays out of screenshots; auth goes through agent-browser's auth
  vault, never paste credentials.

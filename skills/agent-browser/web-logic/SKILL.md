---
name: web-logic
description: Test a web app's business logic — derive the logic from source, write it as a plan document, generate and run test cases, report problems by three-way classification.
disable-model-invocation: true
allowed-tools:
  - Bash
  - Read
---

# Web Logic (business layer)

Business-logic testing for web apps that have source code: the agent derives the business
logic **from the code itself — never from the user** — writes it down as a plan document,
then executes tests against that plan and classifies the problems found. It only tests and
reports — it never changes code. Invoked by name — "use web-logic to test the checkout
logic".

Run the **web-verify** discipline for perception, verdicts, and the autonomy gate. The run
is optional for ad-hoc probes (results then land in the report only); start one whenever
the session should be traceable or continuable.

## Steps

1. **Derive the logic plan from source.** Read the code (entry / routes / components /
   state / API calls), combine it with the page copy and interactions, and derive the
   business logic: core flows (paths a user can take), rules on each path (conditional
   branches, required fields, state changes, side effects), boundaries and error handling
   (empty values, overlong input, invalid formats, API failures, timeouts). Write the plan
   as `.agent-browser/flows/<flow>.md` — the durable plan document — with a provenance
   line naming the entry points it rests on. Ask the user only when the source genuinely
   does not answer (undocumented behavior, two competing flows) — never ask for logic the
   code already states.
   *Done when: every entry point and branch in the source is accounted for in the plan,
   and the plan is written to `.agent-browser/flows/`.*
2. **Generate test cases from the plan.** At least one happy path per plan entry, both
   sides of every conditional branch, boundary values (empty, minimum, maximum, overlong,
   invalid format), and error paths (API failure, timeout, invalid submission). Each case:
   input → action → expected result, tagged with its plan entry.
   *Done when: every plan entry has cases and both sides of every branch are covered.*
3. **Execute the cases.** Start the run (`../scripts/agent-browser-run start <app> <flow>
   --skill web-logic --provenance <the plan's source files>` — provenance makes a
   logic-relevant code change flag the run stale), then run the cases one by one, driven by
   the browser; assert structurally (snapshot / read / get count / eval / wait --text);
   record a checkpoint per case — action, actual result, expected, verdict.
   *Done when: every case has been executed and recorded.*
4. **Classify the problems.** Each failing or anomalous case falls into one of three:
   - **Implementation doesn't match logic** — the source says A, the behavior is B → code
     bug (attach source location + actual evidence)
   - **The logic itself is flawed** — implementation and logic agree, but the logic is
     wrong or misses a boundary → design flaw
   - **I inferred wrong** — I misread the business logic → fix the case and re-run
   *Done when: every anomaly is classified; mismatches carry a source location, flaws state
   where the flaw is.*
5. **Report and record.** Finish the run (`../scripts/agent-browser-run finish <app> <flow>
   --status complete|failed|aborted`); organize the report by the three categories, each
   problem carrying evidence (case, action steps, expected, actual, screenshot or snapshot
   path); end with a conclusion and a recommended next step; open app-repo tickets for
   confirmed problems (tracker-side intent).
   *Done when: every problem is classified with evidence, the report ends with a
   conclusion + next step, and confirmed problems are ticketed.*

## Judgment

- **Logic comes from the code, not the user.** Derive first; ask only where the source
  genuinely cannot answer. A plan written from the user's paraphrase instead of the source
  is a guess.
- **Classification boundary.** When unsure between "implementation mismatch" and "logic
  flaw", find the branch in the source: the branch exists but the behavior deviates is the
  former; the branch or boundary simply doesn't exist is the latter.
- Exploratory bug hunting without a clear logic plan is agent-browser's `dogfood`, not
  this skill.
- No code changes: fixing problems uses `web-fixer`.

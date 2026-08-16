---
name: web-setup
description: Onboard a web app repo into the agent-browser suite — scaffold the `.agent-browser/` state home and add the suite entry to the app's AGENTS.md. Use when a web app repo has no `.agent-browser/` yet.
disable-model-invocation: true
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
---

# Web Setup (business layer)

Onboard an app repo into the agent-browser suite: build the **state home** a fresh session
orients from — the `.agent-browser/` scaffolding, the orient doc, and how-to-run notes.
Runs once per app repo, executed by the agent; the user only completes a vault login when
the app has one. Invoked by name — "use web-setup to set up this app".

Setup **records**: structure, how to run, decisions — so every later session starts cheap.
The app is launched once, only to observe the machine facts worth recording; verification
of the app is the business skills' job (web-checker, web-smoke, …). Assume the operation
layer is installed (`agent-browser skills get core` answers); if a command fails as
"not found", install it (`npm i -g agent-browser && agent-browser install`) with the
user's go-ahead — a machine-level change.

The suite's scripts ship with the **web-verify** skill; this skill bootstraps them into the
app's state home, so every later skill calls a stable path — `.agent-browser/scripts/…` —
no matter where the skills were installed.

Run the **web-verify** discipline for perception and the autonomy gate.

## Steps

1. **Install the suite scripts into the state home.** Copy the run-lifecycle and staleness
   scripts (`agent-browser-run`, `agent-browser-stale`, `agent_browser_common.py`) from the
   installed web-verify skill — this skill's sibling in the skills root (`../web-verify/`
   from here; find it as `web-verify/scripts/agent-browser-run` if the root is unknown) —
   into `.agent-browser/scripts/` and chmod +x. If no local copy is found, fetch the three
   files from the repo
   (`https://raw.githubusercontent.com/transmit-bug/agent-compass/main/skills/agent-browser/web-verify/scripts/`).
   *Done when: `.agent-browser/scripts/agent-browser-run` answers `--help` (and is committed
   with the state home, so clones need no re-bootstrap).*

2. **Scaffold the state home.** `.agent-browser/scripts/agent-browser-run init` — creates
   `.agent-browser/` (empty records + orient doc) and appends `.agent-browser/runs/` to
   `.gitignore` (idempotent).
   *Done when: `.agent-browser/index.md` exists and the runs dir is gitignored.*

3. **Discover how to run the app.** Launch the app the way a fresh session would — dev
   server, mock backend if that's the default — and wait for it to answer (a deterministic
   `wait`: element / `--url` / `--text`, never a bare timeout).
   One launch, for observation: note the facts this machine forces — the exact launch
   command, the port (a taken default port is a fact), what the UI can do without real
   hardware. Write them to `docs/agent-browser/app-notes.md`; re-run `init` so the orient
   doc lists it.
   *Done when: app-notes records a launch a fresh session can reproduce — command, port,
   mock-backend behavior — and the orient doc links it under Durable docs.*

4. **Scaffold the scenario library.** Create `docs/agent-browser/scenarios/` with the
   category dirs `smoke/`, `setup/`, `business/`, `flows/` and a `README.md` navigation
   index (empty category tables: id → what, priority, depends; the scenario contract lives
   in session-model.md). Re-run `init` so the orient doc lists it.
   *Done when: the four category dirs exist, the README index is in place, and the orient
   doc lists the scenario files.*

5. **Declare the entry in the app's AGENTS.md.** Append this section — the file loads every
   turn in the app repo, so it stays exactly this short:

   ```markdown
   ## Web-app lifecycle

   Managed by the agent-browser suite — orient at `.agent-browser/index.md`; `web-*` skills
   are invoked by name.
   ```

   Idempotent — skip when a `## Web-app lifecycle` section already exists; write AGENTS.md,
   or CLAUDE.md when that is the repo's convention and AGENTS.md is absent.
   *Done when: the app's AGENTS.md carries the entry, and re-running setup will not
   duplicate it.*

6. **Note auth facts.** If the app has a login surface, `agent-browser auth login <name>` —
   interactive, the user completes it once. If it has none, record "no auth" in app-notes
   so runs never re-ask.
   *Done when: authenticated sessions need no re-login, or the no-auth decision is recorded.*

7. **Orient.** Read the generated `.agent-browser/index.md`; it names the durable docs and
   the next action. For the lifecycle at a glance and cross-session continuation, the
   usage guide is [references/usage.md](references/usage.md) (ships with this skill).
   *Done when: the orient doc reads correctly and names the next action — usually picking
   a feature ticket and starting a run with the owning skill.*

## Judgment

- **Record, don't prove.** Setup's deliverable is the orient doc plus the notes and
  decisions it links — what every later session reads first. The one launch exists only
  to feed app-notes; the app's verification is the business skills' job.
- Re-running setup is safe (init and the script copy are idempotent); re-doing auth is the
  only interactive part.

---
name: web-setup
description: Initialize a web app repo for the agent-browser suite — scaffold .agent-browser/ and the orient doc, gitignore the evidence, record how to run the app, check the operation layer, auth the vault. Use when an app repo has no .agent-browser/ yet, or when the user asks to set up or onboard a web app for lifecycle management.
disable-model-invocation: true
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
---

# Web Setup (business layer)

Initialize an app repo for the agent-browser suite: build the **unified context** a fresh
session orients from — the `.agent-browser/` scaffolding, the derived orient doc, how-to-run
notes, and a working operation layer. Runs once per app repo, executed by the agent — the
user never types script commands; they only complete the one-time interactive vault login.
Invoked by name — "use web-setup to set up this app".

Run the **web-verify** discipline for perception and the autonomy gate.

## Steps

1. **Check the operation layer.** `agent-browser skills get core` answers → proceed. If the
   CLI is missing, install it (`npm i -g agent-browser && agent-browser install`) with the
   user's go-ahead — it is a machine-level change.
   *Done when: the CLI answers and the browser can launch.*
2. **Scaffold the state home.** `../scripts/agent-browser-run init` — creates
   `.agent-browser/` (empty records + orient doc) and appends `.agent-browser/runs/` to
   `.gitignore` (idempotent).
   *Done when: `.agent-browser/index.md` exists and the runs dir is gitignored.*
3. **Record how to run the app.** Write `docs/agent-browser/app-notes.md` in the app repo:
   dev server command, URLs, auth names — anything a fresh session must know to launch.
   Re-run `../scripts/agent-browser-run init` so the orient doc lists it under Durable docs.
   *Done when: a fresh session can start the app from the notes, and the orient doc links
   them.*
4. **Auth the vault.** `agent-browser auth login <name>` — interactive; the user completes
   it once.
   *Done when: authenticated sessions work without re-login.*
5. **Confirm reachability.** Start the app from the notes; `wait --load` then a structure
   snapshot — the page answers.
   *Done when: the app is reachable and its initial structure is known.*
6. **Orient.** Read the generated `.agent-browser/index.md`; the lifecycle can begin — the
   usual next action is picking a feature ticket and starting a run with the owning skill.
   *Done when: the orient doc reads correctly and names the next action.*

## Judgment

- **Unified context.** Setup's deliverable is one artifact — the orient doc — plus the
  notes it links; every later session starts from there, never from this conversation.
- Re-running setup is safe (init is idempotent); re-doing auth is the only interactive part.

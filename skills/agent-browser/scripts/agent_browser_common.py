#!/usr/bin/env python3
"""agent-browser-common — shared facts + orient-doc rendering for the suite scripts.

Deterministic only: it computes records, derived status, and the orient doc; it never
decides. Contract: references/session-model.md (owned by web-verify).
"""
import datetime
import json
import os
import subprocess

BASE = ".agent-browser"
RUNS = os.path.join(BASE, "runs")
INDEX_JSON = os.path.join(BASE, "index.json")
INDEX_MD = os.path.join(BASE, "index.md")

# Derived-status precedence, worst first (ADR-0002 vocabulary): blocked (work cannot
# proceed), failing (known wrong), stale (untrusted), in-progress (being worked),
# verified. Assignment and sorting share this order.
STATUS_ORDER = ["blocked", "failing", "stale", "in-progress", "verified"]

# Per-feature stage, from the latest run's skill.
STAGE_BY_SKILL = {
    "web-dev": "dev",
    "web-checker": "check",
    "web-fixer": "fix",
    "web-smoke": "smoke",
    "web-maintain": "maintain",
    "web-logic": "logic",
}

ASSESSMENT_KINDS = {
    "completeness": ["complete", "partial", "missing"],
    "logic": ["clear", "ambiguous", "contradictory"],
    "flow": ["sound", "awkward", "broken"],
    "ui": ["reasonable", "ineffective", "broken"],
}

CONCERN_KINDS = {"missing", "contradictory", "broken"}


def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def git(args, cwd=None):
    return subprocess.run(["git"] + args, capture_output=True, text=True, cwd=cwd)


def load_json(path, default):
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return default


def save_json(path, data):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def save_md(path, lines):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w") as f:
        f.write("\n".join(lines))


def load_index():
    return load_json(INDEX_JSON, {"runs": [], "assessments": []})


def save_index(index):
    save_json(INDEX_JSON, index)
    render_orient(index)


def latest_run_per_flow(runs):
    """Latest record per (app, flow)."""
    latest = {}
    for r in sorted(runs, key=lambda r: r.get("startedAt", ""), reverse=True):
        latest.setdefault((r["app"], r["slug"]), r)
    return latest


def derive_status(record):
    """Derive the per-flow status from the latest record (ADR-0002)."""
    if record.get("blockers"):
        return "blocked"
    if record.get("status") in ("running", "aborted", "failed"):
        return "in-progress"
    verdict = record.get("verdict")
    if verdict == "fail":
        return "failing"
    if record.get("stale"):
        return "stale"
    if verdict == "unsure":
        return "in-progress"
    if verdict == "pass":
        return "verified"
    return "in-progress"


def status_rank(status):
    return STATUS_ORDER.index(status) if status in STATUS_ORDER else len(STATUS_ORDER)


def latest_assessments(assessments):
    """Latest assessment per (app, scope)."""
    latest = {}
    for a in sorted(assessments, key=lambda a: a.get("assessedAt", ""), reverse=True):
        latest.setdefault((a["app"], a["scope"]), a)
    return latest


def assessment_concerns(assessment):
    return [kind for kind in ASSESSMENT_KINDS
            if assessment.get(kind) in CONCERN_KINDS]


def next_actions(runs, assessments):
    """Derived next actions: status-driven, assessment-driven, tracker refs."""
    actions = []
    for key, r in sorted(latest_run_per_flow(runs).items(),
                         key=lambda kv: (status_rank(derive_status(kv[1])),
                                         kv[1].get("startedAt", ""))):
        flow = key[1]
        st = derive_status(r)
        if st == "in-progress":
            actions.append(f"resume {flow} from its checkpoints")
        elif st == "blocked":
            actions.append(f"resolve blocker(s) {', '.join(r['blockers'])} on {flow}")
        elif st == "stale":
            actions.append(f"re-verify {flow} before trusting it (via {r.get('skill','-')})")
        elif st == "failing":
            actions.append(f"check/fix {flow} (verdict fail)")
    for key, a in sorted(latest_assessments(assessments).items()):
        concerns = assessment_concerns(a)
        if concerns:
            actions.append(f"review {key[1]}: {', '.join(concerns)}")
    refs = sorted({r.get("ticket") for r in runs if r.get("ticket")}
                  | {b for r in runs for b in (r.get("blockers") or [])})
    return actions, refs


def expectations_list():
    d = os.path.join(BASE, "expectations")
    if os.path.isdir(d):
        return sorted(f for f in os.listdir(d) if f.endswith(".md"))
    return []


def flows_list():
    d = os.path.join(BASE, "flows")
    if os.path.isdir(d):
        return sorted(f for f in os.listdir(d) if f.endswith(".md"))
    return []


def durable_docs():
    d = os.path.join("docs", "agent-browser")
    if os.path.isdir(d):
        return sorted(f for f in os.listdir(d) if f.endswith(".md"))
    return []


def truncate(s, n=120):
    s = s.replace("|", "\\|")
    return s if len(s) <= n else s[: n - 1] + "…"


def render_orient(index):
    runs = index.get("runs", [])
    assessments = index.get("assessments", [])
    lines = ["# Web-App Lifecycle · orient doc (derived — do not edit)", ""]

    latest = latest_run_per_flow(runs)
    if latest:
        lines.append("## Status (derived)")
        lines.append("| flow | stage | status | last verified | verdict | notes |")
        lines.append("|---|---|---|---|---|---|")
        la = latest_assessments(assessments)
        for key, r in sorted(latest.items(),
                             key=lambda kv: (status_rank(derive_status(kv[1])),
                                             kv[1].get("startedAt", ""))):
            flow = key[1]
            stamp = (r.get("finishedAt") or r.get("startedAt") or "-")[:16]
            stage = STAGE_BY_SKILL.get(r.get("skill", ""), "-")
            notes = []
            if r.get("blockers"):
                notes.append("blocked: " + ", ".join(r["blockers"]))
            if r.get("ticket"):
                notes.append("ticket " + r["ticket"])
            a = la.get((r["app"], flow))
            if a:
                concerns = assessment_concerns(a)
                if concerns:
                    notes.append("assess: " + ", ".join(concerns))
            lines.append(f"| {flow} | {stage} | {derive_status(r)} | {stamp} | "
                         f"{r.get('verdict','-')} | {'; '.join(notes) or '-'} |")
        lines.append("")

    la = latest_assessments(assessments)
    if la:
        lines.append("## Assessments (latest per scope)")
        lines.append("| scope | completeness | logic | flow | ui | gist |")
        lines.append("|---|---|---|---|---|---|")
        for key, a in sorted(la.items()):
            lines.append(f"| {key[1]} | {a.get('completeness','-')} | {a.get('logic','-')} "
                         f"| {a.get('flow','-')} | {a.get('ui','-')} | {truncate(a.get('gist','-'))} |")
        lines.append("")

    actions, refs = next_actions(runs, assessments)
    if actions or refs:
        lines.append("## Next actions (derived)")
        for a in actions:
            lines.append(f"- {a}")
        if refs:
            lines.append(f"- tracker: check open refs {', '.join(refs)}")
        lines.append("")

    exps = expectations_list()
    if exps:
        lines.append("## Expectations (reusable ground truth)")
        for e in exps:
            lines.append(f"- {e}")
        lines.append("")

    flows = flows_list()
    if flows:
        lines.append("## Flows (verification plans)")
        for f in flows:
            lines.append(f"- {f}")
        lines.append("")

    docs = durable_docs()
    if docs:
        lines.append("## Durable docs")
        for d in docs:
            lines.append(f"- [docs/agent-browser/{d}](docs/agent-browser/{d})")
        lines.append("")

    if not runs and not assessments:
        lines.append("(no records yet — the orient doc fills with the first run)")
        lines.append("")

    if runs:
        lines.append("## Recent runs")
        lines.append("| time | flow | skill | commit | verdict | status |")
        lines.append("|---|---|---|---|---|---|")
        for r in sorted(runs, key=lambda r: r.get("startedAt", ""), reverse=True)[:20]:
            stamp = r.get("finishedAt") or r.get("startedAt") or "-"
            lines.append(f"| {stamp[:16]} | {r['slug']} | {r.get('skill','-')} "
                         f"| {r.get('commit','-')[:8]} | {r.get('verdict','-')} | {r.get('status','')} |")
    save_md(INDEX_MD, lines)

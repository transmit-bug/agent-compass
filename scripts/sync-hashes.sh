#!/usr/bin/env bash
# Recompute computedHash for every skill in skills-lock.json in one pass.
#
# Hash rule (AGENTS.md, "Modifying a skill"):
# sha256 of concatenated (relativePath + content) over every file in the skill
# directory, files sorted by relative path, relativePath measured from the
# skill's own directory. A directory move only changes skillPath — the hash
# stays the same.
#
# Usage:
#   ./scripts/sync-hashes.sh --check   # report stale hashes, exit 1 if any (no changes)
#   ./scripts/sync-hashes.sh           # recompute all hashes, update skills-lock.json in place
#
# Run this once right before committing — do NOT chase hashes per edit.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCK="$ROOT/skills-lock.json"
MODE="${1:-}"

command -v python3 >/dev/null 2>&1 || { echo "error: python3 required" >&2; exit 1; }

python3 - "$LOCK" "$MODE" <<'PY'
import hashlib, json, os, sys

lock_path, mode = sys.argv[1], sys.argv[2]
root = os.path.dirname(os.path.abspath(lock_path))


def skill_hash(skill_path):
    d = os.path.join(root, os.path.dirname(skill_path))
    if not os.path.isdir(d):
        return None
    parts = []
    for dirpath, _dirs, files in os.walk(d):
        for f in files:
            if f == ".DS_Store" or "__pycache__" in dirpath:
                continue
            full = os.path.join(dirpath, f)
            rel = os.path.relpath(full, d)
            parts.append((rel, open(full, "rb").read()))
    parts.sort(key=lambda p: p[0])
    h = hashlib.sha256()
    for rel, content in parts:
        h.update(rel.encode())
        h.update(content)
    return h.hexdigest()


lock = json.load(open(lock_path))
stale, missing = [], []
for name, e in lock.get("skills", {}).items():
    new_hash = skill_hash(e["skillPath"])
    if new_hash is None:
        missing.append((name, e["skillPath"]))
    elif new_hash != e.get("computedHash"):
        stale.append((name, e["skillPath"], new_hash))

if missing:
    for name, path in missing:
        print(f"MISSING  {name} ({path}) — skill directory not found")
    sys.exit(1)

if mode == "--check":
    for name, path, _ in stale:
        print(f"STALE  {name} ({path}) — run ./scripts/sync-hashes.sh")
    if stale:
        print(f"{len(stale)} stale hash(es) in skills-lock.json")
        sys.exit(1)
    print("all hashes match the working tree")
    sys.exit(0)

if not stale:
    print("all hashes already match the working tree")
    sys.exit(0)

for name, _path, new_hash in stale:
    lock["skills"][name]["computedHash"] = new_hash
    print(f"recomputed hash for {name}: {new_hash}")
with open(lock_path, "w") as f:
    json.dump(lock, f, indent=2)
    f.write("\n")
print("skills-lock.json updated — review with 'git diff' before committing.")
PY

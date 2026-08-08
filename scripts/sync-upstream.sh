#!/usr/bin/env bash
# Check (and optionally apply) upstream drift for vendored skills.
#
# Vendored skills carry an `upstream` block in skills-lock.json:
#   "upstream": { "repo": "<owner>/<name>", "path": "<path/to/SKILL.md>", "ref": "main" }
#
# Usage:
#   ./scripts/sync-upstream.sh --check   # report SAME/DIFF per skill, exit 1 if any drift (no changes)
#   ./scripts/sync-upstream.sh           # pull changed SKILL.md files, recompute hashes, update skills-lock.json
#
# The hash is computed the same way as AGENTS.md specifies:
# sha256 of concatenated (relativePath + content) over every file in the skill dir,
# files sorted by relative path.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCK="$ROOT/skills-lock.json"
MODE="${1:---check}"

command -v python3 >/dev/null 2>&1 || { echo "error: python3 required" >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "error: curl required" >&2; exit 1; }

ROWS="$(python3 - "$LOCK" <<'PY'
import json, sys
lock = json.load(open(sys.argv[1]))
for name, e in lock.get("skills", {}).items():
    up = e.get("upstream")
    if up:
        print(f"{name}\t{e['skillPath']}\t{up['repo']}\t{up['path']}\t{up['ref']}")
PY
)"

[ -n "$ROWS" ] || { echo "no upstream-tracked skills in skills-lock.json"; exit 0; }

DRIFT=0
while IFS=$'\t' read -r name skill_path repo up_path ref; do
  [ -n "$name" ] || continue
  url="https://raw.githubusercontent.com/$repo/$ref/$up_path"
  local_file="$ROOT/$skill_path"
  tmp="$(mktemp)"
  if ! curl -fsSL -o "$tmp" "$url"; then
    echo "ERR   $name — failed to fetch $url"
    rm -f "$tmp"
    DRIFT=1
    continue
  fi
  if [ -f "$local_file" ] && cmp -s "$tmp" "$local_file"; then
    echo "SAME  $name ($repo@$ref)"
    rm -f "$tmp"
    continue
  fi
  echo "DIFF  $name ($repo@$ref)"
  DRIFT=1
  if [ "$MODE" != "--check" ]; then
    cp "$tmp" "$local_file"
    echo "      -> updated $skill_path (review before committing)"
  fi
  rm -f "$tmp"
done <<< "$ROWS"

if [ "$MODE" != "--check" ] && [ "$DRIFT" -eq 1 ]; then
  # Recompute computedHash for every skill whose files changed, in place.
  python3 - "$LOCK" <<'PY'
import hashlib, json, os, sys
lock_path = sys.argv[1]
root = os.path.dirname(os.path.dirname(os.path.abspath(lock_path)))

def skill_hash(skill_path):
    d = os.path.join(root, os.path.dirname(skill_path))
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
changed = False
for name, e in lock.get("skills", {}).items():
    new_hash = skill_hash(e["skillPath"])
    if new_hash != e.get("computedHash"):
        e["computedHash"] = new_hash
        changed = True
        print(f"      -> recomputed hash for {name}: {new_hash}")
if changed:
    with open(lock_path, "w") as f:
        json.dump(lock, f, indent=2)
        f.write("\n")
PY
  echo ""
  echo "Updated. Run 'git diff' to review the vendored SKILL.md files and skills-lock.json."
fi

exit "$DRIFT"

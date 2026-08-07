#!/usr/bin/env python3
"""Extract per-step conclusions from the merged report.md (used by mid.sh finish to build index.md)

Usage: python3 extract-steps.py <merged-report.md>
Output: title of each execution step + the model conclusion (Output/Thought sections, in document order)
"""
import sys
import re
import json

text = open(sys.argv[1], encoding="utf-8").read()


def clean(s):
    return re.sub(r"\s+", " ", s).strip()


def conclusion_of(sec):
    m = re.search(r"### Output\n\s*```(?:json)?\n(.*?)```", sec, re.S)
    if m:
        raw = m.group(1)
        try:
            d = json.loads(raw)
            out = d.get("output") or d.get("thought") or d.get("log")
            if out:
                return clean(str(out))
        except Exception:
            pass
        return clean(raw)
    m = re.search(r"### Thought\n\s*```text\n(.*?)```", sec, re.S)
    if m:
        return clean(m.group(1))
    return ""


sections = re.split(r"(?m)^## ", text)[1:]
for sec in sections:
    title = sec.split("\n", 1)[0].strip()
    if not title or "Model Info" in title or "Token Usage" in title:
        continue
    c = conclusion_of(sec)
    if not c:
        continue
    print(f"### {title}")
    print()
    print(c[:800])
    print()

#!/usr/bin/env bash
# Print loop gate status for this repo. Exit codes:
# 0 = proceed (optionally retry_ok if one report is open)
# 2 = halt (loop-halt open or HALT file)
# 3 = stop-and-halt-now (>=2 open loop-reports)
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

halt_file=0
if [[ -f .cursor/loop/HALT ]]; then
  halt_file=1
fi

json="$(gh issue list --state open --limit 100 --json number,title,url 2>/dev/null || echo '[]')"

python3 - "$json" "$halt_file" <<'PY'
import json, sys

issues = json.loads(sys.argv[1] or "[]")
halt_file = sys.argv[2] == "1"

def titles(prefix):
    return [i for i in issues if str(i.get("title") or "").startswith(prefix)]

halts = titles("[loop-halt]")
reports = titles("[loop-report]")

print(f"halt_file={halt_file}")
print(f"open_loop_halt={len(halts)}")
for i in halts:
    print(f"  halt #{i['number']} {i['title']} {i.get('url','')}")
print(f"open_loop_report={len(reports)}")
for i in reports:
    print(f"  report #{i['number']} {i['title']} {i.get('url','')}")

if halt_file or halts:
    print("decision=HALT")
    sys.exit(2)
if len(reports) >= 2:
    print("decision=HALT_NOW")
    sys.exit(3)
if len(reports) == 1:
    print("decision=RETRY_ALLOWED")
    sys.exit(0)
print("decision=PROCEED")
sys.exit(0)
PY

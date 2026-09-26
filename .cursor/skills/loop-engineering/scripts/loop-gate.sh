#!/usr/bin/env bash
# Print loop gate status for this repo. Exit codes:
# 0 = proceed (RETRY_ALLOWED if exactly one loop-report is open)
# 2 = halt (loop-halt open or HALT file exists)
# 3 = stop-and-halt-now (>=2 open loop-reports)
# 4 = GitHub 照会失敗（フェイルクローズ。進行してはいけない）
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

halt_file=0
if [[ -e .cursor/loop/HALT ]]; then
  halt_file=1
fi

gh_err="$(mktemp)"
set +e
# author_association を得るため REST を使う。gh issue list の JSON には含まれない。
# この API は PR も返すので、PR に枠を取られて halt を見落とさないよう全ページ読む（--slurp でページの配列になる）。
json="$(gh api --paginate --slurp "repos/{owner}/{repo}/issues?state=open&per_page=100" 2>"$gh_err")"
gh_status=$?
set -e
if [[ $gh_status -ne 0 ]]; then
  echo "decision=GH_ERROR"
  echo "gh api issues failed (fail closed; do not PROCEED)"
  cat "$gh_err" >&2 || true
  rm -f "$gh_err"
  exit 4
fi
rm -f "$gh_err"

printf '%s' "$json" | python3 -c '
import json, sys

halt_file = sys.argv[1] == "1"
try:
    issues = json.load(sys.stdin)
except json.JSONDecodeError as e:
    print("decision=GH_ERROR")
    print("invalid gh json: %s" % e)
    sys.exit(4)

if not isinstance(issues, list) or not all(isinstance(page, list) for page in issues):
    print("decision=GH_ERROR")
    print("gh json is not a list of pages")
    sys.exit(4)
issues = [i for page in issues for i in page]

# public リポジトリなので誰でも issue を立てられる。リポジトリ側の人が立てたものだけ数える。
TRUSTED = {"OWNER", "MEMBER", "COLLABORATOR"}
trusted = [
    i
    for i in issues
    if isinstance(i, dict)
    and "pull_request" not in i
    and i.get("author_association") in TRUSTED
]

def titles(prefix):
    return [i for i in trusted if str(i.get("title") or "").startswith(prefix)]

halts = titles("[loop-halt]")
reports = titles("[loop-report]")

print("halt_file=%s" % halt_file)
print("open_loop_halt=%s" % len(halts))
for i in halts:
    print("  halt #%s %s %s" % (i["number"], i["title"], i.get("html_url", "")))
print("open_loop_report=%s" % len(reports))
for i in reports:
    print("  report #%s %s %s" % (i["number"], i["title"], i.get("html_url", "")))

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
' "$halt_file"

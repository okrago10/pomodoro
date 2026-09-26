#!/usr/bin/env bash
# 読み取り専用: 自分が起動したインスタンスが生きていて pomodoro を返すか確認する。
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"
RUN=.verify-artifacts/run
fail() { echo "DOCTOR FAIL: $*" >&2; exit 1; }
[ -f "$RUN/pid" ] || fail "no $RUN/pid (run launch.sh)"
PID=$(cat "$RUN/pid"); URL=$(cat "$RUN/url")
kill -0 "$PID" 2>/dev/null || fail "pid $PID not alive"
HTML=$(curl -sf "$URL") || fail "$URL not answering"
grep -q "<title>pomodoro</title>" <<<"$HTML" || fail "$URL is not pomodoro"
echo "OK pid=$PID url=$URL head=$(git rev-parse --short HEAD) dirty=$(git status --porcelain | wc -l)"

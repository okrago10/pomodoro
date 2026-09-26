#!/usr/bin/env bash
# launch.sh が起動したプロセスグループだけを止める。証跡 (.verify-artifacts/<scenario>-*) は残す。
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"
RUN=.verify-artifacts/run
if [ -f "$RUN/pid" ]; then
  PID=$(cat "$RUN/pid")
  kill -- "-$PID" 2>/dev/null || kill "$PID" 2>/dev/null || true
  echo "stopped pid group $PID"
fi
rm -rf "$RUN"

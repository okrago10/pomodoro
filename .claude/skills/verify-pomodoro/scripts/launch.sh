#!/usr/bin/env bash
# 検証用の Vite dev サーバを空きポートで起動し、状態を .verify-artifacts/run/ に書く。
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
RUN=.verify-artifacts/run
mkdir -p "$RUN"
if [ -f "$RUN/pid" ] && kill -0 "$(cat "$RUN/pid")" 2>/dev/null; then
  echo "already running: pid=$(cat "$RUN/pid") url=$(cat "$RUN/url")"; exit 0
fi
[ -d node_modules ] || npm ci
PORT=${PORT:-$(node -e 's=require("net").createServer().listen(0,()=>{console.log(s.address().port);s.close()})')}
setsid npx vite --host 127.0.0.1 --port "$PORT" --strictPort >"$RUN/vite.log" 2>&1 &
echo $! >"$RUN/pid"
URL="http://127.0.0.1:$PORT/pomodoro/"
echo "$URL" >"$RUN/url"
for _ in $(seq 1 60); do
  if curl -sf "$URL" >/dev/null; then echo "ready: $URL pid=$(cat "$RUN/pid")"; exit 0; fi
  sleep 0.5
done
echo "vite did not become ready; see $RUN/vite.log" >&2; exit 1

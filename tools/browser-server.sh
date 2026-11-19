#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
PORT=$(python3 - <<'PY'
import socket
s=socket.socket();s.bind(('127.0.0.1',0));print(s.getsockname()[1]);s.close()
PY
)
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory game >/tmp/solmar-server-"$PORT".log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT INT TERM
for i in {1..100}; do
  if curl -fsS "http://127.0.0.1:$PORT/" >/dev/null 2>&1; then break; fi
  sleep .1
done
curl -fsS "http://127.0.0.1:$PORT/" >/dev/null || { echo 'FAIL server readiness'; exit 1; }
URL="http://127.0.0.1:$PORT/"

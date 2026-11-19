#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/browser-server.sh"
if timeout 360s node tools/browser-drive.mjs "${URL}?seed=1&quality=low" /tmp/solmar-check3d.png --check; then
  echo 'PASS check3d screenshot=/tmp/solmar-check3d.png'
else
  result=$?
  echo "FAIL check3d exit=$result screenshot=/tmp/solmar-check3d.png (if capture succeeded)"
  exit "$result"
fi

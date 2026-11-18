#!/bin/bash
# shots: render the 4 screenshots (cover/title/onfoot/map) in headless Chromium,
# then run the ffmpeg quality loop (q=3..31) targeting 200-240 KiB each.
# Fails on a missing shot or on Uncaught / 3D RENDERER FAILED in the log.
set -e
REPO="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-8124}"
mkdir -p "$REPO/screenshots" /tmp/shots
cd "$REPO"
node serve.ts --port "$PORT" > /tmp/shots/serve.log 2>&1 &
SERVE_PID=$!
trap 'kill $SERVE_PID 2>/dev/null || true' EXIT
sleep 2
fail=0
for spec in "1-cover.jpg:cover" "2-title.jpg:title" "3-onfoot.jpg:onfoot" "4-map.jpg:map"; do
  name="${spec%%:*}"; shot="${spec##*:}"
  ${CHROME:-chromium-browser} --headless=new --no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr \
    --window-size=1280,720 --virtual-time-budget=25000 \
    --screenshot="/tmp/shots/$name.png" \
    "http://127.0.0.1:$PORT/?shot=$shot&seed=1" > "/tmp/shots/chrome-$shot.log" 2>&1 || fail=1
  if [ ! -s "/tmp/shots/$name.png" ]; then echo "shots: FAIL no image for $shot"; fail=1; continue; fi
  if grep -q "Uncaught" "/tmp/shots/chrome-$shot.log"; then echo "shots: FAIL Uncaught in $shot"; grep "Uncaught" "/tmp/shots/chrome-$shot.log" | head -3; fail=1; fi
  if grep -q "3D RENDERER FAILED" "/tmp/shots/chrome-$shot.log"; then echo "shots: FAIL renderer failed in $shot"; fail=1; fi
  # Quality loop: q=3 up until the file fits the per-screenshot cap
  # (262144 bytes, the dossier limit) or q hits 31.
  MAX_BYTES=262144
  q=3
  while true; do
    ffmpeg -y -v error -i "/tmp/shots/$name.png" -q:v "$q" "$REPO/screenshots/$name"
    size=$(stat -c%s "$REPO/screenshots/$name")
    if [ "$size" -le "$MAX_BYTES" ] || [ "$q" -ge 31 ]; then break; fi
    q=$((q + 2))
  done
  echo "shots: $name q=$q size=$size bytes"
done
if [ "$fail" = 1 ]; then echo "shots: FAIL"; exit 1; fi
echo "shots: PASS"

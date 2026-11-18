#!/bin/bash
# shots: render the 4 screenshots (cover/title/onfoot/map) in headless Chromium,
# then run the ffmpeg quality loop (q=3..31) targeting 200-240 KiB each.
# Fails on a missing shot or on Uncaught / 3D RENDERER FAILED in the log.
set -e
REPO="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-8124}"
# Chromium: prefer the Playwright build (SwiftShader-capable), then the
# system browser. Set CHROME to override.
if [ -z "$CHROME" ]; then
  for c in "$HOME/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome" "$HOME/.cache/ms-playwright/chromium-1187/chrome-linux/chrome" chromium-browser chromium google-chrome; do
    if command -v "$c" >/dev/null 2>&1 || [ -x "$c" ]; then CHROME="$c"; break; fi
  done
fi
CHROME="${CHROME:-chromium-browser}"
# Scratch dir: TMPDIR (the VM's /tmp is only 512 MB).
SHOTS_TMP="${SHOTS_TMP:-${TMPDIR:-~/.cache/tmp}/shots}"
mkdir -p "$REPO/screenshots" "$SHOTS_TMP"
cd "$REPO"
node serve.ts --port "$PORT" > $SHOTS_TMP/serve.log 2>&1 &
SERVE_PID=$!
trap 'kill $SERVE_PID 2>/dev/null || true' EXIT
sleep 2
fail=0
for spec in "1-cover.jpg:cover" "2-title.jpg:title" "3-onfoot.jpg:onfoot" "4-map.jpg:map"; do
  name="${spec%%:*}"; shot="${spec##*:}"
  ${CHROME:-chromium-browser} --headless=new --no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr \
    --window-size=1280,720 --virtual-time-budget=25000 \
    --screenshot="$SHOTS_TMP/$name.png" \
    "http://127.0.0.1:$PORT/?shot=$shot&seed=1" > "$SHOTS_TMP/chrome-$shot.log" 2>&1 || fail=1
  if [ ! -s "$SHOTS_TMP/$name.png" ]; then echo "shots: FAIL no image for $shot"; fail=1; continue; fi
  if grep -q "Uncaught" "$SHOTS_TMP/chrome-$shot.log"; then echo "shots: FAIL Uncaught in $shot"; grep "Uncaught" "$SHOTS_TMP/chrome-$shot.log" | head -3; fail=1; fi
  if grep -q "3D RENDERER FAILED" "$SHOTS_TMP/chrome-$shot.log"; then echo "shots: FAIL renderer failed in $shot"; fail=1; fi
  # Quality loop: q=3 up until <= 262144 bytes or q >= 31.
  q=3
  while true; do
    ffmpeg -y -v error -i "$SHOTS_TMP/$name.png" -q:v "$q" "$REPO/screenshots/$name"
    size=$(stat -c%s "$REPO/screenshots/$name")
    if [ "$size" -le 262144 ] || [ "$q" -ge 31 ]; then break; fi
    q=$((q + 2))
  done
  echo "shots: $name q=$q size=$size bytes"
done
if [ "$fail" = 1 ]; then echo "shots: FAIL"; exit 1; fi
echo "shots: PASS"

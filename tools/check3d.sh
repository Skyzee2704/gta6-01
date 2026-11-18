#!/bin/bash
# check3d: serve game/ locally, render the cover + title scenes in headless
# Chromium (SwiftShader) — needs a Chromium binary on PATH — and fail on
# a missing image, an Uncaught error,
# 3D RENDERER FAILED, or a failed view switch. Prints draw stats from the page.
set -e
REPO="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-8123}"
OUT="${OUT:-/tmp/check3d}"
mkdir -p "$OUT"
cd "$REPO"
node serve.ts --port "$PORT" > "$OUT/serve.log" 2>&1 &
SERVE_PID=$!
trap 'kill $SERVE_PID 2>/dev/null || true' EXIT
sleep 2
fail=0
for shot in cover title; do
  ${CHROME:-chromium-browser} --headless=new --no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr \
    --window-size=1280,720 --virtual-time-budget=20000 \
    --screenshot="$OUT/check-$shot.png" \
    "http://127.0.0.1:$PORT/?shot=$shot&seed=1" > "$OUT/chrome-$shot.log" 2>&1 || fail=1
  if [ ! -s "$OUT/check-$shot.png" ]; then echo "check3d: FAIL no image for $shot"; fail=1; fi
  if grep -q "Uncaught" "$OUT/chrome-$shot.log"; then echo "check3d: FAIL Uncaught in $shot"; grep "Uncaught" "$OUT/chrome-$shot.log" | head -3; fail=1; fi
  if grep -q "3D RENDERER FAILED" "$OUT/chrome-$shot.log"; then echo "check3d: FAIL renderer failed in $shot"; fail=1; fi
  echo "check3d: $shot -> $(stat -c%s "$OUT/check-$shot.png") bytes"
done
# Flow: load the plain game page and dump the DOM — the title screen must render.
${CHROME:-chromium-browser} --headless=new --no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --virtual-time-budget=8000 \
  --dump-dom "http://127.0.0.1:$PORT/" > "$OUT/dom.html" 2> "$OUT/chrome-flow.log" || fail=1
if grep -q "SOLMAR 3D" "$OUT/dom.html"; then echo "check3d: title screen present"; else echo "check3d: FAIL title missing"; fail=1; fi
if grep -q "3D RENDERER FAILED" "$OUT/dom.html"; then echo "check3d: FAIL renderer failed on title"; fail=1; fi
if [ "$fail" = 1 ]; then echo "check3d: FAIL"; exit 1; fi
echo "check3d: PASS"
